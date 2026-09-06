import { NextRequest, NextResponse } from 'next/server';
import { generateCanonicalOffice } from '@/lib/liturgy/office-engine';
import { antiphonOccasionCodes, getCommonOccasionCode, getLiturgicalContext, hymnOccasionCodes, invitatoryOccasionCodes, responsoryOccasionCodes, sundayGospelAntiphonWeek } from '@/lib/liturgy/calendar-context';
import type { OfficeHour } from '@/lib/liturgy/calendar-context';
import { getAnts, getHyms, getRbs } from '@/app/api/ibreviary/gabc-loaders';
import { propagateTones } from '@/lib/psalm-tones/propagate';
import { textFromChant, chantTextCoverage } from '@/lib/liturgy/latin-propers';
import type { Block } from '@/lib/types';

/**
 * GET /api/liturgy
 *
 * Offline Liturgical Office Generator API
 * Query params:
 *   date        — ISO date string (YYYY-MM-DD)
 *   hour        — lauds | vespers | compline | terce | sext | none | readings
 *   lang        — en | la (default: en)
 *   collection  — grail | abbey (default: grail)
 *   psalterWeek — 1 | 2 | 3 | 4 (default: 1)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const hour = (searchParams.get('hour') || 'vespers').toLowerCase() as OfficeHour;
  const lang = (searchParams.get('lang') || 'en') as 'en' | 'la';
  const collection = (searchParams.get('collection') || 'grail') as 'grail' | 'abbey';

  // Only pass psalterWeek if explicitly provided — otherwise let engine calculate from date
  const psalterWeekParam = searchParams.get('psalterWeek');
  const psalterWeek = psalterWeekParam
    ? (parseInt(psalterWeekParam, 10) as 1 | 2 | 3 | 4)
    : undefined;

  try {
    const date = new Date(dateParam + 'T00:00:00.000Z'); // Parse as UTC to avoid tz offset
    if (Number.isNaN(date.getTime())) throw new Error('date must be YYYY-MM-DD');
    if (!['lauds', 'vespers', 'compline', 'terce', 'sext', 'none', 'readings'].includes(hour)) {
      throw new Error(`unsupported hour: ${hour}`);
    }
    const context = await getLiturgicalContext(date, hour);

    // The chant indexes are read here, not in the engine: `lib/liturgy` does
    // not reach into `app/api/ibreviary`, so the invitatory is resolved and
    // handed in.
    const { resolveInvitatory } = require('@/app/api/ibreviary/gabc-lookup');
    const invitatoryCodes = invitatoryOccasionCodes(context);

    // 1. Generate the structural blocks and texts
    const rawBlocks = await generateCanonicalOffice({
      date,
      hour,
      lang,
      collection,
      psalterWeek,
      invitatory: hour === 'lauds' ? resolveInvitatory(invitatoryCodes) : null,
    });

    // 2. Use the same romcal context for texts, psalter, and OCO. Prefer a
    // dated proper only when the local OCO indexes actually contain it.
    const computedWeek = psalterWeek || context.psalterWeek;
    const ferialCode = psalterWeek && context.season === 'ordinary'
      ? `${computedWeek}${context.ferialOccasionCode.slice(1)}`
      : context.ferialOccasionCode;
    const datedCode = context.properOccasionCode;
    const hasDatedProper = !!datedCode && (
      getAnts().some(entry => entry.occasion === datedCode) ||
      getHyms().some(entry => entry.seasonCode.split(/\s+/).includes(datedCode)) ||
      getRbs().some(entry => entry.seasonCode.split('|')[0].split(/\s+/).includes(datedCode))
    );
    const occasionCode = hasDatedProper
      ? datedCode
      : (getCommonOccasionCode(context) || ferialCode);
    
    // Sunday's Gospel-canticle antiphons belong to the Sunday; see
    // `sundayGospelAntiphonWeek` for what asking for them on a Tuesday cost.
    const sundayOfOrdinaryTime = sundayGospelAntiphonWeek(context, occasionCode, ferialCode);

    // 3. Assign GABC scores and candidates
    const { populateGabc, responsoryByCodes } = require('@/app/api/ibreviary/gabc-lookup');
    const scored = await populateGabc(
      rawBlocks,
      hour,
      occasionCode,
      sundayOfOrdinaryTime,
      context.liturgicalYear,
      ferialCode,
      null, // occasionOverride
      date.getUTCDay() === 6,
      context.isFirstVespers,
      invitatoryCodes,
      hymnOccasionCodes(context, hour),
      antiphonOccasionCodes(context, hour)
    );

    // 4. Carry each antiphon's mode down onto the psalms it governs. This runs
    // *after* the GABC assignment because it reads the `annotation:` header
    // that `withAnnotation` writes, and it overwrites the psalter schema's
    // default tone wherever OCO records a mode the table can read. The
    // iBreviary route has done this since it was written; the offline one
    // never did, so every psalm of every day was tone 8.G.
    const toned = propagateTones(scored);

    // 4b. A Latin office has no proper book: `vendor/psautier` is English, so
    // `getOfflineProper` is guarded to `lang === 'en'` and the Latin antiphons
    // and hymn have always been the generic ones. OCO does name them, and the
    // score just assigned carries their words, so they are read off it — the
    // text on a block and the music on it can then never be two different
    // antiphons.
    const blocks = lang === 'la' ? textFromChant(toned) : toned;
    if (lang === 'la') {
      const coverage = chantTextCoverage(toned, blocks);
      for (const [kind, [taken, all]] of Object.entries(coverage)) {
        console.log(`[OCO] ${kind}: ${taken}/${all} took their text from the day's chant`);
      }
    }

    const psalms = blocks.filter((b: Block) => b.type === 'psalm' && !b.gabcScore);
    const fromOco = psalms.filter((b: Block) => b.toneSource === 'oco').length;
    if (psalms.length) {
      console.log(`[OCO] tones: ${fromOco}/${psalms.length} psalms from the antiphon's mode, `
        + `${psalms.length - fromOco} on the psalter's default`);
    }

    // 5. The short responsory, from the innermost section of OCO that has one.
    //
    // It used to be looked up by the single `occasionCode`, which reached it on
    // 216 of the 365 Lauds of 2026 and 227 of the Vespers, and **Compline was
    // excluded outright** although `IDX_RB.csv` holds its *In manus tuas* in
    // four seasonal forms and the Triduum's *Christus factus est* besides. The
    // chain reaches all 1095.
    const responsoryCodes = responsoryOccasionCodes(context, hour);
    const rb = responsoryCodes.length
      ? responsoryByCodes(responsoryCodes, hour, context.isFirstVespers)
      : null;
    if (rb) {
      const chant = {
        id: require('crypto').randomBytes(4).toString('hex'),
        type: 'antiphon' as const,
        content: rb.incipit,
        gabcScore: rb.gabc,
      };
      // Compline's responsory is already written into the office as plain
      // text under the reading, so the chant replaces it rather than joining
      // it — otherwise the hour says *In manus tuas* twice.
      const written = blocks.findIndex((b: Block) => b.type === 'text' && /^\s*℟\.\s*br\./.test(b.content));
      if (written !== -1) {
        blocks.splice(written, 1, chant);
        console.log(`[OCO] responsory "${rb.incipit.slice(0, 40)}" replaced the written one`);
      } else {
        // Elsewhere the engine leaves a RESPONSORY heading and a placeholder.
        const respIdx = blocks.findIndex((b: Block) => b.type === 'heading' && b.content === 'RESPONSORY');
        if (respIdx !== -1) blocks.splice(respIdx, 2);

        const gcIdx = blocks.findIndex((b: Block) =>
          b.type === 'heading' && ['GOSPEL CANTICLE', 'BENEDICTUS', 'MAGNIFICAT', 'NUNC DIMITTIS']
            .some(name => b.content.toUpperCase().includes(name)));
        if (gcIdx > 0) {
          blocks.splice(gcIdx, 0, chant);
          console.log(`[OCO] responsory "${rb.incipit.slice(0, 40)}" from ${responsoryCodes.join(' → ')}`);
        }
      }
    } else if (responsoryCodes.length) {
      console.log(`[OCO] RB ✗ nothing under ${responsoryCodes.join(' → ')}`);
    }

    return NextResponse.json({
      blocks,
      source: 'offline-engine',
      date: dateParam,
      hour,
      lang,
      psalterWeek: computedWeek,
      liturgicalContext: {
        name: context.name,
        latinName: context.latinName,
        rank: context.rank,
        season: context.season,
        seasonWeek: context.seasonWeek,
        liturgicalYear: context.liturgicalYear,
        occasionCode,
        ferialCode,
        isFirstVespers: context.isFirstVespers,
      },
    });
  } catch (error) {
    console.error('Error generating office:', error);
    return NextResponse.json(
      { error: 'Failed to generate offline office: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
