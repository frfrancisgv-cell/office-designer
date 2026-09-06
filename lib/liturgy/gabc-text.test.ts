/**
 * Reading the words out of a score.
 *
 * The corpus is fixed — 2813 rows of `IDX_ANT.csv` — so these assertions are
 * over the whole of it rather than over examples: every scored antiphon must
 * yield words, none may leak the score's typesetting, and none may keep the
 * psalm-tone ending that is written after the antiphon's last word.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { gabcText, antiphonText } from './gabc-text';

/** The `gabc` column of every row that has one, straight off disk. */
function scores(): Array<{ title: string; text: string; gabc: string }> {
  const raw = fs.readFileSync(path.join(process.cwd(), 'IDX_ANT.csv'), 'utf8');
  const out: Array<{ title: string; text: string; gabc: string }> = [];
  for (const line of raw.split('\n').slice(1)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let quoted = false;
    let cell = '';
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cols.push(cell.trim()); cell = ''; }
      else cell += ch;
    }
    cols.push(cell.trim());
    if (cols.length < 8 || !cols[7]) continue;
    out.push({ title: cols[0], text: cols[1], gabc: cols[7] });
  }
  return out;
}

test('every scored antiphon yields words, with no markup and no differentia', () => {
  const rows = scores();
  assert.ok(rows.length > 2500, `only ${rows.length} scored antiphons`);

  const empty: string[] = [];
  const debris: string[] = [];
  const differentia: string[] = [];
  for (const row of rows) {
    const words = antiphonText(row.gabc);
    if (!words) empty.push(row.title);
    // `<v>`, `\GreDagger`, `\char508`, a private-use parenthesis placeholder.
    if (/[<>\\{}]|[\u{E000}\u{E001}]/u.test(words)) debris.push(`${row.title}: ${words.slice(0, 60)}`);
    if (/\bE\s*u\s*o\s*u\s*a\s*e\b/i.test(words)) differentia.push(`${row.title}: ${words.slice(-40)}`);
  }
  assert.deepEqual(empty, []);
  assert.deepEqual(debris, []);
  assert.deepEqual(differentia, []);
});

test('the score is read, not the index\'s Text column', () => {
  // They genuinely disagree, and the words the music is written under are the
  // ones that are sung — the same ruling the invitatory psalm is built on.
  const row = scores().find(r => r.title === 'In principio')!;
  assert.match(row.text, /ipse natus est hodie Salvator mundi/);
  assert.match(antiphonText(row.gabc), /ipse natus est nobis Salvátor mundi/);
});

test('the inline markup the index uses becomes the character it stands for', () => {
  // \char508 is œ: "ob\char508diens" is obœdiens, as the Text column spells it.
  const row = scores().find(r => r.title === 'Christus factus est')!;
  assert.match(antiphonText(row.gabc), /obœdiens/);
});

test('a bar hung inside a word does not break the word in half', () => {
  // *Omnes nationes* writes `por(;ed~)tán(e)tes(f)`.
  const row = scores().find(r => r.title === 'Omnes nationes')!;
  assert.match(antiphonText(row.gabc), /portántes/);
});

test('a score with two differentiae loses both', () => {
  const row = scores().find(r => r.title === 'In cymbalis')!;
  // No comma: the score writes that pause as a quarter bar, `(,)`, not as text.
  assert.equal(antiphonText(row.gabc), 'In cýmbalis * benesonántibus laudáte Dóminum.');
});

test('the headers withAnnotation writes are not the antiphon\'s first words', () => {
  const gabc = 'name: Fiat pax;\nannotation: 1a2;\n%%\n(c4)Fi(f)at(g) pax(h) (::)';
  assert.equal(gabcText(gabc), 'Fiat pax');
});

test('a lyric parenthesis survives the format whose syntax is parentheses', () => {
  const row = scores().find(r => r.title === 'Requiem æternam')!;
  assert.match(antiphonText(row.gabc), /dona ei\(s\)/);
});
