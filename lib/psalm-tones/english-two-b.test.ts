/**
 * `english/two/b` — the tone-2 termination, and the one adjustment the user
 * asked for in the English tones.
 *
 * The rule used to carry a `$final` flag, set when the first accent it met
 * walking backwards was the very last syllable of the hemistich. That flag
 * switched the cadence to an alternate shape — `\mi` on the accent itself,
 * `\pl` on the syllable before it and `\dmi` on the one before that — so the
 * plus retreated off the accented word instead of landing on it. The user's
 * ruling: "when the last syllable is stressed it shouldn't use the alternate
 * form — simply allow the normal tone to finish on the last stressed
 * syllable."
 *
 * These three lines are that change in miniature, and they are pinned here
 * because the rule is regenerated from `vendor/psautier/english/two.pm` by
 * `scripts/gen-lypsautierant.mjs`: a regeneration from an unmirrored copy of
 * the perl would restore the alternate form and nothing else would notice.
 * `npm run test:lyps` proves the port faithful to whatever perl is on disk;
 * it cannot tell you which perl you wanted.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyMode } from './lypsautierant-modes';
import { syllabifyLine } from './lypsautierant-syllabify';

const point = (text: string) => applyMode('english', 'two', 'b', syllabifyLine(text));

test('the tone finishes on an accented last syllable instead of retreating', () => {
  assert.equal(
    point('1 Bléssed indéed is the mán'),
    '1 Bléssed indéed \\mi{is} \\mi{the} \\pl{mán}',
  );
  assert.equal(
    point('and who pónders his láw day and níght.'),
    'and who pónders his láw \\mi{day} \\mi{and} \\pl{níght.}',
  );
  assert.equal(
    point('For théy, like wínnowed cháff,'),
    'For théy, like \\mi{wín}\\mi{nowed} \\pl{cháff,}',
  );
});

test('nothing survives of the alternate cadence', () => {
  // `\dmi` was only ever reachable through the `$final` flag in this rule, so
  // no line of English tone 2 may produce one again.
  for (const line of [
    '1 Bléssed indéed is the mán',
    'For théy, like wínnowed cháff,',
    'Whó walks not in the cóunsel of the wícked,',
    'nor abídes in the wáy of sínners,',
  ]) {
    assert.ok(!point(line).includes('\\dmi'), line);
  }
});

test('a hemistich that does not end on its accent is untouched', () => {
  // The change is confined to the case the user named. Where the last accent
  // is not the last syllable the cadence is what it always was: `\pl` on
  // that accent and `\mi` on the two syllables before it.
  assert.equal(
    point('Whó walks not in the cóunsel of the wícked,'),
    'Whó walks not in the cóunsel \\mi{of} \\mi{the} \\pl{wíc}ked,',
  );
  assert.equal(
    point('nor abídes in the wáy of sínners,'),
    'nor abídes in the \\mi{wáy} \\mi{of} \\pl{sín}ners,',
  );
});
