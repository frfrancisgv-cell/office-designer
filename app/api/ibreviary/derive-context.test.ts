/**
 * What the iBreviary route makes of a day.
 *
 * The route imports its text from iBreviary and its chant from OCO, and the
 * only thing joining the two is the occasion code. That code used to come from
 * the name on iBreviary's main menu — and **the main menu always prints the
 * temporal day**. Fetched live for September 2026, it reads "Tuesday of the
 * Twenty-Third Week in Ordinary Time" on the Nativity of the Blessed Virgin
 * Mary and "Wednesday of the Twenty-Third Week in Ordinary Time" on Saint
 * Peter Claver. The sanctoral therefore reached the office only through
 * `FEAST_CALENDAR`, a hand-kept list of some sixty dates, and every memorial
 * outside it sang the psalter: Peter Claver's own *Vos estis lux*, *Sacerdotes
 * Dei* and *Fulgebunt iusti* are filed under `9/9` and nothing asked for them.
 *
 * romcal knows what is kept on each date, so the codes are built from it and
 * the menu name is left to do what it can do — name the feria underneath.
 *
 * Run with: npm run test:unit
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Block } from '@/lib/types';
import { deriveContext } from './derive-context';
import { populateGabc } from './gabc-lookup';

/** The name iBreviary's main menu prints, which is the feria in every case. */
const MENU = {
  '2026-09-08': 'Tuesday of the Twenty-Third Week in Ordinary Time',
  '2026-09-09': 'Wednesday of the Twenty-Third Week in Ordinary Time',
  '2026-09-12': 'Saturday of the Twenty-Third Week in Ordinary Time',
  '2026-09-16': 'Wednesday of the Twenty-Fourth Week in Ordinary Time',
} as const;

const forDay = (iso: keyof typeof MENU, hour = 'lauds') =>
  deriveContext(MENU[iso], hour, new Date(iso));

test('a memorial the menu does not name is still given its own section', async () => {
  const ctx = await forDay('2026-09-09');
  assert.equal(ctx.occasionCode, '9/9',
    'Saint Peter Claver’s memorial was left on the psalter’s Wednesday');
  assert.equal(ctx.ferialCode, '3H4', 'the feria underneath was lost');
  assert.equal(ctx.antiphonCodes[0], '9/9');
  assert.ok(ctx.antiphonCodes.includes('Past'),
    `the common of Pastors was not reached: ${ctx.antiphonCodes.join(' → ')}`);
  assert.ok(ctx.antiphonCodes.includes('3H4'),
    'the psalter was not left as the last resort');
});

test('the memorial is offered in the menu under the section it will sing', async () => {
  const ctx = await forDay('2026-09-09');
  const claver = ctx.availableOccasions.find(o => /Peter Claver/.test(o.label));
  assert.ok(claver, 'the memorial was not offered at all');
  assert.equal(claver.value, '9/9', 'it was offered under its common rather than its own');
});

/** Lauds stripped to the blocks the chant lookup reads. */
function lauds(): Block[] {
  return [
    { id: 'a1', type: 'antiphon', content: 'first', place: '1' },
    { id: 'a2', type: 'antiphon', content: 'second', place: '2' },
    { id: 'a3', type: 'antiphon', content: 'third', place: '3' },
    { id: 'gh', type: 'heading', content: 'GOSPEL CANTICLE' },
    { id: 'gc', type: 'antiphon', content: 'the antiphon iBreviary printed' },
  ];
}

const scoreLauds = (ctx: Awaited<ReturnType<typeof deriveContext>>) =>
  populateGabc(lauds(), 'lauds', ctx.occasionCode, ctx.otWeekNum,
    ctx.liturgicalYear, ctx.ferialCode, null, false, false,
    ctx.invitatoryCodes, ctx.hymnCodes, ctx.antiphonCodes);

test('a memorial whose psalm antiphons are its own sings them', async () => {
  const scored = await scoreLauds(await forDay('2026-09-09'));
  assert.match(String(scored[0].gabcScore), /Vos estis lux/,
    'the first psalm kept the psalter’s antiphon');
  assert.match(String(scored[1].gabcScore), /Sacerdotes Dei/);
  assert.match(String(scored[2].gabcScore), /Fulgebunt iusti/);
});

/**
 * Saint Peter Claver's Benedictus antiphon is *Frange esurienti*, and `9/9`
 * holds it with no notation — 189 of the Gospel-canticle rows are like that,
 * nearly all of them on the dated memorials this chain now reaches. The block
 * is then left bare rather than handed the psalter's *In sanctitate
 * serviamus*, which belongs to a different day.
 */
test('a Gospel-canticle antiphon OCO names but does not notate is not replaced', async () => {
  const scored = await scoreLauds(await forDay('2026-09-09'));
  const gospel = scored[4];
  assert.ok(!gospel.gabcScore, `the Gospel canticle was given ${gospel.gabcScore}`);
  for (const candidate of gospel.gabcCandidates ?? []) {
    assert.notEqual(candidate.occasion, '3H4', 'it was given the psalter’s Wednesday instead');
  }
});

test('a memorial with no dated section of its own falls to its common', async () => {
  const ctx = await forDay('2026-09-16');
  assert.equal(ctx.antiphonCodes[0], '16/9');
  assert.ok(ctx.antiphonCodes.includes('PlM'),
    `the common of several martyrs was not reached: ${ctx.antiphonCodes.join(' → ')}`);
});

test('a dated feast keeps the section it already had', async () => {
  const ctx = await forDay('2026-09-08');
  assert.equal(ctx.occasionCode, '8/9', 'the Nativity of the Blessed Virgin Mary lost its own');
  assert.equal(ctx.antiphonCodes[0], '8/9');
});

/**
 * An optional memorial romcal did not take up leaves the feria standing, and
 * the day must not be handed the saint's antiphons on the strength of the
 * date alone. 12 September 2026 is the Most Holy Name of Mary, optional.
 */
test('an optional memorial not taken up keeps the feria', async () => {
  const ctx = await forDay('2026-09-12');
  assert.equal(ctx.occasionCode, '3H7');
  assert.equal(ctx.antiphonCodes[0], '3H7',
    `an optional memorial displaced the feria: ${ctx.antiphonCodes.join(' → ')}`);
});

/**
 * Every date part is read in UTC. They were read locally, and the app is
 * deployed west of Greenwich, where `new Date('2026-04-07')` — UTC midnight —
 * answers Monday 6 April to `getDay()`. That moved the whole Easter octave and
 * the dated days of late Advent onto the day before, and put 1 December in the
 * wrong year of the lectionary cycle. Easter 2026 is 5 April, so 7 April is
 * the Tuesday of the octave, which the psalter codes `1P3`.
 */
test('the Easter octave is not read a day early', async () => {
  const ctx = await deriveContext('Tuesday within the Octave of Easter', 'lauds',
    new Date('2026-04-07'));
  assert.equal(ctx.ferialCode, '1P3');
});

test('17 December is 17 December', async () => {
  const ctx = await deriveContext('Thursday of the third week of Advent', 'lauds',
    new Date('2026-12-17'));
  assert.equal(ctx.ferialCode, 'A-17/12');
});

test('1 December is in the year of the cycle that began that Advent', async () => {
  // Advent 2026 opens Year B; read locally, 1 December fell back into Year A.
  const ctx = await deriveContext('Tuesday of the first week of Advent', 'lauds',
    new Date('2026-12-01'));
  assert.equal(ctx.liturgicalYear, 'b');
});

/**
 * The route folds a chosen occasion into the head of each chain before passing
 * it, so `populateGabc` must take the chain as given rather than collapsing to
 * the bare override. Collapsing is what it used to do, and it is why adding
 * the chains alone would have changed nothing: the editor remembers the
 * occasion the route returned and sends it straight back.
 */
test('a chain is used as given, not discarded for the override beside it', async () => {
  const ctx = await forDay('2026-09-09');
  const scored = await populateGabc(lauds(), 'lauds', ctx.occasionCode, ctx.otWeekNum,
    ctx.liturgicalYear, ctx.ferialCode, '3H4', false, false,
    ctx.invitatoryCodes, ctx.hymnCodes, ctx.antiphonCodes);
  assert.match(String(scored[0].gabcScore), /Vos estis lux/,
    'the override alone answered and the chain was thrown away');
});
