/**
 * psalm-tone-engine.ts
 *
 * Server-side Gregorian psalm tone pointing.
 *
 * This is not a second implementation of jgabc. psalmtone.js — bbloomf's
 * file, vendored at the repo root — reads the formulas and points the Latin;
 * what lives here is the structure around it: which cadence each colon of
 * each line gets, and an English path for text jgabc cannot syllabify.
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
 *   1. Read the formula with psalmtone.js's getGabcTones → how many accents,
 *      how many preparatory syllables lead into them, how many syllables
 *      follow the last one, how long the intonation is.
 *   2. If text has no markers (* / †), inferMediants() inserts them per line structure.
 *   3. Process line-by-line: each colon is pointed independently with its
 *      assigned cadence — flex before †, mediant before *, termination after.
 *   4. Latin colons go to psalmtone.js's addBoldItalic, over the same
 *      regexLatin syllables the engraved score is laid out on. English goes
 *      to pickAccents, which applies the identical placement rule to
 *      syllables from ./english-phonetic; jgabc cannot do that job, because
 *      it syllabifies English with Hypher and wants the accents marked with
 *      `*` inside the words.
 */

import { PSALM_TONES } from './tone-data';
import type { ToneSpec } from './tone-data';
import { getGabcTones, addBoldItalic } from './psalmtone-wrapper';

import { englishPhoneticSyllabify, inferEnglishWordStress } from './english-phonetic';
// stripPointing lives in ./strip so client code can use it without pulling
// this module in — it reads psalmtone.js off disk at import time.
import { stripPointing } from './strip';
export { stripPointing };
// ─── Types ────────────────────────────────────────────────────────────────────

export interface GabcToneCounts {
  accents: number;
  preparatory: number;
  /**
   * Syllables the formula spends after its last accent. On a formula that
   * ends on an unaccented note the final accent is not the final syllable,
   * and the cadence has to be counted in from the end by this much before
   * the accents are placed at all.
   */
  afterLastAccent: number;
  tenor: string;
  /**
   * Syllables the formula spends before it reaches the reciting tenor — the
   * intonation. The cadence maths ignores it — the cadence is scanned
   * right-to-left from the end — but the score needs it, and callers ask
   * for it when they need to know how much of a colon the formula spends
   * before it reaches the tenor.
   */
  intonation: number;
}

interface Syll {
  text: string;
  isStressed: boolean;  // acute-accent mark from lypsautierant
  isGap: boolean;       // space / punctuation / verse number — not a syllable
}

// ─── GABC Tone String Parser ─────────────────────────────────────────────────

/**
 * How many accents a formula has, how many preparatory syllables lead into
 * the first of them, how many syllables trail the last one, and how long the
 * intonation is.
 *
 * This used to be scanned here, group by group, and it disagreed with jgabc
 * on 38 of the 108 formulas in tone-data — including the mediant of tones 1,
 * 6 and 7, where it counted the reciting note that sits *between* the two
 * accents as a preparatory syllable and italicised the syllable before the
 * first accent. jgabc resets the preparatory count at every accent, so a
 * two-accent mediant has none. There is no reason to have a second reader:
 * getGabcTones is the same call applyPsalmTone makes to lay the notes out.
 */
export function parseGabcToneCounts(gabc: string, clef = 'c4'): GabcToneCounts {
  if (!gabc || !gabc.trim()) {
    return { accents: 0, preparatory: 0, afterLastAccent: 0, tenor: 'h', intonation: 0 };
  }
  // The clef has to be passed: with none, getGabcTones falls back to the
  // `_clef` global that psalmtone.html declares and this app does not, and
  // reading it throws. It only decides where the flex note sits, which the
  // pointing does not use, but the counts are unreachable without it.
  const t = getGabcTones(gabc, undefined, false, clef);
  return {
    accents: t.accents,
    preparatory: t.preparatory,
    afterLastAccent: t.afterLastAccent,
    tenor: t.toneTenor || 'h',
    intonation: t.intonation,
  };
}

// ─── Syllabification ─────────────────────────────────────────────────────────

const ACUTE_VOWEL_RE = /[áéíóúÁÉÍÓÚ]/;

// There is no Latin syllabifier here any more. This module used to carry one
// — jgabc's regexLatin, scraped out of psalmtone.js at import time and run a
// word at a time — plus its own reading of Latin word stress. Both are
// psalmtone.js's job, and it does them over the whole colon at once, which is
// where the implicit accents come from. Latin now goes through addBoldItalic
// (see pointHemistich); what follows is the English path only.

function tokeniseSylls(text: string): Syll[] {
  // Match word characters (letters including acute accents, plus internal apostrophe/hyphen)
  const wordRe = /([a-zA-ZÀ-ÖØ-öø-ÿáéíóúÁÉÍÓÚæœæǽ]+(?:['′-][a-zA-ZÀ-ÖØ-öø-ÿáéíóúÁÉÍÓÚ]+)?)/g;
  const result: Syll[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = wordRe.exec(text)) !== null) {
    if (m.index > last) {
      result.push({ text: text.slice(last, m.index), isStressed: false, isGap: true });
    }
    const rawWord = m[0];
    const wordSylls = englishPhoneticSyllabify(rawWord);

    if (ACUTE_VOWEL_RE.test(text)) {
      // English with explicit accents (lypsautierant)
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

/**
 * Where the cadence falls, by jgabc's rule (psalmtone.js `addBoldItalic`).
 *
 * Read the colon from the end:
 *   - first skip `afterLastAccent` syllables, the ones the formula spends
 *     after its last accent; the syllable the count lands on is sung on the
 *     accent note even when the word is not accented there, so it is bold;
 *   - then take `accents` accented syllables. Once none are left to the
 *     left, a syllable two back from the one just taken counts as accented
 *     even without a mark, unless the syllable before it is accented — that
 *     is what keeps a dactyl from collapsing onto its neighbour;
 *   - then italicise the `preparatory` syllables immediately to the left of
 *     the leftmost accent, and nothing else.
 *
 * `sylls` carries gaps (spaces, punctuation, verse numbers); the count runs
 * over the real syllables only.
 */
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

  const n = realIdx.length;
  if (!n) return { boldSet, italicSet };

  const accented = (k: number) => sylls[realIdx[k]].isStressed;

  // Is there an accent at k or anywhere left of it? jgabc's rule that a
  // syllable two back from the last accent counts as accented is a stand-in
  // for text that marks no accents at all — in Latin it realises the
  // alternation that psalmtone.js's own syllabifier leaves implicit. English
  // here always carries its stresses, from the acutes in lypsautierant's
  // psalms or from the psalter stress dictionary, so the stand-in must not
  // outrank them: ungated it put the second accent of "the gréatness of the
  // Lórd" on "of", two syllables back, instead of on "gréat".
  const accentAtOrLeft: boolean[] = new Array(n).fill(false);
  for (let k = 0, seen = false; k < n; k++) {
    seen = seen || accented(k);
    accentAtOrLeft[k] = seen;
  }

  let doneAccents = 0;
  let donePrep = 0;
  let skipped = 0;
  let bold = false;
  let lastAccentI = n;

  for (let k = n - 1; k >= 0; k--) {
    if (skipped < counts.afterLastAccent) {
      skipped++;
      if (skipped === counts.afterLastAccent) bold = true;
      continue;
    }

    const twoBack = !accentAtOrLeft[k] && k === lastAccentI - 2 && (k === 0 || !accented(k - 1));
    if (doneAccents < counts.accents && (accented(k) || twoBack)) {
      lastAccentI = k;
      boldSet.add(realIdx[k]);
      doneAccents++;
      bold = false;
    } else if (bold) {
      // The formula's accent note has already been reached counting in from
      // the end, so it carries these syllables too until the accent turns up.
      boldSet.add(realIdx[k]);
    } else if (doneAccents === counts.accents && donePrep < counts.preparatory) {
      italicSet.add(realIdx[k]);
      donePrep++;
    }
  }

  return { boldSet, italicSet };
}


// ─── Single Line / Hemistich Pointing ─────────────────────────────────────────

/** jgabc writes <b>/<i>; the rest of this app reads <strong>/<em>. */
function toStrongEm(html: string): string {
  return html
    .replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>')
    .replace(/<i>/g, '<em>').replace(/<\/i>/g, '</em>');
}

/**
 * Point a single line/colon of psalm text.
 *
 * Latin is handed straight to psalmtone.js: same syllabifier (regexLatin),
 * same cadence placement, same output as the verse list of jgabc's psalm
 * tone tool — and the same syllabification the engraved score above it uses.
 * English cannot go that way, because jgabc syllabifies English with Hypher
 * and expects accents marked with `*` inside the words; it gets the identical
 * placement rule (pickAccents) over this app's own English syllables instead.
 */
export function pointHemistich(
  text: string,
  counts: GabcToneCounts,
  lang: 'en' | 'la',
): string {
  if (!text.trim()) return text;

  if (lang === 'la') {
    return toStrongEm(addBoldItalic(
      text,
      counts.accents,
      counts.preparatory,
      counts.afterLastAccent,
      'html',
      false,          // onlyVowel
      undefined,      // verseNumber
      undefined,      // prefix
      undefined,      // suffix
      undefined,      // verseIndex
      'la',
    ));
  }

  const sylls = tokeniseSylls(text);
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

/**
 * Prefix on the error pointPsalm throws when it has no GABC formula to point
 * with. Callers use it to tell "you asked for something impossible" (a 400)
 * apart from "the engine broke" (a 500). It used to return the text unchanged,
 * so the API answered 200 with the *unpointed* psalm and the UI happily
 * displayed it as though the tone had been applied.
 */
export const NO_FORMULA_PREFIX = 'No tone formula: ';

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
  const {
    text, tone, variant = '', customMediant, customTermination, lang,
    solemn = false,
  } = params;
  const spec: ToneSpec | undefined = tone ? PSALM_TONES[tone] : undefined;

  // Trim before testing: a custom GABC field the user cleared but left a
  // space in is truthy, and used to slip past the emptiness check below to
  // produce a formula with no accents — i.e. the psalm came back unpointed.
  const mediStr = (customMediant?.trim()
    || ((solemn && spec?.solemn) ? spec.solemn : spec?.mediant)
    || '').trim();
  const termStr = (customTermination?.trim()
    || (spec?.terminations
      ? (spec.terminations[variant] ?? Object.values(spec.terminations)[0] ?? spec.mediant)
      : spec?.termination)
    || mediStr).trim();

  if (!mediStr && !termStr) {
    throw new Error(
      `${NO_FORMULA_PREFIX}${tone ? `tone "${tone}"${variant ? ` variant "${variant}"` : ''} has no mediant or termination GABC` : 'no tone was given and both custom formulas are blank'}.`
    );
  }

  const clef = spec?.clef || 'c4';
  const mediCounts = parseGabcToneCounts(mediStr, clef);
  const termCounts = parseGabcToneCounts(termStr, clef);
  const flexCounts: GabcToneCounts = {
    accents: 1, preparatory: 0, afterLastAccent: 0,
    tenor: mediCounts.tenor, intonation: mediCounts.intonation,
  };

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

    // The marker is put back with one space either side. The halves are
    // trimmed at the seam first: psalmtone.js drops the space it was handed
    // at the end of a colon but keeps the one at the head of the next, so
    // splitting on the marker and rejoining used to leave "meus  *  in Deo".
    if (line.includes('†')) {
      const parts = line.split('†');
      const before = pointHemistich(parts[0].trimEnd(), flexCounts, lang);
      const after = parts.slice(1).join('†');
      if (after.trim()) {
        result.push(before + ' † ' + pointHemistich(after.trimStart(), mediCounts, lang));
      } else {
        result.push(before + ' †');
      }
      continue;
    }

    if (line.includes('*')) {
      const parts = line.split('*');
      const before = pointHemistich(parts[0].trimEnd(), mediCounts, lang);
      const after = parts.slice(1).join('*');
      if (after.trim()) {
        result.push(before + ' * ' + pointHemistich(after.trimStart(), termCounts, lang));
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
