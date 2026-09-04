import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

import { Block } from '@/lib/types';
import { populateGabc, responsoryByOccasion } from './gabc-lookup';
import { deriveContext } from './derive-context';
import { FEAST_CALENDAR } from './constants';
import { parseBlocks } from './parse-blocks';
import { getIBreviarySessions } from '@/lib/ibreviary/session';
import { propagateTones } from '@/lib/psalm-tones/propagate';

// Re-export AvailableOccasion so the editor can import it from a single path.
export type { AvailableOccasion } from './derive-context';

const generateId = () => Math.random().toString(36).substring(2, 11);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const hour = searchParams.get('hour') || 'vespers';
  const lang = searchParams.get('lang') || 'en';

  console.log(`Fetching iBreviary text for Date: ${dateParam}, Hour: ${hour}, Lang: ${lang}`);

  let sCode = 'vespri';
  switch (hour.toLowerCase()) {
    case 'lauds': sCode = 'lodi'; break;
    case 'terce':
    case 'sext':
    case 'none': sCode = 'ora_media'; break;
    case 'vespers': sCode = 'vespri'; break;
    case 'compline': sCode = 'compieta'; break;
    case 'matins':
    case 'office-of-readings':
    case 'office_of_readings': sCode = 'ufficio_delle_letture'; break;
  }

  let year = new Date().getFullYear().toString();
  let month = (new Date().getMonth() + 1).toString();
  let day = new Date().getDate().toString();

  try {
    const parts = dateParam.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10).toString();
      month = parseInt(parts[1], 10).toString();
      day = parseInt(parts[2], 10).toString();
    }
  } catch (e) {
    console.error('Error parsing date:', e);
  }

  try {
    // 1) Get cookies for English (main menu) and chosen language (content)
    const sessions = await getIBreviarySessions(lang, day, month, year);

    // 2) Fetch the main menu (always English) to get the liturgical date/name for OCO derivation
    const mainMenuUrl = "https://www.ibreviary.com/m2/breviario.php?b=1";
    // 3) Fetch the specific office in the user's chosen language
    const ibreviaryUrl = `https://www.ibreviary.com/m2/breviario.php?s=${sCode}`;

    console.log(`Using cookie: ${sessions.fetchHeaders.Cookie} to fetch menu: ${mainMenuUrl} and office: ${ibreviaryUrl}`);

    const [mainResponse, response] = await Promise.all([
      fetch(mainMenuUrl, { headers: sessions.enFetchHeaders, cache: 'no-store' }),
      fetch(ibreviaryUrl, { headers: sessions.fetchHeaders, cache: 'no-store' })
    ]);

    if (!response.ok) {
      throw new Error(`Fetch returned status ${response.status}`);
    }

    const mainHtml = await mainResponse.text();
    const html = await response.text();

    if (!html.includes('<div id="contenuto">')) {
      throw new Error('Could not find content container in the returned HTML.');
    }

    const $main = cheerio.load(mainHtml);
    const dateText = $main('#contenuto .inner > p').eq(0).text().trim();
    const liturgicalName = $main('#contenuto .inner > p').eq(1).text().trim();

    const $ = cheerio.load(html);
    const contentHtml = $('#contenuto .inner').html() || '';

    if (!contentHtml) {
      throw new Error('Inner content area is empty or not found.');
    }

    // Derive OCO context early so we can override the liturgical name for feasts
    const ctx = deriveContext(liturgicalName, hour, new Date(dateParam));
    let displayName = liturgicalName;
    if (ctx.occasionCode && FEAST_CALENDAR[ctx.occasionCode]) {
      displayName = FEAST_CALENDAR[ctx.occasionCode];
    } else {
      const match = ctx.availableOccasions.find(o => o.value === ctx.occasionCode);
      if (match) {
        const inner = match.label.match(/\((.*?)\)/);
        if (inner) displayName = inner[1];
      }
    }

    const serviceTitle = $('#contenuto .inner h1').text().trim();
    const finalBlocks = parseBlocks($, dateText, displayName, serviceTitle);

    // Call the populateGabc module to attach GABC notation where possible
    const enrichedBlocks = await populateGabc(
      finalBlocks,
      hour,
      ctx.occasionCode,
      ctx.otWeekNum,
      ctx.liturgicalYear,
      ctx.ferialCode,
      searchParams.get('occasionOverride') || null,
      new Date(dateParam).getUTCDay() === 6,
      new Date(dateParam).getUTCDay() === 6 && hour.toLowerCase() === 'vespers'
    );

    // Inject the OCO short responsory block (Rb.) directly before the GOSPEL CANTICLE heading.
    if (ctx.occasionCode) {
      const rb = responsoryByOccasion(ctx.occasionCode, hour);
      if (rb) {
        const gcIdx = enrichedBlocks.findIndex(
          b =>
            b.type === 'heading' &&
            (b.content.toUpperCase().includes('GOSPEL CANTICLE') ||
              b.content.toUpperCase().includes('BENEDICTUS') ||
              b.content.toUpperCase().includes('MAGNIFICAT'))
        );
        if (gcIdx > 0) {
          const rbBlock: Block = {
            id: generateId(),
            type: 'antiphon',
            content: rb.incipit,
            gabcScore: rb.gabc,
          };
          enrichedBlocks.splice(gcIdx, 0, rbBlock);
          console.log(`[OCO] Injected responsory "${rb.incipit.slice(0, 40)}"`);
        }
      }
    }

    // ── Phase 3: Psalm number extraction + tone propagation ─────────────────
    const fullyEnrichedBlocks = propagateTones(enrichedBlocks);

    console.log(`Parsed ${fullyEnrichedBlocks.length} blocks deterministically using Cheerio.`);

    if (fullyEnrichedBlocks.length === 0) {
      throw new Error('Parsed HTML but resulted in 0 blocks. The format might have changed or requested a non-existent day.');
    }

    return NextResponse.json({
      blocks: fullyEnrichedBlocks,
      source: 'scraped',
      occasionCode: ctx.occasionCode,
      ferialCode: ctx.ferialCode,
      availableOccasions: ctx.availableOccasions,
      liturgicalYear: ctx.liturgicalYear,
    });
  } catch (error) {
    console.error('Error fetching/parsing from iBreviary:', error);
    return NextResponse.json(
      { error: 'Failed to process liturgical texts. ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
