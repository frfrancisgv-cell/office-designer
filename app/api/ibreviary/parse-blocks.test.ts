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
 * The fixtures are the English and Latin Lauds of Saturday 5 September 2026,
 * fetched from ibreviary.com on that day (`s=lodi`). Re-fetch them with the
 * same query if they ever need refreshing; the assertions below are about the
 * page's shape, not about that day's propers.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { parseBlocks } from './parse-blocks';
import { propagateTones } from '@/lib/psalm-tones/propagate';

function laudsBlocks(lang: 'en' | 'la' = 'en') {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'app', 'api', 'ibreviary', '__fixtures__',
      `lauds-2026-09-05-${lang}.html`),
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

// ── The Latin office ─────────────────────────────────────────────────────────
//
// None of this worked at all until the headings were read in Latin: the page
// says "AD INVITATORIUM", "HYMNUS", "CANTICUM EVANGELICUM", and the section
// tests knew only the English and Italian words. So a Latin office never
// entered its own sections, and everything that hangs off them — the
// invitatory antiphon's type, the antiphon repeats being folded away, the
// canticle's name — was wrong.

test('the Latin headings are read, and printed in Latin', () => {
  const blocks = laudsBlocks('la');
  const headings = blocks.filter((b) => b.type === 'heading').map((b) => b.content);

  assert.deepEqual(headings, [
    'AD INVITATORIUM', 'HYMNUS', 'PSALMODIA', 'LECTIO BREVIS',
    'RESPONSORIUM BREVE', 'CANTICUM EVANGELICUM', 'PRECES', 'PATER NOSTER',
    'ORATIO',
  ]);
  // "HYMNUS" used to match the shorter 'HYMN' and come out as a heading
  // "HYMN" with a stray rubric "US" beside it.
  assert.ok(!blocks.some((b) => b.content === 'US'), 'HYMNUS was cut in half');
  assert.ok(!blocks.some((b) => b.content === 'BREVE'), 'RESPONSORIUM BREVE was cut in half');
});

test('the Latin invitatory has the same shape as the English one', () => {
  const blocks = laudsBlocks('la');

  const antiphons = blocks.filter((b) => b.type === 'invitatory-antiphon');
  assert.equal(antiphons.length, 2, 'the antiphon should open and close the psalm');
  assert.match(antiphons[0].content, /Regem vírginum Dóminum/);

  const versicle = blocks.find((b) => b.content.includes('lábia mea apéries'));
  assert.ok(versicle, 'the invitatory versicle is missing');
  assert.equal(versicle.type, 'text');

  // Psalm 94 in one block, its five strophes merged, and no alternative
  // opening after it: the Latin page prints "Deus in adiutórium" with its
  // rubric — "Omnia supra dicta omituntur" — *after* rather than before.
  const psalm = blocks.filter((b) => b.type === 'psalm' && b.content.includes('Veníte, exsultémus'));
  assert.equal(psalm.length, 1, 'Psalm 94 did not come through as one block');
  assert.match(psalm[0].content, /Quadragínta annis/, 'the last strophe is missing');
  assert.ok(!blocks.some((b) => b.content.includes('adiutórium meum')), 'the alternative opening survived');
  assert.ok(!blocks.some((b) => b.content.includes('Omnia supra dicta')), 'its rubric survived');
  assert.ok(!blocks.some((b) => /Psalmus (23\(24\)|66\(67\)|99\(100\))/.test(b.content)),
    'the alternative psalms survived');
});

test('a Latin rubric is never typeset as a verse', () => {
  const blocks = laudsBlocks('la');
  const psalms = blocks.filter((b) => b.type === 'psalm');

  // Titles: the page marks them `rubrica` and nothing else identifies them,
  // because none of them starts with an English word the parser knows.
  for (const title of ['Canticum Deut 32, 1-12', 'BENEDICTUS']) {
    const block = blocks.find((b) => b.content.startsWith(title));
    assert.ok(block, `the "${title}" title is missing`);
    assert.equal(block.type, 'rubric', `"${title}" is typed ${block.type}`);
  }
  assert.ok(!psalms.some((b) => b.content.includes('De Messia eiusque')),
    'the canticle title was merged into the canticle');

  // "Ex ore infántium" is the second strophe of Psalm 8, not a citation of
  // Exodus: the book-abbreviation list used to match a bare "Ex ".
  const psalm8 = psalms.find((b) => b.content.includes('quam admirábile est nomen tuum'));
  assert.ok(psalm8, 'Psalm 8 is missing');
  assert.match(psalm8.content, /Ex ore infántium/, 'Psalm 8 was split by a false rubric');
});

test('the Latin Gospel canticle is named', () => {
  const canticle = laudsBlocks('la').find((b) => b.psalmNumber);
  assert.ok(canticle, 'no block carries a psalmNumber');
  assert.equal(canticle.psalmNumber, 'Benedictus');
  assert.match(canticle.content, /^Benedíctus Dóminus Deus Israel/);
});

// ─── Vespers: the canticle that could not be pointed ──────────────────────────
//
// The Vespers fixtures are the English and Latin Evening Prayer of Saturday
// 5 September 2026, fetched from ibreviary.com on that day (`s=vespri`).
//
// The editor offers its two text buttons — "Lypsautierant (EN)" and "Latin
// (jgabc)" — only for a block that carries a `psalmNumber`, and the psalmody's
// canticle never carried one: the rubric that names it is written "Canticle:
// See Revelation 19:1-7", and the only shape the number-assigning pass matched
// was a parenthesised "Canticle (Rev 19)" that iBreviary does not print. So the
// one part of the office with a pointed English translation waiting for it was
// the one part that could not ask for it.

function vespersBlocks(lang: 'en' | 'la' = 'en') {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'app', 'api', 'ibreviary', '__fixtures__',
      `vespers-2026-09-05-${lang}.html`),
    'utf8',
  );
  return propagateTones(parseBlocks(cheerio.load(html), '', '', ''));
}

test('the Vespers canticle is numbered, so its pointed text can be loaded', () => {
  for (const lang of ['en', 'la'] as const) {
    const canticle = vespersBlocks(lang).find((b) => b.psalmNumber === 'NT 12');
    assert.ok(canticle, `${lang}: no block carries the canticle's number`);
    assert.equal(canticle.type, 'psalm');
  }
});

test('the Vespers canticle does not open on the rubric about the Alleluia', () => {
  for (const lang of ['en', 'la'] as const) {
    const blocks = vespersBlocks(lang);
    const canticle = blocks.find((b) => b.psalmNumber === 'NT 12')!;
    assert.doesNotMatch(canticle.content, /^(The following canticle|Sequens canticum)/);

    const instruction = blocks.find((b) =>
      /^(The following canticle|Sequens canticum)/.test(b.content));
    assert.ok(instruction, `${lang}: the instruction went missing entirely`);
    assert.equal(instruction.type, 'rubric', `${lang}: the instruction is not a rubric`);
  }
});

test('the psalms of a Latin import are numbered as the Grail numbers them', () => {
  // "Psalmus 109 (110), 1-5. 7" — the Hebrew number is the parenthesised one,
  // and it is the one both text loaders want. Before it was read, no psalm of
  // any Latin import had a number, and neither button appeared anywhere.
  const numbers = vespersBlocks('la')
    .filter((b) => b.type === 'psalm')
    .map((b) => b.psalmNumber);
  assert.ok(numbers.includes('110'), `expected Psalm 110, got ${numbers.join(', ')}`);
  assert.ok(numbers.includes('111'), `expected Psalm 111, got ${numbers.join(', ')}`);
});

test('the Lauds canticle is numbered too, in both languages', () => {
  for (const lang of ['en', 'la'] as const) {
    const html = fs.readFileSync(
      path.join(process.cwd(), 'app', 'api', 'ibreviary', '__fixtures__',
        `lauds-2026-09-05-${lang}.html`),
      'utf8',
    );
    const blocks = propagateTones(parseBlocks(cheerio.load(html), '', '', ''));
    // "Canticle: Deuteronomy 32:1-12" / "Canticum Deut 32, 1-12" — the Abbey
    // files Deuteronomy 32 four times over, and only the verses say which.
    const canticle = blocks.find((b) => b.psalmNumber === 'OT 4');
    assert.ok(canticle, `${lang}: the Lauds canticle carries no number`);
    assert.match(
      canticle.content,
      lang === 'en' ? /^Give ear, O heavens/ : /^Audíte, cæli/,
      `${lang}: OT 4 is not the canticle that was printed`,
    );
  }
});
