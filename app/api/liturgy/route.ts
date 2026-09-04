import { NextRequest, NextResponse } from 'next/server';
import { generateCanonicalOffice } from '@/lib/liturgy/office-engine';

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
  const hour = (searchParams.get('hour') || 'vespers').toLowerCase() as any;
  const lang = (searchParams.get('lang') || 'en') as 'en' | 'la';
  const collection = (searchParams.get('collection') || 'grail') as 'grail' | 'abbey';

  // Only pass psalterWeek if explicitly provided — otherwise let engine calculate from date
  const psalterWeekParam = searchParams.get('psalterWeek');
  const psalterWeek = psalterWeekParam
    ? (parseInt(psalterWeekParam, 10) as 1 | 2 | 3 | 4)
    : undefined;

  try {
    const date = new Date(dateParam + 'T00:00:00.000Z'); // Parse as UTC to avoid tz offset
    
    // 1. Generate the structural blocks and texts
    const rawBlocks = generateCanonicalOffice({
      date,
      hour,
      lang,
      collection,
      psalterWeek,
    });

    // 2. Compute variables for GABC assignment
    const effectiveDayOfWeek = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Compute psalter week. If the caller passed one explicitly, honour it;
    // otherwise compute from the date using the same logic as the engine.
    let computedWeek: number = psalterWeek ?? 1;
    if (!psalterWeek) {
      // Replicate the engine's getPsalterWeek calculation here
      const y = date.getUTCFullYear();
      const jan6 = new Date(Date.UTC(y, 0, 6));
      const baptismSunday = new Date(Date.UTC(y, 0, 6 + (7 - jan6.getUTCDay()) % 7));
      const otStart = new Date(Date.UTC(baptismSunday.getUTCFullYear(), baptismSunday.getUTCMonth(), baptismSunday.getUTCDate() + 1));
      // Compute Easter
      const a = y % 19, b = Math.floor(y/100), c = y%100;
      const d2 = Math.floor(b/4), e2 = b%4, f2 = Math.floor((b+8)/25);
      const g2 = Math.floor((b-f2+1)/3), h2 = (19*a+b-d2-g2+15)%30;
      const i2 = Math.floor(c/4), k2 = c%4, l2 = (32+2*e2+2*i2-h2-k2)%7;
      const m2 = Math.floor((a+11*h2+22*l2)/451);
      const eMonth = Math.floor((h2+l2-7*m2+114)/31) - 1;
      const eDay = ((h2+l2-7*m2+114)%31)+1;
      const easter = new Date(Date.UTC(y, eMonth, eDay));
      const ashWed = new Date(easter.getTime() - 46*24*60*60*1000);
      const pentecost = new Date(easter.getTime() + 49*24*60*60*1000);
      const trinityStart = new Date(pentecost.getTime() + 7*24*60*60*1000);

      if (date >= ashWed && date < easter) {
        computedWeek = 1;
      } else if (date >= easter && date < new Date(Date.UTC(y, 5, 15))) {
        const wks = Math.floor((date.getTime() - easter.getTime()) / (7*24*60*60*1000));
        computedWeek = ((wks % 4) + 1);
      } else if (date >= otStart && date < ashWed) {
        const wks = Math.floor((date.getTime() - otStart.getTime()) / (7*24*60*60*1000)) + 1;
        computedWeek = ((wks - 1) % 4) + 1;
      } else if (date >= trinityStart) {
        const otWeek1Count = Math.floor((ashWed.getTime() - otStart.getTime()) / (7*24*60*60*1000)) + 1;
        const wksFromTrinity = Math.floor((date.getTime() - trinityStart.getTime()) / (7*24*60*60*1000));
        const totalOtWeek = otWeek1Count + wksFromTrinity + 1;
        computedWeek = ((totalOtWeek - 1) % 4) + 1;
      }
    }
    
    // Convert 0-6 to 1-7 for OCO codes (Sun=1, Mon=2, etc.)
    const ocoDay = effectiveDayOfWeek + 1;
    const occasionCode = `${computedWeek}H${ocoDay}`;
    const ferialCode = `${computedWeek}H${ocoDay}`;
    
    // Compute liturgical year for proper Sunday Mag/Ben antiphons
    const year = date.getUTCFullYear();
    const isSaturday = effectiveDayOfWeek === 6;
    const isFirstVespers = isSaturday && hour === 'vespers';
    
    // Ordinary Time starts typically in year X and goes through year X. 
    // Cycle C was 2025. 2026 is Year A. 2027 is B.
    // Base year 2025 = C (2), 2026 = A (0), 2027 = B (1).
    const litYearIndex = (year - 2026) % 3;
    const litYearChars: ('a'|'b'|'c')[] = ['a', 'b', 'c'];
    // Handle negative modulo correctly
    const liturgicalYear = litYearChars[((litYearIndex % 3) + 3) % 3];
    
    // 3. Assign GABC scores and candidates
    const { populateGabc, responsoryByOccasion } = require('@/app/api/ibreviary/gabc-lookup');
    const blocks = await populateGabc(
      rawBlocks,
      hour,
      occasionCode,
      computedWeek,
      liturgicalYear,
      ferialCode,
      null, // occasionOverride
      isSaturday,
      isFirstVespers
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
    });
  } catch (error) {
    console.error('Error generating office:', error);
    return NextResponse.json(
      { error: 'Failed to generate offline office: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
