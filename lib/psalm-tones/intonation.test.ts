/**
 * The intonation, on the jgabc side of the app only.
 *
 * Two rules, both of which were missing:
 *   - The engraved verse always carries the intonation. psalmtone.js drops it
 *     when the first half is too short to hold the whole formula unless it is
 *     told to keep it (`favor.intonation`), so "Magníficat" — four syllables —
 *     was engraved starting flat on the tenor.
 *   - The Gospel canticles take the intonation on the mediant of *every*
 *     strophe, so those syllables stay marked throughout the canticle.
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

test('the Gospel canticles are marked at the head of every strophe', () => {
  const text = [
    'Magníficat * ánima mea Dóminum.',
    'Et exsultávit spíritus meus * in Deo salutári meo.',
    'Quia respéxit humilitátem ancíllæ suæ: * ecce enim ex hoc beátam me dicent omnes generatiónes.',
  ].join('\n');

  const plain = pointPsalm({ text, tone: '1.', variant: 'f', lang: 'la' });
  const marked = pointPsalm({ text, tone: '1.', variant: 'f', lang: 'la', intonationEveryVerse: true });

  const secondVerse = (out: string) => out.split('\n')[1].split('*')[0];

  // Verse two begins "Et exsultávit"; the intonation falls on "Et ex-".
  assert.doesNotMatch(secondVerse(plain), /^<em>Et<\/em>/);
  assert.match(secondVerse(marked), /^<em>Et<\/em>/);

  // Nothing after the mediant changes: the intonation is not sung there.
  const afterMediant = (out: string) => out.split('\n').map(line => line.split('*')[1] ?? '');
  assert.deepEqual(afterMediant(marked), afterMediant(plain));
});

test('intonation marking never lands on whitespace or over a cadence', () => {
  const out = pointPsalm({
    text: 'Et exsultávit spíritus meus * in Deo salutári meo.',
    tone: '1.', variant: 'f', lang: 'la', intonationEveryVerse: true,
  });
  assert.doesNotMatch(out, /<em>\s+<\/em>/, 'a gap token was italicised');
  assert.doesNotMatch(out, /<em>[^<]*<strong>/, 'marks nested');
});
