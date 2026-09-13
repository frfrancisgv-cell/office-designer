import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DISCERNED_RULE, accentSpacing, anchorIndex, applyMarkExample, cadenceStart, formulaPreview, gabcFormula, holdNote, markGroups, markRules, markedSyllables, noteCount, pitchGlyphs, validPitch, scoreMismatches, scoreSyllables, scoredSyllables, validateTone, type Crowding, type ToneExample, type ToneSyllable, type CreatedTone } from './creator';
import { pointPsalmText } from './lypsautierant-engine';
import { applyMode } from './lypsautierant-modes';
import { syllabifyLine } from './lypsautierant-syllabify';
import { copySystemTone } from './system-tones';
import { applyPsalmTone, markEnglishAccents } from './psalmtone-wrapper';
const example: ToneExample = { anchor: 'end', syllables: [
  { text: 'Praise', join: false, mark: '', pitch: 'h', role: 'recite' },
  { text: 'the', join: false, mark: '-', pitch: 'h', role: 'recite' },
  { text: 'Lórd', join: false, mark: '+', pitch: 'i', role: 'accent' },
  { text: 'now', join: false, mark: '=', pitch: 'h', role: 'fixed' },
] };
test('conditional creator tones validate and state their editable rule', () => {
  const tone: CreatedTone = {
    version: 1, id: 'conditional', name: 'Conditional Tone 1', backend: 'discerned', clef: 'c4',
    examples: { first: example, termination: example, flex: example },
    discerned: DEFAULT_DISCERNED_RULE,
  };
  assert.equal(validateTone(tone), tone);
  assert.match(formulaPreview(tone), /previous stress ixi; return h; passing g/);
  assert.throws(() => validateTone({ ...tone, discerned: { ...DEFAULT_DISCERNED_RULE, reciting: '' } }), /one valid GABC note/);
});
test('mark inference transfers cadence positions to longer and shorter lines', () => {
  assert.deepEqual(markRules(example), [{ from: 'end', offset: -2, mark: '-' }, { from: 'end', offset: -1, mark: '+' }, { from: 'end', offset: 0, mark: '=' }]);
  assert.equal(applyMarkExample('All the earth praise the Lord now', example), 'All the earth praise \\mi{the} \\pl{Lord} \\dmi{now}');
  assert.equal(applyMarkExample('God', example), '\\dmi{God}');
  assert.equal(applyMarkExample('glo -- ry to God', example), 'glo\\mi{ry} \\pl{to} \\dmi{God}');
});
test('accent anchor follows final stress rather than line length', () => {
  const accent = { ...example, anchor: 'accent' as const };
  assert.equal(applyMarkExample('Praise the Lórd for ever', accent), 'Praise \\mi{the} \\pl{Lórd} \\dmi{for} ever');
  assert.equal(applyMarkExample('text without accents', accent), 'text without accents');
});
test('the unmarked opening is the elastic part, and nothing is spread over it', () => {
  // No rule in psautier/{english,gregorian} ever repeats a mark across the
  // recitation: the recitation is precisely what carries no mark, so a model
  // line only ever describes the window at the end of a hemistich.
  const opening: ToneExample = { anchor: 'end', syllables: [
    { text: 'Praise', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'the', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'Lórd', join: false, mark: '+', pitch: 'i', role: 'accent' },
    { text: 'now', join: false, mark: '=', pitch: 'h', role: 'fixed' },
  ] };
  assert.equal(cadenceStart(opening), 2);
  assert.equal(
    applyMarkExample('All the earth praise the Lord now', opening),
    'All the earth praise the \\pl{Lord} \\dmi{now}',
  );
});
test('a mark on the opening syllable can be pinned there instead', () => {
  // english/two/a', five/a' and eight/a'' each set one mark on the first
  // syllable of the hemistich, whatever its length. That is the only rule in
  // the corpus measured from anywhere but the anchor.
  const pinned: ToneExample = { anchor: 'end', syllables: [
    { text: 'Praise', join: false, mark: '-', pitch: 'h', role: 'recite', atStart: true },
    { text: 'the', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'Lórd', join: false, mark: '+', pitch: 'i', role: 'accent' },
    { text: 'now', join: false, mark: '=', pitch: 'h', role: 'fixed' },
  ] };
  assert.deepEqual(markRules(pinned), [
    { from: 'start', offset: 0, mark: '-' },
    { from: 'end', offset: -1, mark: '+' },
    { from: 'end', offset: 0, mark: '=' },
  ]);
  // The opening mark stays at the head however long the line is, and the
  // pinned syllable is not counted as the start of the cadence.
  assert.equal(cadenceStart(pinned), 2);
  assert.equal(
    applyMarkExample('All the earth praise the Lord now', pinned),
    '\\mi{All} the earth praise the \\pl{Lord} \\dmi{now}',
  );
  // Shorter than the cadence: the cadence is laid first and wins the syllable.
  assert.equal(applyMarkExample('to God', pinned), '\\pl{to} \\dmi{God}');
});
test('the accent anchor is the model line\'s own last acute, not a role', () => {
  // applyMarkExample finds the anchor by looking for the last acute, so the
  // editor has to read it the same way or the marks it draws land elsewhere.
  const accent: ToneExample = { anchor: 'accent', syllables: [
    { text: 'for', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'yóu', join: false, mark: '+', pitch: 'h', role: 'fixed' },
    { text: 'my', join: false, mark: '', pitch: 'h', role: 'recite' },
    { text: 'Lórd', join: false, mark: '=', pitch: 'i', role: 'recite' },
    { text: 'now', join: false, mark: '', pitch: 'h', role: 'recite' },
  ] };
  assert.equal(anchorIndex(accent), 3);
  assert.deepEqual(markRules(accent), [
    { from: 'accent', ordinal: 2, offset: 0, mark: '+', crowded: 'step' },
    { from: 'accent', ordinal: 1, offset: 0, mark: '=', crowded: 'step' },
  ]);
  assert.equal(applyMarkExample('for yóu my Lórd now', accent), 'for \\pl{yóu} my \\dmi{Lórd} now');
  // Two marks, two accents: each stays on its own accent, and the stretch
  // between them counts for nothing. Measured from the last accent alone the
  // "+" would have been dragged onto "praise".
  assert.equal(applyMarkExample('all the éarth praise the Lórd for ever', accent), 'all the \\pl{éarth} praise the \\dmi{Lórd} for ever');
});
test('a mediant on two accents keeps each figure on its own accent', () => {
  // english/one/first is the rule the single-anchor model could not express:
  // "+ −" on the second-to-last accent and "− +" on the last, with however
  // many unaccented syllables the line has lying between the two figures.
  const model = 'like a drý, weáry lánd without wáter.';
  const syllabified = syllabifyLine(model);
  const example: ToneExample = { anchor: 'accent', syllables: markedSyllables(syllabified, applyMode('english', 'one', 'first', syllabified)) };
  assert.deepEqual(markGroups(example).map(g => ({ ordinal: g.ordinal, on: example.syllables[g.accent].text, marks: g.indices.map(i => example.syllables[i].mark) })), [
    { ordinal: 2, on: 'lánd', marks: ['+', '-'] },
    { ordinal: 1, on: 'wá', marks: ['-', '+'] },
  ]);
  // A line ending on its own accent has no room for the last figure, and this
  // tone sings only its "+" there and passes the "−" back to the figure
  // before. Every half-line of Psalm 63, and the shortest lines the psalter
  // has, are then pointed exactly as the tone itself points them.
  const passing: ToneExample = { anchor: 'accent', syllables: example.syllables.map((s, i) => i > 6 && s.mark ? { ...s, crowded: 'pass' as const } : s) };
  for (const line of [
    'O Gód, you áre my Gód; at dáwn I séek you;',
    'for yóu my sóul is thírsting.',
    'So I gáze on yóu in the sánctuary',
    'to sée your stréngth and your glóry.',
    'My sóul shall be fílled as with a bánquet,',
    'Sing to the Lórd a new sóng',
    'Your loving mércy is bétter than lífe;',
    'When I remémber you upón my béd,',
    'Those who séek to destróy my lífe',
    'Glóry to the Fáther, and to the Són,',
    'Praise the Lórd, my sóul!',
    'the Lórd is góod',
    'God is lóve.',
  ]) {
    const s = syllabifyLine(line);
    assert.equal(applyMarkExample(s, passing), applyMode('english', 'one', 'first', s), line);
  }
});
test('a figure with no room on a short line follows the rule it is given', () => {
  // The mediant of English 1 is two figures, and the second half of the
  // psalter is shorter than the line it is drawn on. What each figure does
  // then cannot be read off the model — the model has room — so it is said.
  const model = syllabifyLine('O Gód, you are my Gód; at dawn I séek you;');
  const drawn = markedSyllables(model, applyMode('english', 'one', 'first', model));
  assert.deepEqual(drawn.map(s => s.mark), ['', '', '', '', '', '+', '-', '', '', '-', '+']);
  const rules = (crowded: Crowding, indices: number[]): ToneExample =>
    ({ anchor: 'accent', syllables: drawn.map((s, i) => indices.includes(i) ? { ...s, crowded } : s) });
  // "− +" hangs on the last accent, and “sóng” is both. Each rule is a
  // different answer, and the tone's own is to pass the "−" back.
  const short = syllabifyLine('Sing to the Lórd a new sóng');
  assert.equal(applyMarkExample(short, rules('pass', [9, 10])), applyMode('english', 'one', 'first', short));
  assert.equal(applyMarkExample(short, rules('slide', [9, 10])), 'Sing to the \\pl{Lórd} \\mi{a} \\mi{new} \\pl{sóng}');
  assert.equal(applyMarkExample(short, rules('step', [9, 10])), 'Sing to the \\mi{Lórd} \\pl{a} new sóng');
  assert.equal(applyMarkExample(short, rules('trim', [9, 10])), 'Sing to the \\pl{Lórd} \\mi{a} new \\mi{sóng}');
  assert.equal(applyMarkExample(short, rules('drop', [9, 10])), 'Sing to the \\pl{Lórd} \\mi{a} new sóng');
  // A passed mark rides at the end of the run that took it in — “new” here —
  // but only while that run stays put. On "I will bléss you áll my lífe;" the
  // opening figure has to move, and the mark is left behind on the accent it
  // vacated: "−" on “áll”, and "+ −" back on “bléss”.
  const crowded = syllabifyLine('I will bléss you áll my lífe;');
  assert.equal(applyMarkExample(crowded, rules('pass', [9, 10])), 'I will \\pl{bléss} \\mi{you} \\mi{áll} my \\pl{lífe;}');
  // The passed mark is not the receiving figure's own, so it stays on the
  // accent even where that figure is left off the line altogether.
  assert.equal(applyMarkExample(crowded, { anchor: 'accent', syllables: drawn.map((s, i) =>
    [9, 10].includes(i) ? { ...s, crowded: 'pass' as const } : [5, 6].includes(i) ? { ...s, crowded: 'drop' as const } : s) }),
    'I will bléss you \\mi{áll} my \\pl{lífe;}');
});
test('a folded figure joins a mark to the one it wrote before it', () => {
  // A figure squeezed against the figure after it has nowhere to put its
  // second mark, and folding writes the two as one pair mark on its accent —
  // "+ −" on “áll”, where the line has no spare syllable to carry the "−".
  const model = syllabifyLine('O Gód, you are my Gód; at dawn I séek you;');
  const drawn = markedSyllables(model, applyMode('english', 'one', 'first', model));
  const rules = (first: Crowding, last: Crowding): ToneExample => ({ anchor: 'accent', syllables: drawn.map((s, i) =>
    [5, 6].includes(i) ? { ...s, crowded: first } : [9, 10].includes(i) ? { ...s, crowded: last } : s) });
  for (const [line, folded, plain] of [
    ['I will bléss you áll my lífe;', 'I will bléss you \\plmi{áll} \\mi{my} \\pl{lífe;}', 'I will bléss you \\pl{áll} \\mi{my} \\pl{lífe;}'],
    ['the Lórd is góod', 'the \\plmi{Lórd} \\mi{is} \\pl{góod}', 'the \\pl{Lórd} \\mi{is} \\pl{góod}'],
  ]) {
    const s = syllabifyLine(line);
    assert.equal(applyMarkExample(s, rules('fold', 'slide')), folded, line);
    // Without folding the mark simply falls off, which is the difference.
    assert.equal(applyMarkExample(s, rules('trim', 'slide')), plain, line);
  }
  // A mark joins one this figure wrote, never one another figure put there.
  // A passed mark counts as the receiving figure's own: here the "−" handed
  // back by "− +" folds onto the "−" of the figure that took it in.
  assert.equal(applyMarkExample(syllabifyLine('the Lórd is góod'), rules('fold', 'pass')), 'the \\pl{Lórd} \\mimi{is} \\pl{góod}');
});
test('two marks pushed onto one syllable are written as the pair mark', () => {
  // gregorian/one/a carries "+ +" on the last accent and the syllable after
  // it, and writes "++" on a last accent that is also the last syllable.
  const model = syllabifyLine('to behóld your stréngth and your glóry.');
  const syllables = markedSyllables(model, applyMode('gregorian', 'one', 'a', model))
    .map(s => s.mark ? { ...s, crowded: 'fold' as const } : s);
  assert.deepEqual(syllables.map(s => s.mark), ['', '', '', '', '', '-', '-', '+', '+']);
  assert.deepEqual(markGroups({ syllables, anchor: 'accent' }).map(g => g.crowded), ['fold']);
  for (const line of ['Your loving mércy is bétter than lífe;', 'my líps will spéak your práise.', 'yóur right hánd uphólds me.']) {
    const s = syllabifyLine(line);
    assert.equal(applyMarkExample(s, { syllables, anchor: 'accent' }), applyMode('gregorian', 'one', 'a', s), line);
  }
});
test('validation pins only the opening syllable, and wants an accent to anchor on', () => {
  const tone: CreatedTone = { version: 1, id: 't', name: 'T', backend: 'lyps', clef: 'c4', examples: {
    first: example, termination: example, flex: example } };
  const late = structuredClone(tone);
  late.examples.first.syllables[1].atStart = true;
  assert.throws(() => validateTone(late), /opening syllable/);
  const ok = structuredClone(tone);
  ok.examples.first.syllables[0].atStart = true;
  assert.equal(validateTone(ok), ok);
  // "Praise the Lórd now" has an acute; a line with none cannot be anchored
  // on its last accent, and saying so beats pointing nothing at all.
  const accent = structuredClone(tone);
  accent.examples.first.anchor = 'accent';
  assert.equal(validateTone(accent), accent);
  const toneless = structuredClone(accent);
  toneless.examples.first.syllables[2].text = 'Lord';
  assert.throws(() => validateTone(toneless), /no accented syllable/);
  // A short-line rule is one of the five, and nothing else comes in from disk.
  const crowded = structuredClone(accent);
  crowded.examples.first.syllables[2].crowded = 'slide';
  assert.equal(validateTone(crowded), crowded);
  const nonsense = structuredClone(accent);
  (nonsense.examples.first.syllables[2] as { crowded: string }).crowded = 'shuffle';
  assert.throws(() => validateTone(nonsense), /Invalid syllable/);
});
test('a copied psautier tone points the psalm as the tone itself does', () => {
  // The copy used to come across anchored to the last syllable whatever the
  // rule was, which moved the whole cadence of every accent-aware mode on any
  // line not ending on its stress. english/eight/a is one of those.
  const lines = [
    'O Gód, you áre my Gód, for yóu I lóng;',
    'for yóu my sóul is thírsting.',
    'My bódy pínes for yóu',
    'like a drý, weáry lánd without wáter.',
    'So I gáze on yóu in the sánctuary',
    'to sée your stréngth and your glóry.',
  ];
  const { tone, warnings } = copySystemTone('system:lyps:english:eight:a',
    { first: lines[0], termination: lines[1], flex: lines[2] }, 'en', lines);
  assert.equal(tone.examples.termination.anchor, 'accent');
  assert.deepEqual(warnings, []);
  for (const line of lines) {
    const syllabified = syllabifyLine(line);
    assert.equal(applyMarkExample(syllabified, tone.examples.termination), applyMode('english', 'eight', 'a', syllabified));
  }
});
test('the note held after an accent is the tone\'s choice, not the next syllable\'s', () => {
  // jgabc absorbs the syllables a longer verse has after an accent onto an
  // open note. Which note that is cannot be read off the model line, because
  // the model line has no syllable there to draw it on: "for yóu my sóul is
  // thírsting." sings "is" on g whichever note the extras are held on.
  const S = (text: string, pitch: string, role: 'recite' | 'fixed' | 'accent', hold?: string): ToneSyllable =>
    ({ text, join: false, mark: '', pitch, role, ...(hold ? { hold } : {}) });
  const ending = (hold?: string): ToneExample => ({ anchor: 'end', syllables: [
    S('for', 'h', 'recite'), S('yóu', 'h', 'recite'), S('my', 'g', 'fixed'),
    S('sóul', 'f', 'accent', hold), S('is', 'g', 'fixed'), S('thír', 'h', 'accent'), S('sting.', 'h', 'recite'),
  ] });
  assert.equal(holdNote(ending(), 3), 'g');
  assert.equal(gabcFormula(ending()), "hr g 'f gr g 'h hr h.");
  assert.equal(holdNote(ending('f'), 3), 'f');
  assert.equal(gabcFormula(ending('f')), "hr g 'f fr g 'h hr h.");
  const sing = (line: string, example: ToneExample) => scoreSyllables(applyPsalmTone({
    text: markEnglishAccents(line), gabc: gabcFormula(example), clef: 'c4', lang: 'en', useBoldItalic: false,
  })).map(s => `${s.text}(${s.notes})`).join(' ');
  // The model's own line is sung the same either way, which is exactly why
  // the held note has to be said rather than drawn.
  for (const hold of [undefined, 'f']) {
    assert.equal(sing('for yóu my sóul is thírsting.', ending(hold)), 'for(h) yóu(h) my(g) sóul(f) is(g) thír(h) sting.(h)');
  }
  // A longer line has a syllable to put there, and that is where the two part.
  assert.equal(sing('to behóld your stréngth and your glóry.', ending()),
    'to(h) be(h) hóld(h) your(g) stréngth(f) and(g) your(g) gló(h) ry.(h)');
  assert.equal(sing('to behóld your stréngth and your glóry.', ending('f')),
    'to(h) be(h) hóld(h) your(g) stréngth(f) and(f) your(g) gló(h) ry.(h)');
  // Reading a formula back keeps a held note the drawing cannot show.
  const read = scoredSyllables(applyPsalmTone({
    text: markEnglishAccents('for yóu my sóul is thírsting.'), gabc: "hr g 'f fr g 'h hr h.", clef: 'c4', lang: 'en', useBoldItalic: false,
  }), "hr g 'f fr g 'h hr h.");
  assert.equal(gabcFormula({ syllables: read!.syllables, anchor: 'end' }), "hr g 'f fr g 'h hr h.");
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
