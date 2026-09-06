/**
 * Which OCO codes an hour may ask for.
 *
 * `getLiturgicalContext` needs romcal and a whole liturgical year; the code
 * choices made from it do not, and are tested here on plain contexts.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { antiphonOccasionCodes, hymnOccasionCodes, responsoryOccasionCodes, sundayGospelAntiphonWeek } from './calendar-context';
import type { LiturgicalContext } from './calendar-context';

type Ctx = Pick<LiturgicalContext, 'season' | 'seasonWeek' | 'celebrationDate'>;

/** 2026-06-28 is a Sunday, the Thirteenth in Ordinary Time; the 29th a Monday. */
const sunday = (over: Partial<Ctx> = {}): Ctx => ({
  season: 'ordinary',
  seasonWeek: 13,
  celebrationDate: new Date('2026-06-28T00:00:00Z'),
  ...over,
});

test('the Sunday of Ordinary Time may take its own year\'s antiphon', () => {
  assert.equal(sundayGospelAntiphonWeek(sunday(), '1H1', '1H1'), 13);
});

test('a weekday may not — the Sunday\'s antiphon is not the feria\'s', () => {
  const monday = sunday({ celebrationDate: new Date('2026-06-29T00:00:00Z') });
  assert.equal(sundayGospelAntiphonWeek(monday, '1H2', '1H2'), null);
});

test('a Saturday evening may, because it is the Sunday that is celebrated', () => {
  // `celebrationDate` is already the Sunday at First Vespers, which is the
  // whole reason the test is on the celebration and not on the calendar date.
  assert.equal(sundayGospelAntiphonWeek(sunday(), '1H1', '1H1'), 13);
});

test('a Sunday kept under a proper of its own sings that proper', () => {
  // Trinity Sunday: the occasion resolved to something other than the ferial
  // code, so the Sunday of the psalter it displaced has no claim on the hour.
  assert.equal(sundayGospelAntiphonWeek(sunday(), 'Trin', '1H1'), null);
});

test('outside Ordinary Time there is no such week to ask for', () => {
  assert.equal(sundayGospelAntiphonWeek(sunday({ season: 'lent' }), '1Q1', '1Q1'), null);
});

// ── The hymn and antiphon section chains ─────────────────────────────────────

type ChainCtx = Parameters<typeof hymnOccasionCodes>[0] & Parameters<typeof antiphonOccasionCodes>[0];

/** A plain Wednesday of the second week of Ordinary Time, psalter week 2. */
const day = (over: Partial<ChainCtx> = {}): ChainCtx => ({
  season: 'ordinary',
  seasonWeek: 2,
  psalterWeek: 2,
  key: 'wednesday',
  rank: 'FERIAL',
  celebrationDate: new Date('2026-01-14T00:00:00Z'),
  commons: [],
  titles: [],
  saintCount: 0,
  properOccasionCode: null,
  ferialOccasionCode: '2H4',
  ...over,
});

test('a memorial with no hymn of its own falls to its common', () => {
  // Ss. Timothy and Titus: "26/1" has no hymn, "Past" has three.
  const codes = hymnOccasionCodes(day({
    rank: 'MEMORIAL', properOccasionCode: '26/1', commons: ['Pastors'], saintCount: 2,
  }), 'lauds');
  assert.deepEqual(codes.slice(0, 3), ['26/1', 'PastPl', 'Past']);
});

test('the little hours ask by rank, never by weekday', () => {
  // There is no "2.4H4" row for Terce; the hymn there is one per rank per week.
  assert.deepEqual(hymnOccasionCodes(day(), 'terce'), ['2.4H2-7']);
  assert.deepEqual(hymnOccasionCodes(day({ rank: 'MEMORIAL' }), 'terce'), ['2.4H mem.', '2.4H2-7']);
  assert.deepEqual(hymnOccasionCodes(day({ rank: 'SOLEMNITY' }), 'terce'), ['2.4H soll.', '2.4H2-7']);
});

test('Lauds and Vespers do ask by weekday', () => {
  assert.deepEqual(hymnOccasionCodes(day(), 'lauds'), ['2.4H4']);
});

test('Compline on a Saturday belongs to the Sunday that has begun', () => {
  // 2026-01-17 is a Saturday of psalter week 2; its Compline follows the First
  // Vespers of a week-3 Sunday, so the hymn is "1.3", not "2.4".
  const saturday = day({ celebrationDate: new Date('2026-01-17T00:00:00Z'), ferialOccasionCode: '2H7' });
  assert.deepEqual(hymnOccasionCodes(saturday, 'compline'), ['1.3H1']);
});

test('Lent Compline counts weeks of Lent, which run to five', () => {
  const lent = day({ season: 'lent', seasonWeek: 5, psalterWeek: 1, ferialOccasionCode: '5Q4' });
  // The psalter's own row stays behind it as a fallback and never fires:
  // "Te lucis (Quad)" is filed under the Lenten code and answers first.
  assert.deepEqual(hymnOccasionCodes(lent, 'compline'), ['1.3.5Q', '1.3H2-6']);
});

test('the antiphon chain ends on the running psalter week, not the season', () => {
  // Advent and Lent say the Office of Readings from the psalter; "1Q4" holds
  // only the Gospel-canticle antiphon.
  const lent = day({ season: 'lent', seasonWeek: 1, psalterWeek: 1, ferialOccasionCode: '1Q4' });
  assert.deepEqual(antiphonOccasionCodes(lent, 'readings'), ['1Q4', '1H4']);
});

test('Compline is asked in the psalter\'s shape even in a season', () => {
  // `antsByOccasion` reads the weekday digit out of "1H4"; "1Q4" is not that
  // shape and reached nothing, which left Compline blank for all of Lent.
  const lent = day({ season: 'lent', seasonWeek: 1, psalterWeek: 1, ferialOccasionCode: '1Q4' });
  assert.deepEqual(antiphonOccasionCodes(lent, 'compline'), ['1H4']);
});

test('an Ordinary Time Sunday is numbered, and the weekday is the psalter\'s', () => {
  const sun = day({
    seasonWeek: 13, psalterWeek: 1, rank: 'SUNDAY',
    celebrationDate: new Date('2026-06-28T00:00:00Z'), ferialOccasionCode: '1H1',
  });
  assert.deepEqual(antiphonOccasionCodes(sun, 'vespers'), ['13D', '1H1']);
  assert.deepEqual(antiphonOccasionCodes(day(), 'vespers'), ['2H4']);
});

test('a midday hour may end on the complementary psalmody', () => {
  assert.deepEqual(antiphonOccasionCodes(day(), 'sext'), ['2H4', 'H']);
});

test('the midday hours and the Office of Readings have no short responsory', () => {
  // Not a gap: a midday hour has a versicle instead, and the Office of
  // Readings has the long responsories, which OCO does not index.
  for (const hour of ['terce', 'sext', 'none', 'readings'] as const)
    assert.deepEqual(responsoryOccasionCodes(day(), hour), []);
});

test('Compline\'s responsory changes with the season and not the weekday', () => {
  assert.deepEqual(responsoryOccasionCodes(day(), 'compline'), ['H1']);
  assert.deepEqual(responsoryOccasionCodes(day({ season: 'advent' }), 'compline'), ['Adv', 'H1']);
  assert.deepEqual(responsoryOccasionCodes(day({ season: 'lent' }), 'compline'), ['Q', 'H1']);
  assert.deepEqual(responsoryOccasionCodes(day({ season: 'easter' }), 'compline'), ['P', 'H1']);
});

test('Holy Week\'s responsory ranges are cut differently at Lauds and Vespers', () => {
  // 2026-04-01 is the Wednesday of Holy Week, the 2nd the Thursday.
  const wed = day({ season: 'lent', seasonWeek: 6, celebrationDate: new Date('2026-04-01T00:00:00Z') });
  const thu = day({ season: 'lent', seasonWeek: 6, celebrationDate: new Date('2026-04-02T00:00:00Z') });
  assert.deepEqual(responsoryOccasionCodes(wed, 'lauds').slice(0, 1), ['6Q1-5']);
  assert.deepEqual(responsoryOccasionCodes(wed, 'vespers').slice(0, 1), ['6Q1-4']);
  assert.deepEqual(responsoryOccasionCodes(thu, 'lauds').slice(0, 1), ['6Q1-5']);
  assert.deepEqual(responsoryOccasionCodes(thu, 'vespers').slice(0, 1), ['6Q5']);
});

test('the commons are spelled a third way again in the responsory index', () => {
  const many = day({ rank: 'MEMORIAL', commons: ['Pastors'], saintCount: 2 });
  assert.deepEqual(responsoryOccasionCodes(many, 'lauds').slice(0, 2), ['Past Pl', 'Past']);
  // In Eastertide the alleluia form comes first, but within its own step.
  const easter = day({ season: 'easter', seasonWeek: 3, rank: 'MEMORIAL', commons: ['Pastors'], saintCount: 1 });
  assert.deepEqual(responsoryOccasionCodes(easter, 'lauds').slice(0, 2), ['Past TP', 'Past']);
});
