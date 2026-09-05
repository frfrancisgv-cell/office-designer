/**
 * gabc-lookup.ts
 *
 * For each antiphon/hymn block, returns a ranked list of GabcCandidates
 * drawn from IDX_ANT.csv + OCO/INDEX_HYM2.json + gregobase-cache.json.
 *
 * Blocks with 1 candidate get gabcScore set automatically.
 * Blocks with >1 candidate get gabcCandidates set; the user picks in the UI.
 * Blocks with 0 candidates get neither.
 *
 * OCO is the authoritative source. iBreviary Latin text is used only to
 * identify which OCO entry is most relevant via leading-token matching.
 *
 * Data loading, caching, and normalisation utilities live in gabc-loaders.ts.
 */

// Types are imported as types: this module is loaded outside Next by the
// tests, and a value import of an interface fails there at parse time.
import type { Block, GabcCandidate } from '@/lib/types';
import * as cheerio from 'cheerio';
import type { AntEntry, HymEntry, InvEntry, RbEntry } from './gabc-loaders';
import {
  getAnts, getHyms, getInvs, getRbs, getGrego,
  normalize,
} from './gabc-loaders';

// Re-export InvEntry so external callers (gabc-search route) don't need to
// change their import paths.
export type { InvEntry };

// ── Direct OCO occasion lookup ────────────────────────────────────────────────

/**
 * When we know the exact OCO occasion code (e.g. "1H4") and office (e.g. "V"),
 * return the antiphons directly from IDX_ANT.csv ordered by place (1, 2, 3, M/B).
 * This is authoritative — no fuzzy matching needed.
 */
function antsByOccasion(occasionCode: string, hour: string, isFirstVespers: boolean = false): GabcCandidate[] {
  const isCompline = hour.toLowerCase().includes('compline');
  let mappedOccasion = occasionCode;
  
  if (isCompline && mappedOccasion.match(/^\dH\d$/)) {
    const feria = parseInt(mappedOccasion[2]);
    if (feria === 7) mappedOccasion = 'H0';
    else mappedOccasion = `H${feria}`;
  }

  const filters = officeFilters(hour, isFirstVespers);
  const placeOrder = (p: string) => {
    const n = parseInt(p, 10);
    if (!isNaN(n)) return n;                         // numeric: 1,2,3
    if (/^[MB]$/.test(p)) return 99;                 // M or B: comes last
    return 50;                                        // other (e.g. Hm variants)
  };

  return getAnts()
    .filter(e =>
      (e.occasion === mappedOccasion || (isCompline && e.occasion === 'H0-7')) &&
      (filters.length === 0 || officeMatches(e.office, filters)) &&
      /^([123MB]|Nunc)/.test(e.place.trim())
    )
    .sort((a, b) => placeOrder(a.place.trim()) - placeOrder(b.place.trim()))
    .flatMap(e => {
      const gabc = resolveGabc(e.gbId, e.gabc) || '';
      return [{ incipit: e.incipit, gabc: gabc ? withAnnotation(gabc, e.incipit, e.mode) : '', mode: e.mode, office: e.office,
                occasion: e.occasion, source: e.gbId > 0 ? 'gregobase' : 'OCO',
                gbId: e.gbId || undefined, place: e.place.trim() } satisfies GabcCandidate];
    });
}

// ── Proper Sunday Magnificat/Benedictus lookup ───────────────────────────────

function sundayMagBenCandidates(otWeekNum: number | null, liturgicalYear: 'a'|'b'|'c', hour: string, isFirstVespers: boolean): GabcCandidate[] {
  if (!otWeekNum || !liturgicalYear) return [];
  const occ = `${otWeekNum}D`;
  const isVespers = hour.toLowerCase().includes('vespers');
  const yr = liturgicalYear.toLowerCase();

  const validFilters = officeFilters(hour, isFirstVespers);
  const priorityPlaces = isVespers
    ? [`M${yr}`, 'M', 'M-I ad lib', 'M-II ad lib', 'M ad lib']
    : [`B${yr}`, 'B', 'Bb', 'Ba', 'Bc'];
  
  const officeFilter = validFilters;

  const candidates: GabcCandidate[] = [];
  for (const place of priorityPlaces) {
    const matches = getAnts().filter(e =>
      e.occasion === occ &&
      officeFilter.some(f => e.office === f) &&
      e.place.trim() === place
    );
    for (const e of matches) {
      const gabc = resolveGabc(e.gbId, e.gabc) || '';
      let label = e.office;
      const p = e.place.trim();
      if (p === `M${yr}` || p === `B${yr}`) label += ` (Proper for Year ${yr.toUpperCase()})`;
      else if (p === 'M' || p === 'B') label += ` (Generic/Common)`;
      else if (p.includes('ad lib')) label += ` (${p})`;
      else if (/^[MB][abc]$/.test(p)) label += ` (Proper for Year ${p.slice(-1).toUpperCase()})`;

      candidates.push({
        incipit: e.incipit, gabc: gabc ? withAnnotation(gabc, e.incipit, e.mode) : '', mode: e.mode,
        office: label,
        occasion: occ, source: e.gbId > 0 ? 'gregobase' : 'OCO',
        gbId: e.gbId || undefined,
      });
    }
  }
  return candidates;
}

// ── Scoring ───────────────────────────────────────────────────────────────────



/**
 * Resolve best GABC for a matched CSV entry.
 * Prefers the gregobase Solesmes edition when available, then any gregobase entry, then OCO CSV.
 */
export function resolveGabc(gbId: number, csvGabc: string): string | null {
  let gabc: string | null = null;
  if (gbId > 0) {
    const g = getGrego()[gbId];
    if (g?.gabc && g.version === 'Solesmes') gabc = g.gabc;
    else if (g?.gabc) gabc = g.gabc;
  }
  if (!gabc) gabc = csvGabc || null;
  
  if (gabc) {
    gabc = gabc.replace(/<v>\\greheightstar<\/v>/g, '*')
               .replace(/\\greheightstar/g, '*');
  }
  return gabc;
}

/**
 * Wrap raw GABC with proper file headers including the mode annotation.
 * Exsurge reads `annotation:` to show the mode above the score.
 * LuaLaTeX gregoriotex also uses it.
 */
export function withAnnotation(gabc: string, incipit: string, mode: string): string {
  if (!gabc) return gabc;
  if (gabc.includes('%%')) return gabc; // already has headers
  const name = incipit.replace(/[;"]/g, '').trim().slice(0, 80) || 'Antiphon';
  const ann  = mode ? `annotation: ${mode};\n` : '';
  return `name: ${name};\n${ann}%%\n${gabc}`;
}


/** Find the short responsory for a given occasion code (e.g. "1H4") and hour. */
export function responsoryByOccasion(
  occasionCode: string,
  hour: string,
  hasAlleluia?: boolean,
): { gabc: string; incipit: string } | null {
  let seasonCode = '';
  const offPart = hour.toLowerCase().includes('laud') ? 'L' : 'V';

  // Commons and proper celebrations use their OCO code directly (for
  // example Doct, Past, or 29/9).  These used to be skipped entirely because
  // the code below only translated temporal occasion codes.  Prefer the
  // office-specific row before applying the temporal translations.
  const directHits = getRbs().filter(e => {
    const separator = e.seasonCode.lastIndexOf('|');
    const occasion = e.seasonCode.slice(0, separator).trim();
    const office = e.seasonCode.slice(separator + 1).trim();
    const occasionTokens: string[] = occasion.match(/\d{1,2}\/\d{1,2}|[^\s]+/g) ?? [];
    const occasionMatches = occasionCode.includes(' ')
      ? occasion.includes(occasionCode)
      : occasionTokens.includes(occasionCode);
    return occasionMatches &&
      officeMatches(office, officeFilters(hour));
  });
  const directHit = (hasAlleluia === undefined
    ? null
    : directHits.find(entry => /\.\.\.\s*all\./i.test(entry.incipit) === hasAlleluia)) ||
    directHits[0];
  if (directHit) {
    return {
      incipit: directHit.incipit,
      gabc: withAnnotation(directHit.gabc, directHit.incipit, directHit.mode),
    };
  }

  // 1. Ordinary Time: e.g. "1H4"
  const mH = occasionCode.match(/^(\d)H(\d)$/);
  if (mH) {
    const week  = parseInt(mH[1]);
    const feria = parseInt(mH[2]);
    const pair  = week % 2 === 1 ? '1.3' : '2.4';
    seasonCode = `${pair}H${feria}|${offPart}`;
  }

  // 2. Advent: e.g. "1A2" or "A-17/12"
  else if (occasionCode.startsWith('A-') || occasionCode.includes('12')) {
    // Dec 17-24 Advent
    const day = parseInt(occasionCode.replace('A-', '').split('/')[0]);
    if (day === 24) {
      seasonCode = `Adv 24/12|${offPart}`;
    } else {
      seasonCode = `Adv H2-7|${offPart}`;
    }
  } else if (occasionCode.match(/^(\d)A(\d)$/)) {
    const m = occasionCode.match(/^(\d)A(\d)$/)!;
    const week = parseInt(m[1]);
    if (week === 1) {
      seasonCode = `Adv H1|${offPart}`;
    } else {
      if (offPart === 'L') {
        seasonCode = `Adv H2-7|${offPart}`;
      } else {
        seasonCode = `Adv H2-6|${offPart}`;
      }
    }
  }

  // 3. Lent: e.g. "1Q2"
  else if (occasionCode.match(/^(\d)Q(\d)$/)) {
    const m = occasionCode.match(/^(\d)Q(\d)$/)!;
    const week = parseInt(m[1]);
    if (week === 6) {
      seasonCode = `6Q|${offPart}`;
    } else {
      if (offPart === 'L') {
        seasonCode = `Q H2-7|${offPart}`;
      } else {
        seasonCode = `Q H2-6|${offPart}`;
      }
    }
  }

  // 4. Easter: e.g. "1P2"
  else if (occasionCode.match(/^(\d)P(\d)$/)) {
    if (offPart === 'L') {
      seasonCode = `P H2-7|${offPart}`;
    } else {
      seasonCode = `P H2-6|${offPart}`;
    }
  }

  if (!seasonCode) return null;

  const hit = getRbs().find(e => e.seasonCode === seasonCode);
  if (!hit) {
    const genericHit = getRbs().find(e => e.seasonCode.split('|')[0] === seasonCode.split('|')[0]);
    if (genericHit) {
      return { incipit: genericHit.incipit, gabc: withAnnotation(genericHit.gabc, genericHit.incipit, genericHit.mode) };
    }
    return null;
  }
  return { incipit: hit.incipit, gabc: withAnnotation(hit.gabc, hit.incipit, hit.mode) };
}

/**
 * Match a short responsory from its Latin iBreviary text.
 *
 * OCO incipits are Latin, so the parallel Latin import provides a reliable
 * fallback for a single responsory, or whenever its alternatives align with
 * those in the requested language.
 */
export function responsoryByText(latinText: string, hour: string): { gabc: string; incipit: string } | null {
  const text = normalize(latinText);
  if (!text) return null;
  const hasAlleluia = /\balleluia\b/.test(text);

  const matches = getRbs()
    .filter(entry => {
      const separator = entry.seasonCode.lastIndexOf('|');
      const office = entry.seasonCode.slice(separator + 1).trim();
      if (!officeMatches(office, officeFilters(hour))) return false;

      // Display suffixes such as "... all." and "soll." distinguish OCO
      // variants but are not part of the sung incipit printed by iBreviary.
      const baseIncipit = normalize(entry.incipit.split('...')[0].replace(/\bsoll\.?$/i, ''));
      return baseIncipit.length >= 5 && text.includes(baseIncipit);
    })
    .sort((a, b) => {
      const aAlleluia = /\.\.\.\s*all\./i.test(a.incipit);
      const bAlleluia = /\.\.\.\s*all\./i.test(b.incipit);
      if (aAlleluia !== bAlleluia) {
        return Number(bAlleluia === hasAlleluia) - Number(aAlleluia === hasAlleluia);
      }
      return normalize(b.incipit).length - normalize(a.incipit).length;
    });

  const hit = matches[0];
  return hit
    ? { incipit: hit.incipit, gabc: withAnnotation(hit.gabc, hit.incipit, hit.mode) }
    : null;
}

// ── Office filter ─────────────────────────────────────────────────────────────

function officeFilters(hour: string, isFirstVespers: boolean = false): string[] {
  switch (hour.toLowerCase()) {
    case 'vespers':  return isFirstVespers ? ['1V', 'V', 'v'] : ['2V', 'V', 'v'];
    case 'lauds':    return ['L', 'l'];
    case 'matins': case 'office-of-readings': case 'office_of_readings': return ['N', 'Ol'];
    case 'terce': case 'sext': case 'none': return ['T', 'S', 'Hm'];
    case 'compline': return ['C', 'c'];
    default: return [];
  }
}

function officeMatches(officeStr: string, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const tokens = officeStr.split(/[,/\s]+/).map(t => t.trim()).filter(Boolean);
  return filters.some(f => tokens.includes(f));
}

/**
 * Match an OCO hymn season to the requested occasion.
 *
 * Most rows contain one season code. Some proper hymns are deliberately shared
 * by several feasts (for example, "25/4 11/6 18/10"). Date lookups must match
 * one complete date token instead of requiring the whole metadata field to be
 * identical.
 */
export function hymnSeasonMatches(entrySeasonCode: string, requestedSeasonCode: string): boolean {
  const entry = entrySeasonCode.trim().toLowerCase();
  const requested = requestedSeasonCode.trim().toLowerCase();
  if (entry === requested) return true;

  if (/^\d{1,2}\/\d{1,2}$/.test(requested)) {
    const dateCodes: string[] = entry.match(/\b\d{1,2}\/\d{1,2}\b/g) ?? [];
    return dateCodes.includes(requested);
  }

  return false;
}





const TOP_N = 5;     // max candidates to offer
const MIN_SCORE = 0.4; // minimum leading-token match ratio




/** Does an `IDX_INV.csv` occasion cell name this code? "29/9 2/10" names two. */
function invOccasionMatches(cell: string, code: string): boolean {
  return cell === code || cell.split(/\s+(?=\d)/).includes(code);
}

/**
 * Every invitatory antiphon offered for a day, in the order the codes were
 * asked for.
 *
 * All matches are returned, not the first: `Ded`, `BMV`, `Q` and `Ap` each
 * have two rows in the index, and those are genuine *ad libitum* options that
 * the editor should be able to choose between — the same way the antiphon path
 * already offers `gabcCandidates`.
 */
export function invByOccasion(occasionCodes: string | string[]): GabcCandidate[] {
  const codes = Array.isArray(occasionCodes) ? occasionCodes : [occasionCodes];
  const out: GabcCandidate[] = [];
  const seen = new Set<string>();

  for (const code of codes) {
    if (!code) continue;
    for (const match of getInvs()) {
      if (!invOccasionMatches(match.occasion, code)) continue;
      if (seen.has(match.text)) continue;
      seen.add(match.text);

      const rawGabc = resolveGabc(match.gbId, match.gabc) || '';
      out.push({
        // The antiphon is the `Text` column; `Title` is a label, and eleven
        // Easter rows label themselves "- cum alleluia".
        incipit: match.text || match.incipit,
        gabc: rawGabc ? withAnnotation(rawGabc, match.incipit, match.mode) : '',
        mode: match.mode,
        office: 'INV', occasion: match.occasion,
        source: match.gbId > 0 ? 'gregobase' : 'OCO',
        gbId: match.gbId || undefined,
      });
    }
  }
  return out;
}

/**
 * The mode a `IDX_INV.csv` row records → the Gregobase label of the invitatory
 * psalm sung to it.
 *
 * The eleven distinct modes the index uses are `2 3 4 4* 4** 5 6 6* 7 D E`,
 * and Gregobase has a complete Solesmes *Venite exsultemus* for every one of
 * them, labelled by Roman numeral with the asterisks kept and the two
 * letter-modes passed through. These are not tone formulas: each is the whole
 * of Psalm 94 written out with its melody, so the Latin invitatory is engraved
 * as chant with no pointing step.
 */
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export function invitatoryToneLabel(mode: string | undefined): string | null {
  const m = (mode ?? '').trim().match(/^([1-8]|[A-G])(\*{0,2})$/);
  if (!m) return null;
  const stem = /^[1-8]$/.test(m[1]) ? ROMAN[Number(m[1])] : m[1];
  return `Venite exsultemus ${stem}${m[2]}`;
}

/**
 * The Gregobase invitatory psalm for a mode, as GABC.
 *
 * The label must match exactly. Gregobase also carries a second, parallel
 * naming scheme for the same tones — "Venite exsultemus (mode 7a simplex)",
 * "(mode 4g festivus)", "(mode 3f solemnis)" — and a "Venite exsultemus IV*
 * (ad lib)". Those are real alternatives worth offering in the editor one day,
 * but mixing the two schemes silently is how you end up singing a festive tone
 * on a ferial Tuesday. Where a label has more than one entry the lowest id
 * wins, which is the plain Solesmes setting.
 */
export function invitatoryToneByMode(mode: string | undefined): { gabc: string; gbId: number } | null {
  const label = invitatoryToneLabel(mode);
  if (!label) return null;

  const wanted = label.toLowerCase();
  const grego = getGrego();
  const ids = Object.keys(grego)
    .filter(id => grego[id].officePart === 'ps'
      && (grego[id].incipit || '').trim().toLowerCase() === wanted)
    .sort((a, b) => Number(a) - Number(b));

  if (!ids.length) return null;
  return { gabc: grego[ids[0]].gabc, gbId: Number(ids[0]) };
}



/**
 * Direct hymn lookup from INDEX_HYM2.json using the OCO occasion code.
 * Maps ferial occasion codes (e.g. "1H4") to hymn season_code (e.g. "1.3H4").
 * Weeks 1 & 3 share hymns ("1.3"), weeks 2 & 4 share hymns ("2.4").
 */
function hymnByOccasion(occasionCode: string, hour: string, isFirstVespers: boolean = false): GabcCandidate[] {
  let seasonCode = '';

  // 1. Ordinary Time: e.g. "1H4" -> "1.3H4"
  const mH = occasionCode.match(/^(\d)H(\d)$/);
  if (mH) {
    const week  = parseInt(mH[1]);
    const feria = parseInt(mH[2]);
    const pair  = week % 2 === 1 ? '1.3' : '2.4';
    seasonCode = `${pair}H${feria}`;
  }

  // 2. Advent: e.g. "1A2" or "A-17/12"
  else if (occasionCode.startsWith('A-') || occasionCode.includes('12')) {
    seasonCode = 'Adv post 17/12';
  } else if (occasionCode.match(/^\dA\d$/)) {
    seasonCode = 'Adv ante 17/12';
  }

  // 3. Lent: e.g. "1Q2"
  else if (occasionCode.match(/^(\d)Q(\d)$/)) {
    const m = occasionCode.match(/^(\d)Q(\d)$/)!;
    const week = parseInt(m[1]);
    const feria = parseInt(m[2]);
    const offPart = hour.toLowerCase();

    if (feria === 1) {
      if (offPart.includes('laud')) {
        seasonCode = '1-5Q1';
      } else {
        seasonCode = 'Q1';
      }
    } else {
      if (offPart.includes('laud') || offPart.includes('read') || offPart.includes('matin')) {
        seasonCode = '0-5Q2-7';
      } else if (offPart.includes('vesp')) {
        seasonCode = '0-5Q2-6';
      } else if (offPart.includes('compl')) {
        seasonCode = week % 2 === 1 ? '1.3.5Q' : '2.4Q';
      } else {
        seasonCode = 'Q';
      }
    }
  }

  // 4. Easter: e.g. "1P2"
  else if (occasionCode.match(/^(\d)P(\d)$/)) {
    const m = occasionCode.match(/^(\d)P(\d)$/)!;
    const week = parseInt(m[1]);
    const feria = parseInt(m[2]);
    const offPart = hour.toLowerCase();

    if (feria === 1) {
      if (offPart.includes('laud') || offPart.includes('read') || offPart.includes('matin')) {
        seasonCode = 'P2-7 ante Asc';
      } else if (offPart.includes('vesp')) {
        seasonCode = 'P2-6 ante Asc';
      } else if (offPart.includes('compl')) {
        seasonCode = 'PC';
      } else {
        seasonCode = 'P';
      }
    } else {
      if (offPart.includes('compl')) {
        seasonCode = 'PC';
      } else if (offPart.includes('terce') || offPart.includes('sext') || offPart.includes('none')) {
        seasonCode = 'P';
      } else {
        seasonCode = 'P ante Asc';
      }
    }
  }

  // 5. Feast date code: e.g. "22/7" (day/month) — look up directly in INDEX_HYM2.json
  else if (/^\d+\/\d+$/.test(occasionCode)) {
    seasonCode = occasionCode; // Use as-is; INDEX_HYM2.json stores these directly
  }

  if (!seasonCode) return [];

  const validFilters = officeFilters(hour, isFirstVespers);
  const grego = getGrego();

  return getHyms()
    .filter(e =>
      hymnSeasonMatches(e.seasonCode, seasonCode) &&
      officeMatches(e.officePart, validFilters)
    )
    .flatMap(e => {
      const g = grego[e.gregobaseId];
      if (!g?.gabc) return [];
      // Use 'Hymn.' as the annotation label for hymns since gregobase cache
      // does not store mode; the annotation still appears in the rendered SVG.
      return [{
        incipit: e.incipit,
        gabc: withAnnotation(g.gabc, e.incipit, 'Hymn.'),
        office: e.page ? `${e.officePart} (Liber Hymnarius p. ${e.page})` : e.officePart,
        occasion: e.seasonCode,
        source: 'gregobase',
        gbId: e.gregobaseId
      } satisfies GabcCandidate];
    });
}



// ── Public API ────────────────────────────────────────────────────────────────

export async function populateGabc(
  blocks: Block[],
  hour: string,
  occasionCode?: string | null,
  otWeekNum?: number | null,
  liturgicalYear?: 'a' | 'b' | 'c',
  ferialCode?: string | null,
  occasionOverride?: string | null,
  isSaturday: boolean = false,
  isFirstVespers: boolean = false,
  /**
   * The `IDX_INV.csv` codes to try for the invitatory, most specific first —
   * `invitatoryOccasionCodes(context)`. That index uses a code shape of its
   * own, so `occasionCode` reaches it on almost no day of the year; callers
   * that do not pass this get the old behaviour, which is that one code.
   */
  invitatoryCodes?: string[] | null
): Promise<Block[]> {

  let finalOccasion = occasionOverride || occasionCode;
  let ocoAntiphons = finalOccasion ? antsByOccasion(finalOccasion, hour, isFirstVespers) : null;

  if (ocoAntiphons && ocoAntiphons.length > 0) {
    console.log(`[OCO] Direct occasion lookup "${finalOccasion}" → ${ocoAntiphons.length} antiphons`);
  }

  // Update occasionCode to be the final resolved one so downstream functions (like hymnByOccasion) use it too
  occasionCode = finalOccasion;

  // Sunday Magnificat/Benedictus candidates for this OT week (Lauds/Vespers only)
  const sunCandidates = (otWeekNum && liturgicalYear)
    ? sundayMagBenCandidates(otWeekNum, liturgicalYear, hour, isFirstVespers)
    : [];
  if (sunCandidates.length) {
    console.log(`[OCO] Sunday ${otWeekNum}D Year ${liturgicalYear?.toUpperCase()} → ${sunCandidates.length} Mag/Ben candidates`);
  }

  // Identify the Gospel Canticle antiphon: the first antiphon block that comes
  // AFTER the "GOSPEL CANTICLE" / "MAGNIFICAT" / "BENEDICTUS" heading.
  let magBenBlockId: string | null = null;
  let foundCanticleHeading = false;
  for (const b of blocks) {
    if (b.type === 'heading' || b.type === 'subheading') {
      const up = b.content.toUpperCase();
      if (up.includes('GOSPEL CANTICLE') || up.includes('CANTICLE OF MARY') ||
          up.includes('CANTICLE OF ZECHARIAH') || up.includes('MAGNIFICAT') ||
          up.includes('BENEDICTUS')) {
        foundCanticleHeading = true;
      }
    }
    if (foundCanticleHeading && b.type === 'antiphon' && !b.gabcScore) {
      magBenBlockId = b.id;
      break;
    }
  }
  // Fallback: last antiphon block
  if (!magBenBlockId) {
    const lastAnt = [...blocks].reverse().find(b => b.type === 'antiphon' && !b.gabcScore);
    if (lastAnt) magBenBlockId = lastAnt.id;
  }
  console.log(`[OCO] Mag/Ben block id: ${magBenBlockId ?? 'none'}`);

  // Split OCO antiphons into psalm-position entries (1,2,3) and the Mag/Ben (M or B).
  // ocoAntiphons already contains only the place-indexed antiphons via antsByOccasion();
  // the Mag/Ben fallback is handled separately via ocoMagBen.
  // Re-fetch OCO entries specifically for Mag/Ben/Nunc if available
  const ocoMagBen = occasionCode
    ? getAnts()
        .filter(e => (e.occasion === occasionCode || (hour.toLowerCase().includes('compline') && e.occasion === 'H0-7')) && 
                     /^[MB]|Nunc/.test(e.place.trim()) &&
                     officeMatches(e.office, officeFilters(hour, isFirstVespers)))
        .flatMap(e => { const g = resolveGabc(e.gbId, e.gabc) || ''; const annotated = g ? withAnnotation(g, e.incipit, e.mode) : ''; return [{ incipit: e.incipit, gabc: annotated, mode: e.mode, office: e.office, occasion: e.occasion, source: (e.gbId > 0 ? 'gregobase' : 'OCO') as 'gregobase'|'OCO', gbId: e.gbId || undefined } satisfies GabcCandidate]; })
    : null;

  let antIdx = 0, hymIdx = 0;
  let ocoIdx = 0;
  const seenAntiphons: Record<string, { gabcScore?: string, gabcCandidates?: GabcCandidate[] }> = {};
  const seenInvitatories: Record<string, { gabcScore?: string, gabcCandidates?: GabcCandidate[] }> = {};

  return blocks.map(block => {
    if (block.type !== 'antiphon' && block.type !== 'hymn' && block.type !== 'invitatory-antiphon') return block;

    if (block.type === 'invitatory-antiphon') {
       const normText = block.content.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);
       if (block.gabcScore) {
          seenInvitatories[normText] = { gabcScore: block.gabcScore, gabcCandidates: block.gabcCandidates };
          return block;
       }
       if (seenInvitatories[normText]) return { ...block, ...seenInvitatories[normText] };

       const codes = invitatoryCodes?.length ? invitatoryCodes
         : (occasionCode ? [occasionCode] : []);
       const cands = codes.length ? invByOccasion(codes) : [];
       if (cands.length > 0) {
          console.log(`[OCO] INV ${cands.length} candidate(s) for ${codes.join(' → ')}`);
       } else if (codes.length) {
          console.log(`[OCO] INV no antiphon for ${codes.join(' → ')}`);
       }



       const result = { ...block, gabcCandidates: cands.length > 0 ? cands : undefined };
       if (cands.length === 1) {
          result.gabcScore = cands[0].gabc;
          result.gabcCandidates = undefined;
       }
       seenInvitatories[normText] = { gabcScore: result.gabcScore, gabcCandidates: result.gabcCandidates };
       return result;
    }

    if (block.type === 'antiphon') {
      const isLastAnt = block.id === magBenBlockId;
      const normText = block.content.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50);

      if (block.gabcScore) {
        seenAntiphons[normText] = { gabcScore: block.gabcScore, gabcCandidates: block.gabcCandidates };
        return block;
      }

      // If we've already mapped this antiphon text earlier, reuse the same mapping!
      if (seenAntiphons[normText]) {
        console.log(`[OCO] ANT repeated, reusing mapping for "${normText}"`);
        return { ...block, ...seenAntiphons[normText] };
      }

      const cacheAndReturn = (newBlock: any) => {
        seenAntiphons[normText] = { gabcScore: newBlock.gabcScore, gabcCandidates: newBlock.gabcCandidates };
        return newBlock;
      };

      // ── Magnificat / Benedictus block: use Sunday candidates + ferial option ──
      if (isLastAnt) {
        const ferial = ocoMagBen?.[0] ?? null;
        if (sunCandidates.length > 0) {
          const all = ferial ? [...sunCandidates, ferial] : sunCandidates;
          console.log(`[OCO] Mag/Ben ${all.length} candidates (${sunCandidates.length} Sunday + ${ferial ? 1 : 0} ferial)`);
          return cacheAndReturn({ ...block, gabcCandidates: all });
        }
        if (ferial) {
          console.log(`[OCO] Mag/Ben ferial-only "${ferial.incipit.slice(0,40)}"`);
          return cacheAndReturn({ ...block, gabcScore: ferial.gabc });
        }
        // Fall through to text-match if neither
      }

      // ── Psalm antiphons: OCO assignment using place metadata with sequential fallback ──────────
      if (ocoAntiphons && !isLastAnt) {
        if (block.place) {
          let candidates = ocoAntiphons.filter(e => e.place?.trim() === block.place);
          
          // Per-place fallback to psalter (ferialCode) if proper occasion lacks the antiphon
          if (candidates.length === 0 && ferialCode && ferialCode !== occasionCode) {
            const ferialAntiphons = antsByOccasion(ferialCode, hour, isFirstVespers);
            candidates = ferialAntiphons.filter(e => e.place?.trim() === block.place);
            if (candidates.length > 0) {
              console.log(`[OCO] ANT place ${block.place} not found in ${occasionCode}, falling back to ${ferialCode}`);
            }
          }

          if (candidates.length === 1) {
            antIdx++;
            console.log(`[OCO] ANT direct "${candidates[0].incipit.slice(0,50)}" (place: ${block.place})`);
            return cacheAndReturn({ ...block, gabcScore: candidates[0].gabc, gabcCandidates: undefined });
          } else if (candidates.length > 1) {
            antIdx++;
            console.log(`[OCO] ANT ${candidates.length} direct candidates for place ${block.place}`);
            return cacheAndReturn({ ...block, gabcCandidates: candidates });
          }
          // place provided but no OCO match found — fall through to text-match
        } else {
          const candidate = ocoAntiphons[ocoIdx++];
          if (candidate) {
            antIdx++;
            console.log(`[OCO] ANT direct "${candidate.incipit.slice(0,50)}" (place: fallback)`);
            return cacheAndReturn({ ...block, gabcScore: candidate.gabc, gabcCandidates: undefined });
          }
        }
      }

      // ── No OCO match found ──────────────────────────────────────────────────
      // The dataset (IDX_ANT.csv) does not contain a specific antiphon for this place,
      // or we lack the occasion code. We strictly rely on the determinism of the OCO;
      // if it's not mapped, we return the text without hallucinating a fuzzy match.
      console.log(`[OCO] ANT ✗ missing from dataset for place ${block.place ?? 'unknown'}`);
      antIdx++;
      return cacheAndReturn(block);
    }

    if (block.type === 'hymn') {
      // ── Path 1: direct OCO lookup by occasion code (authoritative) ───────────
      // The OCO directly prescribes the hymn — do not fall back to fuzzy matching.
      if (occasionCode) {
        const ocoHymns = hymnByOccasion(occasionCode, hour, isFirstVespers);
        if (ocoHymns.length === 1) {
          console.log(`[OCO] HYM direct "${ocoHymns[0].incipit.slice(0,40)}"`);
          return { ...block, gabcScore: ocoHymns[0].gabc, gabcCandidates: undefined };
        }
        if (ocoHymns.length > 1) {
          console.log(`[OCO] HYM ${ocoHymns.length} direct candidates`);
          return { ...block, gabcCandidates: ocoHymns };
        }
        // OCO prescribed a specific hymn but GABC not in cache — return text-only, no guessing
        console.log(`[OCO] HYM ✗ no GABC cached for occasion "${occasionCode}" — text only`);
        return block;
      }

      // ── Path 2: No occasion code ─────────────────────────────────────────────
      // We strictly rely on the determinism of the OCO.
      // If we don't have an occasion code, we return the text without a fuzzy match.
      console.log(`[OCO] HYM ✗ no occasion code to lookup hymn`);
      return block;
    }

    return block;
  });
}
