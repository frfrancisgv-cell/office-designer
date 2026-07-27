/**
 * psalm-tone-engine.ts
 *
 * Server-side Gregorian psalm tone pointing engine.
 * Ports the essential logic of bbloomf/jgabc without DOM/localStorage deps.
 *
 * HEMISTICH & COLON STRUCTURE FOR ENGLISH PSALMS (Revised Grail / Abbey):
 *   In English psalmody, EACH LINE in a verse block is a single colon (half-line of chant).
 *   Lines are NOT combined across line breaks into multi-line strings.
 *
 *   Stanza colon mapping:
 *     1-line stanza  → line1 (termination/plain)
 *     2-line stanza  → line1 * \n line2                (mediant + termination)
 *     3-line stanza  → line1 † \n line2 * \n line3      (flex + mediant + termination)
 *     4-line stanza  → line1 * \n line2 \n line3 * \n line4  (two 2-line verses: 2+2)
 *     5-line stanza  → line1 † \n line2 * \n line3 \n line4 * \n line5 (3+2)
 *     6-line stanza  → line1 * \n line2 \n line3 * \n line4 \n line5 * \n line6 (2+2+2)
 *
 * POINTING ALGORITHM:
 *   1. Parse GABC tone string → { accents, preparatory } counts
 *      - Accents = note groups with '
 *      - Preparatory = note groups BETWEEN reciting tenor and first accent
 *      - Post-accentual notes (after last accent) do NOT count as preparatory
 *   2. If text has no markers (* / †), inferMediants() inserts them per line structure.
 *   3. Process line-by-line: each colon is pointed independently with its assigned cadence.
 *   4. Syllabification uses Hypher (TeX Liang) while preserving acute-accent stress marks.
 */

const Hypher = require('hypher');
const enUs = require('hyphenation.en-us');
const la = require('hyphenation.la');


const hypherEn = new Hypher(enUs);
const hypherLa = new Hypher(la);

import { PSALM_TONES, ToneSpec } from './tone-data';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GabcToneCounts {
  accents: number;
  preparatory: number;
  tenor: string;
}

interface Syll {
  text: string;
  isStressed: boolean;  // acute-accent mark from lypsautierant
  isGap: boolean;       // space / punctuation / verse number — not a syllable
}

// ─── GABC Tone String Parser ─────────────────────────────────────────────────

/**
 * Parse accents and preparatory count from a jgabc GABC tone sub-string.
 *
 * In Gregorian chant GABC specs:
 *   - Note groups containing ' are ACCENTS.
 *   - PREPARATORY notes are note groups BETWEEN the reciting tenor and the accent.
 *   - Post-accentual note groups (notes following the final accent) are for syllables
 *     following the main accent; they are NOT preparatory syllables before the accent.
 */
export function parseGabcToneCounts(gabc: string): GabcToneCounts {
  if (!gabc) return { accents: 0, preparatory: 0, tenor: 'h' };

  const clean = gabc.replace(/\.+$/, '').trim();
  const groups = clean.split(/\s+/).filter(Boolean);

  let accents = 0;
  let preparatory = 0;
  let tenor = 'h';

  // Find reciting tenor group (first group with 'r', e.g. hr, jr, ir, er, dr)
  let tenorIdx = -1;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (/^[a-m]r/i.test(g) || (g.includes('r') && !g.includes("'"))) {
      tenorIdx = i;
      const m = g.match(/^[a-m]/i);
      if (m) tenor = m[0];
      break;
    }
  }

  // Scan right-to-left
  let state: 'after_accent' | 'preparatory' | 'done' = 'after_accent';

  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];

    if (g.includes("'")) {
      accents++;
      state = 'preparatory';
      continue;
    }

    if (state === 'preparatory') {
      if (i === tenorIdx || (tenorIdx >= 0 && i < tenorIdx)) {
        state = 'done';
        break;
      }
      if (/[a-m]/i.test(g)) {
        preparatory++;
      }
    }
  }

  return { accents, preparatory, tenor };
}

// ─── Syllabification ─────────────────────────────────────────────────────────

const ACUTE_VOWEL_RE = /[áéíóúÁÉÍÓÚ]/;

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const ENGLISH_PSALM_DICT: Record<string, string[]> = {
  'remembering': ['re', 'mem', 'bering'], 'remémbering': ['re', 'mém', 'bering'],
  'remember': ['re', 'mem', 'ber'], 'remémber': ['re', 'mém', 'ber'],
  'remembered': ['re', 'mem', 'bered'], 'remémbered': ['re', 'mém', 'bered'],
  'gathering': ['gath', 'ering'], 'gáthering': ['gáth', 'ering'],
  'offering': ['of', 'fering'], 'óffering': ['óf', 'fering'],
  'offerings': ['of', 'ferings'], 'ófferings': ['óf', 'ferings'],
  'suffering': ['suf', 'fering'], 'súffering': ['súf', 'fering'],
  'sufferings': ['suf', 'ferings'], 'súfferings': ['súf', 'ferings'],
  'natural': ['nat', 'ural'], 'nátural': ['nát', 'ural'],
  'several': ['sev', 'eral'], 'séveral': ['sév', 'eral'],
  'general': ['gen', 'eral'], 'géneral': ['gén', 'eral'],
  'cultural': ['cul', 'tural'], 'cúltural': ['cúl', 'tural'],
  'pastoral': ['pas', 'toral'], 'pástoral': ['pás', 'toral'],
  'every': ['ev', 'ery'], 'évery': ['év', 'ery'],
  'tongue': ['tongue'], 'tongues': ['tongues'], 'tóngue': ['tóngue'], 'tóngues': ['tóngues'],
  'zion': ['zi', 'on'], 'zíon': ['zí', 'on'], 'sion': ['si', 'on'], 'síon': ['sí', 'on'],



  'israel': ['is', 'ra', 'el'], 'ísrael': ['ís', 'ra', 'el'],
  'jerusalem': ['je', 'ru', 'sa', 'lem'], 'jerúsalem': ['je', 'rú', 'sa', 'lem'],
  'babylon': ['bab', 'y', 'lon'], 'bábylon': ['báb', 'y', 'lon'],
  'blessed': ['bles', 'sed'], 'blessèd': ['bles', 'sèd'], 'blesséd': ['blés', 'sed'],
  'scorners': ['scor', 'ners'], 'scorner': ['scor', 'ner'],
  'abides': ['a', 'bides'], 'abide': ['a', 'bide'],
  'ever': ['ev', 'er'], 'forever': ['for', 'ev', 'er'],
  'rebel': ['reb', 'el'], 'rebels': ['reb', 'els'],
  'righteous': ['righ', 'teous'], 'righteousness': ['righ', 'teous', 'ness'],
  'enemy': ['en', 'e', 'my'], 'enemies': ['en', 'e', 'mies'],
  'holy': ['ho', 'ly'], 'glory': ['glo', 'ry'], 'mercy': ['mer', 'cy'],
  'father': ['fa', 'ther'], 'spirit': ['spi', 'rit'],
  'heavens': ['heav', 'ens'], 'heaven': ['heav', 'en'],
  'majestic': ['ma', 'jes', 'tic'], 'majesty': ['ma', 'jes', 'ty'],
  'children': ['chil', 'dren'], 'peoples': ['peo', 'ples'], 'nations': ['na', 'tions'],
  'fetters': ['fet', 'ters'], 'counsel': ['coun', 'sel'], 'company': ['com', 'pa', 'ny'],
  'salvation': ['sal', 'va', 'tion'], 'delight': ['de', 'light'], 'ponders': ['pon', 'ders'],
  'conspire': ['con', 'spire'], 'shatter': ['shat', 'ter'], 'shattered': ['shat', 'tered'],
  'truest': ['tru', 'est'], 'highest': ['high', 'est'], 'lowest': ['low', 'est'],
  'power': ['pow', 'er'], 'powers': ['pow', 'ers'], 'prayer': ['pray', 'er'], 'prayers': ['pray', 'ers'],
  'shelter': ['shel', 'ter'], 'refuge': ['ref', 'uge'], 'fortress': ['for', 'tress'],
  'deliver': ['de', 'liv', 'er'], 'deliverer': ['de', 'liv', 'er', 'er'], 'deliverance': ['de', 'liv', 'er', 'ance'],
  'blessing': ['bless', 'ing'], 'blessings': ['bless', 'ings'],
  'lovingkindness': ['lov', 'ing', 'kind', 'ness'], 'steadfast': ['stead', 'fast'], 'faithfulness': ['faith', 'ful', 'ness'],
  'assembly': ['as', 'sem', 'bly'], 'heritage': ['her', 'i', 'tage'], 'possession': ['pos', 'ses', 'sion'],
  'exult': ['ex', 'ult'], 'trembling': ['trem', 'bling'], 'blazing': ['bla', 'zing'],
  'dishonored': ['dis', 'hon', 'ored'], 'futile': ['fu', 'tile'], 'wonders': ['won', 'ders'],
  'faithful': ['faith', 'ful'], 'sacrifice': ['sac', 'ri', 'fice'], 'increase': ['in', 'crease'],
  'asleep': ['a', 'sleep'], 'safety': ['safe', 'ty'], 'anguish': ['an', 'guish'],
  'torment': ['tor', 'ment'], 'reproach': ['re', 'proach'], 'grief': ['grief'],
  'trouble': ['trou', 'ble'], 'lament': ['la', 'ment'], 'darkness': ['dark', 'ness'],
  'light': ['light'], 'stronghold': ['strong', 'hold'], 'chaff': ['chaff'], 'wind': ['wind'],
  'wicked': ['wick', 'ed'], 'sinners': ['sin', 'ners'], 'scorn': ['scorn'], 'law': ['law'],
  'day': ['day'], 'night': ['night'], 'tree': ['tree'], 'planted': ['plant', 'ed'],
  'streams': ['streams'], 'water': ['wa', 'ter'], 'yields': ['yields'], 'fruit': ['fruit'],
  'season': ['sea', 'son'], 'leaves': ['leaves'], 'wither': ['with', 'er'], 'prospers': ['pros', 'pers']
};

/** Split English word into phonetic singing syllables. */
export function englishPhoneticSyllabify(word: string): string[] {
  if (!word) return [];
  const clean = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (ENGLISH_PSALM_DICT[clean]) {
    const parts = ENGLISH_PSALM_DICT[clean];
    const res: string[] = [];
    let pos = 0;
    for (const p of parts) {
      res.push(word.slice(pos, pos + p.length));
      pos += p.length;
    }
    if (pos < word.length) res[res.length - 1] += word.slice(pos);
    return res;
  }

  // Silent 'ue' / 'ues' check: words like tongue, tongues, plague, plagues, rogue, vague, league
  if (/(?:ng|g|q)ues?$/i.test(clean)) {
    return [word];
  }


  // Handle monosyllables with silent e/es/ed
  if (/^[b-df-hj-np-tv-z]*[aeiouy]+[b-df-hj-np-tv-z]+e$/i.test(clean) ||
      /^[b-df-hj-np-tv-z]*[aeiouy]+[b-df-hj-np-tv-z]+es$/i.test(clean) ||
      /^[b-df-hj-np-tv-z]*[aeiouy]+[b-df-hj-np-tv-z]+ed$/i.test(clean)) {
    return [word];
  }

  // Compound prefix rules e.g. with-in, with-out, with-hold, with-held, with-drawn
  if (/^with(in|out|hold|held|drawn|stand)/i.test(clean)) {
    const p1 = word.slice(0, 4);
    const p2 = englishPhoneticSyllabify(word.slice(4));
    return [p1, ...p2];
  }

  // Phonetic nucleus syllabifier
  const vowelPattern = /[aeiouy]+(?:[aeiouy]+)?/gi;
  let tempWord = clean;
  if (/[b-df-hj-np-tv-z]e$/i.test(tempWord) && !/[aeiouy]{2}e$/i.test(tempWord)) tempWord = tempWord.slice(0, -1);
  if (/[b-df-hj-np-tv-z]es$/i.test(tempWord) && !/[csz]|x|ch|sh/i.test(tempWord.slice(0, -2))) tempWord = tempWord.slice(0, -2);
  if (/[b-df-hj-np-tv-z]ed$/i.test(tempWord) && !/[td]/i.test(tempWord.slice(0, -2))) tempWord = tempWord.slice(0, -2);

  const matches: Array<{ index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = vowelPattern.exec(tempWord)) !== null) {
    matches.push({ index: m.index, length: m[0].length });
  }

  if (matches.length <= 1) return [word];

  const sylls: string[] = [];
  let lastEnd = 0;
  for (let i = 0; i < matches.length - 1; i++) {
    const currV = matches[i];
    const nextV = matches[i + 1];
    const consBetween = clean.slice(currV.index + currV.length, nextV.index);

    let splitOffset = Math.floor(consBetween.length / 2);
    if (consBetween.length >= 2) splitOffset = 1;

    // Digraph rule: keep 'th', 'sh', 'ch', 'ph', 'wh' together
    if (consBetween.length >= 2 && /^(th|sh|ch|ph|wh)/i.test(consBetween)) {
      splitOffset = 0; // Digraph stays together at onset of next syllable
    }

    const cutPoint = currV.index + currV.length + splitOffset;
    sylls.push(word.slice(lastEnd, cutPoint));
    lastEnd = cutPoint;
  }
  sylls.push(word.slice(lastEnd));
  return sylls;
}

/** Split a clean word token into syllables using English phonetic syllabifier or Latin Hypher. */
export function syllabifyWord(word: string, lang: 'en' | 'la'): string[] {
  if (!word) return [];
  if (lang === 'en') {
    return englishPhoneticSyllabify(word);
  }

  const stripped = stripDiacritics(word).toLowerCase();
  let parts: string[];
  try {
    parts = hypherLa.hyphenate(stripped) as string[];
  } catch {
    parts = [stripped];
  }
  if (!parts?.length) parts = [stripped];

  const result: string[] = [];
  let pos = 0;
  for (const p of parts) {
    result.push(word.slice(pos, pos + p.length));
    pos += p.length;
  }
  if (pos < word.length) {
    if (result.length) result[result.length - 1] += word.slice(pos);
    else result.push(word.slice(pos));
  }
  return result.filter(Boolean);
}


const ENGLISH_STRESS_DICT: Record<string, boolean[]> = {
  'zion': [true, false], 'sions': [true, false], 'zíon': [true, false],
  'jerusalem': [false, false, true, false], 'jerúsalem': [false, false, true, false],
  'babylon': [true, false, false], 'bábylon': [true, false, false],
  'remembering': [false, true, false], 'remémbering': [false, true, false], 'remember': [false, true, false],

  'natural': [true, false], 'nátural': [true, false],
  'several': [true, false], 'séveral': [true, false],
  'general': [true, false], 'géneral': [true, false],
  'forget': [false, true], 'wither': [true, false], 'rivers': [true, false],

  'tongue': [true], 'tongues': [true], 'tóngue': [true], 'tóngues': [true],
  'cleave': [true], 'roof': [true], 'heavens': [true, false], 'heaven': [true, false],
  'blessed': [true, false], 'counsel': [true, false], 'wicked': [true, false],
  'sinners': [true, false], 'scorners': [true, false], 'company': [true, false, false],
  'delight': [false, true], 'ponders': [true, false], 'salvation': [false, true, false],
  'righteous': [true, false], 'righteousness': [true, false, false],
  'lovingkindness': [true, false, true, false], 'faithfulness': [true, false, false],
  'steadfast': [true, false], 'deliver': [false, true, false],
  'deliverer': [false, true, false, false], 'deliverance': [false, true, false],
  'majestic': [false, true, false], 'majesty': [true, false, false],
  'children': [true, false], 'peoples': [true, false], 'nations': [true, false],
  'glory': [true, false], 'holy': [true, false], 'mercy': [true, false],
  'father': [true, false], 'spirit': [true, false]
};

const FUNCTIONAL_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'with', 'from',
  'by', 'or', 'nor', 'but', 'if', 'then', 'so', 'as', 'my', 'your', 'his', 'her',
  'its', 'our', 'their', 'this', 'that', 'these', 'those', 'it', 'he', 'she', 'we',
  'they', 'you', 'me', 'him', 'us', 'them'
]);

/** Infer primary word stress for unaccented English words. */
function inferEnglishWordStress(word: string, sylls: string[]): boolean[] {
  const clean = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  if (ENGLISH_STRESS_DICT[clean]) return ENGLISH_STRESS_DICT[clean];
  if (sylls.length === 1) return [!FUNCTIONAL_WORDS.has(clean)];
  const res = new Array(sylls.length).fill(false);
  if (sylls.length === 2) res[0] = true;
  else res[Math.max(0, sylls.length - 2)] = true;
  return res;
}

/** Tokenise a line of text into Syll objects (syllables + gaps). */
function tokeniseSylls(text: string, lang: 'en' | 'la'): Syll[] {
  // Match word characters (letters including acute accents, plus internal apostrophe/hyphen)
  const wordRe = /([a-zA-ZÀ-ÖØ-öø-ÿáéíóúÁÉÍÓÚ]+(?:['′-][a-zA-ZÀ-ÖØ-öø-ÿáéíóúÁÉÍÓÚ]+)?)/g;
  const result: Syll[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  const hasExplicitAccents = ACUTE_VOWEL_RE.test(text);

  while ((m = wordRe.exec(text)) !== null) {
    if (m.index > last) {
      result.push({ text: text.slice(last, m.index), isStressed: false, isGap: true });
    }
    const rawWord = m[0];
    const wordSylls = syllabifyWord(rawWord, lang);

    if (hasExplicitAccents || lang === 'la') {
      for (const p of wordSylls) {
        result.push({ text: p, isStressed: ACUTE_VOWEL_RE.test(p), isGap: false });
      }
    } else {
      const stresses = inferEnglishWordStress(rawWord, wordSylls);
      for (let k = 0; k < wordSylls.length; k++) {
        result.push({ text: wordSylls[k], isStressed: !!stresses[k], isGap: false });
      }
    }
    last = m.index + rawWord.length;
  }
  if (last < text.length) {
    result.push({ text: text.slice(last), isStressed: false, isGap: true });
  }
  return result;
}


// ─── Accent Placement ─────────────────────────────────────────────────────────

function pickAccents(
  sylls: Syll[],
  counts: GabcToneCounts,
): { boldSet: Set<number>; italicSet: Set<number> } {
  const boldSet = new Set<number>();
  const italicSet = new Set<number>();

  const realIdx = sylls
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.isGap)
    .map(({ i }) => i);

  if (!realIdx.length || counts.accents === 0) return { boldSet, italicSet };

  const hasAcute = realIdx.some(i => sylls[i].isStressed);

  if (hasAcute) {
    // ── Lypsautierant / Latin mode: use acute-accent marks ───────────────────────────
    const stressed = realIdx.filter(i => sylls[i].isStressed);
    const accentTargets = stressed.slice(-counts.accents);
    for (const i of accentTargets) {
      boldSet.add(i);
      // Dactylic white-note check for 3+ syllable proparoxytone words (e.g. Dó-mi-ni, ré-spi-cit, ex-áu-di)
      const realPos = realIdx.indexOf(i);
      if (realPos + 1 < realIdx.length) {
        const nextIdx = realIdx[realPos + 1];
        if (!sylls[nextIdx].isStressed && !sylls[nextIdx].isGap && !boldSet.has(nextIdx)) {
          // Check if syllable is part of the same word (no space separator)
          if (!/\s/.test(sylls[i].text) && !/^\s/.test(sylls[nextIdx].text)) {
            // Check if word has 3+ syllables (proparoxytone dactyl)
            boldSet.add(nextIdx);
          }
        }
      }
    }

    if (accentTargets.length > 0 && counts.preparatory > 0) {
      const firstBoldPos = realIdx.indexOf(accentTargets[0]);
      for (let p = 1; p <= counts.preparatory; p++) {
        const pos = firstBoldPos - p;
        if (pos >= 0 && !boldSet.has(realIdx[pos])) {
          italicSet.add(realIdx[pos]);
        }
      }
    }
  } else {
    // ── Positional fallback (count from right) ───────────────────────────────
    const n = realIdx.length;
    const total = counts.accents + counts.preparatory;
    if (n < total) {
      for (let i = Math.max(0, n - counts.accents); i < n; i++) boldSet.add(realIdx[i]);
      return { boldSet, italicSet };
    }
    const boldStart = n - counts.accents;
    for (let i = boldStart; i < n; i++) boldSet.add(realIdx[i]);
    for (let p = 1; p <= counts.preparatory; p++) {
      const pos = boldStart - p;
      if (pos >= 0 && !boldSet.has(realIdx[pos])) {
        italicSet.add(realIdx[pos]);
      }
    }
  }

  return { boldSet, italicSet };
}


// ─── Single Line / Hemistich Pointing ─────────────────────────────────────────

/**
 * Point a single line/colon of psalm text.
 * Syllabifies the line, places accent and preparatory tags, and assembles HTML.
 */
export function pointHemistich(text: string, counts: GabcToneCounts, lang: 'en' | 'la'): string {
  if (!text.trim()) return text;

  const sylls = tokeniseSylls(text, lang);
  const { boldSet, italicSet } = pickAccents(sylls, counts);

  const out: string[] = [];
  for (let i = 0; i < sylls.length; i++) {
    const s = sylls[i];
    if (boldSet.has(i)) out.push(`<strong>${s.text}</strong>`);
    else if (italicSet.has(i)) out.push(`<em>${s.text}</em>`);
    else out.push(s.text);
  }
  return out.join('');
}

// ─── Mediant / Flex Inference ─────────────────────────────────────────────────

/**
 * Insert * and † markers into unmarked psalm text (lypsautierant format).
 *
 * Stich rules for English psalmody (Revised Grail / Abbey):
 *   1 line  → no marker (single colon / header)
 *   2 lines → line 0 * \n line 1
 *   3 lines → line 0 † \n line 1 * \n line 2
 *   4 lines → line 0 * \n line 1 \n line 2 * \n line 3    (two 2-line verses)
 *   5 lines → line 0 † \n line 1 * \n line 2 \n line 3 * \n line 4 (3 + 2)
 *   6 lines → line 0 * \n line 1 \n line 2 * \n line 3 \n line 4 * \n line 5 (2 + 2 + 2)
 */
export function inferMediants(text: string): string {
  // Split at blank lines (\n{2,}), keeping the separators
  const parts = text.split(/(\n{2,})/);

  return parts.map((part, idx) => {
    // Odd indices are blank-line separators
    if (idx % 2 === 1) return part;

    // If stanza already contains explicit markers, do not modify
    if (part.includes('*') || part.includes('†')) return part;

    const lines = part.split('\n');

    // Find indices of non-empty lines in this stanza
    const nonEmptyIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim()) nonEmptyIndices.push(i);
    }

    const n = nonEmptyIndices.length;
    if (n <= 1) return part; // 0 or 1 line -> leave as-is

    const isOdd = n % 2 === 1;

    for (let k = 0; k < n; k++) {
      const lineIdx = nonEmptyIndices[k];

      if (isOdd) {
        if (k === 0) {
          lines[lineIdx] = lines[lineIdx].trimEnd() + ' †';
        } else if (k % 2 === 1) {
          lines[lineIdx] = lines[lineIdx].trimEnd() + ' *';
        }
      } else {
        if (k % 2 === 0) {
          lines[lineIdx] = lines[lineIdx].trimEnd() + ' *';
        }
      }
    }

    return lines.join('\n');
  }).join('');
}

// ─── Full Psalm Pointing ───────────────────────────────────────────────────────

export interface PointingParams {
  text: string;
  tone?: string;
  variant?: string;
  customMediant?: string;
  customTermination?: string;
  lang: 'en' | 'la';
  solemn?: boolean;
}

/**
 * Strip all HTML pointing tags (<strong>, <em>) and clean up formatting.
 */
export function stripPointing(text: string): string {
  if (!text) return '';
  return text
    .replace(/<\/?(strong|em|b|i)[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, '\u00a0');
}

/**
 * Point an entire psalm block using Gregorian tone cadences.
 *
 * Each line is a colon of psalm text and is pointed independently:
 *   - Line with † → pointed as Flex (1 accent, 0 prep)
 *   - Line with * → pointed as Mediant
 *   - Line without marker → pointed as Termination
 *
 * When text has NO * or † markers (lypsautierant format), inferMediants() is
 * called first to assign * and † markers line by line.
 */
export function pointPsalm(params: PointingParams): string {
  const { text, tone, variant = '', customMediant, customTermination, lang, solemn = false } = params;
  const spec: ToneSpec | undefined = tone ? PSALM_TONES[tone] : undefined;

  const mediStr = customMediant
    || ((solemn && spec?.solemn) ? spec.solemn : spec?.mediant)
    || '';
  const termStr = customTermination
    || (spec?.terminations
      ? (spec.terminations[variant] ?? Object.values(spec.terminations)[0] ?? spec.mediant)
      : spec?.termination)
    || mediStr;

  if (!mediStr && !termStr) return text;

  const mediCounts = parseGabcToneCounts(mediStr);
  const termCounts = parseGabcToneCounts(termStr);
  const flexCounts: GabcToneCounts = { accents: 1, preparatory: 0, tenor: mediCounts.tenor };

  // Strip existing HTML markup cleanly
  let plain = stripPointing(text);


  // If text has no markers (* / †), infer them stanza by stanza
  if (!plain.includes('*') && !plain.includes('†')) {
    plain = inferMediants(plain);
  }

  // Point line-by-line
  const lines = plain.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      result.push(line);
      continue;
    }

    // Skip title lines (e.g. "Psalm 1", "Alleluia!")
    if (/^Psalm \d+/i.test(line.trim()) || /^Alleluia!$/i.test(line.trim())) {
      result.push(line);
      continue;
    }

    if (line.includes('†')) {
      const parts = line.split('†');
      const before = pointHemistich(parts[0], flexCounts, lang);
      const after = parts.slice(1).join('†');
      if (after.trim()) {
        result.push(before + ' † ' + pointHemistich(after, mediCounts, lang));
      } else {
        result.push(before + ' †');
      }
      continue;
    }

    if (line.includes('*')) {
      const parts = line.split('*');
      const before = pointHemistich(parts[0], mediCounts, lang);
      const after = parts.slice(1).join('*');
      if (after.trim()) {
        result.push(before + ' * ' + pointHemistich(after, termCounts, lang));
      } else {
        result.push(before + ' *');
      }
      continue;
    }

    // Line without marker -> Termination cadence
    result.push(pointHemistich(line, termCounts, lang));
  }

  return result.join('\n');
}
