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

/**
 * The psalmody loop used to test `lang === 'la'` before the unit's type, so a
 * canticle was looked up against the numbered psalm files by its own index.
 * Every Latin Lauds and Vespers therefore printed a psalm where the canticle
 * belongs — NT canticle 6 (Col 1:12-20) came out as Psalm 6 — with no
 * placeholder and nothing in the log.
 *
 * The four-week psalter is walked in full, because the substitution depended
 * on which canticle each day happens to name.
 */
function everyMajorHourBlock(lang: 'en' | 'la') {
  const blocks = [];
  for (let week = 1; week <= 4; week++) {
    for (let day = 0; day < 7; day++) {
      // 2026-01-04 is a Sunday, so this walks all 28 day/week pairs.
      const date = new Date(Date.UTC(2026, 0, 4 + (week - 1) * 7 + day));
      for (const hour of ['lauds', 'vespers'] as const) {
        blocks.push(
          ...generateCanonicalOffice({ date, hour, lang, psalterWeek: week as 1 | 2 | 3 | 4 }),
        );
      }
    }
  }
  return blocks;
}

test('a Latin canticle is never filled with the psalm of the same number', () => {
  const canticles = everyMajorHourBlock('la')
    .filter((b) => b.type === 'psalm' && /^(OT|NT) \d+$/.test(String(b.psalmNumber)));

  assert.ok(canticles.length > 0, 'no canticle blocks were generated at all');
  for (const c of canticles) {
    // Either the real Latin canticle, or an honest statement that there is
    // none. What must never appear is plausible Latin from a psalm file.
    assert.match(
      c.content,
      /^\[Canticum |^[^[]/,
      `${c.psalmNumber}: unexpected content`,
    );
    if (!c.content.startsWith('[')) {
      assert.match(c.content, /Cantic|Benedic|Magnif|^[A-ZÁÉÍÓÚÆ]/u);
    }
  }
});

test('the English Gospel canticle is in English', () => {
  const magnificat = generateCanonicalOffice({
    date: MONDAY, hour: 'vespers', lang: 'en',
  }).find((b) => b.psalmNumber === 'Magnificat');

  assert.ok(magnificat, 'no Magnificat block');
  assert.match(magnificat.content, /my soul proclaims/i);
  assert.doesNotMatch(magnificat.content, /Magníficat|ánima mea/);
});

test('no block carries a stray carriage return', () => {
  // The jgabc sources are CRLF and were only `.trim()`ed, so a `\r` survived
  // on every interior line, rode through stripPointing untouched, and ended
  // up inside the pointed HTML.
  for (const lang of ['en', 'la'] as const) {
    for (const block of everyMajorHourBlock(lang)) {
      assert.doesNotMatch(
        block.content,
        /\r/,
        `${lang} ${block.type} ${block.psalmNumber ?? ''} contains a carriage return`,
      );
    }
  }
});

test('every Latin psalm of the four-week psalter resolves to real text', () => {
  const psalms = everyMajorHourBlock('la')
    .filter((b) => b.type === 'psalm' && !/^(OT|NT) \d+$/.test(String(b.psalmNumber)));

  assert.ok(psalms.length > 0);
  for (const p of psalms) {
    assert.doesNotMatch(p.content, /^\[Psalmus/, `psalm ${p.psalmNumber} is a placeholder`);
    assert.match(p.content, /Glória Patri/, `psalm ${p.psalmNumber} has no doxology`);
  }
});

test('the Latin psalter is the Nova Vulgata, in the office\'s own numbering', () => {
  // Psalm 23 is the discriminator: the Nova Vulgata numbers it the Hebrew way
  // ("Dóminus pascit me"), while the Roman Breviary's Vulgate calls the same
  // psalm 22 and reads "Dóminus regit me". The engine used to convert the
  // number and read the older book.
  const vespers = generateCanonicalOffice({
    date: new Date(Date.UTC(2026, 0, 4)), hour: 'vespers', lang: 'la', psalterWeek: 1,
  });
  const psalm23 = generateCanonicalOffice({
    date: new Date(Date.UTC(2026, 0, 4)), hour: 'lauds', lang: 'la', psalterWeek: 1,
  }).concat(vespers);
  assert.ok(psalm23.length > 0);

  // Verse numbers and the flex are already in the source, and must survive.
  // The Gospel canticles are excluded: NovaVulgata.txt is the psalter only,
  // so they still come from the jgabc canticle files, which carry no verse
  // numbers.
  const psalms = everyMajorHourBlock('la').filter(
    (b) => b.type === 'psalm'
      && !/^(OT|NT) \d+$/.test(String(b.psalmNumber))
      && !['Magnificat', 'Benedictus', 'Nunc dimittis'].includes(String(b.psalmNumber)),
  );
  assert.ok(psalms.some((p) => /†/.test(p.content)), 'no psalm kept its flex');
  assert.ok(psalms.every((p) => /^\d+\s/.test(p.content)), 'a psalm lost its verse numbering');
});

test('a psalm split over two slots does not print itself twice', () => {
  // The Latin branch ignored `unit.verses`, so Psalm 27 — prayed as 1-6 and
  // then 7-14 on the same day — filled both slots with the whole psalm.
  for (let week = 1; week <= 4; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(Date.UTC(2026, 0, 4 + (week - 1) * 7 + day));
      for (const hour of ['lauds', 'vespers'] as const) {
        const psalms = generateCanonicalOffice({
          date, hour, lang: 'la', psalterWeek: week as 1 | 2 | 3 | 4,
        }).filter((b) => b.type === 'psalm');

        for (let i = 1; i < psalms.length; i++) {
          if (psalms[i].psalmNumber !== psalms[i - 1].psalmNumber) continue;
          assert.notEqual(
            psalms[i].content,
            psalms[i - 1].content,
            `week ${week} day ${day} ${hour}: psalm ${psalms[i].psalmNumber} repeats itself`,
          );
        }
      }
    }
  }
});
