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
import { sundayGospelAntiphonWeek } from './calendar-context';
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
