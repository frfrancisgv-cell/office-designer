import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

import { Block } from '@/lib/types';
import { populateGabc, responsoryByOccasion, responsoryByText } from './gabc-lookup';
import { deriveContext } from './derive-context';
import { FEAST_CALENDAR } from './constants';
import { parseBlocks } from './parse-blocks';
import { getIBreviarySessions } from '@/lib/ibreviary/session';
import { propagateTones } from '@/lib/psalm-tones/propagate';

// Re-export AvailableOccasion so the editor can import it from a single path.
export type { AvailableOccasion } from './derive-context';

const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Return the OCO common named by the reading rubric preceding a responsory.
 * iBreviary uses this shape when it prints two alternatives in one hour, for
 * example "[Doctors]" and "[Pastors]" on a bishop/doctor's memorial.
 */
function responsoryCommonBefore(blocks: Block[], responsoryIndex: number): string | null {
  let readingIndex = -1;
  for (let i = responsoryIndex - 1; i >= 0; i--) {
    if (blocks[i].type !== 'heading') continue;
    if (/READING|LETTURA|LECTIO/i.test(blocks[i].content)) readingIndex = i;
    break;
  }
  if (readingIndex < 0) return null;

  const label = blocks
    .slice(readingIndex + 1, responsoryIndex)
    .filter(block => block.type === 'rubric')
    .map(block => block.content)
    .join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (/\bdoctors?\b|\bdoctores?\b|\bdottori?\b|\bdocteurs?\b/i.test(label)) return 'Doct';
  if (/\bpastors?\b|\bpastores?\b|\bpastori?\b|\bpasteurs?\b/i.test(label)) return 'Past';
  if (/\bapostles?\b|\bevangelists?\b|\bapostoli\b|\bapostolorum\b|\bapotres?\b|\bapostoles?\b/i.test(label)) return 'Ap';
  if (/\bblessed virgin mary\b|\bvirgin mary\b|\bbeata maria vergine\b|\bbienheureuse vierge marie\b|\bvirgen maria\b|\bbeatae mariae virginis\b/i.test(label)) return 'BMV';
  if (/\bdedication\b.*\bchurch\b|\bdedicazione\b|\bdedicace\b|\bdedicacion\b|\bdedicatione ecclesiae\b/i.test(label)) return 'Ded';
  if (/\bseveral martyrs?\b|\bmore martiri\b|\bplusieurs martyrs?\b|\bvarios martires\b|\bplurimorum martyrum\b/i.test(label)) return 'PlM';
  if (/\bone martyr\b|\bsingle martyr\b|\bun martire\b|\bun martyr\b|\bun martir\b|\bunius martyris\b/i.test(label)) return 'UnM';
  if (/\bmartyrs?\b|\bmartiri\b|\bmartires\b|\bmartyrum\b/i.test(label)) return 'UnM';
  if (/\bseveral virgins?\b|\bmore vergini\b|\bplusieurs vierges\b|\bvarias virgenes\b|\bplurium virginum\b/i.test(label)) return 'Virg Pl';
  if (/\bvirgins?\b|\bvergini\b|\bvierges?\b|\bvirgenes\b|\bvirginum\b/i.test(label)) return 'Virg';
  if (/\bholy women\b|\bsante\b|\bsaintes\b|\bsantas\b|\bsanctarum mulierum\b/i.test(label)) return 'Mul';
  if (/\bholy men\b|\bsanti\b|\bsaints\b|\bsantos\b|\bsanctorum virorum\b/i.test(label)) return 'Vir';
  return null;
}

/** Attach OCO chants to the short responsory section(s) already imported. */
function responsoryTexts(blocks: Block[]): string[] {
  const texts: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type !== 'heading' || !/RESPONSORY|RESPONSORIO|RESPONSORIUM/i.test(blocks[i].content)) continue;
    const parts: string[] = [];
    for (let j = i + 1; j < blocks.length && blocks[j].type !== 'heading'; j++) {
      if (blocks[j].type === 'text') parts.push(blocks[j].content);
    }
    texts.push(parts.join('\n'));
  }
  return texts;
}

function injectOcoResponsories(
  blocks: Block[],
  hour: string,
  defaultOccasion: string | null,
  latinBlocks: Block[],
): void {
  if (!/lauds|vespers/i.test(hour)) return;

  const latinResponsories = responsoryTexts(latinBlocks);
  const importedResponsories = responsoryTexts(blocks);

  const responsoryIndexes = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type === 'heading' && /RESPONSORY|RESPONSORIO|RESPONSORIUM/i.test(block.content))
    .map(({ index }) => index);

  // Multiple headings denote alternative readings.  Resolve every chant
  // from that reading's own common rather than choosing one global occasion.
  const insertions = responsoryIndexes.flatMap((responsoryIndex, responsoryOrdinal) => {
    const occasion = responsoryIndexes.length > 1
      ? responsoryCommonBefore(blocks, responsoryIndex)
      : defaultOccasion;
    const importedText = importedResponsories[responsoryOrdinal] || '';
    const normalizedImportedText = importedText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hasAlleluia = /\balleluia\b|\baleluya\b/i.test(normalizedImportedText);
    const latinText = latinResponsories.length === responsoryIndexes.length
      ? latinResponsories[responsoryOrdinal] || ''
      : '';
    const rb = (occasion ? responsoryByOccasion(occasion, hour, hasAlleluia) : null) ||
      responsoryByText(latinText, hour) ||
      (responsoryIndexes.length === 1 && defaultOccasion
        ? responsoryByOccasion(defaultOccasion, hour, hasAlleluia)
        : null);
    if (!rb) return [];

    let insertAt = responsoryIndex + 1;
    while (insertAt < blocks.length && blocks[insertAt].type !== 'heading') insertAt++;
    return [{ insertAt, occasion: occasion || 'text match', rb }];
  });

  // Work backwards so earlier indexes remain valid as blocks are inserted.
  for (const { insertAt, occasion, rb } of insertions.reverse()) {
    blocks.splice(insertAt, 0, {
      id: generateId(),
      type: 'antiphon',
      content: rb.incipit,
      gabcScore: rb.gabc,
    });
    console.log(`[OCO] Injected ${occasion} responsory "${rb.incipit.slice(0, 40)}"`);
  }
}

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

    const [mainResponse, response, latinResponse] = await Promise.all([
      fetch(mainMenuUrl, { headers: sessions.enFetchHeaders, cache: 'no-store' }),
      fetch(ibreviaryUrl, { headers: sessions.fetchHeaders, cache: 'no-store' }),
      lang === 'la'
        ? Promise.resolve(null)
        : fetch(ibreviaryUrl, { headers: sessions.laFetchHeaders, cache: 'no-store' }),
    ]);

    if (!response.ok) {
      throw new Error(`Fetch returned status ${response.status}`);
    }

    const mainHtml = await mainResponse.text();
    const html = await response.text();
    const latinHtml = lang === 'la'
      ? html
      : (latinResponse?.ok ? await latinResponse.text() : '');

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
    const latinBlocks = latinHtml
      ? parseBlocks(cheerio.load(latinHtml), '', '', '')
      : [];

    // Call the populateGabc module to attach GABC notation where possible
    const occasionOverride = searchParams.get('occasionOverride') || null;
    const enrichedBlocks = await populateGabc(
      finalBlocks,
      hour,
      ctx.occasionCode,
      ctx.otWeekNum,
      ctx.liturgicalYear,
      ctx.ferialCode,
      occasionOverride,
      new Date(dateParam).getUTCDay() === 6,
      new Date(dateParam).getUTCDay() === 6 && hour.toLowerCase() === 'vespers'
    );

    // Add the OCO short responsory chant after the imported responsory text.
    // When iBreviary supplies alternative readings, each alternative gets the
    // chant belonging to its own common (e.g. Doctors and Pastors).
    injectOcoResponsories(enrichedBlocks, hour, occasionOverride || ctx.occasionCode, latinBlocks);

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
