import test from 'node:test';
import assert from 'node:assert/strict';
import { firstVerseRange, firstVerseText } from './first-verse';

test('a verse printed on one line is one line', () => {
  const psalm = 'Magníficat * ánima mea Dóminum.\nEt exsultávit spíritus meus * in Deo salutári meo.';
  assert.deepEqual(firstVerseRange(psalm), { start: 0, end: 1 });
  assert.equal(firstVerseText(psalm), 'Magníficat * ánima mea Dóminum.');
});

test('a verse iBreviary broke after its asterisk is rejoined', () => {
  // iBreviary prints the termination half under the mediant half, so the
  // first line has nothing after its `*` and the score used to come out
  // empty — a Latin Magnificat printed as pointed text with no notation.
  const psalm = 'Magníficat*\n   ánima mea Dóminum,\net exsultávit spíritus meus*\n   in Deo salvatóre meo,';
  assert.deepEqual(firstVerseRange(psalm), { start: 0, end: 2 });
  assert.equal(firstVerseText(psalm), 'Magníficat* ánima mea Dóminum,');
});

test('a verse with a flex takes all three of its lines', () => {
  const psalm = 'The Lord’s revelation to my Master: †\n“Sit on my right: *\nyour foes I will put beneath your feet.”\n\nThe Lord will wield.';
  assert.deepEqual(firstVerseRange(psalm), { start: 0, end: 3 });
});

test('leading blank lines are skipped and a stanza break stops the search', () => {
  assert.deepEqual(firstVerseRange('\n\nOnly verse * pointed.'), { start: 2, end: 3 });
  // A psalm left hanging on a marker at the end of its stanza cannot run on
  // into the next one.
  assert.deepEqual(firstVerseRange('Hanging half *\n\nNext stanza.'), { start: 0, end: 1 });
});

test('unmarked text is left as a single line', () => {
  // The Grail psalter carries no markers; the pointing engine infers them,
  // and this runs before that, so it must not guess.
  assert.equal(firstVerseText('The Lórd’s revelátion to my Lórd:\n``Sít at my right hánd,'), 'The Lórd’s revelátion to my Lórd:');
});

test('text with nothing in it has no first verse', () => {
  assert.equal(firstVerseRange('   \n\n  '), null);
  assert.equal(firstVerseText(''), '');
});
