/**
 * Build lib/psalm-tones/english-stress.ts from the accented English psalters.
 *
 *   node --import ./scripts/test-register.mjs scripts/build-english-stress.mjs
 *
 * The psalters in vendor/psautier are pointed by their editors: every syllable
 * that carries the singing stress has an acute on its vowel, and the words
 * that never take one are the function words. That is a stress dictionary for
 * liturgical English, written by people who sing this text, and it is already
 * in the repo — the same move latin-syllabify.ts makes with the 18,522 GABC
 * scores in gregobase-cache.json.
 *
 * It replaced two hand-written lists in english-phonetic.ts: ENGLISH_STRESS_DICT
 * (about fifty words) and FUNCTIONAL_WORDS (about forty-five).
 *
 * The syllable index is relative to englishPhoneticSyllabify, so this file has
 * to be regenerated whenever that function changes. english-stress.test.ts
 * fails if it is not.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { englishPhoneticSyllabify } from '../lib/psalm-tones/english-phonetic.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'lib/psalm-tones/english-stress.ts');

/** The two pointed psalters, and the files in them that are psalm text. */
const CORPUS = [
  ['vendor/psautier/revisedGrailPsalter', /^Psalm \d/],
  ['vendor/psautier/theAbbeyPsalmsAndCanticles', /^(NT|OT) \d/],
];

// Every acute the two psalters use. Leaving ý out of this class split
// "cýmbals" and "whý" into fragments that then looked like unaccented words.
const ACUTE = /[áéíóúýÁÉÍÓÚÝ]/;
const WORD = /[A-Za-z'’áéíóúýÁÉÍÓÚÝ]+/g;

/** A key worth storing: letters, possibly an apostrophe, and at least one vowel. */
function isWord(key) {
  return /^[a-z][a-z']*$/.test(key) && /[aeiouy]/.test(key);
}

/**
 * A word is rarely accented when the psalters point it less often than this.
 *
 * The first cut of this file asked whether a word is EVER accented, and got a
 * list of fourteen. That is the wrong question: a line of psalmody carries two
 * or three accents out of about seven words, so most words on most lines are
 * passed over, and a word that takes the accent one time in ten is a word the
 * cadence should not land on. What matters is the rate.
 *
 * The pronouns are the clearest case. Every one of them is accented sometimes
 * — "Hé is like a trée" — and almost never:
 *
 *     his 0%   their 0%   my 0%    its 0%   our 0%   your 1%   it 0%
 *     they 8%  i 9%       he 11%   us 13%   me 15%   him 16%   you 23%
 *
 * against lord 81%, god 85%, soul 88%, holy 92%, name 93%, king 95%.
 *
 * Threshold swept against the Abbey psalter, held out from the training data.
 * "last-2" is the question the mediant asks: are the last two words this
 * predicts the last two the editors accented?
 *
 *                       last-2   last-1   whole line   accents/line
 *     ever-accented     32.7%    90.6%        —           6.15
 *     rate >= 0.25      77.8%    94.4%       47.4%        3.38
 *     rate >= 0.35      80.8%    95.1%       52.9%        3.13
 *     rate >= 0.45      81.0%    94.8%       54.9%        2.99   <—
 *     rate >= 0.55      80.6%    94.1%       54.5%        2.86
 *     rate >= 0.60      79.8%    93.9%       53.9%        2.84
 *
 * last-2 is what a mediant of two accents asks. "whole line" is every accent
 * in the line placed exactly as the editors placed it, which is what
 * accentuateEnglish is judged on. The editors themselves average 2.92
 * accents a line, so 0.45 is also where the count comes out right.
 *
 * It governs unaccented text only. Where the text carries its own acutes —
 * Latin, or lypsautierant's English psalms — those marks are obeyed and none
 * of this is consulted.
 */
const RARELY_ACCENTED_BELOW = 0.45;

/**
 * And how many times a word must appear before its rate is worth believing.
 *
 * Accuracy is flat from 1 to 12 (81.1% / 81.0% / 80.6% / 80.4% / 80.2% at the
 * threshold above) because the smoothing already discounts small counts. Three
 * is chosen to keep the shipped list free of two-occurrence noise — "zoan",
 * "rahab", "sycamore", proper nouns that happen to appear twice unpointed.
 */
const RATE_MIN_OCCURRENCES = 3;

/**
 * A first syllable is an unstressed prefix when the psalters point the stress
 * off it more often than this, over at least PREFIX_MIN_FORMS two-syllable
 * forms that begin with it.
 *
 * This is what the fallback needs. A word the psalters never pointed — "began"
 * appears once in the Revised Grail, on a pointed line, unaccented — used to
 * get the old rule, the first of two, and came out "bégan". But English does
 * not stress its prefixes, and the psalters say so plainly: of the 56
 * two-syllable forms in the Revised Grail beginning with the syllable "re",
 * 55 are pointed on the second syllable; of the 22 beginning with "be", all
 * 22 are. "benefits" and "under" are the kind of word that pulls the other
 * way, and they are the exceptions the rate is measuring.
 *
 * Swept on the Abbey psalter over the two-syllable forms the Revised Grail
 * never pointed — exactly the words the fallback is asked about:
 *
 *                        forms  right
 *     first of two        204   65.2%
 *     rate >= 0.55         43   84.3%
 *     rate >= 0.60         41   84.3%
 *     rate >= 0.65         37   83.8%
 *     rate >= 0.70         32   84.3%   <—
 *     rate >= 0.75         30   81.4%
 *     rate >= 0.80         24   80.4%
 *
 * Accuracy is flat across the plateau, so 0.70 is taken as the highest
 * threshold still on it: it keeps the list to the prefixes a reader would
 * recognize and drops "for", "pre", "per" and "in", which the psalters point
 * both ways ("fórmer" against "forgáve", "précepts" against "prepáre").
 *
 * The rule applies to two-syllable words only. For three or more the penult
 * rule already lands off the first syllable, so a prefix tells it nothing.
 */
const PREFIX_UNSTRESSED_ABOVE = 0.70;

/**
 * And how many forms a first syllable needs before its rate is believed.
 *
 * Two, not three as above: the Laplace smoothing does the discounting, and
 * this list is of syllables rather than words, so it has an order of
 * magnitude less evidence per entry to work with. At two the held-out score
 * is unchanged from one (84.3%) while the list drops from 61 entries to 32.
 */
const PREFIX_MIN_FORMS = 2;

/** The key a word is stored and looked up under. Must match english-phonetic. */
export function stressKey(word) {
  return word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/’/g, "'");
}

/** Which syllable of the word carries the acute, or -1 if none does. */
function accentedSyllable(word) {
  let charIndex = -1;
  for (let i = 0; i < word.length; i++) {
    if (ACUTE.test(word[i])) { charIndex = i; break; }
  }
  if (charIndex < 0) return -1;
  // The acute sits on a vowel; count characters until the syllable holding it.
  // Both sides use englishPhoneticSyllabify, so the index means the same thing
  // to the reader of this dictionary as it did to its writer.
  const sylls = englishPhoneticSyllabify(stressKey(word));
  let pos = 0;
  for (let i = 0; i < sylls.length; i++) {
    if (charIndex < pos + sylls[i].length) return i;
    pos += sylls[i].length;
  }
  return sylls.length - 1;
}

export function collect() {
  const votes = new Map();       // key -> Map(syllableIndex -> count)
  const occurrences = new Map(); // key -> how often the word appears
  const accented = new Map();    // key -> how often it carries the acute

  for (const [dir, isText] of CORPUS) {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      if (!isText.test(name)) continue;
      const text = readFileSync(path.join(ROOT, dir, name), 'utf8');
      // Line by line, and only the lines the editors pointed. 18.5% of the
      // Revised Grail's lines carry no acute at all — most of Psalm 119 — and
      // counting those in the denominator made a word look unaccented when
      // nobody had pointed the line it sat on. It put "law" at 21%,
      // "precepts" at 12% and "statutes" at 4%, all below the threshold, so
      // the cadence passed straight over them. On pointed lines alone they
      // are 90%, 80% and 67%.
      for (const line of text.split('\n')) {
        if (!ACUTE.test(line)) continue;
      for (const word of line.match(WORD) ?? []) {
        const key = stressKey(word);
        if (!isWord(key)) continue;
        occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
        const syll = accentedSyllable(word);
        if (syll < 0) continue;
        accented.set(key, (accented.get(key) ?? 0) + 1);
        if (!votes.has(key)) votes.set(key, new Map());
        const v = votes.get(key);
        v.set(syll, (v.get(syll) ?? 0) + 1);
      }
      }
    }
  }

  // Where the two psalters point a word differently — "increase" and
  // "firstborn" among them — the majority reading is taken, as in
  // latin-syllabify.ts. `divided` counts those so the report can name them.
  const stress = new Map();
  const divided = [];
  for (const [key, v] of votes) {
    let best = -1, most = -1, total = 0;
    for (const [syll, count] of v) {
      total += count;
      if (count > most) { most = count; best = syll; }
    }
    if (most < total) divided.push([key, [...v].sort((a, b) => b[1] - a[1])]);
    // A one-syllable word carries its stress on its only syllable; saying so
    // costs bytes and tells the reader nothing. What matters for those is
    // whether the cadence lands on them at all, which the rate list answers.
    if (englishPhoneticSyllabify(key).length > 1) stress.set(key, best);
  }

  // First syllables the stress falls off, counted over the two-syllable forms
  // alone: those are the words the fallback has to guess, and the only ones
  // where "stress the first of two" can land on a prefix.
  const onPrefix = new Map();   // first syllable -> forms stressed on it
  const offPrefix = new Map();  // first syllable -> forms stressed after it
  for (const [key, syll] of stress) {
    const sylls = englishPhoneticSyllabify(key);
    if (sylls.length !== 2) continue;
    const first = sylls[0];
    const side = syll === 0 ? onPrefix : offPrefix;
    side.set(first, (side.get(first) ?? 0) + 1);
  }

  // Laplace smoothing: a word seen twice and never pointed is not evidence of
  // the same strength as one seen two hundred times and never pointed.
  const accentRate = (key) => ((accented.get(key) ?? 0) + 1) / (occurrences.get(key) + 2);

  // Smoothed the same way, for the same reason: "op" seen three times and
  // pointed off all three is weaker evidence than "re" seen fifty-six times.
  const prefixes = [...new Set([...onPrefix.keys(), ...offPrefix.keys()])]
    .filter((first) => {
      const on = onPrefix.get(first) ?? 0;
      const off = offPrefix.get(first) ?? 0;
      return on + off >= PREFIX_MIN_FORMS
        && (off + 1) / (on + off + 2) >= PREFIX_UNSTRESSED_ABOVE;
    })
    .sort();

  const rarely = [...occurrences]
    .filter(([key, n]) => n >= RATE_MIN_OCCURRENCES && accentRate(key) < RARELY_ACCENTED_BELOW)
    .map(([key]) => key)
    .sort();

  return { stress, rarely, prefixes, divided, occurrences, votes, accentRate };
}

/**
 * Wrap a word list into quoted, concatenated source lines.
 *
 * Whatever consumes the result must parenthesise the concatenation before
 * calling .split on it: `.split` binds to the last string literal alone, and
 * `new Set(oneLongString)` then iterates characters. The list was a set of
 * 26 letters until english-stress.test.ts caught it.
 */
function wrap(words, indent) {
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && line.length + w.length + 1 > 72) { lines.push(line); line = ''; }
    line += (line ? ' ' : '') + w;
  }
  if (line) lines.push(line);
  // Double quotes: the words include possessives ("god's", "children's").
  return lines.map((l, i) =>
    `${indent}${i ? '+ ' : '  '}"${l}${i < lines.length - 1 ? ' ' : ''}"`).join('\n');
}

function render({ stress, rarely, prefixes, divided }) {
  const byIndex = new Map();
  for (const word of [...stress.keys()].sort()) {
    const syll = stress.get(word);
    if (!byIndex.has(syll)) byIndex.set(syll, []);
    byIndex.get(syll).push(word);
  }
  const groups = [...byIndex].sort((a, b) => a[0] - b[0]).map(([syll, words]) =>
    `  // ${words.length} forms\n  ${syll}:\n${wrap(words, '    ')},`
  ).join('\n');

  return `/**
 * GENERATED — do not edit. Run:
 *   node --import ./scripts/test-register.mjs scripts/build-english-stress.mjs
 *
 * Word stress for liturgical English, read off the acutes that the editors of
 * the Revised Grail psalter and The Abbey Psalms and Canticles put on their
 * own text (vendor/psautier). ${stress.size} multi-syllable forms with a known
 * stress, and ${rarely.length} words those psalters seldom accent at all.
 *
 * Built from the Revised Grail alone and measured against the Abbey psalter,
 * which it had not seen, it covered 89.2% of the accented words there and was
 * right about 99.5% of the ones it covered. The heuristic it replaces — stress
 * the penult, or the first of two — scored 83.4%.
 *
 * ${divided.length} forms are pointed both ways by the two psalters
 * (${divided.slice(0, 6).map(([w]) => w).join(', ')} among them). The majority
 * reading is taken, as latin-syllabify.ts does with its own corpus.
 *
 * The number is a syllable index as englishPhoneticSyllabify divides the word.
 * Change that function and this file must be rebuilt; english-stress.test.ts
 * fails until it is.
 */

/** Multi-syllable forms, grouped by the syllable that carries the stress. */
const BY_SYLLABLE: Record<number, string> = {
${groups}
};

/** word → the syllable that carries the stress. */
export const ENGLISH_STRESS: ReadonlyMap<string, number> = new Map(
  Object.entries(BY_SYLLABLE).flatMap(([syllable, words]) =>
    words.split(' ').map(word => [word, Number(syllable)] as [string, number]),
  ),
);

/**
 * Words the psalters accent less than ${Math.round(RARELY_ACCENTED_BELOW * 100)}% of the time,
 * out of at least ${RATE_MIN_OCCURRENCES} chances: the articles, prepositions,
 * conjunctions, auxiliaries, and every pronoun and possessive.
 *
 * A line of psalmody carries two or three accents out of about seven words, so
 * a word pointed one time in ten is one the cadence should pass over. Asking
 * instead whether a word is EVER accented gave a list of fourteen and put the
 * mediant's accents in the right place 32.7% of the time; this gives 81.0%.
 *
 * Consulted only for text that carries no acutes of its own.
 */
export const ENGLISH_RARELY_ACCENTED: ReadonlySet<string> = new Set(
  (
${wrap(rarely, '   ')}
  ).split(' '),
);

/**
 * First syllables the psalters point the stress off more than ${Math.round(PREFIX_UNSTRESSED_ABOVE * 100)}% of the
 * time, over at least ${PREFIX_MIN_FORMS} two-syllable forms: the unstressed prefixes of
 * English, as the editors of these two psalters mark them.
 *
 * Only the fallback reads this, and only for a word of two syllables that the
 * dictionary above has never seen. "began" is the case that asked for it: the
 * psalters use the word once and do not point it, so the old rule — the first
 * of two — sang "bégan". Of the two-syllable forms the Revised Grail never
 * pointed, that rule placed 65.2% of the accents where the Abbey psalter's
 * editors did; consulting this list first places 84.3%.
 *
 * A syllable, not a spelling: it must be the whole first syllable as
 * englishPhoneticSyllabify cuts the word, so "be-gan" and "be-hold" match
 * where "ben-e-fits" and "bet-ter" do not.
 */
export const ENGLISH_UNSTRESSED_PREFIXES: ReadonlySet<string> = new Set(
  (
${wrap(prefixes, '   ')}
  ).split(' '),
);
`;
}

const built = collect();
writeFileSync(OUT, render(built), 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`  ${built.stress.size} multi-syllable forms with a known stress`);
console.log(`  ${built.rarely.length} words accented under ${RARELY_ACCENTED_BELOW * 100}% of the time (seen ${RATE_MIN_OCCURRENCES}+ times)`);
console.log(`  ${built.divided.length} forms the two psalters point differently`);
console.log(`  ${built.prefixes.length} first syllables the stress falls off: ${built.prefixes.join(' ')}`);
