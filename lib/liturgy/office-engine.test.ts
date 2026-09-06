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
import { getLatinPsalmText } from './latin-texts';

/** Monday 2026-09-07 — a minor hour here draws on a subdivided Psalm 119. */
const MONDAY = new Date('2026-09-07T12:00:00');

test('a Latin minor hour renders the subdivided psalm, not a placeholder', async () => {
  for (const hour of ['terce', 'sext', 'none'] as const) {
    const psalms = (await generateCanonicalOffice({ date: MONDAY, hour, lang: 'la' }))
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

test('the English office of the same hour is populated too', async () => {
  const psalms = (await generateCanonicalOffice({ date: MONDAY, hour: 'terce', lang: 'en' }))
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
async function everyMajorHourBlock(lang: 'en' | 'la') {
  const blocks = [];
  for (let week = 1; week <= 4; week++) {
    for (let day = 0; day < 7; day++) {
      // 2026-01-04 is a Sunday, so this walks all 28 day/week pairs.
      const date = new Date(Date.UTC(2026, 0, 4 + (week - 1) * 7 + day));
      for (const hour of ['lauds', 'vespers'] as const) {
        blocks.push(
          ...(await generateCanonicalOffice({ date, hour, lang, psalterWeek: week as 1 | 2 | 3 | 4 })),
        );
      }
    }
  }
  return blocks;
}

test('a Latin canticle is never filled with the psalm of the same number', async () => {
  const canticles = (await everyMajorHourBlock('la'))
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

test('the English Gospel canticle is in English', async () => {
  const magnificat = (await generateCanonicalOffice({
    date: MONDAY, hour: 'vespers', lang: 'en',
  })).find((b) => b.psalmNumber === 'Magnificat');

  assert.ok(magnificat, 'no Magnificat block');
  assert.match(magnificat.content, /my soul proclaims/i);
  assert.doesNotMatch(magnificat.content, /Magníficat|ánima mea/);
});

test('no block carries a stray carriage return', async () => {
  // The jgabc sources are CRLF and were only `.trim()`ed, so a `\r` survived
  // on every interior line, rode through stripPointing untouched, and ended
  // up inside the pointed HTML.
  for (const lang of ['en', 'la'] as const) {
    for (const block of await everyMajorHourBlock(lang)) {
      assert.doesNotMatch(
        block.content,
        /\r/,
        `${lang} ${block.type} ${block.psalmNumber ?? ''} contains a carriage return`,
      );
    }
  }
});

test('every Latin psalm of the four-week psalter resolves to real text', async () => {
  const psalms = (await everyMajorHourBlock('la'))
    .filter((b) => b.type === 'psalm' && !/^(OT|NT) \d+$/.test(String(b.psalmNumber)));

  assert.ok(psalms.length > 0);
  for (const p of psalms) {
    assert.doesNotMatch(p.content, /^\[Psalmus/, `psalm ${p.psalmNumber} is a placeholder`);
    assert.match(p.content, /Glória Patri/, `psalm ${p.psalmNumber} has no doxology`);
  }
});

test('the Latin psalter is the Nova Vulgata, in the office\'s own numbering', async () => {
  // Psalm 23 is the discriminator: the Nova Vulgata numbers it the Hebrew way
  // ("Dóminus pascit me"), while the Roman Breviary's Vulgate calls the same
  // psalm 22 and reads "Dóminus regit me". The engine used to convert the
  // number and read the older book.
  const vespers = await generateCanonicalOffice({
    date: new Date(Date.UTC(2026, 0, 4)), hour: 'vespers', lang: 'la', psalterWeek: 1,
  });
  const lauds = (await generateCanonicalOffice({
    date: new Date(Date.UTC(2026, 0, 4)), hour: 'lauds', lang: 'la', psalterWeek: 1,
  })).concat(vespers);
  assert.ok(lauds.length > 0);
  assert.match(getLatinPsalmText('23')!, /^Dóminus pascit me/);

  // The flex is in the source and must survive; the verse numbers must not.
  // The Gospel canticles are excluded: NovaVulgata.txt is the psalter only,
  // so they still come from the jgabc canticle files.
  const psalms = (await everyMajorHourBlock('la')).filter(
    (b) => b.type === 'psalm'
      && !/^(OT|NT) \d+$/.test(String(b.psalmNumber))
      && !['Magnificat', 'Benedictus', 'Nunc dimittis'].includes(String(b.psalmNumber)),
  );
  assert.ok(psalms.some((p) => /†/.test(p.content)), 'no psalm kept its flex');
});

test('no psalm or canticle prints a verse number, in either language', async () => {
  // A verse number left in the text is not only unwanted in the office: the
  // pointing engines count syllables from the end of each hemistich, so the
  // "3" in "…virtútum! * 3 Concupíscit…" was syllabified as a token and every
  // mark on that hemistich landed one syllable early. 106 lines of the Latin
  // psalter were mispointed that way.
  const VERSE_NUMBER = /(^|[*†]\s*)\[?\d/m;
  for (const lang of ['la', 'en'] as const) {
    const offenders = (await everyMajorHourBlock(lang))
      .filter((b) => b.type === 'psalm' && VERSE_NUMBER.test(b.content))
      .map((b) => `${lang} ${b.psalmNumber}: ${b.content.match(VERSE_NUMBER)![0]}`);
    assert.deepEqual([...new Set(offenders)], []);
  }
});

test('a psalm split over two slots does not print itself twice', async () => {
  // The Latin branch ignored `unit.verses`, so Psalm 27 — prayed as 1-6 and
  // then 7-14 on the same day — filled both slots with the whole psalm.
  for (let week = 1; week <= 4; week++) {
    for (let day = 0; day < 7; day++) {
      const date = new Date(Date.UTC(2026, 0, 4 + (week - 1) * 7 + day));
      for (const hour of ['lauds', 'vespers'] as const) {
        const psalms = (await generateCanonicalOffice({
          date, hour, lang: 'la', psalterWeek: week as 1 | 2 | 3 | 4,
        })).filter((b) => b.type === 'psalm');

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

/**
 * romcal is the only source of the celebration's title, and it holds the
 * calendar in both languages. A Latin office that titles itself in English is
 * the same class of mistake as a Latin psalm rendered from the English book.
 */
test('a Latin office names its day in Latin', async () => {
  const cases: Array<[Date, string, RegExp]> = [
    [new Date(Date.UTC(2026, 5, 29)), 'Ss. Petri et Pauli', /apostolorum/],
    [new Date(Date.UTC(2026, 11, 6)), 'a Sunday of Advent', /Dominica.*Adventus/],
    [new Date(Date.UTC(2026, 8, 4)), 'a weekday in Ordinary Time', /feria.*per annum/],
    [new Date(Date.UTC(2026, 3, 5)), 'Easter', /Dominica Pasch/],
  ];

  for (const [date, label, latin] of cases) {
    const subheadings = (await generateCanonicalOffice({ date, hour: 'lauds', lang: 'la' }))
      .filter((b) => b.type === 'subheading')
      .map((b) => b.content);

    assert.ok(
      subheadings.some((s) => latin.test(s)),
      `${label}: no Latin title among ${JSON.stringify(subheadings)}`,
    );
  }
});

test('an English office still names its day in English', async () => {
  const subheadings = (await generateCanonicalOffice({
    date: new Date(Date.UTC(2026, 5, 29)), hour: 'lauds', lang: 'en',
  })).filter((b) => b.type === 'subheading').map((b) => b.content);

  assert.ok(subheadings.some((s) => /Saints Peter and Paul/.test(s)), JSON.stringify(subheadings));
  assert.ok(!subheadings.some((s) => /apostolorum/.test(s)), 'Latin leaked into the English office');
});

test('an offline canticle is numbered as the text it prints', async () => {
  // The schema numbers its Old Testament canticles by their slot in the
  // four-week Lauds cycle; every text source numbers them the Abbey's way.
  // Handing the slot number straight to the Abbey index made slot 1 ask for
  // the Benedicite and print Exodus 15, and stamped the block with a number
  // that sent the editor's two buttons to a third canticle again.
  const seen = new Map<string, string>();
  for (const lang of ['en', 'la'] as const) {
    for (const block of await everyMajorHourBlock(lang)) {
      if (!/^OT \d+$/.test(String(block.psalmNumber))) continue;
      if (block.content.startsWith('[')) continue;   // honestly absent
      const key = `${lang} ${block.psalmNumber}`;
      const opening = block.content.split('\n')[0];
      const first = seen.get(key);
      if (first === undefined) seen.set(key, opening);
      else assert.equal(opening, first, `${key} printed two different canticles`);
    }
  }
  assert.ok(seen.size > 0, 'no Old Testament canticle was generated at all');

  // Sunday Lauds asks for the Benedicite, and must get it in both languages.
  for (const [lang, expected] of [['en', /^Bléss the Lórd, all you wórks/], ['la', /^Benedícite/]] as const) {
    const sunday = (await generateCanonicalOffice({
      date: new Date('2026-09-06T12:00:00Z'), hour: 'lauds', lang,
    })).find((b) => /^OT \d+$/.test(String(b.psalmNumber)));
    assert.ok(sunday, `${lang}: Sunday Lauds has no canticle`);
    assert.equal(sunday.psalmNumber, 'OT 54', `${lang}: not the Benedicite's number`);
    assert.match(sunday.content, expected, `${lang}: not the Benedicite`);
  }
});
