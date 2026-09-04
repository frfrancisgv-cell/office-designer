/**
 * The one thing worth asserting end-to-end about office generation: that a
 * Latin office actually carries Latin text.
 *
 * generateCanonicalOffice falls back to a "[Psalmus N]" placeholder whenever
 * it cannot find the text, and it does so silently — which is how the
 * subdivided-psalm numbering bug (see psalm-numbering.ts) survived: every
 * Latin minor hour on Monday through Saturday rendered a placeholder instead
 * of Psalm 119, and nothing complained.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateCanonicalOffice } from './office-engine';

/** Monday 2026-09-07 — a minor hour here draws on a subdivided Psalm 119. */
const MONDAY = new Date('2026-09-07T12:00:00');

test('a Latin minor hour renders the subdivided psalm, not a placeholder', () => {
  for (const hour of ['terce', 'sext', 'none'] as const) {
    const psalms = generateCanonicalOffice({ date: MONDAY, hour, lang: 'la' })
      .filter((b) => b.type === 'psalm');

    assert.ok(psalms.length > 0, `${hour}: no psalm block at all`);
    for (const p of psalms) {
      assert.doesNotMatch(
        p.content,
        /^\[Psalmus/,
        `${hour}: psalm ${p.psalmNumber} fell back to a placeholder`,
      );
      assert.ok(p.content.length > 100, `${hour}: psalm ${p.psalmNumber} is suspiciously short`);
    }
  }
});

test('the English office of the same hour is populated too', () => {
  const psalms = generateCanonicalOffice({ date: MONDAY, hour: 'terce', lang: 'en' })
    .filter((b) => b.type === 'psalm');

  assert.ok(psalms.length > 0);
  for (const p of psalms) {
    assert.doesNotMatch(p.content, /^\[Psalm /, `psalm ${p.psalmNumber} fell back to a placeholder`);
  }
});
