/**
 * OCO's `Mode` column → the tone the psalms under that antiphon are sung to.
 *
 * The table in `mode-map.ts` is the user's, and its measure is what it reaches
 * over the real index: 2531 of `IDX_ANT.csv`'s 2813 antiphons — 90.0%. The
 * first test pins that number, because a table that quietly stops reaching a
 * family of modes looks exactly like a table that never did.
 *
 * The rest pin the rulings that are easy to lose: the asterisk is not
 * significant, `per.` is the tonus peregrinus, and whether a serial number on
 * the termination is ignored is per row rather than global — `1d2` is `1d`,
 * `8c2` is not `8c`.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveToneFromMode, normaliseMode } from './mode-map';
import { getVariants } from './tone-data';
import { getAnts } from '@/app/api/ibreviary/gabc-loaders';

/** The english side, as `mode/variation`, or the reason there is none. */
const english = (mode: string) => {
  const r = resolveToneFromMode(mode);
  return r.ok ? `${r.tone.lypsMode}/${r.tone.lypsVariation}` : `— ${r.reason}`;
};
/** The jgabc side, as `tone variant`. */
const jgabc = (mode: string) => {
  const r = resolveToneFromMode(mode);
  return r.ok ? `${r.tone.jgabcTone} ${r.tone.jgabcVariant}`.trim() : null;
};

test('the table reaches 2531 of the index’s 2813 antiphons', () => {
  const rows = getAnts();
  let mapped = 0, blank = 0, unmapped = 0;
  for (const row of rows) {
    if (resolveToneFromMode(row.mode).ok) mapped++;
    else if (!row.mode?.trim()) blank++;
    else unmapped++;
  }
  assert.equal(rows.length, 2813);
  assert.equal(mapped, 2531);
  assert.equal(blank, 241);
  assert.equal(unmapped, 41);
});

test('every mode the table maps names a variation that exists', () => {
  // `english/four` has an `a_prime` and `eight` an `a_prime` and `a_dprime`
  // that the table does not use; nothing may point at one that is not there.
  const variations: Record<string, string[]> = {
    one: ['a', 'b', 'a_prime', 'b_prime'],
    two: ['a', 'b', 'a_prime'],
    three: ['a', 'b'],
    four: ['a', 'b', 'a_prime', 'b_prime'],
    five: ['a', 'a_prime', 'b', 'b_prime'],
    six: ['a', 'b', 'a_prime'],
    seven: ['a', 'b', 'b_prime'],
    eight: ['a', 'a_prime', 'a_dprime', 'b'],
    peregrinus: ['a', 'b'],
  };
  const seen = new Set<string>();
  for (const row of getAnts()) {
    const r = resolveToneFromMode(row.mode);
    if (!r.ok) continue;
    seen.add(`${r.tone.lypsMode}/${r.tone.lypsVariation}`);
    assert.ok(variations[r.tone.lypsMode]?.includes(r.tone.lypsVariation),
      `${row.mode} → ${r.tone.lypsMode}/${r.tone.lypsVariation}`);
    // And the jgabc side may never name a termination its tone does not have.
    const codes = getVariants(r.tone.jgabcTone);
    assert.ok(codes.includes(r.tone.jgabcVariant),
      `${row.mode} → ${r.tone.jgabcTone} has no "${r.tone.jgabcVariant}"`);
  }
  assert.equal(seen.size, 16);
});

test('the user’s table, row by row', () => {
  assert.equal(english('1d'), 'one/b_prime');
  assert.equal(english('1g'), 'one/a_prime');
  assert.equal(english('1a'), 'one/a');
  assert.equal(english('1f'), 'one/b');
  assert.equal(english('2d'), 'two/b');
  assert.equal(english('3a'), 'three/a');
  assert.equal(english('4g'), 'four/a');
  assert.equal(english('4e'), 'four/b');
  assert.equal(english('5a'), 'five/b');
  assert.equal(english('6f'), 'six/a_prime');
  assert.equal(english('7a'), 'seven/b_prime');
  assert.equal(english('7b'), 'seven/a');
  assert.equal(english('7c'), 'seven/b');
  assert.equal(english('7d'), 'seven/b');
  assert.equal(english('8c'), 'eight/a');
  assert.equal(english('8g'), 'eight/b');

  // Modes 2, 3, 5 and 6 map whole — the termination does not change the tone,
  // and neither does its absence.
  for (const mode of ['2', '2a', '2d', '2f', '2*a', '2*d', '2*f', '2*-4a', '2*-4d']) {
    assert.equal(english(mode), 'two/b', mode);
  }
  for (const mode of ['3', '3a', '3a2', '3b', '3g']) assert.equal(english(mode), 'three/a', mode);
  for (const mode of ['5', '5a']) assert.equal(english(mode), 'five/b', mode);
  for (const mode of ['6', '6c', '6f']) assert.equal(english(mode), 'six/a_prime', mode);
});

test('the two rules on top of the table', () => {
  // `per.` is the tonus peregrinus.
  assert.equal(english('per.'), 'peregrinus/b');
  assert.equal(jgabc('per.'), 'per.');

  // The asterisk is not significant for this lookup. `4*e` is `4e`, and the
  // user's "4 alt c" and "4 alt A" are OCO's starred `4*c` and `4*a`.
  assert.equal(english('4*e'), english('4e'));
  assert.equal(english('4*c'), 'four/a');
  assert.equal(english('4*a'), 'four/b_prime');
  assert.equal(english('2*a'), english('2a'));
});

test('a serial number on the termination is ignored per row, not everywhere', () => {
  // `1d`, `1g`, `1a`, `7c` and `8g` carry all their numbered variants.
  assert.equal(english('1d2'), 'one/b_prime');
  assert.equal(english('1d3'), 'one/b_prime');
  assert.equal(english('1a2'), 'one/a');
  assert.equal(english('1a3'), 'one/a');
  assert.equal(english('1g2'), 'one/a_prime');
  assert.equal(english('1g3'), 'one/a_prime');
  assert.equal(english('7c2'), 'seven/b');
  assert.equal(english('8g2'), 'eight/b');

  // `8c` does not, and `8c2` is one of the 41 the table leaves alone.
  assert.ok(!resolveToneFromMode('8c2').ok);
});

test('what the table does not reach, it says so about', () => {
  const reasons = ['E', 'D', 'Dg', 'Dd', 'C2', 'Cc2', 'E/4*e']
    .map(m => resolveToneFromMode(m));
  for (const r of reasons) {
    assert.equal(r.ok, false);
    assert.match((r as { reason: string }).reason, /letter-mode/);
  }

  // A bare mode number records no termination, and modes 1, 4, 7 and 8 are
  // keyed on one.
  assert.match((resolveToneFromMode('1') as { reason: string }).reason, /no termination/);
  assert.match((resolveToneFromMode('7') as { reason: string }).reason, /no termination/);

  // `7at` is mode 7a "transposed"; the `t` is not a serial number and the
  // table has no row for it, so it is not quietly read as `7a`.
  assert.ok(!resolveToneFromMode('7at').ok);
  assert.equal(english('7a'), 'seven/b_prime');

  assert.match((resolveToneFromMode('') as { reason: string }).reason, /no mode recorded/);
  assert.match((resolveToneFromMode(undefined) as { reason: string }).reason, /no mode recorded/);
});

test('the jgabc tone never invents a termination', () => {
  assert.equal(jgabc('8g'), '8. G');
  assert.equal(jgabc('8c'), '8. c');
  assert.equal(jgabc('1d'), '1. D');
  assert.equal(jgabc('1d2'), '1. D2');
  assert.equal(jgabc('3a2'), '3. a2');
  assert.equal(jgabc('7c2'), '7. c2');
  assert.equal(jgabc('4e'), '4. E');

  // Modes 2, 5 and 6 have one termination and no code for it.
  assert.equal(jgabc('2*a'), '2.');
  assert.equal(jgabc('5a'), '5.');
  assert.equal(jgabc('6f'), '6.');

  // The starred modes are jgabc's "N. alt", but only where that tone has the
  // termination asked for: `4*e` has no alt form and sings plain mode 4 E.
  assert.equal(jgabc('4*c'), '4. alt c');
  assert.equal(jgabc('4*a'), '4. alt A');
  assert.equal(jgabc('4a'), '4. alt A');
  assert.equal(jgabc('4*e'), '4. E');

  // `8g2` and `1d3` are real OCO terminations that `tone-data.ts` does not
  // carry. The nearest is taken and the fact is recorded, not hidden.
  const g2 = resolveToneFromMode('8g2');
  assert.ok(g2.ok && g2.tone.jgabcApproximated && g2.tone.jgabcVariant === 'G');
  const d3 = resolveToneFromMode('1d3');
  assert.ok(d3.ok && d3.tone.jgabcApproximated && d3.tone.jgabcVariant === 'D');
  const g = resolveToneFromMode('8g');
  assert.ok(g.ok && !g.tone.jgabcApproximated);
});

test('a jgabc-style annotation reaches the same table as an OCO mode', () => {
  // `withAnnotation` writes OCO's mode verbatim, but a Gregobase score that
  // already has headers keeps its own, written the jgabc way.
  assert.equal(normaliseMode('Ant. 8 G'), '8g');
  assert.equal(normaliseMode('8.'), '8');
  assert.equal(normaliseMode('4. alt g'), '4*g');
  assert.equal(normaliseMode('Inv. per.'), 'per.');
  assert.equal(english('Ant. 8 G'), 'eight/b');
  assert.equal(jgabc('4. alt g'), '4. g');

  // A letter-mode is not a termination of nothing: `E` keeps its case.
  assert.equal(normaliseMode('E'), 'E');
});
