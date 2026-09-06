/**
 * The citations the office actually prints, resolved to the Abbey's numbers.
 *
 * The references below are copied from iBreviary's own pages, English and
 * Latin, and the keys from the citation headings of the Abbey's
 * `canticlesOTNTlineNumbers.txt`. Every one of them used to resolve to
 * nothing, because the only shape the old table matched — "Canticle (Eph
 * 1:3-10)" — is a shape the office never writes.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCanticleKey } from './canticle-refs';
import { getCanticleText } from '../psalm-tones/psalm-index';

test('the New Testament canticles of Vespers, as English prints them', () => {
  const cases: [string, string][] = [
    ['See Revelation 19:1-7', 'NT 12'],
    ['Ephesians 1:3-10', 'NT 4'],
    ['Philippians 2:6-11', 'NT 5'],
    ['See Colossians 1:12-20', 'NT 6'],
    ['1 Timothy 3:16', 'NT 7'],
    ['1 Peter 2:21-24', 'NT 8'],
    ['Revelation 4:11; 5:9, 10, 12', 'NT 9'],
    ['Revelation 11:17-18; 12:10-12', 'NT 10'],
    ['Revelation 15:3-4', 'NT 11'],
  ];
  for (const [ref, key] of cases) {
    assert.equal(resolveCanticleKey(ref), key, ref);
  }
});

test('the same canticles as the Latin office abbreviates them', () => {
  const cases: [string, string][] = [
    ['Cf. Ap 19, 1-2. 5-7', 'NT 12'],
    ['Eph 1, 3-10', 'NT 4'],
    ['Phil 2, 6-11', 'NT 5'],
    ['Col 1, 12-20', 'NT 6'],
    ['1 Tim 3, 16', 'NT 7'],
    ['1 Petr 2, 21-24', 'NT 8'],
    ['Ap 15, 3-4', 'NT 11'],
    ['Deut 32, 1-12', 'OT 4'],
    ['Idt 16, 2-3. 13-15', 'OT 14'],
    ['Ier 14, 17-21', 'OT 47'],
    ['Sap 9, 1-6. 9-11', 'OT 19'],
    ['Soph 3, 8-13', 'OT 58'],
  ];
  for (const [ref, key] of cases) {
    assert.equal(resolveCanticleKey(ref), key, ref);
  }
});

test('the verse decides between arrangements of one chapter', () => {
  // Deuteronomy 32 is in the Abbey four times, Exodus 15 and Tobit 13 and
  // Daniel 3 three times each. The book and chapter alone cannot choose.
  assert.equal(resolveCanticleKey('Deuteronomy 32:1-12'), 'OT 4');
  assert.equal(resolveCanticleKey('Deuteronomy 32:18-21'), 'OT 5');
  assert.equal(resolveCanticleKey('Daniel 3:52-57'), 'OT 53');
  assert.equal(resolveCanticleKey('Daniel 3:57-88, 56'), 'OT 54');

  // Both arrangements of Isaiah 38 open on verse 10; only the last verse
  // tells the office's one (…17-20) from the shorter one (…16).
  assert.equal(resolveCanticleKey('Isaiah 38:10-14, 17-20'), 'OT 35');
  assert.equal(resolveCanticleKey('Isaiah 38:10-12, 16'), 'OT 34');
});

test('a chapter named after the verses is not read as a verse', () => {
  // "Isaiah 61:10-62:5" ends at verse 10 of chapter 61, not at verse 62.
  assert.equal(resolveCanticleKey('Isaiah 61:10-62:5'), 'OT 42');
  assert.equal(resolveCanticleKey('Isaiah 61:6-9'), 'OT 41');
});

test('what is not a canticle citation resolves to nothing', () => {
  for (const ref of ['of Mary', 'of Zechariah', 'Psalm 110:1-5, 7', '', 'Matthew 5:1-12']) {
    assert.equal(resolveCanticleKey(ref), null, ref);
  }
});

test('every key the resolver returns names a canticle on file', () => {
  const refs = [
    'Exodus 15:1-4, 8-13, 17-18', 'Deuteronomy 32:1-12', '1 Samuel 2:1-10',
    '1 Chronicles 29:10-13', 'Tobit 13:1-8', 'Judith 16:2-3, 13-15',
    'Isaiah 12:1-6', 'Isaiah 40:10-17', 'Isaiah 42:10-16', 'Isaiah 45:15-25',
    'Isaiah 66:10-14', 'Jeremiah 31:10-14', 'Ezekiel 36:24-28',
    'Daniel 3:57-88, 56', 'Habakkuk 3:2-4, 13, 15-19', 'Wisdom 9:1-6, 9-11',
    'Sirach 36:1-5, 10-13', 'See Revelation 19:1-7', 'Ephesians 1:3-10',
  ];
  for (const ref of refs) {
    const key = resolveCanticleKey(ref);
    assert.ok(key, `${ref} resolved to nothing`);
    const [type, num] = key.split(' ');
    const entry = getCanticleText(type.toLowerCase() as 'ot' | 'nt', parseInt(num, 10));
    assert.ok(entry, `${ref} → ${key}, which is not in the Abbey index`);
    assert.ok(entry.rawText.length > 80, `${ref} → ${key} is suspiciously short`);
  }
});
