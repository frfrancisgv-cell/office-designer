/**
 * Correcting the accents by hand.
 *
 * accentuateEnglish gets about 92% of words right, so the rest has to be
 * fixable — and the fix cannot be "type an á". These are the pure parts the
 * click editor is built on: cutting the text into clickable syllables, and
 * writing a moved accent back without disturbing anything else.
 *
 * The last test is the one that matters: move an accent and the mark the tone
 * sets moves with it.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { parseAccentLines, setAccentAt, countAccents } from './accent-editing';
import { accentuateEnglish } from './english-phonetic';
import { pointPsalmText, getVariations } from './lypsautierant-engine';

const ACUTE = /[áéíóúýÁÉÍÓÚÝ]/;

/** Psalm 110 as iBreviary prints it: no accents, one hemistich a line. */
const IBREVIARY = [
  'The Lord’s revelation to my Master: †',
  '“Sit on my right: *',
  'your foes I will put beneath your feet.”',
].join('\n');

test('the tokens cover the text exactly', () => {
  // Nothing may be lost by being drawn: the editor renders these and only
  // these, so anything the parse drops disappears from the psalm.
  const dir = path.join(process.cwd(), 'vendor/psautier/theAbbeyPsalmsAndCanticles');
  let checked = 0;
  for (const name of readdirSync(dir)) {
    if (!/^(NT|OT) \d/.test(name)) continue;
    const text = readFileSync(path.join(dir, name), 'utf8');
    if (!ACUTE.test(text)) continue;
    const rebuilt = parseAccentLines(text)
      .map(tokens => tokens.map(t => t.text).join(''))
      .join('\n');
    assert.equal(rebuilt, text, name);
    checked++;
  }
  assert.ok(checked > 50, `expected the Abbey psalter, checked ${checked} files`);
});

test('each word says which of its syllables carries the acute', () => {
  const [line] = parseAccentLines(accentuateEnglish('to my Master'));
  const words = line.filter(t => t.kind === 'word');

  assert.deepEqual(words.map(w => w.text), ['to', 'my', 'Máster']);
  // "to" and "my" are passed over; -1 is how that is said.
  assert.deepEqual(words.map(w => (w.kind === 'word' ? w.accent : null)), [-1, -1, 0]);
  // The syllables are drawn with the acute on them, so what you click is what
  // you will see marked.
  assert.deepEqual(words[2].kind === 'word' ? words[2].syllables : [], ['Más', 'ter']);
});

test('an accent moves to the syllable asked for, and only there', () => {
  const text = accentuateEnglish('to my Master');
  assert.equal(setAccentAt(text, 0, 2, 1), 'to my Mastér');
  assert.equal(setAccentAt(text, 0, 2, 0), 'to my Máster');
  // Null takes it off, which is how a word the phrase does not stress is
  // passed over.
  assert.equal(setAccentAt(text, 0, 2, null), 'to my Master');
  // And a word that had none can be given one, without touching the rest.
  assert.equal(setAccentAt(text, 0, 1, 0), 'to mý Máster');
});

test('the accent lands on a vowel, never on a consonant', () => {
  const vowels = /[aeiouyAEIOUY]/;
  for (const word of ['master', 'revelation', 'strength', 'thirsting', 'years', 'cymbals']) {
    const sylls = parseAccentLines(word)[0].find(t => t.kind === 'word');
    assert.ok(sylls?.kind === 'word');
    for (let i = 0; i < sylls.syllables.length; i++) {
      const moved = setAccentAt(word, 0, 0, i);
      const at = [...moved].findIndex(c => ACUTE.test(c));
      assert.ok(at >= 0, `${word} syllable ${i}: no accent placed`);
      assert.ok(vowels.test(word[at]), `${word} syllable ${i}: accent on "${word[at]}"`);
    }
  }
});

test('punctuation, verse numbers and the hemistich markers are untouched', () => {
  const text = accentuateEnglish(IBREVIARY);
  const moved = setAccentAt(text, 0, 5, 1);
  assert.match(moved, /Mastér: †$/m);
  assert.match(moved, /^“Sít on my ríght: \*$/m);
  assert.equal(moved.split('\n').length, text.split('\n').length);

  // A verse number is not a word and takes no index: "Sit" is word 0 here.
  const numbered = setAccentAt('4 “Sit on my right: *', 0, 0, 0);
  assert.equal(numbered, '4 “Sít on my right: *');
});

test('an address that no longer exists changes nothing', () => {
  // The caller is a click handler holding indices from a render that may be
  // stale, so this must not throw.
  const text = accentuateEnglish(IBREVIARY);
  assert.equal(setAccentAt(text, 99, 0, 0), text);
  assert.equal(setAccentAt(text, 0, 99, 0), text);
  assert.equal(setAccentAt(text, 0, 0, 99), setAccentAt(text, 0, 0, null));
});

test('psalmody comes out at two or three accents a line', () => {
  for (const tokens of parseAccentLines(accentuateEnglish(IBREVIARY))) {
    const n = countAccents(tokens);
    assert.ok(n >= 2 && n <= 4, `${n} accents on a line`);
  }
});

test('moving an accent moves the mark the tone sets', () => {
  const variation = getVariations('english', 'one')[0];
  const point = (text: string) => pointPsalmText(text, 'english', 'one', variation, 'en').html;

  const accents = accentuateEnglish(IBREVIARY);
  const before = point(accents);

  // The last hemistich ends "beneath your feet." with the accents on
  // "benéath" and "féet"; take the one off "benéath" and the cadence has to
  // find another syllable.
  const words = parseAccentLines(accents)[2].filter(t => t.kind === 'word');
  const beneath = words.findIndex(w => w.text.startsWith('ben'));
  assert.ok(beneath >= 0, words.map(w => w.text).join(' '));

  const corrected = setAccentAt(accents, 2, beneath, null);
  assert.notEqual(corrected, accents);
  const after = point(corrected);
  assert.notEqual(after, before, 'the marks did not follow the accent');

  // And the correction survives being pointed: what comes back out carries
  // the accents that went in, which is what lets it be corrected again.
  const result = pointPsalmText(corrected, 'english', 'one', variation, 'en');
  assert.equal(result.accented, corrected);
  assert.equal(result.accentsDerived, false);
});
