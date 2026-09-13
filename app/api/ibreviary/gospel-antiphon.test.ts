/**
 * Which Gospel-canticle antiphon a day is given.
 *
 * The Sunday's Magnificat and Benedictus antiphons are filed under the week of
 * Ordinary Time — `23D` for the twenty-third — and vary with the year's cycle.
 * Every weekday of that week shares the week number, so the week number alone
 * is not leave to sing them: the Nativity of the Blessed Virgin Mary on 8
 * September 2026 falls inside the twenty-third week and has a Magnificat
 * antiphon of its own, *Gloriosae Virginis Mariae*, and was being given the
 * twenty-third Sunday's *Si duo ex vobis* instead — labelled, unhelpfully,
 * "Proper for Year A", which is what the editor's automatic selection then
 * reached for.
 *
 * The arguments below are the ones `app/api/ibreviary/route.ts` passes: the
 * resolved occasion, the week of Ordinary Time, the year's cycle, and the
 * ferial code of the psalter day underneath.
 *
 * Run with: npm run test:unit
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Block } from '@/lib/types';
import { populateGabc, magBenByCodes } from './gabc-lookup';

/** An hour stripped to the Gospel canticle, which is all this asks about. */
function office(): Block[] {
  return [
    { id: 'h', type: 'heading', content: 'GOSPEL CANTICLE' },
    { id: 'ant', type: 'antiphon', content: 'The antiphon iBreviary printed.' },
  ];
}

/** `populateGabc` with the iBreviary route's argument order. */
function forDay(occasion: string, ferial: string, otWeek: number | null, hour = 'vespers') {
  return populateGabc(office(), hour, occasion, otWeek, 'a', ferial, null, false, false);
}

test('a feast inside the week sings its own Magnificat antiphon, not the Sunday’s', async () => {
  const [, ant] = await forDay('8/9', '3H3', 23);
  assert.match(String(ant.gabcScore), /Glorios/,
    'the Nativity of the Blessed Virgin Mary did not get its own antiphon');
  assert.ok(!/Si duo ex vobis/.test(String(ant.gabcScore)), 'it got the Sunday’s');
  for (const candidate of ant.gabcCandidates ?? []) {
    assert.notEqual(candidate.occasion, '23D', 'the Sunday’s antiphons were still offered');
  }
});

test('an ordinary weekday sings the psalter’s own, not the Sunday’s', async () => {
  const [, ant] = await forDay('3H3', '3H3', 23);
  const psalter = magBenByCodes(['3H3'], 'vespers');
  assert.ok(psalter.length, 'the psalter has no Wednesday Magnificat antiphon to compare against');
  assert.equal(ant.gabcScore, psalter[0].gabc);
});

/**
 * The Sunday's own, which is the antiphon of the year and not a choice among
 * the three. The twenty-third Sunday's Magnificat antiphons are *Si duo ex
 * vobis* (`Ma`), *Quanto eis praecipiebat* (`Mb`) and *Christus nobis dicit*
 * (`Mc`); in Year A the first of them is sung.
 */
test('the Sunday sings the antiphon proper to the year', async () => {
  const [, ant] = await forDay('3H1', '3H1', 23);
  assert.match(String(ant.gabcScore), /Si duo ex vobis/,
    'the Sunday was left without a Magnificat antiphon on it');
  for (const candidate of ant.gabcCandidates ?? []) {
    assert.ok(!/Proper for Year [BC]/.test(String(candidate.office)),
      `another year's antiphon was offered: ${candidate.office}`);
  }
});

/**
 * At Lauds the same Sunday used to come through with four Benedictus
 * antiphons and none of them sung: the year's own was named twice — once as
 * `B` + the year and again in the `Bb`/`Ba`/`Bc` that followed it — and the
 * other two years' were offered beside it. In Year A the twenty-third
 * Sunday sings *Dixit Iesus discipulis: Si peccaverit* (`Ba`); *Dum transiret
 * Dominus* is Year B's and *Qui odit* Year C's.
 */
test('the Sunday sings one Benedictus antiphon, not a choice of four', async () => {
  const [, ant] = await forDay('3H1', '3H1', 23, 'lauds');
  assert.match(String(ant.gabcScore), /Si peccaverit/,
    'the Sunday was left without a Benedictus antiphon on it');
  const offered = (ant.gabcCandidates ?? []).map(c => c.incipit);
  assert.deepEqual(offered.filter(i => /Dum transiret|Qui odit/.test(i)), [],
    'another year\u2019s Benedictus antiphon was offered');
  assert.equal(new Set(offered).size, offered.length,
    'the same antiphon was offered twice');
});

/**
 * The years are not an Ordinary Time affair only. The third Sunday of Lent is
 * filed under the ferial code `3Q1`, which `sundayMagBenCandidates` never
 * reaches, and its three Benedictus antiphons sit in that one section: *Aqua
 * quam* (`Ba`), *Auferte ista hinc* (`Bb`) and *Dixit autem dominus ad
 * cultorem* (`Bc`). Whichever the CSV listed first was sung in all three
 * years, which was Year B's.
 */
test('a Sunday of Lent sings its own year too', async () => {
  const lent = (year: 'a' | 'b' | 'c') =>
    populateGabc(office(), 'lauds', '3Q1', null, year, '3Q1', null, false, false);
  assert.match(String((await lent('a'))[1].gabcScore), /Aqua quam/);
  assert.match(String((await lent('b'))[1].gabcScore), /Auferte ista hinc/);
  assert.match(String((await lent('c'))[1].gabcScore), /cultores|cultorem|cultóre/);
});

/**
 * The same day at Lauds, where it was reported: the Benedictus antiphon of the
 * feast is *Nativitas tua*, filed under `8/9` at `L` in place `B`, and the
 * twenty-third Sunday's `Ba` — *Dixit Iesus discipulis: Si peccaverit* — was
 * being sung in its place.
 */
test('the feast sings its own Benedictus antiphon at Lauds', async () => {
  const [, ant] = await forDay('8/9', '3H3', 23, 'lauds');
  assert.match(String(ant.gabcScore), /Nativitas tua/,
    'the Nativity of the Blessed Virgin Mary did not get its own Benedictus antiphon');
  for (const candidate of ant.gabcCandidates ?? []) {
    assert.notEqual(candidate.occasion, '23D', 'the Sunday\u2019s antiphons were still offered');
  }
});
