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
 *   4. Syllabification (syllabifyWord) preserves acute-accent stress marks:
 *      Latin uses regexLatin, scraped from psalmtone.js; English uses
 *      englishPhoneticSyllabify from ./english-phonetic.
 */

import { PSALM_TONES } from './tone-data';
import type { ToneSpec } from './tone-data';

import { englishPhoneticSyllabify, inferEnglishWordStress } from './english-phonetic';
// stripPointing lives in ./strip so client code can use it without pulling
// this module in — it reads psalmtone.js off disk at import time.
import { stripPointing } from './strip';
export { stripPointing };
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

// Load regexLatin directly from psalmtone.js at runtime.
// This avoids any risk of escaping corruption when copying the complex regex
// as a string literal, and guarantees we always use the exact same regex as jgabc.
// regexLatin is the gold-standard phonological syllabifier for liturgical Latin;
// each exec() call yields exactly one syllable with m[3]=syllText+space, m[4]=leadingSpace.
function makeLatinRegex(): RegExp {
  try {
    const path = require('path');
    const fs = require('fs');
    const src = fs.readFileSync(path.join(process.cwd(), 'psalmtone.js'), 'utf8');
    // The regex is defined on line 4 as: var regexLatin = /...../gi  (no trailing semicolon)
    const m = src.match(/var regexLatin = (\/.+\/gi)/);
    if (m) {
      // Eval only this single regex literal — safe since we control the file
      // eslint-disable-next-line no-eval
      return eval(m[1]);
    }
  } catch { /* fall through */ }
  // Fallback: simple vowel-based splitter (better than nothing)
  return /([bcdfghjklmnprstvwxz]*[aeiouyáéíóúýæœ][bcdfghjklmnprstvwxz]*)/gi;
}

const _latinRegexSrc = (() => { try { return makeLatinRegex().source; } catch { return ''; } })();
const _latinRegexFlags = 'gi';

/**
 * Syllabify a single Latin word using jgabc's regexLatin.
 * Returns array of syllable strings (preserving original casing and diacritics).
 */
export function syllabifyLatinWord(word: string): string[] {
  if (!_latinRegexSrc) return [word];
  const re = new RegExp(_latinRegexSrc, _latinRegexFlags);
  const result: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(word)) !== null) {
    const leadSpace = m[4] || '';
    const syl = m[3] ? m[3].slice(leadSpace.length) : '';
    if (syl) result.push(syl);
    if (!m[0]) break;
  }
  return result.length ? result : [word];
}

export function syllabifyWord(word: string, lang: 'en' | 'la'): string[] {
  if (!word) return [];
  if (lang === 'en') return englishPhoneticSyllabify(word);
  return syllabifyLatinWord(word);
}


function tokeniseSylls(text: string, lang: 'en' | 'la'): Syll[] {
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
    const wordSylls = syllabifyWord(rawWord, lang);

    if (lang === 'la') {
      // Build syllable objects for this word
      const wordSyllObjs: Syll[] = wordSylls.map(p => ({
        text: p,
        isStressed: ACUTE_VOWEL_RE.test(p),
        isGap: false,
      }));
      // If no syllable has an explicit accent, assign one via Latin stress rules:
      //   1 syl → mark it; 2 syls → penult (index 0); 3+ syls → penult (index n-2)
      if (!wordSyllObjs.some(s => s.isStressed)) {
        if (wordSyllObjs.length === 1) {
          wordSyllObjs[0].isStressed = true;
        } else if (wordSyllObjs.length === 2) {
          wordSyllObjs[0].isStressed = true;
        } else {
          // 3+ syllables: penult (classical default for unaccented text)
          wordSyllObjs[wordSyllObjs.length - 2].isStressed = true;
        }
      }
      for (const syll of wordSyllObjs) result.push(syll);
    } else if (ACUTE_VOWEL_RE.test(text)) {
      // English with explicit accents (lpsautierant)
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
    // Bold: the `counts.accents` rightmost stressed syllables
    for (const i of accentTargets) {
      boldSet.add(i);
    }

    // Preparatory italic: syllables immediately before the first bold position
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
  const { text, tone, variant = '', customMediant, customTermination, lang, solemn = false } = params;
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
