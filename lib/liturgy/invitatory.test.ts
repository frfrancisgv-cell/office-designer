/**
 * The invitatory antiphon and the psalm tone that goes with it.
 *
 * `IDX_INV.csv` does not use the occasion codes the rest of the app computes.
 * The route asks OCO for a ferial `1H4`, a dated `15/8` or a common `Doct`;
 * the invitatory index writes the ferial cycle as `1-4H4` — one set of seven
 * shared by all four psalter weeks — Lent as `Q`, Advent as
 * `Adv ante 17/12 H2-7`, Easter as `TP ante Asc`. So the old
 * `find(e => e.occasion === occasionCode)` matched on a handful of commons and
 * dated feasts and on no ferial, Advent, Lent, Christmas or Easter day at all,
 * which is most of the year.
 *
 * The measure of this file is the first test: every day of a year resolves an
 * antiphon, with real text and a tone to sing the psalm to.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getLiturgicalContext, invitatoryOccasionCodes } from './calendar-context';
import { invByOccasion, invitatoryToneByMode, invitatoryToneLabel } from '@/app/api/ibreviary/gabc-lookup';
import { getInvs } from '@/app/api/ibreviary/gabc-loaders';

/** Every day of 2026, resolved as Lauds. */
async function everyDay() {
  const days = [];
  for (let i = 0; i < 365; i++) {
    const date = new Date(Date.UTC(2026, 0, 1 + i));
    const context = await getLiturgicalContext(date, 'lauds');
    const codes = invitatoryOccasionCodes(context);
    days.push({ date, context, codes, candidates: invByOccasion(codes) });
  }
  return days;
}

test('every day of the year resolves an invitatory antiphon', async () => {
  const days = await everyDay();

  const unresolved = days
    .filter(d => !d.candidates.length)
    .map(d => `${d.date.toISOString().slice(0, 10)} tried ${d.codes.join(' → ')}`);
  assert.deepEqual(unresolved, []);

  // Not a label, and not upstream's "- cum alleluia" ditto mark, which is what
  // reading the `Title` column instead of `Text` used to print.
  const empty = days
    .filter(d => !d.candidates[0].incipit.trim() || d.candidates[0].incipit.startsWith('-'))
    .map(d => `${d.date.toISOString().slice(0, 10)}: ${JSON.stringify(d.candidates[0].incipit)}`);
  assert.deepEqual(empty, []);

  // Most of the year should be getting its own antiphon rather than the
  // weekday one: 210 of 365 in 2026, which is every Sunday, every day of
  // Advent, Lent and Easter, and every celebration with a common.
  const proper = days.filter(d => !/^1-4H\d$/.test(d.candidates[0].occasion ?? ''));
  assert.ok(proper.length > 200, `only ${proper.length} days get a proper or seasonal antiphon`);
});

test('the day that is asked for is the day that answers', async () => {
  const expected: Record<string, string> = {
    '2026-01-01': 'N-1/1',                 // Mary, Mother of God
    '2026-01-04': 'Ep',                    // Epiphany, transferred to the Sunday
    '2026-01-08': 'N post Ep',
    '2026-01-11': 'Bapt',
    '2026-02-02': '2/2',                   // the Presentation
    '2026-03-19': '19/3',                  // Saint Joseph
    '2026-04-03': '6Q6',                   // Good Friday has its own, not the general "Q"
    '2026-04-04': '6Q7',                   // Holy Saturday likewise
    '2026-04-25': '25/4',                  // Saint Mark — see the Easter test below
    '2026-05-03': 'TP ante Asc',
    '2026-05-17': 'Asc',
    '2026-05-24': 'Pent',
    '2026-05-31': 'Trn',                   // movable: no date code can reach it
    '2026-06-07': 'Corp',
    '2026-06-12': 'Cord',
    '2026-08-15': '15/8',                  // the Assumption
    '2026-09-29': '29/9 2/10',             // one row, two dates
    '2026-11-02': 'Def',
    '2026-11-22': 'Reg',
    '2026-12-20': 'Adv post 17/12 H1',     // the Sunday after 17 December
    '2026-12-21': 'Adv post 17/12 H2-7',   // and its weekdays
    '2026-12-06': 'Adv ante 17/12 H1',
    '2026-12-25': 'N-25/12',
    '2026-12-27': 'Fam',
  };

  for (const [iso, code] of Object.entries(expected)) {
    const context = await getLiturgicalContext(new Date(`${iso}T00:00:00Z`), 'lauds');
    const candidates = invByOccasion(invitatoryOccasionCodes(context));
    assert.ok(candidates.length, `${iso}: nothing resolved`);
    assert.equal(candidates[0].occasion, code, `${iso} (${context.key})`);
  }
});

test('Easter prefers the alleluia variant, but not over a more proper one', async () => {
  // Saint Mark is the case that decides where the preference belongs. 25 April
  // always falls in Easter, so his own dated row is already the alleluia form;
  // preferring "Ap TP" — the apostles' Easter invitatory — over it would be
  // reaching for a *less* proper antiphon because it happens to say alleluia.
  const mark = await getLiturgicalContext(new Date('2026-04-25T00:00:00Z'), 'lauds');
  const markAnt = invByOccasion(invitatoryOccasionCodes(mark))[0];
  assert.equal(markAnt.occasion, '25/4');
  assert.match(markAnt.incipit, /alleluia/);

  // A doctor in Easter, where there is no dated row, does take "Doct TP".
  const doctor = await getLiturgicalContext(new Date('2026-04-29T00:00:00Z'), 'lauds');
  assert.equal(doctor.key, 'catherine_of_siena_virgin');
  const codes = invitatoryOccasionCodes(doctor);
  assert.ok(codes.indexOf('Doct TP') < codes.indexOf('Doct'), codes.join(' → '));

  // Upstream spaces the Easter codes inconsistently, so both spellings are
  // offered and whichever the index has is the one that matches.
  assert.ok(codes.includes('DoctTP'), codes.join(' → '));
});

test('Ascension opens the seventh week of Easter in this calendar', async () => {
  // The "ante Asc" / "post Asc" split is made on the season week, which is
  // right only because the configured calendar transfers Ascension to the
  // Sunday. A calendar keeping it on the Thursday would move the boundary into
  // the sixth week, and `invitatorySeasonCodes` would have to follow.
  const ascension = await getLiturgicalContext(new Date('2026-05-17T00:00:00Z'), 'lauds');
  assert.equal(ascension.key, 'ascension_of_the_lord');
  assert.equal(ascension.seasonWeek, 7);
  assert.equal(ascension.celebrationDate.getUTCDay(), 0);
});

test('an ad libitum choice is offered, not silently taken', async () => {
  // `Ded`, `BMV`, `Q` and `Ap` each have two rows in the index — real options.
  // `find` returned the first and discarded the rest.
  const lent = invByOccasion(['Q']);
  assert.equal(lent.length, 2);
  assert.deepEqual(lent.map(c => c.mode), ['4*', 'E']);

  const dedication = invByOccasion(['Ded']);
  assert.equal(dedication.length, 2);
  assert.match(dedication[0].incipit, /Christum Dominum qui dilexit Ecclesiam/);
  assert.match(dedication[1].incipit, /Domum Dei decet sanctitudo/);
});

// ── The psalm tone ───────────────────────────────────────────────────────────

test('every mode the index uses has a Venite exsultemus in Gregobase', () => {
  const modes = [...new Set(getInvs().map(e => e.mode))].sort();
  assert.deepEqual(modes, ['2', '3', '4', '4*', '4**', '5', '6', '6*', '7', 'D', 'E']);

  for (const mode of modes) {
    const tone = invitatoryToneByMode(mode);
    assert.ok(tone, `mode ${mode} has no invitatory psalm`);
    // Not a tone formula: the whole of Psalm 94 written out with its melody.
    assert.ok(tone.gabc.length > 2000, `mode ${mode}: ${tone.gabc.length} characters is too short`);
  }
});

test('the tone label is built, not guessed', () => {
  assert.equal(invitatoryToneLabel('2'), 'Venite exsultemus II');
  assert.equal(invitatoryToneLabel('4*'), 'Venite exsultemus IV*');
  assert.equal(invitatoryToneLabel('4**'), 'Venite exsultemus IV**');
  assert.equal(invitatoryToneLabel('E'), 'Venite exsultemus E');
  assert.equal(invitatoryToneLabel('D'), 'Venite exsultemus D');
  assert.equal(invitatoryToneLabel('7a'), null, 'a termination is not part of this label');
  assert.equal(invitatoryToneLabel(''), null);

  // Gregobase carries a second, parallel naming scheme for the same tones —
  // "(mode 7a simplex)", "(mode 4g festivus)" — and an "IV* (ad lib)". The
  // label must match exactly so the two schemes are never mixed.
  assert.equal(invitatoryToneByMode('4*')!.gbId, 7669);
  // Where a label has more than one entry the lowest id wins: mode 7 is 9834
  // and 16799, mode 4 is 15508 and 17784.
  assert.equal(invitatoryToneByMode('7')!.gbId, 9834);
  assert.equal(invitatoryToneByMode('4')!.gbId, 15508);
});

test('the antiphon ends on the intonation of the tone chosen for it', () => {
  // Each ferial antiphon's score closes with the psalm's opening words and
  // their melody — "(::) Ve(g/goh)ní(fg)te,(ffe) (::)" — which is where the
  // tone the mode selects begins. Antiphon and tone are therefore a free
  // check on each other: if the mode → label table ever pointed at the wrong
  // Venite exsultemus, the two would stop lining up.

  /** GABC → [syllable, notes] pairs, spelling and note grouping normalised. */
  const score = (gabc: string) => [...gabc.matchAll(/([^()]*)\(([^)]*)\)/g)]
    .map(m => [
      m[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z]/g, '').replace(/j/g, 'i').replace(/v/g, 'u'),
      // "ffe" and "f/fe" are the same three notes differently grouped, and
      // "(::)" and "(,)" are bars, not notes.
      m[2].replace(/\//g, ''),
    ] as [string, string])
    .filter(([syllable, notes]) => syllable && !/^[a-z]\d$/.test(notes));

  for (let day = 1; day <= 7; day++) {
    const [antiphon] = invByOccasion([`1-4H${day}`]);
    assert.ok(antiphon, `no ferial antiphon for day ${day}`);
    const tone = invitatoryToneByMode(antiphon.mode);
    assert.ok(tone, `day ${day}: mode ${antiphon.mode} has no tone`);

    // Everything after the antiphon's last-but-one double bar is the psalm's
    // opening, quoted. On day 1 that is "Iubilemus" rather than "Venite",
    // because the antiphon's own words are "Venite exsultemus Domino" and the
    // psalm goes on from there.
    const lastBar = antiphon.gabc.lastIndexOf('(::)');
    const quoted = score(antiphon.gabc.slice(antiphon.gabc.lastIndexOf('(::)', lastBar - 1)));
    assert.ok(quoted.length >= 3, `day ${day}: the antiphon quotes no psalm opening`);

    const psalm = score(tone.gabc);
    const at = psalm.findIndex((_, i) =>
      quoted.every(([syllable], k) => psalm[i + k]?.[0] === syllable));
    assert.ok(at >= 0,
      `day ${day}: the tone never sings "${quoted.map(q => q[0]).join('')}"`);
    assert.deepEqual(
      psalm.slice(at, at + quoted.length),
      quoted,
      `day ${day} (mode ${antiphon.mode}): the antiphon's quotation and the tone differ`,
    );
  }
});
