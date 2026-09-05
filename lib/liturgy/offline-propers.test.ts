/**
 * The offline propers used to serve Sunday's texts to the whole week.
 *
 * `getSection` took the first matching hour header in the file, and the
 * Ordinary Time psalter files hold all seven days at once — so every weekday of
 * a psalter week received Sunday's reading and Sunday's collect, silently and
 * plausibly. The assertion that would have caught it is the first one here:
 * that two different days get two different readings.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getLiturgicalContext } from './calendar-context';
import { getOfflineProper } from './offline-propers';

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function properFor(iso: string, hour: 'lauds' | 'vespers' | 'terce' | 'sext' | 'compline') {
  const context = await getLiturgicalContext(utc(iso), hour);
  return { context, proper: getOfflineProper(context, hour) };
}

/** 19–23 January 2026: Monday to Friday of one psalter week in Ordinary Time. */
const WEEKDAYS = ['2026-01-19', '2026-01-20', '2026-01-21', '2026-01-22', '2026-01-23'];

test('each weekday of a psalter week gets its own reading, not the Sunday\'s', async () => {
  const sunday = await properFor('2026-01-18', 'lauds');
  assert.ok(sunday.proper.reading, 'the Sunday itself has no reading');

  for (const iso of WEEKDAYS) {
    const { proper } = await properFor(iso, 'lauds');
    assert.ok(proper.reading, `${iso}: no reading at all`);
    assert.notEqual(
      proper.reading, sunday.proper.reading,
      `${iso} Lauds was served the Sunday's reading`,
    );
  }
});

test('the weekdays do not all share one reading either', async () => {
  for (const hour of ['lauds', 'vespers'] as const) {
    const readings = [];
    for (const iso of WEEKDAYS) readings.push((await properFor(iso, hour)).proper.reading);
    assert.equal(
      new Set(readings).size, readings.length,
      `${hour}: ${readings.length} weekdays share ${new Set(readings).size} distinct readings`,
    );
  }
});

test('a weekday of Ordinary Time has a collect', async () => {
  for (const iso of WEEKDAYS) {
    for (const hour of ['lauds', 'vespers'] as const) {
      const { proper } = await properFor(iso, hour);
      assert.ok(proper.prayer, `${iso} ${hour}: no collect`);
    }
  }
});

/**
 * The psalter files say `PRAYER: of Sunday` and carry no Sunday collect of
 * their own; the 34 of them live in `seasons/Psalter`, which nothing used to
 * open. Terce has no section in these books at all, so it exercises the
 * fallback; Sext, which does, keeps its own collect — asserted below.
 */
test('an Ordinary Time hour with no collect of its own takes the Sunday\'s', async () => {
  const { context, proper } = await properFor('2026-01-20', 'terce');
  assert.equal(context.season, 'ordinary');
  assert.equal(context.seasonWeek, 2, 'expected the second week of Ordinary Time');
  assert.match(
    proper.prayer || '',
    /Almighty ever-living God, who govern all things, both in heaven and on earth/,
    'not the collect of the 2nd Sunday of Ordinary Time',
  );
  assert.ok(proper.sourceFiles.includes('seasons/Psalter'), proper.sourceFiles.join(', '));

  // And the fallback does not override an hour that has its own.
  const sext = await properFor('2026-01-20', 'sext');
  assert.match(sext.proper.prayer || '', /you made known to Peter/, sext.proper.prayer || '(empty)');
});

test('Compline does not borrow the Sunday collect', async () => {
  // Compline's collects are a weekly cycle of their own and are not in these
  // books. Better an honest gap than another hour's prayer.
  const { proper } = await properFor('2026-01-20', 'compline');
  assert.equal(proper.prayer, undefined);
});

/**
 * `seasons/lent/{thursday,friday,saturday}` label their variants
 * `Friday after Ash Wednesday & Weeks 1-4: …`, which begins with a weekday.
 * Treating that as a day heading truncated the field it belongs to.
 */
test('a variant label beginning with a weekday is not read as a day heading', async () => {
  const { context, proper } = await properFor('2026-02-20', 'lauds');
  assert.equal(context.season, 'lent');
  assert.ok(proper.reading, 'Friday after Ash Wednesday lost its reading');
  assert.match(proper.reading || '', /Is 53/, proper.reading || '(empty)');
});

/**
 * romcal numbers Ash Wednesday and the three days after it week 0 of Lent.
 * Zero is falsy, so `chooseVariant` built no labels and every variant-bearing
 * field on those four days came back empty.
 */
test('the days from Ash Wednesday to Saturday keep their texts', async () => {
  for (const iso of ['2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21']) {
    const { context, proper } = await properFor(iso, 'lauds');
    assert.equal(context.seasonWeek, 0, `${iso}: expected Lent week 0`);
    assert.ok(proper.reading, `${iso}: no reading`);
    assert.ok(proper.prayer, `${iso}: no collect`);
  }
});

test('the days of Holy Week are told apart', async () => {
  const monday = await properFor('2026-03-30', 'lauds');
  const tuesday = await properFor('2026-03-31', 'lauds');
  assert.ok(monday.proper.reading, 'Monday of Holy Week has no reading');
  assert.notEqual(
    monday.proper.reading, tuesday.proper.reading,
    'Tuesday of Holy Week was served Monday\'s reading',
  );
});
