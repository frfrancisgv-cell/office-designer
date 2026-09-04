/**
 * hebrewToVulgate — Hebrew psalm number to the Vulgate number that names the
 * Latin text file in jgabc-psalms/.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hebrewToVulgate } from './psalm-numbering';

test('psalms 1-8 are numbered alike in both systems', () => {
  for (let n = 1; n <= 8; n++) assert.equal(hebrewToVulgate(n), n);
});

test('psalm 9 is the join: Hebrew 9 and 10 are one Vulgate psalm', () => {
  assert.equal(hebrewToVulgate(9), 9);
  assert.equal(hebrewToVulgate(10), 9);
});

test('11-113 run one behind', () => {
  assert.equal(hebrewToVulgate(11), 10);
  assert.equal(hebrewToVulgate(51), 50);   // Miserere
  assert.equal(hebrewToVulgate(113), 112);
});

test('114 and 115 are the second join', () => {
  assert.equal(hebrewToVulgate(114), 113);
  assert.equal(hebrewToVulgate(115), 113);
  assert.equal(hebrewToVulgate(116), 114);
});

test('117-146 run one behind again', () => {
  assert.equal(hebrewToVulgate(117), 116);
  assert.equal(hebrewToVulgate(119), 118);  // the long one
  assert.equal(hebrewToVulgate(146), 145);
});

test('147 is the split, and 148-150 realign', () => {
  assert.equal(hebrewToVulgate(147), 146);
  assert.equal(hebrewToVulgate(148), 148);
  assert.equal(hebrewToVulgate(150), 150);
});

test('a subdivided psalm keeps its leading number', () => {
  // The regression: String(psalm).replace(/\D/g, '') turned "119.1-8" into
  // 11918, which fell through to the n >= 148 branch and asked for
  // jgabc-psalms/11918.txt. Every subdivided psalm's Latin text was
  // unreachable — including Psalm 119 (I), which the psalter schema names
  // directly.
  assert.equal(hebrewToVulgate('119.1-8'), 118);
  assert.equal(hebrewToVulgate('119.9-16'), 118);
  assert.equal(hebrewToVulgate('119.169-176'), 118);
  assert.equal(hebrewToVulgate('9.1-10'), 9);
  assert.equal(hebrewToVulgate('144.1-8'), 143);
});

test('accepts numbers and strings alike', () => {
  assert.equal(hebrewToVulgate('117'), hebrewToVulgate(117));
  assert.equal(hebrewToVulgate(' 51 '), 50);
});

test('falls back to psalm 1 when there is no number at all', () => {
  assert.equal(hebrewToVulgate(''), 1);
  assert.equal(hebrewToVulgate('benedictus'), 1);
});
