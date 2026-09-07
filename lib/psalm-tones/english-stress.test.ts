/**
 * The English stress dictionary, and the corpus it is read off.
 *
 * english-stress.ts is generated from the acutes in the Revised Grail psalter
 * and The Abbey Psalms and Canticles (vendor/psautier). It stores a syllable
 * NUMBER, which only means something against englishPhoneticSyllabify — so if
 * that function changes and the file is not rebuilt, every index in it quietly
 * shifts. The first test below is what catches that.
 *
 * Rebuild with:
 *   node --import ./scripts/test-register.mjs scripts/build-english-stress.mjs
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  englishPhoneticSyllabify,
  inferEnglishWordStress,
  isUnstressedWord,
  stressKey,
} from './english-phonetic';
import {
  ENGLISH_STRESS,
  ENGLISH_RARELY_ACCENTED,
  ENGLISH_UNSTRESSED_PREFIXES,
} from './english-stress';

const ROOT = process.cwd();
const CORPUS: Array<[string, RegExp]> = [
  ['vendor/psautier/revisedGrailPsalter', /^Psalm \d/],
  ['vendor/psautier/theAbbeyPsalmsAndCanticles', /^(NT|OT) \d/],
];
const ACUTE = /[áéíóúýÁÉÍÓÚÝ]/;
const WORD = /[A-Za-z'’áéíóúýÁÉÍÓÚÝ]+/g;

/** Every accented word in the psalters, with the syllable its acute falls on. */
function accentedWords(): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  for (const [dir, isText] of CORPUS) {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      if (!isText.test(name)) continue;
      const text = readFileSync(path.join(ROOT, dir, name), 'utf8');
      for (const word of text.match(WORD) ?? []) {
        let charIndex = -1;
        for (let i = 0; i < word.length; i++) {
          if (ACUTE.test(word[i])) { charIndex = i; break; }
        }
        if (charIndex < 0) continue;
        const key = stressKey(word);
        if (!/^[a-z][a-z']*$/.test(key) || !/[aeiouy]/.test(key)) continue;
        const sylls = englishPhoneticSyllabify(key);
        let pos = 0, syll = sylls.length - 1;
        for (let i = 0; i < sylls.length; i++) {
          if (charIndex < pos + sylls[i].length) { syll = i; break; }
          pos += sylls[i].length;
        }
        out.push([key, syll]);
      }
    }
  }
  return out;
}

/** The psalters line by line, each word with whether the editors pointed it. */
function pointedLines(): Array<Array<{ key: string; accented: boolean }>> {
  const out: Array<Array<{ key: string; accented: boolean }>> = [];
  for (const [dir, isText] of CORPUS) {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      if (!isText.test(name)) continue;
      for (let raw of readFileSync(path.join(ROOT, dir, name), 'utf8').split('\n')) {
        raw = raw.replace(/^\s*\d+\s*/, '').trim();   // drop the verse number
        if (!raw) continue;
        const line = (raw.match(WORD) ?? [])
          .map(w => ({ key: stressKey(w), accented: ACUTE.test(w) }))
          .filter(w => /^[a-z][a-z']*$/.test(w.key));
        if (line.some(w => w.accented)) out.push(line);
      }
    }
  }
  return out;
}

test('the dictionary still agrees with the psalters it was read off', () => {
  const words = accentedWords();
  assert.ok(words.length > 20000, `expected the whole corpus, got ${words.length}`);

  // Every entry is checked against every occurrence, so a syllabifier change
  // that shifts indices shows up here as a flood of failures, not a silent
  // drift. 32 forms are pointed both ways by the two psalters and the
  // majority reading is stored, so a handful of honest disagreements remain.
  let wrong = 0;
  for (const [word, syll] of words) {
    const known = ENGLISH_STRESS.get(word);
    if (known === undefined) continue;   // single-syllable forms are not stored
    if (known !== syll) wrong++;
  }
  const covered = words.filter(([w]) => ENGLISH_STRESS.has(w)).length;
  assert.ok(
    wrong / covered < 0.005,
    `${wrong} of ${covered} stored accents disagree with the corpus — rebuild english-stress.ts`,
  );
});

test('every stored index names a syllable the word actually has', () => {
  for (const [word, syll] of ENGLISH_STRESS) {
    const sylls = englishPhoneticSyllabify(word);
    assert.ok(
      syll >= 0 && syll < sylls.length,
      `${word}: stress ${syll} but only ${sylls.length} syllables ${JSON.stringify(sylls)}`,
    );
  }
});

test('the words a psalm tone passes over, and the ones it does not', () => {
  const passedOver = [
    'the', 'of', 'a', 'an', 'at', 'into', 'than', 'whose', 'their',
    // Every pronoun and possessive. Each of them IS accented somewhere —
    // "Hé is like a trée" — but a line carries two or three accents out of
    // about seven words, and these take one in ten: his 0%, my 1%, their 0%,
    // they 10%, he 13%, you 26%. Asking whether a word is ever accented,
    // rather than how often, left all of them out.
    'he', 'she', 'we', 'they', 'you', 'his', 'her', 'him', 'them', 'us',
    'my', 'me', 'i', 'our', 'your', 'its', 'it',
  ];
  for (const w of passedOver) {
    assert.ok(ENGLISH_RARELY_ACCENTED.has(w), `${w} should be passed over`);
  }
  // And the words the cadence does land on. The nearest either side of the
  // 0.45 line are "all" at 47.0% and "this" at 46.3%, which it lands on, and
  // "own" at 44.4% and "up" at 44.2%, which it passes over.
  for (const w of ['all', 'lord', 'god', 'soul', 'name', 'this']) {
    assert.ok(!ENGLISH_RARELY_ACCENTED.has(w), `${w} takes the accent often enough`);
  }
  for (const w of ['own', 'up', 'whom']) {
    assert.ok(ENGLISH_RARELY_ACCENTED.has(w), `${w} sits just below the line`);
  }

  // Psalm 119's vocabulary, which was wrongly passed over while unpointed
  // lines were still counted in the denominator: on pointed lines "law" is
  // accented 91% of the time and "precepts" 80%, not 21% and 12%.
  for (const w of ['law', 'precepts', 'statutes', 'decrees', 'commands']) {
    assert.ok(!ENGLISH_RARELY_ACCENTED.has(w), `${w} is a noun the cadence lands on`);
  }
});

test('the fallback does not stress a prefix', () => {
  const stressOf = (word: string) => {
    const sylls = englishPhoneticSyllabify(word);
    return inferEnglishWordStress(word, sylls).indexOf(true);
  };

  // Not one of these is in the dictionary: the psalters either never use them
  // or never point them. "began" is the one that asked for the rule — it
  // appears once in the Revised Grail, on a pointed line, unaccented, and
  // "the first of two" sang "bégan".
  for (const w of ['began', 'begins', 'unpacked', 'consoles', 'remixed', 'disowned']) {
    assert.ok(!ENGLISH_STRESS.has(w), `${w} should be a fallback case, not a stored one`);
    assert.equal(stressOf(w), 1, `${w} is stressed off its prefix`);
  }

  // The rule reads a syllable, not a spelling: "bed-ding" and "red-dest" put
  // the b and the e in the same syllable as the consonant after them, so they
  // never match "be" or "re" and keep the first of two.
  for (const w of ['bedding', 'reddest']) {
    assert.ok(!ENGLISH_STRESS.has(w), `${w} should be a fallback case, not a stored one`);
    assert.equal(stressOf(w), 0, `${w} does not begin with a prefix syllable`);
  }

  // It is a rate, not a law, and this is what the rate costs: "con-sul" is a
  // noun stressed on its first syllable, and it comes out "consúl" because
  // 22 of the 23 two-syllable "con" forms the psalters point are verbs. No
  // psalm says "consul", which is why the trade is worth making.
  assert.equal(stressOf('consul'), 1);

  // Three syllables or more never consult the list: the penult is already off
  // the first syllable, so a prefix has nothing left to say.
  assert.equal(stressOf('reclassified'), 2);   // re-clas-si-FIED is wrong, but
                                               // it is the penult rule's wrong
                                               // answer, not the prefix rule's
});

test('the prefixes are syllables the psalters really do point off', () => {
  // Every entry must be a syllable englishPhoneticSyllabify can actually cut,
  // or the fallback would never match it.
  for (const prefix of ENGLISH_UNSTRESSED_PREFIXES) {
    assert.match(prefix, /^[a-z]+$/, `${prefix} is not a bare syllable`);
  }
  // The clearest cases, and the ones the threshold deliberately leaves out
  // because the psalters point them both ways: "fórmer" against "forgáve",
  // "précepts" against "prepáre", "pérfect" against "perfórmed".
  for (const prefix of ['be', 're', 'de', 'con', 'dis', 'un', 'a']) {
    assert.ok(ENGLISH_UNSTRESSED_PREFIXES.has(prefix), `${prefix} is an unstressed prefix`);
  }
  for (const prefix of ['for', 'pre', 'per', 'an', 'of']) {
    assert.ok(!ENGLISH_UNSTRESSED_PREFIXES.has(prefix), `${prefix} is pointed both ways`);
  }

  // And the rule earns its keep on held-out words: over the two-syllable
  // forms in the dictionary, taken as truth, the bare "first of two" rule
  // agrees with the psalters far less often than the prefix rule does.
  const two = [...ENGLISH_STRESS].filter(([w]) => englishPhoneticSyllabify(w).length === 2);
  assert.ok(two.length > 1000, `expected the dictionary, got ${two.length} two-syllable forms`);
  const right = (rule: (w: string) => number) =>
    two.filter(([w, syll]) => rule(w) === syll).length / two.length;
  const bare = right(() => 0);
  const withPrefixes = right(w =>
    (ENGLISH_UNSTRESSED_PREFIXES.has(englishPhoneticSyllabify(w)[0]) ? 1 : 0));
  assert.ok(bare < 0.70, `first-of-two scores ${(100 * bare).toFixed(1)}%`);
  assert.ok(withPrefixes > 0.85, `prefix rule scores ${(100 * withPrefixes).toFixed(1)}%`);
});

test('the words the old heuristic got wrong', () => {
  const stressOf = (word: string) => {
    const sylls = englishPhoneticSyllabify(word);
    return inferEnglishWordStress(word, sylls).indexOf(true);
  };
  // "stress the penult" put these one syllable off; the psalters know better.
  assert.equal(stressOf('salvation'), 1);      // sal-VA-tion
  assert.equal(stressOf('everlasting'), 2);    // ev-er-LAS-ting
  assert.equal(stressOf('sanctuary'), 0);      // SANC-tu-a-ry
  assert.equal(stressOf('israel'), 0);         // IS-ra-el
  assert.equal(stressOf('generations'), 2);    // gen-er-A-tions
  assert.equal(stressOf('thirsting'), 0);      // THIRST-ing
});

test('the cadence lands where the editors put it', () => {
  // The question a mediant of two accents asks of an unpointed English line:
  // are the last two words we would accent the last two the editors did?
  //
  // Asking only whether a word is EVER accented answered 32.7%; asking how
  // often, and passing over the words pointed less than a third of the time,
  // answers 81%. The measurement is on the Abbey psalter, which the shipped
  // dictionary has now seen — so this is a floor on a training set, there to
  // catch a regression, not the held-out number quoted in english-stress.ts.
  const lines = pointedLines();
  assert.ok(lines.length > 1500, `expected the psalter, got ${lines.length} lines`);

  let last2 = 0, last1 = 0, accents = 0;
  for (const line of lines) {
    const truth = line.flatMap((w, i) => (w.accented ? [i] : []));
    const ours = line.flatMap((w, i) => (isUnstressedWord(w.key) ? [] : [i]));
    accents += ours.length;
    if (truth.length >= 2 && ours.length >= 2
        && truth.at(-1) === ours.at(-1) && truth.at(-2) === ours.at(-2)) last2++;
    if (truth.length && ours.length && truth.at(-1) === ours.at(-1)) last1++;
  }

  assert.ok(last2 / lines.length > 0.80, `last two accents right ${(100 * last2 / lines.length).toFixed(1)}%`);
  assert.ok(last1 / lines.length > 0.94, `last accent right ${(100 * last1 / lines.length).toFixed(1)}%`);

  // And the count comes out where the psalters put it: two or three a line,
  // rarely four. The editors average 2.9 over this corpus.
  const perLine = accents / lines.length;
  assert.ok(perLine > 2.5 && perLine < 3.6, `${perLine.toFixed(2)} accents a line`);
});
