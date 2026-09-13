import test from 'node:test';
import assert from 'node:assert/strict';
import type { Block } from './types';
import {
  BENEDICAMUS_WORDS, ORDINARY_CHANTS, applyChantedOrdinary, cleanOrdinaryGabc, ordinaryPartForHeading,
} from './chanted-ordinary';

const GABC = { intro: '(c3)De(h)us(h) (::)', pater: '(c3)Pa(f)ter(g) (::)', bene: '(c4) BE(d)ne(e) (::)' };
const chosen = { introduction: 'i', lordsPrayer: 'p', dismissal: 'd' };
const scores = { i: GABC.intro, p: GABC.pater, d: GABC.bene };

const office = (): Block[] => [
  { id: 'h1', type: 'heading', content: 'INTRODUCTION' },
  { id: 'intro', type: 'text', content: 'God, come to my assistance.' },
  { id: 'h2', type: 'heading', content: 'HYMN' },
  { id: 'hymn', type: 'hymn', content: 'A hymn' },
  { id: 'h3', type: 'heading', content: 'OUR FATHER' },
  { id: 'pater', type: 'text', content: 'Our Father, who art in heaven,' },
  { id: 'h4', type: 'heading', content: 'DISMISSAL' },
  { id: 'dismissal', type: 'text', content: 'May the Lord bless us…' },
];

test('every catalogue entry names a part and a distinct score', () => {
  const ids = ORDINARY_CHANTS.map(chant => chant.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const chant of ORDINARY_CHANTS) {
    assert.match(chant.id, /^\d+$/, `${chant.name} is not a gregobase id`);
    assert.ok(chant.name && chant.source, `${chant.id} is unnamed`);
  }
});

test('the three parts take their chant and keep the words the chant sings', () => {
  const { blocks, sung } = applyChantedOrdinary(office(), chosen, scores, 'en', true);
  assert.deepEqual(sung.sort(), ['dismissal', 'introduction', 'lords-prayer']);
  const [intro, pater, dismissal] = ['intro', 'pater', 'dismissal'].map(id => blocks.find(b => b.id === id)!);
  assert.equal(intro.type, 'antiphon');
  assert.equal(intro.gabcScore, GABC.intro);
  // The office's own words stay put and become the line under the staff.
  assert.equal(intro.content, 'God, come to my assistance.');
  assert.equal(intro.printTranslation, true);
  assert.equal(pater.gabcScore, GABC.pater);
  assert.equal(pater.content, 'Our Father, who art in heaven,');
  // Only the dismissal's words are replaced: the blessing is not what
  // Benedicamus Domino says.
  assert.equal(dismissal.gabcScore, GABC.bene);
  assert.equal(dismissal.content, BENEDICAMUS_WORDS.en);
  // The hymn between them is untouched.
  assert.equal(blocks.find(b => b.id === 'hymn')!.type, 'hymn');
});

test('a Latin office prints no line under the staff, but keeps the words on the block', () => {
  const latin = office().map(block => block.id === 'intro'
    ? { ...block, content: 'V. Deus, in adiutórium meum inténde.' } : block);
  const { blocks } = applyChantedOrdinary(latin, chosen, scores, 'la', true);
  const intro = blocks.find(b => b.id === 'intro')!;
  assert.equal(intro.printTranslation, false);
  assert.match(intro.content, /adiutórium/);
  // An office in a language the dismissal versicle has no wording for keeps
  // the Latin rather than being given a translation nobody wrote.
  const italian = applyChantedOrdinary(office(), chosen, scores, 'it', true).blocks;
  const dismissal = italian.find(b => b.id === 'dismissal')!;
  assert.equal(dismissal.content, BENEDICAMUS_WORDS.la);
  assert.equal(dismissal.printTranslation, false);
});

test('a part with no chant chosen, and one with no block, are both left alone', () => {
  const { blocks, sung } = applyChantedOrdinary(
    office().filter(block => !block.content.startsWith('May the Lord')),
    { ...chosen, lordsPrayer: '' }, scores, 'en', true,
  );
  assert.equal(blocks.find(b => b.id === 'pater')!.type, 'text');
  assert.equal(blocks.find(b => b.id === 'pater')!.gabcScore, undefined);
  // An hour with no dismissal block is an hour that does not have one, not a
  // failure to find it: it simply is not among the parts sung.
  assert.deepEqual(sung, ['introduction']);
});

test('a chosen id the catalogue no longer serves leaves its part spoken', () => {
  const { blocks, sung } = applyChantedOrdinary(office(), { ...chosen, introduction: 'gone' }, scores, 'en', true);
  assert.equal(blocks.find(b => b.id === 'intro')!.type, 'text');
  assert.deepEqual(sung.sort(), ['dismissal', 'lords-prayer']);
});

test("iBreviary's own headings are read, English BLESSING included", () => {
  assert.equal(ordinaryPartForHeading('INTRODUZIONE'), 'introduction');
  assert.equal(ordinaryPartForHeading('PATER NOSTER'), 'lords-prayer');
  assert.equal(ordinaryPartForHeading('BLESSING'), 'dismissal');
  assert.equal(ordinaryPartForHeading('CONCLUSIO'), 'dismissal');
  assert.equal(ordinaryPartForHeading('PSALMODY'), null);
});

test("gregobase's two unrendered lyric spellings are undone, and nothing else", () => {
  assert.equal(cleanOrdinaryGabc("et(h) in(h) s'ae(h)cu(h)la(h)"), 'et(h) in(h) sæ(h)cu(h)la(h)');
  assert.equal(cleanOrdinaryGabc('Al(h)le(hi)lú{ia}.(h)'), 'Al(h)le(hi)lúia.(h)');
  assert.equal(cleanOrdinaryGabc('De(gh)o(gv.ef!gvv//deDC.)'), 'De(gh)o(gv.ef!gvv//deDC.)');
});

test('Compline is turned away by name, whatever its opening block turns out to be', () => {
  // Its *Convérte nos* is a rubric today, and so was skipped by accident; a
  // block type is not a reason to withhold a chant, and the wrong opening is.
  const compline: Block[] = [
    { id: 'h', type: 'heading', content: 'INTRODUCTION' },
    { id: 'c', type: 'text', content: 'V. Convert us, O God our savior.' },
  ];
  const { blocks, sung } = applyChantedOrdinary(compline, chosen, scores, 'en', true, 'compline');
  assert.deepEqual(sung, []);
  assert.equal(blocks[1].type, 'text');
  assert.equal(blocks[1].gabcScore, undefined);
  // Any other hour with the same shape does sing it.
  assert.deepEqual(applyChantedOrdinary(compline, chosen, scores, 'en', true, 'terce').sung, ['introduction']);
});
