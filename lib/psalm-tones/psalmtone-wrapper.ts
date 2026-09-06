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
  toneTenor?: string;
} = psalmtone.getGabcTones;
