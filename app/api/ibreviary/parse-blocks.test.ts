/**
 * The iBreviary Lauds import, checked against a stored copy of the page.
 *
 * iBreviary prints the Invitatory with all its options around it: two
 * navigation links, the three alternative invitatory psalms as links, a
 * rubric saying the Invitatory is said only if this is the first hour, and —
 * after another rubric — the *Deus in adiutorium* opening used when it is
 * not. This app always says the Invitatory, and always with Psalm 94/95, so
 * none of that is wanted.
 *
 * Worse than unwanted: the versicle *Lord, open my lips* arrived as a `psalm`
 * block with "Go to the Hymn / Go to the Psalmody" glued to the front of it,
 * so the website's navigation was offered for psalm-tone pointing.
 *
 * The fixture is the English Lauds of Saturday 5 September 2026, fetched from
 * ibreviary.com on that day (`s=lodi`). Re-fetch it with the same query if it
 * ever needs refreshing; the assertions below are about the page's shape, not
 * about that day's propers.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { parseBlocks } from './parse-blocks';

function laudsBlocks() {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'app', 'api', 'ibreviary', '__fixtures__',
      'lauds-2026-09-05-en.html'),
    'utf8',
  );
  return parseBlocks(cheerio.load(html), '', '', '');
}

test('the imported Lauds offers no alternative to the Invitatory', () => {
  const blocks = laudsBlocks();
  assert.ok(blocks.length > 20, `only ${blocks.length} blocks parsed`);

  const offending = blocks.filter((b) =>
    /Psalm (24|67|100)$/.test(b.content)
    || /^Go to the/.test(b.content)
    || b.content.includes('come to my assistance')
    || /^The Invitatory is said when/.test(b.content)
    || /^If the Invitatory is not said/.test(b.content),
  );
  assert.deepEqual(offending.map((b) => `${b.type}: ${b.content.slice(0, 60)}`), []);
});

test('Lord, open my lips is a versicle, not a verse of the psalm', () => {
  const blocks = laudsBlocks();
  const versicle = blocks.find((b) => b.content.includes('open my lips'));

  assert.ok(versicle, 'the invitatory versicle is missing');
  assert.equal(versicle.type, 'text');
  assert.equal(
    versicle.content,
    'Lord, + open my lips.\n— And my mouth will proclaim your praise.',
  );
});

test('the Invitatory itself survives intact', () => {
  const blocks = laudsBlocks();

  const antiphons = blocks.filter((b) => b.type === 'invitatory-antiphon');
  assert.equal(antiphons.length, 2, 'the antiphon should open and close the psalm');
  assert.match(antiphons[0].content, /Let us listen to the voice of God/);

  // The one psalm the invitatory ever gets, in one block: the intermediate
  // antiphon repeats are dropped so the verses merge.
  const psalm = blocks.find((b) => b.type === 'psalm' && b.content.includes('let us sing to the Lord'));
  assert.ok(psalm, 'Psalm 95 is missing');
  assert.match(psalm.content, /Come, let us sing to the Lord/);
  assert.match(psalm.content, /bow down and worship/);
  assert.match(psalm.content, /Glory to the Father/);
});

test('nothing outside the Invitatory is lost', () => {
  const blocks = laudsBlocks();
  for (const heading of ['INVITATORY', 'HYMN', 'PSALMODY', 'READING', 'RESPONSORY']) {
    assert.ok(
      blocks.some((b) => b.type === 'heading' && b.content === heading),
      `the ${heading} heading is gone`,
    );
  }
  assert.ok(blocks.some((b) => b.type === 'hymn' && b.content.includes('As daylight fills the sky')));
  assert.ok(blocks.some((b) => b.type === 'psalm' && b.content.includes('good to give thanks to the Lord')));
});
