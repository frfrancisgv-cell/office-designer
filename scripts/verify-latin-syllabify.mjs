/**
 * Measure lib/psalm-tones/latin-syllabify.ts against real chant.
 *
 *   node --import ./scripts/test-register.mjs scripts/verify-latin-syllabify.mjs
 *
 * The corpus is gregobase-cache.json: 18,522 GABC scores whose text is already
 * divided syllable by syllable — "Lau(h)dem(ghG'E) Dó(fe)mi(fg)ni(...)" — by
 * the editors who set the chant. That is the authority for how ecclesiastical
 * Latin divides, and it is in the repo already.
 *
 * The score will not reach 100%, and should not be made to. The corpus is not
 * of one mind: "omnes" appears as both "om-nes" and "o-mnes", "propter" as
 * both "prop-ter" and "pro-pter", in comparable numbers. Nor is it all Latin —
 * gregobase carries English, French and Vietnamese chant too, and the filter
 * below only thins that out. Treat the number as a regression guard: it must
 * not FALL. Print the misses with --verbose to see what moved.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { splitLatinWord } from '../lib/psalm-tones/latin-syllabify.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FLOOR = 93.0;          // raise this when the rules genuinely improve

// ── Pull every syllabified word out of the GABC ─────────────────────────────
// GABC is text(notes)text(notes)…; the text between the parens is one syllable,
// and whitespace inside it ends the word.
const cache = JSON.parse(fs.readFileSync(path.join(ROOT, 'gregobase-cache.json'), 'utf8'));
const counts = new Map();

for (const entry of Object.values(cache)) {
  let word = [];
  for (const m of String(entry.gabc ?? '').matchAll(/([^()]*)\(([^)]*)\)/g)) {
    for (const part of m[1].split(/(\s+)/)) {
      if (!part) continue;
      if (!part.trim()) {
        if (word.length) { const k = word.join('-'); counts.set(k, (counts.get(k) ?? 0) + 1); word = []; }
      } else {
        word.push(part);
      }
    }
  }
  if (word.length) { const k = word.join('-'); counts.set(k, (counts.get(k) ?? 0) + 1); }
}

// Latin letters only, and no k or w, which Latin does not use — that drops
// most of the English and Vietnamese chant without touching the Latin.
const LATIN = /^[a-zæœáéíóúýA-ZÆŒÁÉÍÓÚÝ-]+$/;
const corpus = [...counts].filter(([w]) => LATIN.test(w) && !/[kw]/i.test(w) && w.replace(/-/g, '').length > 1);

// ── Compare ─────────────────────────────────────────────────────────────────
let hitTokens = 0, missTokens = 0, hitForms = 0, missForms = 0;
const misses = [];

for (const [expected, n] of corpus) {
  const got = splitLatinWord(expected.split('-').join('')).join('-');
  if (got === expected) { hitTokens += n; hitForms += 1; }
  else { missTokens += n; missForms += 1; misses.push([n, expected, got]); }
}

const tokenPct = (hitTokens * 100) / (hitTokens + missTokens);
console.log(`corpus: ${corpus.length} Latin word forms, ${hitTokens + missTokens} tokens`);
console.log(`  tokens: ${hitTokens}/${hitTokens + missTokens} = ${tokenPct.toFixed(2)}%`);
console.log(`  forms:  ${hitForms}/${hitForms + missForms} = ${((hitForms * 100) / (hitForms + missForms)).toFixed(2)}%`);

if (process.argv.includes('--verbose')) {
  misses.sort((a, b) => b[0] - a[0]);
  for (const [n, expected, got] of misses.slice(0, 40)) console.log(`   ${n}\t${expected}\t->\t${got}`);
}

if (tokenPct < FLOOR) {
  console.error(`  FAIL — below the ${FLOOR}% floor. Run with --verbose to see what regressed.`);
  process.exit(1);
}
console.log('  OK');
