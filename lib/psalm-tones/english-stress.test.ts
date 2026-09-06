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
import { ENGLISH_STRESS, ENGLISH_RARELY_ACCENTED } from './english-stress';

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
    // about seven words, and these take one in ten: his 0%, my 0%, their 0%,
    // they 8%, he 11%, me 15%, you 23%. Asking whether a word is ever
    // accented, rather than how often, left all of them out.
    'he', 'she', 'we', 'they', 'you', 'his', 'her', 'him', 'them', 'us',
    'my', 'me', 'i', 'our', 'your', 'its', 'it',
  ];
  for (const w of passedOver) {
    assert.ok(ENGLISH_RARELY_ACCENTED.has(w), `${w} should be passed over`);
  }
  // And the words just the other side of the line, which are not passed over:
  // "all" is accented 43% of the time, "this" 38%, "whom" 38%.
  for (const w of ['all', 'this', 'whom', 'lord', 'god', 'soul', 'name']) {
    assert.ok(!ENGLISH_RARELY_ACCENTED.has(w), `${w} takes the accent often enough`);
  }
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
