import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copySystemTone, listSystemTones, narrowSystemTones } from './system-tones';
import { applyMarkExample, gabcFormula, markGroups, pitchGlyphs, validateTone } from './creator';
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

test('every tone is reachable through the four selectors, and named once', () => {
  const all = listSystemTones();
  for (const tone of all) {
    const found = narrowSystemTones(all, tone);
    assert.equal(found.picked?.id, tone.id, `${tone.name} is not reachable`);
  }
  // A family, mode and ending together have to mean one tone, or the
  // selectors would silently pass over the others sharing that place.
  const places = all.map(t => [t.backend, t.family, t.tone, t.variant].join('\u0000'));
  assert.equal(new Set(places).size, all.length);
});

test('narrowing keeps what it can and never comes to rest on nothing', () => {
  const all = listSystemTones();
  // The English rules and the positional ones both have a mode 8 ending a′,
  // so moving between the two families stays where it was.
  const moved = narrowSystemTones(all, { backend: 'lyps', family: 'Positional — syllable count', tone: '8', variant: 'a′' });
  assert.equal(moved.picked?.id, 'system:lyps:modes:eight:a_prime');
  // Gregorian 2 has only the one ending, so the a′ asked for gives way to it.
  const gone = narrowSystemTones(all, { backend: 'lyps', family: 'Gregorian — stress aware', tone: '2', variant: 'a′' });
  assert.equal(gone.picked?.id, 'system:lyps:gregorian:two:d');
  // Nothing chosen at all still names a tone, which is what opens the panel.
  const opening = narrowSystemTones(all, { backend: 'lyps', family: '', tone: '', variant: '' });
  assert.ok(opening.picked);
  assert.equal(opening.family, opening.picked!.family);
  // An engine with nothing in it is the one case with no tone to come to.
  assert.equal(narrowSystemTones([], { backend: 'lyps', family: '', tone: '', variant: '' }).picked, null);
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

test('a copied rule is fitted with the short-line rule its figures need', () => {
  // The mediant of English 1 is two figures, and what each does on a line
  // with no room for it is invisible on the model line. Only the psalm shows
  // it, so the copy is tried against every half-line of the psalm.
  const psalm = [
    'O Gód, you are my Gód; at dawn I séek you;', 'for yóu my sóul is thírsting.',
    'Your loving mércy is bétter than lífe;', 'my líps will spéak your práise.',
    'I will bléss you áll my lífe;', 'in your náme I will líft up my hánds.',
    'My sóul shall be fílled as with a bánquet;', 'with joyful líps, my móuth shall práise you.',
    'Sing to the Lórd a new sóng', 'to behóld your stréngth and your glóry.',
  ];
  const point = (line: string) => applyMode('english', 'one', 'first', syllabifyLine(line));
  const follows = (tone: ReturnType<typeof copySystemTone>['tone']) =>
    psalm.filter(line => applyMarkExample(syllabifyLine(line), tone.examples.first) === point(line)).length;
  const { tone } = copySystemTone('system:lyps:english:one:a', samples, 'en', psalm);
  // On a line whose last accent is also its last syllable, "− +" sings only
  // its "+" there and passes the "−" back; "+ −" on the accent before takes
  // that mark along, or leaves it behind on its accent and steps back.
  assert.deepEqual(markGroups(tone.examples.first).map(g => `${g.ordinal}:${g.crowded}`), ['2:step', '1:pass']);
  // Unfitted — every figure left to step back — it points less of the psalm.
  const unfitted = { ...tone, examples: { ...tone.examples, first: { ...tone.examples.first, syllables: tone.examples.first.syllables.map(s => ({ ...s, crowded: undefined })) } } };
  assert.ok(follows(tone) > follows(unfitted), `${follows(tone)} is no better than ${follows(unfitted)}`);
  assert.equal(follows(tone), psalm.length, `only ${follows(tone)} of ${psalm.length} half-lines pointed as the tone does`);
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
