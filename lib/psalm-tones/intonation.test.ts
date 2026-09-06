/**
 * The intonation, on the jgabc side of the app.
 *
 * The engraved verse always carries the intonation. psalmtone.js drops it
 * when the first half is too short to hold the whole formula unless it is
 * told to keep it (`favor.intonation`), so "Magníficat" — four syllables —
 * was engraved starting flat on the tenor.
 *
 * The intonation is a fact about the notes, not about the pointing: it is
 * sung on the syllables at the head of the colon, but jgabc marks nothing
 * there. Its `italicizeIntonation` option italicises the *score*, not the
 * verse text, and it is off by default. This app used to italicise those
 * syllables in the text of every strophe of the Gospel canticles, which put
 * marks on "Et ex-" of "Et exsultávit" that no psalter prints.
 *
 * This is the jgabc tone engine (tone-data + psalm-tone-engine + psalmtone.js).
 * The lypsautierant engine is a separate pointing system and is not involved.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseGabcToneCounts, pointPsalm } from './psalm-tone-engine';
import { PSALM_TONES } from './tone-data';

test('the intonation length is read off the formula', () => {
  // "f gh hr 'ixi hr 'g hr h." — f and gh precede the reciting group hr.
  const tone1 = parseGabcToneCounts(PSALM_TONES['1.'].mediant);
  assert.equal(tone1.intonation, 2);

  // A formula with no reciting group has no intonation to speak of.
  assert.equal(parseGabcToneCounts('').intonation, 0);
});

test('the intonation is not marked in the text of any strophe', () => {
  const text = [
    'Magníficat * ánima mea Dóminum.',
    'Et exsultávit spíritus meus * in Deo salutári meo.',
    'Quia respéxit humilitátem ancíllæ suæ: * ecce enim ex hoc beátam me dicent omnes generatiónes.',
  ].join('\n');

  const out = pointPsalm({ text, tone: '1.', variant: 'f', lang: 'la' });
  const lines = out.split('\n');

  // Tone 1 spends two syllables on the intonation. Neither of them is marked.
  assert.equal(lines[1].split('*')[0].trim(), 'Et exsultávit <strong>spí</strong>ritus <strong>me</strong>us');
  assert.equal(lines[2].split('*')[0].trim(), 'Quia respéxit humilitátem an<strong>cíl</strong>læ <strong>su</strong>æ:');
});
