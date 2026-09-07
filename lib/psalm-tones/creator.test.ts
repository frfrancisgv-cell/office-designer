import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accentSpacing, applyMarkExample, gabcFormula, markRules, markedSyllables, noteCount, pitchGlyphs, validPitch, scoreMismatches, scoreSyllables, scoredSyllables, validateTone, type ToneExample, type CreatedTone } from './creator';
import { pointPsalmText } from './lypsautierant-engine';
import { applyPsalmTone } from './psalmtone-wrapper';
const example: ToneExample = { anchor: 'end', syllables: [
  { text: 'Praise', join: false, mark: '', pitch: 'h', role: 'recite' },
  { text: 'the', join: false, mark: '-', pitch: 'h', role: 'recite' },
  { text: 'Lórd', join: false, mark: '+', pitch: 'i', role: 'accent' },
  { text: 'now', join: false, mark: '=', pitch: 'h', role: 'fixed' },
] };
test('mark inference transfers cadence positions to longer and shorter lines', () => {
  assert.deepEqual(markRules(example), [{ from: 'anchor', offset: -2, mark: '-' }, { from: 'anchor', offset: -1, mark: '+' }, { from: 'anchor', offset: 0, mark: '=' }]);
  assert.equal(applyMarkExample('All the earth praise the Lord now', example), 'All the earth praise \\mi{the} \\pl{Lord} \\dmi{now}');
  assert.equal(applyMarkExample('God', example), '\\dmi{God}');
  assert.equal(applyMarkExample('glo -- ry to God', example), 'glo\\mi{ry} \\pl{to} \\dmi{God}');
});
test('accent anchor follows final stress rather than line length', () => {
  const accent = { ...example, anchor: 'accent' as const };
  assert.equal(applyMarkExample('Praise the Lórd for ever', accent), 'Praise \\mi{the} \\pl{Lórd} \\dmi{for} ever');
  assert.equal(applyMarkExample('text without accents', accent), 'text without accents');
});
test('a repeating syllable stretches to whatever the real line needs', () => {
  // "Praise" opens on a mark of its own, "the" repeats for as long as the
  // line lasts, and the last two syllables stay pinned to the ending.
  const elastic: ToneExample = { anchor: 'end', syllables: [
    { text: 'Praise', join: false, mark: '+', pitch: 'h', role: 'fixed' },
    { text: 'the', join: false, mark: '-', pitch: 'h', role: 'recite', repeat: true },
    { text: 'Lórd', join: false, mark: '+', pitch: 'i', role: 'accent' },
    { text: 'now', join: false, mark: '=', pitch: 'h', role: 'fixed' },
  ] };
  assert.deepEqual(markRules(elastic), [
    { from: 'start', offset: 0, mark: '+' },
    { from: 'anchor', offset: -1, mark: '+' },
    { from: 'anchor', offset: 0, mark: '=' },
  ]);
  assert.equal(
    applyMarkExample('All the earth praise the Lord now', elastic),
    '\\pl{All} \\mi{the} \\mi{earth} \\mi{praise} \\mi{the} \\pl{Lord} \\dmi{now}',
  );
  // Same tone, a line of the model's own length: the fill covers one syllable.
  assert.equal(applyMarkExample('Praise the Lord now', elastic), '\\pl{Praise} \\mi{the} \\pl{Lord} \\dmi{now}');
  // Shorter than the model: the cadence wins and nothing is marked twice.
  assert.equal(applyMarkExample('to God', elastic), '\\pl{to} \\dmi{God}');
  // Each half of a joined word is its own syllable for the fill, and the two
  // stay welded together in the output.
  assert.equal(applyMarkExample('glo -- ry to our Gód', elastic), '\\pl{glo}\\mi{ry} \\mi{to} \\pl{our} \\dmi{Gód}');
});
test('a repeating syllable measures the opening from the accent anchor too', () => {
  const elastic: ToneExample = { anchor: 'accent', syllables: [
    { text: 'Praise', join: false, mark: '+', pitch: 'h', role: 'fixed' },
    { text: 'the', join: false, mark: '', pitch: 'h', role: 'recite', repeat: true },
    { text: 'Lórd', join: false, mark: '=', pitch: 'i', role: 'accent' },
  ] };
  assert.equal(applyMarkExample('Práise the Lórd for ever', elastic), '\\pl{Práise} the \\dmi{Lórd} for ever');
});
test('validation holds the repeating syllable to one, ahead of the anchor', () => {
  const tone: CreatedTone = { version: 1, id: 't', name: 'T', backend: 'lyps', clef: 'c4', examples: {
    first: example, termination: example, flex: example } };
  const twice = structuredClone(tone);
  twice.examples.first.syllables[0].repeat = true;
  twice.examples.first.syllables[1].repeat = true;
  assert.throws(() => validateTone(twice), /may repeat/);
  const behind = structuredClone(tone);
  behind.examples.first.syllables[3].repeat = true;
  assert.throws(() => validateTone(behind), /before the anchor/);
  const ok = structuredClone(tone);
  ok.examples.first.syllables[0].repeat = true;
  assert.equal(validateTone(ok), ok);
});
test('GABC inference collapses recitation and produces an executable cadence', () => {
  assert.equal(gabcFormula(example), "hr 'i hr h.");
  const rendered = applyPsalmTone({ text: 'Laudáte Dóminum omnes gentes', gabc: gabcFormula(example), clef: 'c4', lang: 'la', useBoldItalic: false });
  assert.match(rendered, /\(i\)/);
  assert.match(rendered, /\(h\.\)/);
});
test('custom marks use existing whole-psalm structure and HTML output', () => {
  const rule = (line: string) => applyMarkExample(line, example);
  const result = pointPsalmText('Praise the Lórd * all the éarth.\n\nSing to Gód †\npraise his náme *\nfor éver.', 'english', 'eight', 'a', 'en', { first: rule, termination: rule, flex: rule });
  assert.match(result.html, /lyps-/);
  assert.match(result.html, /†/);
  assert.match(result.latex, /\\dmi\{/);
});
test('the staff says where jgabc will not sing the cadence as drawn', () => {
  const drawn: ToneExample = { anchor: 'end', syllables: [
    { text: 'O', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'Gód;', join: false, mark: '', pitch: 'i', role: 'accent' },
    { text: 'at', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'dawn', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'I', join: false, mark: '', pitch: 'g', role: 'fixed' },
    { text: 'séek', join: false, mark: '', pitch: 'h', role: 'accent' },
    { text: 'you;', join: false, mark: '', pitch: 'h', role: 'fixed' },
  ] };
  // Four syllables apart, which is one more than jgabc's cadence allows.
  assert.match(accentSpacing(drawn)!, /“Gód;” and “séek” have 3/);
  assert.equal(accentSpacing({ ...drawn, syllables: drawn.syllables.filter(s => s.text !== 'dawn') }), null);
  // The reading is per syllable, and the closing dot is not a difference.
  assert.deepEqual(scoreSyllables('Gód;(h) at(h) dawn(i) I(g) séek(h) you;(h.)').map(s => s.notes), ['h', 'h', 'i', 'g', 'h', 'h']);
  assert.deepEqual(scoreMismatches(drawn, 'O(h) Gód;(h) at(h) dawn(i) I(g) séek(h) you;(h.)'),
    ['“Gód;” is drawn on i but sung on h; “dawn” is drawn on h but sung on i.']);
  assert.deepEqual(scoreMismatches(drawn, 'O(h) Gód;(i) at(h) dawn(h) I(g) séek(h) you;(h.)'), []);
  const short = scoreMismatches(drawn, 'O(h) Gód;(i) séek(h) you;(h.)');
  assert.match(short[0], /divides this cadence into 4 syllables, not the 7/);
});
test('saved tone validation rejects malformed formulas and unsafe text', () => {
  const tone: CreatedTone = { version: 1, id: 'test', name: 'Test', backend: 'lyps', clef: 'c4', examples: { first: example, termination: example, flex: example } };
  assert.deepEqual(validateTone(JSON.parse(JSON.stringify(tone))), tone);
  assert.throws(() => validateTone({ ...tone, clef: 'z9' }));
  const bad = structuredClone(tone); bad.examples.first.syllables[0].text = '<script>';
  assert.throws(() => validateTone(bad));
});

test('an existing pointing rule is read back onto the syllables it marked', () => {
  const line = 'for yóu my sóul is thír -- sting.';
  const pointed = 'for yóu \\dmi{my} \\pl{sóul} \\pl{is} \\mi{thír}sting.';
  const syllables = markedSyllables(line, pointed);
  assert.deepEqual(syllables.map(s => `${s.text}${s.mark}`), ['for', 'yóu', 'my=', 'sóul+', 'is+', 'thír-', 'sting.']);
  // The closed-up word divides where the editor divides it, not where the
  // rule left it, and the mark stays on the syllable it was set on.
  assert.deepEqual(syllables.map(s => s.join), [false, false, false, false, false, false, true]);
  assert.equal(applyMarkExample(line, { syllables, anchor: 'end' }), pointed);
  // Two rules on one syllable are the pair mark written the long way round.
  assert.equal(markedSyllables('wá -- ter.', '\\mi{\\pl{wá}}\\mi{ter.}')[0].mark, '-+');
  // The dagger in the margin is not a mark, and its argument is not text.
  assert.equal(markedSyllables('you;', '\\mi{you;}\\flagflex{\\dag}')[0].mark, '-');
  // Text that does not match letter for letter comes back unmarked rather
  // than marked in the wrong places.
  assert.deepEqual(markedSyllables('for yóu', '\\pl{some} other line').map(s => s.mark), ['', '']);
});
test('an existing psalm tone is read back off the line the engine sang it on', () => {
  // Tone 1g: the tenor, two preparatory notes, the accent, and the close.
  const read = scoredSyllables('for(h) yóu(h) my(h) sóul(g) is(f) thír(gh)sting.(g.)', "hr g f 'gh gr g.");
  assert.deepEqual(read!.syllables.map(s => `${s.text}:${s.pitch}:${s.role}`), [
    'for:h:recite', 'yóu:h:recite', 'my:h:recite', 'sóul:g:fixed', 'is:f:fixed', 'thír:gh:accent', 'sting.:g:fixed',
  ]);
  assert.equal(gabcFormula({ syllables: read!.syllables, anchor: 'end' }), "hr g f 'gh gr g.");
  assert.deepEqual(read!.simplified, []);
  // An accent and the open note beside it share a pitch; the stress tells them
  // apart, so the accent lands on the stressed syllable and not before it.
  const tricky = scoredSyllables('for(h) yóu(h) my(h) sóul(g) is(f) thír(g)sting.(ghg.)', "hr g f 'g gr ghg.");
  assert.equal(tricky!.syllables[5].role, 'accent');
  // A flat is pitch, not decoration: “ixi” is a flat and the i it lowers, and
  // reading it as two notes would invent a note that is not sung.
  const flat = scoredSyllables('at(h) dawn(ixi)', "hr 'ixi.");
  assert.equal(flat!.syllables[1].pitch, 'ixi');
  assert.deepEqual(flat!.simplified, []);
  // The shapes are the notation and are kept whole: a climacus keeps its
  // virga and the diamonds that fall from it.
  const ornate = scoredSyllables('at(h) dawn(gvFED.)', "hr 'gvFED.");
  assert.equal(ornate!.syllables[1].pitch, 'gvFED');
  assert.deepEqual(ornate!.simplified, []);
  // The open note after an accent is one note — the first of the neume that
  // follows — and not the whole climacus written out a second time.
  assert.equal(gabcFormula({ syllables: ornate!.syllables, anchor: 'end' }), "hr 'gvFED gr gvFED.");
  // What the editor has no reading for at all does come off, and is said out
  // loud: GABC's angle-bracket liquescents are left out of the pitches this
  // app writes, so a note bearing one is drawn as the note underneath.
  const strange = scoredSyllables('at(h) dawn(g<)', "hr 'g<.");
  assert.equal(strange!.syllables[1].pitch, 'g');
  assert.match(strange!.simplified[0], /“dawn” is sung on g<, drawn here as g/);
  // The syllables are the engine's own: it broke “thírsting” where it sang
  // the break, and the editor draws the word broken there too.
  assert.deepEqual(read!.syllables.map(s => s.join), [false, false, false, false, false, false, true]);
  assert.equal(scoredSyllables('', 'hr h.'), null);
});

test('a pitch is read as the notes and accidentals GABC writes', () => {
  assert.deepEqual(pitchGlyphs('ixi'), [
    { pitch: 'i', accidental: 'x', shape: 'punctum', dots: 0 },
    { pitch: 'i', shape: 'punctum', dots: 0 },
  ]);
  // A capital is the note lying over as a diamond, v hangs a virga's stem on
  // it, w serrates it, _ sets an episema above and . a mora beside.
  assert.deepEqual(pitchGlyphs('gvFED').map(g => `${g.pitch}:${g.shape}`), ['g:virga', 'f:inclinatum', 'e:inclinatum', 'd:inclinatum']);
  assert.deepEqual(pitchGlyphs('g_hw').map(g => `${g.pitch}:${g.shape}${g.episema ? '+episema' : ''}`), ['g:punctum+episema', 'h:quilisma']);
  assert.equal(pitchGlyphs('hi.j')[1].dots, 1);
  assert.ok(pitchGlyphs('h/i')[0].gap);
  assert.ok(validPitch('gvFED') && validPitch('ixi') && validPitch("hiHGhih.ghGFE'fggf"));
  assert.ok(!validPitch('') && !validPitch('vv') && !validPitch('h<i') && !validPitch('h{i'));
  // The flat is not sung, so a reciting note may carry one and still be one note.
  assert.equal(noteCount('ixi'), 1);
  assert.equal(noteCount('gh'), 2);
  const flat: ToneExample = { syllables: [
    { text: 'at', join: false, mark: '', pitch: 'ixh', role: 'recite' },
    { text: 'dáwn', join: false, mark: '', pitch: 'ixi', role: 'accent' },
  ], anchor: 'end' };
  const tone: CreatedTone = { version: 1, id: 'flat', name: 'Flat', backend: 'jgabc', clef: 'c4', examples: { first: flat, termination: flat, flex: flat } };
  assert.deepEqual(validateTone(structuredClone(tone)), tone);
  const bad = structuredClone(tone); bad.examples.first.syllables[0].pitch = 'xi';
  assert.throws(() => validateTone(bad));
});
