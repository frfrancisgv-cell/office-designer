/**
 * Looking the chant up by the day, rather than by the antiphon's first words.
 *
 * The case that prompted it: the editor could find *Gloriosae Virginis Mariae*
 * only if you already knew it began that way, which is what you would be
 * looking it up to learn. Asking for "the nativity of the virgin mary" now
 * answers with the day's own Magnificat antiphon, named as the Magnificat's.
 *
 * Run with: npm run test:unit
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchByDay, toOfficeHour } from './day-search';
import { describePlace, findOccasions, occasionIndex } from './occasion-index';

test('a feast is found by name, and its Magnificat antiphon named as such', async () => {
  const { heading, groups } = await searchByDay('nativity of the virgin mary', 'vespers');
  assert.match(heading, /Nativity of the Blessed Virgin Mary/);
  const day = groups.find(group => group.code === '8/9');
  assert.ok(day, 'the feast’s own section is not in the answer');
  const magnificat = day.results.find(row => row.placeLabel === 'Magnificat');
  assert.ok(magnificat, 'no row is named as the Magnificat antiphon');
  assert.match(magnificat.incipit, /^Glorios/);
  assert.ok(magnificat.gabc.length > 0, 'the antiphon came back without a score');
});

test('the same day found by its date, with what it falls back on beneath', async () => {
  const { heading, groups } = await searchByDay('2026-09-08', 'vespers');
  assert.match(heading, /Nativity of the Blessed Virgin Mary/);
  assert.equal(groups[0].code, '8/9');
  // Tuesday of psalter week 3 is what 8 September 2026 would otherwise be, and
  // is worth showing under the feast rather than instead of it.
  assert.ok(groups.some(group => group.code === '3H3'),
    'the psalter day underneath the feast was not offered');
  assert.ok(groups.slice(1).every(group => group.note), 'a fallback was offered with no reason given');
});

test('Lauds is answered with the Benedictus antiphon, not Vespers’', async () => {
  const { groups } = await searchByDay('nativity of the virgin mary', 'lauds');
  const places = groups.flatMap(group => group.results.map(row => row.placeLabel));
  assert.ok(places.includes('Benedictus'), 'Lauds got no Benedictus antiphon');
  assert.ok(!places.includes('Magnificat'), 'Lauds was given Vespers’ antiphon');
});

test('a day with no Gospel antiphon of its own is offered its common’s', async () => {
  // Saint Peter Claver is a memorial with no proper antiphons in the index; the
  // book sings the Common of Pastors.
  const { groups } = await searchByDay('peter claver', 'vespers');
  const common = groups.find(group => group.code === 'Past');
  assert.ok(common, 'the common of Pastors was not offered');
  assert.match(String(common.note), /common/i);
  assert.ok(common.results.some(row => row.placeLabel.startsWith('Magnificat')));
});

test('a query that names nothing says so rather than answering at random', async () => {
  const { heading, groups } = await searchByDay('qqqq', 'vespers');
  assert.deepEqual(groups, []);
  assert.match(heading, /Nothing/);
});

test('the index is searched by whole words, and by code', async () => {
  const index = await occasionIndex(2026);
  assert.equal(findOccasions('8/9', index)[0].code, '8/9');
  assert.equal(findOccasions('BMV', index)[0].code, 'BMV');
  assert.match(findOccasions('nativity virgin', index)[0].label, /Nativity of the Blessed Virgin Mary/);
  assert.deepEqual(findOccasions('   ', index), []);
});

test('the Place column is read aloud', () => {
  assert.equal(describePlace('M'), 'Magnificat');
  assert.equal(describePlace('B'), 'Benedictus');
  assert.equal(describePlace('Ma'), 'Magnificat (Year A)');
  assert.equal(describePlace('M ad lib'), 'Magnificat (ad lib)');
  assert.equal(describePlace('Nunc'), 'Nunc dimittis');
  assert.equal(describePlace('2'), 'Psalm antiphon 2');
  assert.equal(describePlace(''), '');
});

test('the editor’s "matins" is the calendar’s "readings"', () => {
  assert.equal(toOfficeHour('matins'), 'readings');
  assert.equal(toOfficeHour('Lauds'), 'lauds');
  assert.equal(toOfficeHour(null), 'vespers');
});
