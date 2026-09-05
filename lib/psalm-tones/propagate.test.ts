/**
 * The antiphon's mode, carried down onto the psalms it governs.
 *
 * `propagateTones` was wired to the iBreviary route only, so the offline
 * office never called it and every psalm of every day was sung to tone 8.G —
 * whatever mode OCO had recorded on the antiphon standing over it.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { Block } from '@/lib/types';
import { propagateTones } from './propagate';
import { generateCanonicalOffice } from '@/lib/liturgy/office-engine';
import { getLiturgicalContext, getCommonOccasionCode } from '@/lib/liturgy/calendar-context';
import { populateGabc } from '@/app/api/ibreviary/gabc-lookup';

let n = 0;
const block = (b: Partial<Block> & { type: Block['type'] }): Block =>
  ({ id: `b${n++}`, content: '', ...b } as Block);

/** An antiphon whose score carries OCO's mode in its annotation header. */
const antiphon = (mode: string) => block({
  type: 'antiphon',
  content: 'Ant.',
  gabcScore: `name: Ant;\nannotation: ${mode};\n%%\n(c4) A(f)men.(f.)`,
});

test('a psalm takes the tone of the antiphon over it, on both engines', () => {
  const [, psalm] = propagateTones([antiphon('1d2'), block({ type: 'psalm' })]);
  assert.equal(psalm.psalmTone, '1.');
  assert.equal(psalm.psalmVariant, 'D2');
  assert.equal(psalm.toneSource, 'oco');
  assert.equal(psalm.lypsautierantFamily, 'english');
  assert.equal(psalm.lypsautierantMode, 'one');
  assert.equal(psalm.lypsautierantVariation, 'b_prime');
});

test('the psalter’s default tone is overwritten, not deferred to', () => {
  // The office engine stamps the schema's own tone before the antiphon has
  // been resolved. It is a fallback, so OCO wins where OCO speaks.
  const [, psalm] = propagateTones([
    antiphon('7c'),
    block({ type: 'psalm', psalmTone: '8.', psalmVariant: 'G', toneSource: 'default' }),
  ]);
  assert.equal(psalm.psalmTone, '7.');
  assert.equal(psalm.psalmVariant, 'c');
  assert.equal(psalm.toneSource, 'oco');
});

test('an unreadable mode leaves the fallback standing, and does not borrow', () => {
  // A letter-mode has no eight-mode tone. The danger is not that the psalm
  // keeps its default — that is the ruling — but that it silently keeps the
  // *previous* antiphon's tone, which would be a wrong answer wearing the
  // last right one's clothes.
  const blocks = propagateTones([
    antiphon('7c'),
    block({ type: 'psalm', psalmTone: '8.', psalmVariant: 'G', toneSource: 'default' }),
    antiphon('E'),
    block({ type: 'psalm', psalmTone: '8.', psalmVariant: 'G', toneSource: 'default' }),
  ]);
  assert.equal(blocks[1].psalmTone, '7.');
  assert.equal(blocks[3].psalmTone, '8.');
  assert.equal(blocks[3].toneSource, 'default');
  assert.equal(blocks[3].lypsautierantMode, undefined);
});

test('a psalm engraved from its own score is not given a tone to point to', () => {
  // The invitatory's Venite exsultemus is the whole psalm with its melody.
  const [, psalm] = propagateTones([
    antiphon('8g'),
    block({ type: 'psalm', gabcScore: '(c4) Ve(e)ní(g)te(h)' }),
  ]);
  assert.equal(psalm.psalmTone, undefined);
});

test('a real offline Vespers is no longer tone 8 from end to end', async () => {
  const date = new Date(Date.UTC(2026, 8, 8));
  const context = await getLiturgicalContext(date, 'vespers');
  const raw = await generateCanonicalOffice({ date, hour: 'vespers', lang: 'en' });
  const occasionCode = getCommonOccasionCode(context) || context.ferialOccasionCode;
  const scored = await populateGabc(
    raw, 'vespers', occasionCode, null, context.liturgicalYear,
    context.ferialOccasionCode, null, false, context.isFirstVespers, null,
  );
  const psalms = (propagateTones(scored) as Block[]).filter(b => b.type === 'psalm');

  assert.ok(psalms.length >= 3, `only ${psalms.length} psalms`);
  const fromOco = psalms.filter(b => b.toneSource === 'oco');
  assert.ok(fromOco.length > 0, 'no psalm took its tone from the antiphon');
  assert.ok(new Set(psalms.map(b => `${b.psalmTone}${b.psalmVariant}`)).size > 1,
    'every psalm of the hour is still on one tone');
  for (const p of fromOco) {
    assert.equal(p.lypsautierantFamily, 'english');
    assert.ok(p.lypsautierantMode && p.lypsautierantVariation, 'no English variation');
  }
});
