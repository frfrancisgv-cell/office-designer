/**
 * The psalm index, checked against the files it reads.
 *
 * Two things went wrong at once when Psalm 116:10-19 was asked for. The psalm
 * is on file in two parts, 116A and 116B, each ending in its own Glory Be;
 * they were joined by concatenating the *rendered* text of each and parsing
 * that again, so the parser met part A's doxology in the middle, took it for
 * the end of the psalm, and swept the whole of part B into the Glory Be. The
 * verse numbers had been stripped by the first render, so nothing was left for
 * the range to match on, and the "10-19" selection came back empty — leaving
 * the doxology, printed first, as the entire psalm.
 *
 * Underneath that, every psalm lost its strophes: the parser dropped the blank
 * lines and the renderer put one back between every verse, so a strophe of two
 * verses came out as two strophes. The strophes are what gets sung, so the
 * invariant this file leans on is that a rendered psalm is its source file
 * again, exactly, minus the heading line and the verse labels.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getPsalmText, getEntryByKey, listAllKeys } from './psalm-index';
import type { PsalmEntry } from './psalm-index';

const DIRS: Record<string, string> = {
  grail: 'revisedGrailPsalter',
  abbey: 'theAbbeyPsalmsAndCanticles',
};
const VERSE_LABEL = /^(?:\d+:)?\d+[a-z]?\s+(\S.*)$/;

function sourceBlocks(entry: PsalmEntry): string[][] {
  const raw = fs.readFileSync(
    path.join(process.cwd(), 'vendor', 'psautier', DIRS[entry.source], entry.title), 'utf8',
  );
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) current.push(trimmed);
    else if (current.length) { blocks.push(current); current = []; }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

test('a rendered psalm is its file again, strophes and all', () => {
  const keys = listAllKeys();
  assert.ok(keys.length > 200, `only ${keys.length} entries indexed`);

  const wrong: string[] = [];
  for (const key of keys) {
    const entry = getEntryByKey(key)!;
    const blocks = sourceBlocks(entry);
    if (entry.heading) blocks.shift();
    const expected = blocks
      .map(block => block.map(l => l.match(VERSE_LABEL)?.[1] ?? l).join('\n'))
      .join('\n\n');
    if (expected !== entry.rawText) wrong.push(key);
  }
  assert.deepEqual(wrong, []);
});

test('no entry is nothing but its Glory Be', () => {
  // NT 10, NT 12, OT 16 and nine others open on a line the old parser could
  // not label — a chapter:verse reference, an "Allelúia!", a response — and
  // it dropped every unlabelled verse on the floor.
  const hollow = listAllKeys().filter((key) => {
    const entry = getEntryByKey(key)!;
    return !entry.rawText.replace(entry.doxology, '').trim();
  });
  assert.deepEqual(hollow, []);
});

test('Psalm 116:10-19 opens on verse 10 and ends on one doxology', () => {
  const entry = getPsalmText(116, 'grail', '10-19');
  assert.ok(entry, 'Psalm 116 verses 10-19 not found');

  assert.deepEqual(
    [...new Set(entry.verses.map(v => v.num))],
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  );
  assert.ok(entry.doxology, 'no doxology parsed');
  assert.ok(!entry.rawText.startsWith(entry.doxology), 'the doxology came first');
  assert.ok(entry.rawText.trimEnd().endsWith(entry.doxology), 'the doxology is not last');
  assert.equal(entry.rawText.split(entry.doxology).length - 1, 1, 'more than one doxology');

  // 10 and 11 are one strophe in the file, 12 and 13 the next, and so on.
  assert.equal(entry.verses[0].strophe, entry.verses[1].strophe);
  assert.notEqual(entry.verses[1].strophe, entry.verses[2].strophe);
});

test('the two halves of Psalm 116 are cut apart at the right verse', () => {
  const first = getPsalmText(116, 'grail', '1-9')!;
  const second = getPsalmText(116, 'grail', '10-19')!;
  assert.deepEqual([...new Set(first.verses.map(v => v.num))], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const body = (e: PsalmEntry) => e.rawText.replace(e.doxology, '').trim();
  assert.notEqual(body(first), body(second));
  assert.ok(!body(first).includes(body(second)));
});

test('a range naming no verse of the psalm yields nothing, not a bare Glory Be', () => {
  assert.equal(getPsalmText(116, 'grail', '900-999'), null);
});

test('the strophes of Psalm 119 join in the order they are prayed', () => {
  // Sorting the keys as strings puts 119.105-112 before 119.9-16, which would
  // print the psalm out of order. Each part's text must appear in the joined
  // psalm, once, in the order its verses are numbered.
  const parts = listAllKeys()
    .filter(k => k.startsWith('psalm-119.'))
    .map(k => getEntryByKey(k)!)
    .sort((a, b) => a.verses[0].num - b.verses[0].num);
  assert.equal(parts.length, 22, 'Psalm 119 is on file in 22 strophes');

  const whole = getPsalmText(119, 'grail')!;
  let previous = -1;
  for (const part of parts) {
    const body = part.rawText.replace(part.doxology, '').trim();
    const at = whole.rawText.indexOf(body);
    assert.ok(at > previous, `strophe ${part.title} is out of order`);
    previous = at;
  }
  assert.equal(whole.rawText.split(whole.doxology).length - 1, 1, 'one doxology per psalm');
  assert.equal(whole.verses[0].num, 1);
  assert.equal(whole.verses[whole.verses.length - 1].num, 176);
});
