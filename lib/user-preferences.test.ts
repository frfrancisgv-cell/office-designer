import test from 'node:test';
import assert from 'node:assert/strict';
import type { Block } from './types';
import {
  DEFAULT_USER_PREFERENCES,
  applyStructureTemplate,
  filterIBreviarySections,
  filterOfficeBlocks,
  normalizeUserPreferences,
  psalmToneOverrideFor,
  sectionForHeading,
  structureFromBlocks,
  visibilityFromBlocks,
} from './user-preferences';
import { lypsForJgabcTone } from './psalm-tones/mode-map';

const block = (id: string, type: Block['type'], content: string): Block => ({ id, type, content });

test('stored preferences are upgraded with new defaults', () => {
  const result = normalizeUserPreferences({ defaultLanguage: 'la', psalms: { language: 'en' } });
  assert.equal(result.defaultLanguage, 'la');
  assert.equal(result.psalms.language, 'en');
  assert.equal(result.psalms.engine, 'lypsautierant');
  assert.equal(result.psalms.family, 'english');
  assert.equal(result.ibreviarySections.psalmody, true);
});

test('disabled iBreviary sections remove the heading and its contents', () => {
  const blocks = [
    block('meta', 'subheading', 'Monday'),
    block('h1', 'heading', 'HYMN'), block('hymn', 'hymn', 'A hymn'),
    block('h2', 'heading', 'PSALMODY'), block('psalm', 'psalm', 'A psalm'),
    block('h3', 'heading', 'LECTIO BREVIS'), block('reading', 'text', 'A reading'),
  ];
  const enabled = { ...DEFAULT_USER_PREFERENCES.ibreviarySections, hymn: false, reading: false };
  assert.deepEqual(filterIBreviarySections(blocks, enabled).map(item => item.id), ['meta', 'h2', 'psalm']);
});

test('multilingual headings map to preference sections', () => {
  assert.equal(sectionForHeading('INNO'), 'hymn');
  assert.equal(sectionForHeading('CANTIQUE ÉVANGÉLIQUE'), 'gospel-canticle');
  assert.equal(sectionForHeading('PADRE NUESTRO'), 'lords-prayer');
});

test('saving a structure records the blocks the office was left with', () => {
  const blocks = [
    block('psalm-h', 'heading', 'PSALMODY'),
    block('ant', 'antiphon', 'Alleluia'), block('psalm', 'psalm', 'A psalm'),
  ];
  const template = structureFromBlocks(blocks);
  // No prayer, no repeat, no rubric and no label survived in the office, so
  // the hour's default carries none of them either.
  assert.deepEqual(template.blockVisibility, {
    metadata: false, rubrics: false, psalmPrayers: false, repeatedAntiphons: false,
  });
});

test('an office that kept its prayers and antiphon repeats saves them as kept', () => {
  const blocks = [
    block('meta', 'subheading', 'Monday'), block('rubric', 'rubric', 'Psalm 23'),
    block('ant-1', 'antiphon', 'Alleluia'), block('psalm', 'psalm', 'A psalm'),
    block('prayer', 'psalm-prayer', 'A prayer'), block('ant-2', 'antiphon', 'Alleluia'),
  ];
  assert.deepEqual(visibilityFromBlocks(blocks), {
    metadata: true, rubrics: true, psalmPrayers: true, repeatedAntiphons: true,
  });
});

test("a saved structure's block switches outrank the general defaults", () => {
  const template = { sectionOrder: [], blockVisibility: {
    metadata: true, rubrics: true, psalmPrayers: false, repeatedAntiphons: false,
  } };
  const blocks = [
    block('meta', 'subheading', 'Monday'),
    block('ant-1', 'antiphon', 'Alleluia'), block('psalm', 'psalm', 'A psalm'),
    block('prayer', 'psalm-prayer', 'A prayer'), block('ant-2', 'antiphon', 'Alleluia'),
  ];
  // DEFAULT_USER_PREFERENCES would keep every one of these blocks.
  assert.deepEqual(
    filterOfficeBlocks(blocks, DEFAULT_USER_PREFERENCES, template).map(item => item.id),
    ['meta', 'ant-1', 'psalm'],
  );
  // Without a template the general defaults still stand.
  assert.equal(filterOfficeBlocks(blocks, DEFAULT_USER_PREFERENCES).length, blocks.length);
});

test('a template saved before block switches existed still defers to the general ones', () => {
  const stored = normalizeUserPreferences({ structureTemplates: { Vespers: { sectionOrder: ['psalmody'] } } });
  assert.equal(stored.structureTemplates.Vespers.blockVisibility, undefined);
  const blocks = [block('prayer', 'psalm-prayer', 'A prayer')];
  const preferences = {
    ...DEFAULT_USER_PREFERENCES,
    blockVisibility: { ...DEFAULT_USER_PREFERENCES.blockVisibility, psalmPrayers: false },
  };
  assert.deepEqual(filterOfficeBlocks(blocks, preferences, stored.structureTemplates.Vespers), []);
});

test('a damaged stored template is dropped rather than emptying an office', () => {
  const stored = normalizeUserPreferences({
    structureTemplates: {
      Lauds: { sectionOrder: ['psalmody', 'not-a-section'] },
      Vespers: { sections: ['psalmody'] },
      None: null,
    },
  });
  assert.deepEqual(stored.structureTemplates.Lauds.sectionOrder, ['psalmody']);
  assert.equal(stored.structureTemplates.Vespers, undefined);
  assert.equal(stored.structureTemplates.None, undefined);
});

test('a saved structure retains its section set and order', () => {
  const blocks = [
    block('hymn-h', 'heading', 'HYMN'), block('hymn', 'hymn', 'A hymn'),
    block('psalm-h', 'heading', 'PSALMODY'), block('psalm', 'psalm', 'A psalm'),
    block('read-h', 'heading', 'READING'), block('read', 'text', 'A reading'),
  ];
  const template = structureFromBlocks([blocks[2], blocks[3], blocks[0], blocks[1]]);
  assert.deepEqual(template.sectionOrder, ['psalmody', 'hymn']);
  assert.deepEqual(applyStructureTemplate(blocks, template).map(item => item.id), ['psalm-h', 'psalm', 'hymn-h', 'hymn']);
});

test('individual block defaults remove rubrics, prayers, metadata, and repeated antiphons', () => {
  const preferences = {
    ...DEFAULT_USER_PREFERENCES,
    blockVisibility: { metadata: false, rubrics: false, psalmPrayers: false, repeatedAntiphons: false },
  };
  const blocks = [
    block('meta', 'subheading', 'Monday'), block('rubric', 'rubric', 'Psalm 23'),
    block('ant-1', 'antiphon', 'Alleluia'), block('psalm', 'psalm', 'A psalm'),
    block('prayer', 'psalm-prayer', 'A prayer'), block('ant-2', 'antiphon', 'Alleluia'),
  ];
  assert.deepEqual(filterOfficeBlocks(blocks, preferences).map(item => item.id), ['ant-1', 'psalm']);
});

test('hiding psalm prayers takes their label with them', () => {
  const preferences = {
    ...DEFAULT_USER_PREFERENCES,
    blockVisibility: { ...DEFAULT_USER_PREFERENCES.blockVisibility, psalmPrayers: false },
  };
  const blocks = [
    block('psalm', 'psalm', 'A psalm'), block('label', 'rubric', 'Psalm Prayer'),
    block('prayer', 'psalm-prayer', 'A prayer'), block('ant', 'antiphon', 'Alleluia'),
  ];
  // Rubrics are on, so only the one heading the hidden prayer goes; a rubric
  // that merely mentions psalm prayers stays.
  assert.deepEqual(filterOfficeBlocks(blocks, preferences).map(item => item.id), ['psalm', 'ant']);
  const about = [block('r', 'rubric', 'The psalm prayer may be said here.')];
  assert.equal(filterOfficeBlocks(about, preferences).length, 1);
});

test('an override row is read back only where its own engine could sing it', () => {
  const result = normalizeUserPreferences({
    psalmToneOverrides: {
      '8.|G': { enabled: true, engine: 'gregorian', tone: '1.', variant: 'D' },
      '1.|D': { engine: 'lypsautierant', family: 'english', mode: 'one', variation: 'b_prime' },
      '4.|E': { enabled: true, engine: 'created', createdToneId: 'abc', createdToneName: 'My tone' },
      // A tone that is not in the dictionary, a termination the tone does not
      // carry, a family that is not a psautier book, and a designed tone with
      // no id: each would bypass the chosen engine and then fall back inside
      // the one it named, so each is dropped.
      '7.|a': { enabled: true, engine: 'gregorian', tone: '99.', variant: '' },
      '7.|b': { enabled: true, engine: 'gregorian', tone: '2.', variant: 'Q' },
      '7.|c': { enabled: true, engine: 'lypsautierant', family: 'ambrosian', mode: 'one', variation: 'a' },
      '7.|d': { enabled: true, engine: 'created' },
      '7.|e': { enabled: true, engine: 'simple' },
    },
  });
  assert.deepEqual(Object.keys(result.psalmToneOverrides).sort(), ['1.|D', '4.|E', '8.|G']);
  // A row saved before the checkbox existed was a row in force.
  assert.equal(result.psalmToneOverrides['1.|D'].enabled, true);
  assert.equal(result.psalmToneOverrides['4.|E'].createdToneName, 'My tone');
});

test('a psalm finds the override filed under its own tone and termination', () => {
  const overrides = {
    '1.|D': { enabled: true, engine: 'created' as const, createdToneId: 'mine' },
    '1.|g': { enabled: false, engine: 'created' as const, createdToneId: 'other' },
  };
  const preferences = { ...DEFAULT_USER_PREFERENCES, psalmToneOverrides: overrides };
  const psalm = (tone: string, variant: string): Block =>
    ({ id: 'p', type: 'psalm', content: 'A psalm', psalmTone: tone, psalmVariant: variant });
  assert.equal(psalmToneOverrideFor(preferences, psalm('1.', 'D'))?.createdToneId, 'mine');
  // Mode 1 with a g termination is a different cadence, and its row is off.
  assert.equal(psalmToneOverrideFor(preferences, psalm('1.', 'g')), undefined);
  assert.equal(psalmToneOverrideFor(preferences, psalm('8.', 'G')), undefined);
});

test('a jgabc tone maps back to the stress-aware tone that sings it', () => {
  assert.deepEqual(lypsForJgabcTone('8.', 'G'), { family: 'english', mode: 'eight', variation: 'b' });
  assert.deepEqual(lypsForJgabcTone('1.', 'D'), { family: 'english', mode: 'one', variation: 'b_prime' });
  // "4. alt" is OCO's starred mode 4, and mode 2 maps whole whichever book
  // the tone key names.
  assert.deepEqual(lypsForJgabcTone('4. alt', 'c'), { family: 'english', mode: 'four', variation: 'a' });
  assert.deepEqual(lypsForJgabcTone('2. monasticus', ''), { family: 'english', mode: 'two', variation: 'b' });
  assert.deepEqual(lypsForJgabcTone('per.-alt', ''), { family: 'english', mode: 'peregrinus', variation: 'b' });
});
