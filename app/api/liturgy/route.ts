import { NextRequest, NextResponse } from 'next/server';
import { generateCanonicalOffice } from '@/lib/liturgy/office-engine';
import { getCommonOccasionCode, getLiturgicalContext } from '@/lib/liturgy/calendar-context';
import type { OfficeHour } from '@/lib/liturgy/calendar-context';
import { getAnts, getHyms, getRbs } from '@/app/api/ibreviary/gabc-loaders';

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
    const context = getLiturgicalContext(date, hour);
    
    // 1. Generate the structural blocks and texts
    const rawBlocks = generateCanonicalOffice({
      date,
      hour,
      lang,
      collection,
      psalterWeek,
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
    
    // 3. Assign GABC scores and candidates
    const { populateGabc, responsoryByOccasion } = require('@/app/api/ibreviary/gabc-lookup');
    const blocks = await populateGabc(
      rawBlocks,
      hour,
      occasionCode,
      context.season === 'ordinary' ? context.seasonWeek : null,
      context.liturgicalYear,
      ferialCode,
      null, // occasionOverride
      date.getUTCDay() === 6,
      context.isFirstVespers
    );

    // Inject the OCO short responsory block (Rb.) directly before the GOSPEL CANTICLE heading
    if (occasionCode && hour !== 'compline') {
      const rb = responsoryByOccasion(occasionCode, hour);
      if (rb) {
        // Remove the offline generator's RESPONSORY heading and text placeholders
        const respIdx = blocks.findIndex((b: any) => b.type === 'heading' && b.content === 'RESPONSORY');
        if (respIdx !== -1) {
          blocks.splice(respIdx, 2); // Remove heading and the text placeholder
        }

        const gcIdx = blocks.findIndex(
          (b: any) =>
            b.type === 'heading' &&
            (b.content.toUpperCase().includes('GOSPEL CANTICLE') ||
              b.content.toUpperCase().includes('BENEDICTUS') ||
              b.content.toUpperCase().includes('MAGNIFICAT'))
        );
        if (gcIdx > 0) {
          blocks.splice(gcIdx, 0, {
            id: require('crypto').randomBytes(4).toString('hex'), // or any random generator
            type: 'antiphon',
            content: rb.incipit,
            gabcScore: rb.gabc,
          });
          console.log(`[OCO] Offline injected responsory "${rb.incipit.slice(0, 40)}"`);
        }
      }
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
