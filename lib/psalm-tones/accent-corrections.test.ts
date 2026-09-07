/**
 * Keeping the accent corrections.
 *
 * A correction used to live on the block and nowhere else: reload and it was
 * gone, and the same psalm came round again on the four-week cycle needing the
 * same clicks. These are the pure parts of the two layers that fix that — the
 * text kept whole and matched by its own words, and the words whose accent was
 * moved taught to accentuateEnglish.
 *
 * The tests that matter most are the two round trips: correct a psalm, save it,
 * and meet it again accented; and correct one word, save, and find a psalm
 * never opened accented right the first time.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_CORRECTIONS,
  accentTextKey,
  findSavedAccents,
  forgetTextAccents,
  learnWordAccents,
  mergeWordAccents,
  parseCorrections,
  saveTextAccents,
  wordAccentMap,
} from './accent-corrections';
import { accentuateEnglish, setWordAccent } from './english-phonetic';
import { setAccentAt } from './accent-editing';

/** Psalm 110 as iBreviary prints it: no accents, one hemistich a line. */
const IBREVIARY = [
  'The Lord’s revelation to my Master: †',
  '“Sit on my right: *',
  'your foes I will put beneath your feet.”',
].join('\n');

/**
 * A word the dictionary never saw, and guesses wrong.
 *
 * ENGLISH_STRESS was read off the Revised Grail, which does not use
 * "multitude", so the penult fallback sings "multítude" — and the word is
 * MUL-ti-tude. A wrong syllable on a word, correctable once and wrong
 * everywhere until it is: that is what the word layer is for. (Words the
 * psalters *do* use it gets right about 99.5% of the time, which is why the
 * example has to come from outside them.)
 */
const GUESSED_WRONG = 'a multitude of nations';

test('a text and its corrected self answer to the same key', () => {
  // This is the whole trick: the document holds the plain psalm and the store
  // holds the accented one, and they have to meet.
  assert.equal(accentTextKey(accentuateEnglish(IBREVIARY)), accentTextKey(IBREVIARY));

  // Refetched text whose spacing or apostrophe shifted is still the same text.
  assert.equal(
    accentTextKey('The Lord’s  revelation\n'),
    accentTextKey("The Lord's revelation"),
  );

  // Verse numbers are not: handing the saved copy back would put numbers into
  // a psalm they had been stripped from.
  assert.notEqual(accentTextKey('1 The Lord’s revelation'), accentTextKey('The Lord’s revelation'));
});

test('a corrected psalm is met again corrected', () => {
  const accents = accentuateEnglish(IBREVIARY);
  // The last hemistich comes out "pút benéath your féet": three accents where
  // the cadence wants two, so "benéath" is clicked off.
  const corrected = setAccentAt(accents, 2, 5, null);
  assert.match(accents, /benéath/);
  assert.match(corrected, /beneath/);

  const store = saveTextAccents(EMPTY_CORRECTIONS, corrected, 'Psalm 110');

  // Met again as the plain psalm the office loads, not as the corrected text.
  const found = findSavedAccents(store, IBREVIARY);
  assert.ok(found, 'the saved correction was not found from the plain psalm');
  assert.equal(found.accents, corrected);
  assert.equal(found.label, 'Psalm 110');

  // And an uncorrected psalm finds nothing rather than something near it.
  assert.equal(findSavedAccents(store, 'Praise the Lord, all you nations.'), null);
});

test('saving the same psalm again replaces the correction', () => {
  const first = setAccentAt(accentuateEnglish(IBREVIARY), 2, 5, null);
  const second = setAccentAt(first, 2, 4, null);

  let store = saveTextAccents(EMPTY_CORRECTIONS, first);
  store = saveTextAccents(store, second);

  assert.equal(store.texts.length, 1, 'the store stacked a second copy of one psalm');
  assert.equal(findSavedAccents(store, IBREVIARY)?.accents, second);
});

test('forgetting a text keeps what its words taught', () => {
  const corrected = setAccentAt(accentuateEnglish(GUESSED_WRONG), 0, 1, 0);
  let store = saveTextAccents(EMPTY_CORRECTIONS, corrected);
  store = mergeWordAccents(store, learnWordAccents(corrected));
  assert.equal(store.words.multitude, 0);

  store = forgetTextAccents(store, GUESSED_WRONG);
  assert.equal(store.texts.length, 0);
  // A wrongly-stressed word is wrong independently of where it was noticed.
  assert.equal(store.words.multitude, 0);
});

test('a moved accent is used in a psalm never opened', () => {
  assert.equal(accentuateEnglish(GUESSED_WRONG), 'a multítude of nátions');
  const corrected = setAccentAt(accentuateEnglish(GUESSED_WRONG), 0, 1, 0);
  assert.equal(corrected, 'a múltitude of nátions');

  const store = mergeWordAccents(EMPTY_CORRECTIONS, learnWordAccents(corrected));
  assert.equal(
    accentuateEnglish('the multitude of the peoples', wordAccentMap(store)),
    'the múltitude of the péoples',
    'the correction was not carried to other text',
  );

  // Only that word. Everything else still comes from the dictionary — which
  // is right about the words it knows: "Master" is MAS-ter, and stays there.
  assert.equal(accentuateEnglish('to my Master'), 'to my Máster');
  assert.equal(accentuateEnglish('to my Master', wordAccentMap(store)), 'to my Máster');
});

test('unaccenting a word teaches nothing about the word', () => {
  // "benéath" passed over is a fact about this line's cadence. A word list
  // that learned it would quietly unaccent the whole psalter.
  const accents = accentuateEnglish(IBREVIARY);
  const corrected = setAccentAt(accents, 2, 5, null);
  assert.match(corrected, /beneath/);

  const learned = learnWordAccents(corrected);
  assert.equal(learned.has('beneath'), false);
  assert.match(accentuateEnglish('beneath', wordAccentMap(mergeWordAccents(EMPTY_CORRECTIONS, learned))), /benéath/);
});

test('a word the dictionary passes over teaches nothing, even accented', () => {
  // "of" carrying a cadence in one verse must not become an accented word
  // everywhere: the psalters seldom point it, and that stands.
  const learned = learnWordAccents('the hand óf the Lórd');
  assert.equal(learned.has('of'), false);
  // "Lórd" is where the dictionary would have put it, so there is no override
  // to keep — null, which is also what drops one that has become unnecessary.
  assert.equal(learned.get('lord'), null);
});

test('moving the accent back drops the saved override', () => {
  let store = mergeWordAccents(
    EMPTY_CORRECTIONS,
    learnWordAccents(setAccentAt(accentuateEnglish(GUESSED_WRONG), 0, 1, 0)),
  );
  assert.equal(store.words.multitude, 0);

  // The same text saved again with the dictionary's own guess put back.
  store = mergeWordAccents(store, learnWordAccents(accentuateEnglish(GUESSED_WRONG)));
  assert.equal('multitude' in store.words, false, 'a correction that was undone is still on disk');
});

test('a text that accents one word two ways teaches nothing', () => {
  // Not a lexical fact, whichever way it is read — so no override is claimed,
  // and an earlier one is dropped rather than left half-true.
  let store = mergeWordAccents(EMPTY_CORRECTIONS, new Map([['multitude', 0]]));
  const both = `${setWordAccent('multitude', 0)} and ${setWordAccent('multitude', 1)}`;
  store = mergeWordAccents(store, learnWordAccents(both));
  assert.equal('multitude' in store.words, false);
});

test('a hand-edited store is read as far as it makes sense', () => {
  // One bad entry must not take the accent editor down with it.
  const store = parseCorrections({
    version: 1,
    words: { multitude: 0, broken: 'penult', negative: -1, fractional: 1.5 },
    texts: [
      { accents: 'a múltitude of nátions', label: 'Psalm 110', updated: '2026-09-07' },
      { accents: '   ' },
      { label: 'no text at all' },
      'not an entry',
    ],
  });
  assert.deepEqual(store.words, { multitude: 0 });
  assert.equal(store.texts.length, 1);
  assert.equal(store.texts[0].accents, 'a múltitude of nátions');

  assert.deepEqual(parseCorrections(null), EMPTY_CORRECTIONS);
  assert.deepEqual(parseCorrections('{}'), EMPTY_CORRECTIONS);
});
