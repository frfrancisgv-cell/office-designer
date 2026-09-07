import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copySystemTone, listSystemTones } from './system-tones';
import { applyMarkExample, gabcFormula, pitchGlyphs, validateTone } from './creator';
import { syllabifyLine } from './lypsautierant-syllabify';
import { applyMode } from './lypsautierant-modes';

const samples = {
  first: 'O Gód, you are my Gód; at dawn I séek you;',
  termination: 'for yóu my sóul is thírsting.',
  flex: 'My bódy pínes for yóu',
};

test('every tone the app ships with can be copied onto a model text', () => {
  const all = listSystemTones();
  // The two families: the psautier pointing rules and the Gregorian tones.
  assert.ok(all.length > 100, `only ${all.length} tones listed`);
  assert.ok(all.some(t => t.backend === 'lyps') && all.some(t => t.backend === 'jgabc'));
  for (const tone of all) validateTone(copySystemTone(tone.id, samples, 'en').tone);
  assert.throws(() => copySystemTone('system:jgabc:no such tone:', samples, 'en'), /not in the library/);
});

test('a copy is a new tone, never the one it was taken from', () => {
  const { tone } = copySystemTone('system:lyps:english:eight:a', samples, 'en');
  assert.match(tone.name, /\(copy\)$/);
  assert.doesNotMatch(tone.id, /^system:/);
  assert.notEqual(copySystemTone('system:lyps:english:eight:a', samples, 'en').tone.id, tone.id);
});

test('a copied pointing rule marks the syllables its own rule marks', () => {
  const { tone } = copySystemTone('system:lyps:english:eight:a', samples, 'en');
  const line = syllabifyLine(samples.termination);
  assert.equal(applyMarkExample(line, tone.examples.termination), applyMode('english', 'eight', 'a', line));
});

test('a copied psalm tone deduces the formula it was sung with', () => {
  const { tone, warnings } = copySystemTone('system:jgabc:1.:g', samples, 'en');
  assert.equal(tone.clef, 'c4');
  assert.equal(gabcFormula(tone.examples.termination), "hr g f 'gh gr g.");
  // Tone 1's mediant flattens the i of its accent, and the flat is pitch: it
  // comes across whole, and there is nothing to warn about.
  assert.equal(gabcFormula(tone.examples.first), "f gh hr 'ixi hr 'g hr h.");
  assert.deepEqual(warnings, []);
});

test('a tone with no flex of its own gets one, not a second mediant', () => {
  const { tone } = copySystemTone('system:jgabc:1.:g', {
    ...samples, flex: 'like a drý, weary lánd withóut wáter.',
  }, 'en');
  // Recite on the tenor, fall to the tone's flex note at the last accent, and
  // stay there: the mediant standing in its place was longer than a flex line.
  assert.equal(gabcFormula(tone.examples.flex), "hr 'g gr g.");
  assert.deepEqual(tone.examples.flex.syllables.slice(-2).map(s => `${s.text}(${s.pitch})`), ['wá(g)', 'ter.(g)']);
});

test('the shapes of a copied tone are the shapes it is written with', () => {
  // Tone 1 D closes on a climacus: a virga and the diamonds falling from it.
  const { tone, warnings } = copySystemTone('system:jgabc:1.:D', samples, 'en');
  assert.equal(tone.examples.termination.syllables.at(-1)!.pitch, 'gvFED');
  assert.deepEqual(pitchGlyphs('gvFED').map(g => g.shape), ['virga', 'inclinatum', 'inclinatum', 'inclinatum']);
  assert.deepEqual(warnings, []);
});
