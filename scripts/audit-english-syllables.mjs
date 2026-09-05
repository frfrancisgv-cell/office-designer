/**
 * Audit how sedsyllables cuts the English psalter, and print the words whose
 * split is demonstrably wrong.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
 *        --import ./scripts/test-register.mjs scripts/audit-english-syllables.mjs
 *
 * Two signals, both self-evident — neither asks this script to know how English
 * is syllabified, which it cannot:
 *
 *  1. CASE — a capitalised word splits differently from its own lower-cased
 *     form. sedsyllables' character classes are lower-case only, so
 *     capitalisation silently defeats them: "hóly" splits, "Hóly" does not.
 *     One of the two is wrong whichever way round it is.
 *
 *  2. VOWELLESS — a piece of the split holds no vowel ("B -- less"), or the
 *     split opens with an empty piece (a stray leading " -- "). A syllable
 *     without a vowel is not a syllable.
 *
 * Counting vowel groups to guess a syllable count was tried and thrown away:
 * it flags "have", "are", "one" and "like" — silent finals and diphthongs —
 * far more often than it flags a real fault.
 *
 * The output is a proposal for a human to rule on. A wrong syllable count
 * moves every pointing mark in its hemistich, so nothing here is applied
 * without the user's approval (see the plan, §7).
 */

import fs from 'fs';
import path from 'path';
import { syllabifyLine } from '../lib/psalm-tones/lypsautierant-syllabify.ts';

const COLLECTIONS = [
  'revisedGrailPsalter', 'theAbbeyPsalmsAndCanticles', 'commons', 'seasons', 'sanctoral',
];
const ROOT = path.join(process.cwd(), 'vendor', 'psautier');
const VOWELS = /[aeiouyáéíóúýAEIOUYÁÉÍÓÚÝ]/;

/** Words protected by an explicit rule in sedsyllables and correct as they are. */
const KNOWN_GOOD = new Set(['LORD', 'LÓRD', 'LORD’s', 'LÓRD’s', 'LORDs', 'LÓRDs']);

/**
 * Is this token psalm text at all? The commons, seasons and sanctoral files
 * carry section labels (READING, PSALMODY, HYMN, SEXT), citation fragments
 * (Ps, NT, OT) and rule-off dashes, none of which is ever sung.
 */
function isPsalmWord(word) {
  if (word.length < 2) return false;
  if (!/[a-záéíóúý]/u.test(word)) return false;          // all-caps label or dashes
  if (!VOWELS.test(word)) return false;                   // "ps", "th", "b-"
  return true;
}

function corpusWords() {
  const counts = new Map();
  for (const collection of COLLECTIONS) {
    let entries;
    try { entries = fs.readdirSync(path.join(ROOT, collection)); } catch { continue; }
    for (const name of entries) {
      const file = path.join(ROOT, collection, name);
      if (!fs.statSync(file).isFile()) continue;
      // modes.pl skips line 1, so the corpus does too.
      const text = fs.readFileSync(file, 'utf8').split('\n').slice(1).join('\n');
      for (const word of text.match(/[A-Za-zÁÉÍÓÚáéíóúý'’-]+/gu) ?? []) {
        if (isPsalmWord(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
  }
  return counts;
}

const split = word => syllabifyLine(word).split(' -- ');

const counts = corpusWords();
const rows = [];

for (const [word, n] of counts) {
  if (KNOWN_GOOD.has(word)) continue;
  const pieces = split(word);
  const flags = [];

  if (/^[A-ZÁÉÍÓÚ]/.test(word)) {
    const lower = word[0].toLowerCase() + word.slice(1);
    const lowerPieces = split(lower);
    if (lowerPieces.length !== pieces.length) {
      flags.push(pieces.length < lowerPieces.length ? 'CASE-under' : 'CASE-over');
    }
  }
  if (pieces.some(piece => !VOWELS.test(piece))) flags.push('VOWELLESS');

  if (flags.length) {
    rows.push({
      word, n, flags,
      now: pieces.join('-'),
      lower: /^[A-ZÁÉÍÓÚ]/.test(word)
        ? split(word[0].toLowerCase() + word.slice(1)).join('-')
        : '',
    });
  }
}

rows.sort((a, b) => b.n - a.n || a.word.localeCompare(b.word));

console.log(`corpus: ${counts.size} distinct psalm words`);
console.log(`flagged: ${rows.length} distinct, ${rows.reduce((s, r) => s + r.n, 0)} occurrences\n`);
console.log('    ×  word           split now           lower-cased splits as  flags');
console.log('-'.repeat(84));
for (const r of rows) {
  console.log(
    String(r.n).padStart(5),
    r.word.padEnd(14),
    r.now.padEnd(20),
    (r.lower || '—').padEnd(22),
    r.flags.join(','),
  );
}
