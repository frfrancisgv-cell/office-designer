/**
 * The Latin office taking its antiphons and hymn from the day's chant.
 *
 * The rule this file pins down is when the text is *not* replaced: a block
 * with no score, and a block still offering the editor a choice, both keep
 * what the engine wrote. Guessing at one of two antiphons OCO offers *ad
 * libitum* would be exactly the invented text ground rule 2 forbids.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Block } from '@/lib/types';
import { textFromChant, chantTextCoverage } from './latin-propers';

const FIAT_PAX = 'name: Fiat pax;\nannotation: 1a2;\n%%\n'
  + '(c4)Fi(f)at(g) pax(h) <v>\\greheightstar</v>(,) in(h) vir(g)tú(f)te(g) tu(f)a.(f) '
  + '(::) E(h) u(h) o(h) u(g) a(ef) e.(f) (::)';

const block = (over: Partial<Block>): Block =>
  ({ id: 'x', type: 'antiphon', content: 'Ant. 1. Psalm 63', ...over }) as Block;

test('an antiphon keeps its place label and takes the chant\'s words', () => {
  const [out] = textFromChant([block({ gabcScore: FIAT_PAX, place: '1' })]);
  assert.equal(out.content, 'Ant. 1. Fiat pax * in virtúte tua.');
});

test('the Magnificat antiphon\'s bare label survives too', () => {
  const [out] = textFromChant([
    block({ content: 'Ant. Magníficat ánima mea Dóminum.', gabcScore: FIAT_PAX, place: 'M' }),
  ]);
  assert.equal(out.content, 'Ant. Fiat pax * in virtúte tua.');
});

test('a hymn takes the whole of its score, line for line', () => {
  const gabc = '%%\n(c4)Re(f)rum(g) De(h)us(g) (;) te(f)nax(g) vi(h)gor,(g) (::)';
  const [out] = textFromChant([block({ type: 'hymn', content: '1. O lux beáta Trínitas', gabcScore: gabc })]);
  assert.equal(out.content, 'Rerum Deus\ntenax vigor,');
});

test('a block with no score is left exactly as the engine wrote it', () => {
  const [out] = textFromChant([block({ place: '1' })]);
  assert.equal(out.content, 'Ant. 1. Psalm 63');
});

test('a choice OCO has not made is not made here either', () => {
  // Ss Peter and Paul offer two hymns, *Aurea luce* and *O Roma felix*. The
  // editor picks; picking the first would be inventing the day's hymn.
  const [out] = textFromChant([block({
    gabcScore: undefined,
    gabcCandidates: [
      { incipit: 'Aurea luce', gabc: FIAT_PAX, source: 'gregobase' },
      { incipit: 'O Roma felix', gabc: FIAT_PAX, source: 'gregobase' },
    ],
  })]);
  assert.equal(out.content, 'Ant. 1. Psalm 63');
});

test('psalms, readings and rubrics are none of its business', () => {
  const psalm = block({ type: 'psalm', content: 'Deus, Deus meus', gabcScore: FIAT_PAX });
  const [out] = textFromChant([psalm]);
  assert.equal(out.content, 'Deus, Deus meus');
});

test('the coverage count is over sung blocks only, and counts what changed', () => {
  const before: Block[] = [
    block({ gabcScore: FIAT_PAX, place: '1' }),
    block({ place: '2' }),
    block({ type: 'rubric', content: 'Psalm 63' }),
  ];
  assert.deepEqual(chantTextCoverage(before, textFromChant(before)), { antiphon: [1, 2] });
});
