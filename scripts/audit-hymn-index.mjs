import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const hymns = JSON.parse(read('OCO/INDEX_HYM2.json'));
const gregobase = JSON.parse(read('gregobase-cache.json'));

// The TeX and JSON indexes are two serializations of the same source data.
const texEntries = [...read('OCO/INDEX_HYM2.tex').matchAll(
  /\\hym_entry\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
)].map(([, incipit, season_code, office_part, page, grebobase_id]) => ({
  incipit, season_code, office_part, page, grebobase_id,
}));
assert.deepEqual(texEntries, hymns, 'The TeX and JSON hymn indexes have diverged');

const officeTokens = new Set(['1V', '2V', 'V', 'Ol', 'L', 'T', 'S', 'N', 'Hm', 'C']);
for (const hymn of hymns) {
  const offices = hymn.office_part.split(/[,/\s]+/).filter(Boolean);
  assert.ok(offices.length, `${hymn.incipit} has no office assignment`);
  for (const office of offices) {
    assert.ok(officeTokens.has(office), `${hymn.incipit} has unknown office ${office}`);
  }
}

const dateTokens = seasonCode => seasonCode.match(/\b\d{1,2}\/\d{1,2}\b/g) ?? [];
const isProperDateField = seasonCode =>
  /^(?:\d{1,2}\/\d{1,2})(?:\s+\d{1,2}\/\d{1,2})*$/.test(seasonCode) ||
  /^(?:6Q\s+|\d{1,2}\/\d{1,2}\s+BMV)/.test(seasonCode);

// Every proper date represented by the hymn index must be reachable from the
// automatic calendar, and the calendar must not point at a date with no hymn.
const indexedDates = new Set(
  hymns.flatMap(hymn => isProperDateField(hymn.season_code) ? dateTokens(hymn.season_code) : []),
);
const calendarDates = new Set(
  [...read('app/api/ibreviary/constants.ts').matchAll(/^\s*'(\d{1,2}\/\d{1,2})'\s*:/gm)]
    .map(match => match[1]),
);
assert.deepEqual([...calendarDates].sort(), [...indexedDates].sort(),
  'FEAST_CALENDAR and proper hymn dates differ');

// Compare office assignments with the actual labels in the OCO source. This
// catches rows accidentally filed under Lauds, First Vespers, etc.
const sourceRecords = [];
for (const filename of readdirSync(new URL('OCO/', root)).filter(name => /^oco_.*\.tex$/.test(name))) {
  for (const [index, line] of read(`OCO/${filename}`).split(/\r?\n/).entries()) {
    if (!line.includes('LHym') || !line.includes('id=')) continue;
    const label = line.match(/\\hskip-3\.65cm\\rlap\{(.*?)\}\\hskip2\.3cm/)?.[1];
    if (label === undefined) continue;
    sourceRecords.push({
      filename,
      line: index + 1,
      label,
      ids: [...line.matchAll(/id=(\d+)/g)].map(match => match[1]),
      pages: [...line.matchAll(/LHym (\d+)/g)].map(match => match[1]),
    });
  }
}

function sourceOfficeMatches(label, offices) {
  const has = office => offices.includes(office);
  if (label === 'Laudes') return has('L');
  if (label === 'Off. lect.') return has('Ol');
  if (label === 'Vesp.') return has('V');
  if (label === 'I Vesp.') return has('1V') || has('V');
  if (label === 'II Vesp.' || label === '(II) Vesp.') return has('2V') || has('V');
  if (label === 'Tertia') return has('T');
  if (label === 'Sexta') return has('S');
  if (label === 'Nona') return has('N');
  if (label === 'Compl.') return has('C');
  if (label === 'Hor. med.') return has('Hm');
  if (label.includes('Laudes') && label.includes('Vesp')) return has('L') && has('V');
  if (label.includes('Vesp. I') || label.includes('I \\& II Vesp.')) return has('V');
  return true; // Empty/inherited source labels cannot be checked mechanically.
}

for (const hymn of hymns) {
  const sources = sourceRecords.filter(source =>
    source.ids.includes(hymn.grebobase_id) && source.pages.includes(hymn.page),
  );
  if (!sources.length) continue; // Alternate melodies may only occur in the index.
  const offices = hymn.office_part.split(/[,/\s]+/).filter(Boolean);
  assert.ok(sources.some(source => sourceOfficeMatches(source.label, offices)),
    `${hymn.incipit} (${hymn.season_code}) is ${hymn.office_part}, but its OCO source says ${sources.map(source => `${source.label} at ${source.filename}:${source.line}`).join(', ')}`);
}

function seasonMatches(entry, requested) {
  if (entry.toLowerCase() === requested.toLowerCase()) return true;
  return /^\d{1,2}\/\d{1,2}$/.test(requested) && dateTokens(entry).includes(requested);
}

function resolved(date, office) {
  return hymns.filter(hymn =>
    seasonMatches(hymn.season_code, date) &&
    hymn.office_part.split(/[,/\s]+/).includes(office) &&
    gregobase[hymn.grebobase_id]?.gabc,
  );
}

assert.deepEqual(resolved('3/9', 'L').map(hymn => hymn.incipit), ['Anglorum iam apostolus']);
assert.deepEqual(resolved('3/9', 'V').map(hymn => hymn.incipit), ['Anglorum iam apostolus']);
for (const date of ['25/4', '11/6', '18/10']) {
  assert.ok(resolved(date, 'Ol').some(hymn => hymn.incipit === 'O vir beate'));
}
for (const date of ['19/3', '1/5']) {
  assert.ok(resolved(date, 'V').some(hymn => hymn.incipit === 'Te Ioseph'));
}

console.log(`Hymn index audit passed: ${hymns.length} entries, ${indexedDates.size} proper dates.`);
