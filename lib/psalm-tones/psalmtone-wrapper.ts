/**
 * psalmtone.js, made callable from the server.
 *
 * The file is bbloomf's, vendored at the repo root, and it is browser code:
 * it expects `localStorage`, `location`, jQuery, and a syllabifier supplied
 * by the page. This module supplies what it needs and nothing more.
 */
import path from 'node:path';

import { englishPhoneticSyllabify } from './english-phonetic';
import { nodeRequire } from './node-require';

if (typeof global !== 'undefined') {
  if (typeof (global as any).location === 'undefined') {
    (global as any).location = { search: '' };
  }
  // psalmtone.js reaches for jQuery in `$.extend({}, tone)` inside
  // applyPsalmTone, on the branch that adds the closing dots to a formula.
  // It threw ReferenceError, the API route caught it, and the pointed psalm
  // came back with an empty `gabcScore` — so "Apply Tone" never produced the
  // chant score it is supposed to. Every call site is a shallow copy, so
  // Object.assign is the whole of it.
  if (typeof (global as any).$ === 'undefined') {
    (global as any).$ = {
      extend: (target: any, ...sources: any[]) => Object.assign(target, ...sources),
    };
  }
}

// psalmtone.js is loaded as a raw CommonJS file, never bundled: it uses
// implicit global var declarations that break under webpack's strict-mode
// output (the oTags variable inside the syllable() function). See
// ./node-require for how that require is obtained under each runtime.
// The path must be absolute: at runtime the code lives in .next/server/chunks/.
const psalmtone = nodeRequire(path.join(process.cwd(), 'psalmtone.js'));

// English syllables are this app's, not jgabc's. Upstream divides English
// with TeX hyphenation patterns (Hypher) and posts whatever they cannot
// divide to sourceandsummit.com; hyphenation patterns say where a LINE may
// break, so "mercy", "glory", "holy", "heaven" and "blessed" came back
// undivided and the remote call hid it. Latin does not come through here:
// it uses psalmtone.js's own regexLatin, which is a real syllabifier.
psalmtone.setSyllabifier((word: string) => englishPhoneticSyllabify(word));

/**
 * English accents, written the way psalmtone.js reads them.
 *
 * psalmtone.js marks a syllable as accented when it holds an acute — but only
 * as well as a mechanical rule that fires when the text carries none of its
 * own `*` accent marks (psalmtone.js:480): it accents the last syllable of the
 * line when that is a one-syllable word, and otherwise the penult of the last
 * word. A psalter line ending "at dawn I séek you;" therefore had its final
 * accent put on "you;", and every note of the cadence came out one syllable
 * late. Marking the acute syllables explicitly turns that rule off and gives
 * the engine the accents the text actually has.
 *
 * The `*` goes after the accented syllable, divided by the same syllabifier
 * psalmtone.js is given above, so the offsets it counts agree with ours. It is
 * stripped again before anything is printed (psalmtone.js:386).
 */
const ACUTE = /[áéíóúýǽ\u0301]/i;
export function markEnglishAccents(text: string): string {
  // \p{L}\p{M} rather than \w: an acute is not a word character, and \w broke
  // every accented word in half, so no word ever looked accented.
  return text.replace(/[\p{L}\p{M}'’-]+/gu, word => {
    if (!ACUTE.test(word)) return word;
    let at = 0;
    for (const syllable of englishPhoneticSyllabify(word)) {
      at += syllable.length;
      if (ACUTE.test(syllable)) return `${word.slice(0, at)}*${word.slice(at)}`;
    }
    return word;
  });
}

/**
 * A line divided as psalmtone.js will divide it, in the ` -- ` join notation
 * the lypsautierant syllabifier uses. A staff drawn on any other division
 * cannot line up with the score the engine writes from it.
 */
export function syllabifyLineForScore(line: string): string {
  return line.trim().split(/\s+/).map(token => {
    const match = token.match(/^([^\p{L}\p{M}]*)([\p{L}\p{M}'’-]+)(.*)$/u);
    if (!match) return token;
    const [, lead, word, trail] = match;
    const parts = englishPhoneticSyllabify(word);
    return parts.length > 1 ? lead + parts.join(' -- ') + trail : token;
  }).join(' ');
}

export const applyPsalmTone = psalmtone.applyPsalmTone;
export const getPsalmTones = psalmtone.getPsalmTones;
export const getEndings = psalmtone.getEndings;
export const addBoldItalic = psalmtone.addBoldItalic;

/**
 * The cadence reader: how many accents a formula has, how many preparatory
 * syllables lead into the first of them, how many syllables trail the last
 * one, and how long the intonation is. This is the same call applyPsalmTone
 * makes to lay the notes out, so the pointing and the score cannot drift.
 */
export const getGabcTones: (
  gabc: string,
  prefix?: string,
  flexEqualsTenor?: boolean,
  clef?: string,
) => {
  accents: number;
  preparatory: number;
  afterLastAccent: number;
  intonation: number;
  /** The reciting note, and the note a flex falls to from it. */
  toneTenor?: string;
  toneFlex?: string;
} = psalmtone.getGabcTones;
