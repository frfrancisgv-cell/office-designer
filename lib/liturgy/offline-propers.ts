import fs from 'fs';
import path from 'path';
import type { LiturgicalContext, OfficeHour } from './calendar-context';

export interface OfflineProper {
  hymn?: string;
  invitatory?: string;
  reading?: string;
  responsory?: string;
  gospelAntiphon?: string;
  prayer?: string;
  sourceFiles: string[];
}

const ROOT = path.join(process.cwd(), 'vendor', 'psautier');
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const COMMON_FILES: Array<[RegExp, string]> = [
  [/doctor/i, 'doctors'],
  [/apostle|evangelist/i, 'apostles'],
  [/blessed virgin|\bmary\b|our lady/i, 'bvm'],
  [/virgin/i, 'virgins'],
  [/martyrs/i, 'martyrs'],
  [/martyr/i, 'martyr'],
  [/pope|bishop|priest|pastor/i, 'pastors'],
  [/religious|abbot|monk|nun/i, 'religious'],
  [/holy men|holy women/i, 'holymenandwomen'],
];

const FIELD_HEADER = /^(HYMN|INVITATORY|READING|RESP(?:ONSORY)?|BENEDICTUS|MAGNIFICAT|PRAYER(?:S)?|PSALMODY)\b\s*:?[ \t]*/i;
const SECTION_HEADER = /^(FIRST VESPERS|SECOND VESPERS|VESPERS|LAUDS|SEXT|TERCE|NONE|VIGILS|OFFICE OF READINGS)\b/i;

/**
 * The Ordinary Time psalter files hold all seven days in one file, headed
 * `SUNDAY I` … `SATURDAY I` (the numeral is the psalter week, and is redundant
 * because the file was chosen by that week). `seasons/lent/holyweek` is headed
 * the same way. Advent, Lent and Easter otherwise use one file per weekday.
 *
 * A day header is a standalone all-caps line. The uppercase test is what keeps
 * it off the variant labels inside a field — `Friday after Ash Wednesday &
 * Weeks 1-4:  Is 53:11b-12` also begins with a weekday, and treating it as a
 * heading truncated the field it belongs to.
 */
const DAY_HEADER = /^(SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY)S?\b[^a-z]*$/;
const WEEKDAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function read(relative: string): string | null {
  const full = path.join(ROOT, relative);
  try {
    if (!fs.statSync(full).isFile()) return null;
    return fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '').replace(/\r/g, '');
  } catch {
    return null;
  }
}

function clean(text: string): string {
  return text
    .replace(/\b\d{2,4}(?:COMMONS|[A-Z][A-Z ]+)\b/g, '')
    .replace(/Th\s+ose/g, 'Those').replace(/th\s+ose/g, 'those')
    .replace(/Th e/g, 'The').replace(/th e/g, 'the')
    .replace(/\bfl ock\b/g, 'flock').replace(/\bfi lled\b/g, 'filled')
    .replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function sectionNames(hour: OfficeHour, firstVespers: boolean): string[] {
  if (hour === 'vespers') return firstVespers ? ['FIRST VESPERS', 'VESPERS'] : ['SECOND VESPERS', 'VESPERS'];
  if (hour === 'readings') return ['OFFICE OF READINGS', 'VIGILS'];
  return [hour.toUpperCase()];
}

/**
 * Narrow to one day's block in a file that carries several.
 *
 * Without this the first `LAUDS` in the file wins, which in Ordinary Time is
 * Sunday's — so every weekday of the psalter week was served Sunday's reading
 * and Sunday's collect. Files with no day headers are returned whole.
 */
function daySection(lines: string[], weekday: number): string[] {
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (DAY_HEADER.test(lines[i].trim())) starts.push(i);
  }
  if (!starts.length) return lines;
  const wanted = WEEKDAY_NAMES[weekday];
  const index = starts.findIndex(start => lines[start].trim().toUpperCase().startsWith(wanted));
  if (index < 0) return lines;
  return lines.slice(starts[index], starts[index + 1] ?? lines.length);
}

function getSection(text: string, hour: OfficeHour, firstVespers: boolean, weekday: number): string {
  const lines = daySection(text.split('\n'), weekday);
  for (const wanted of sectionNames(hour, firstVespers)) {
    const start = lines.findIndex(line => line.trim().toUpperCase() === wanted);
    if (start < 0) continue;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (SECTION_HEADER.test(lines[i].trim())) { end = i; break; }
    }
    return lines.slice(start + 1, end).join('\n');
  }
  return '';
}

function chooseVariant(value: string, context: LiturgicalContext): string {
  const lines = value.split('\n').map(line => line.trim()).filter(Boolean);
  const week = context.seasonWeek;
  const labels = week ? [
    new RegExp(`^Week\\s+${week}:\\s*`, 'i'),
    new RegExp(`^(?:[^:]*&\\s*)?Weeks?\\s+([1-9])-([1-9]):\\s*`, 'i'),
    new RegExp(`^${week}\\.\\s*`),
  ] : [];
  // Ash Wednesday and the three days after it fall before Lent's first week —
  // romcal numbers them week 0, which is falsy and used to leave this list
  // empty, so those four days lost their reading, antiphon and collect. The
  // books label them by name.
  if (week === 0 && context.season === 'lent') {
    labels.push(/^(?:\w+day\s+after\s+)?Ash\s+Wednesday(?:\s*&\s*Weeks?\s+[1-9]-[1-9])?\s*:\s*/i);
  }
  const month = context.celebrationDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = context.celebrationDate.getUTCDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  labels.unshift(new RegExp(`^\\(?${month}\\s+${day}${suffix}\\)?\\s*:?\\s*`, 'i'));
  if (context.season === 'easter') labels.unshift(/^After Octave:\s*/i, /^Octave:\s*/i);
  for (const label of labels) {
    const line = lines.find(candidate => {
      const match = candidate.match(label);
      if (!match) return false;
      if (match[1] && match[2] && week) return week >= Number(match[1]) && week <= Number(match[2]);
      return true;
    });
    if (line) return line.replace(label, '').trim();
  }
  const hasVariants = lines.some(line => /^(?:\(?[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)\)?|Weeks?\s+\d|\d\.)\s*:?/i.test(line));
  if (hasVariants) return '';
  return lines.map(line => line.replace(/^(?:Week\s+\d+|Octave|After Octave|During the Day):\s*/i, '')).join('\n');
}

function parseSource(text: string, hour: OfficeHour, context: LiturgicalContext): OfflineProper {
  const section = getSection(text, hour, context.isFirstVespers, context.celebrationDate.getUTCDay());
  const result: OfflineProper = { sourceFiles: [] };
  if (!section) return result;
  const lines = section.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(FIELD_HEADER);
    if (!match) continue;
    const fieldIndex = i;
    const label = match[1].toUpperCase();
    const collected = [lines[i].trim().slice(match[0].length)];
    for (let j = i + 1; j < lines.length; j++) {
      if (FIELD_HEADER.test(lines[j].trim()) || SECTION_HEADER.test(lines[j].trim())) break;
      collected.push(lines[j]);
      i = j;
    }
    let value = clean(chooseVariant(collected.join('\n'), context));
    if (label === 'READING' && lines[fieldIndex - 1]?.trim() && value.length < 60 && /^\d?\s*[A-Z][\w ]+\s+\d/i.test(value)) {
      const preceding: string[] = [];
      for (let j = fieldIndex - 1; j >= 0; j--) {
        const line = lines[j].trim();
        if (!line) continue;
        if (/^(?:MODE|PSALMODY|INVITATORY|HYMN|ps\s|OT\s|NT\s)/i.test(line)) break;
        preceding.unshift(lines[j]);
      }
      if (preceding.length) value = clean(`${value}\n${preceding.join('\n')}`);
    }
    if (label === 'BENEDICTUS' || label === 'MAGNIFICAT') {
      const alleluiaEnd = value.match(/^([\s\S]*?\(alleluia\)\.)/i);
      if (alleluiaEnd) value = alleluiaEnd[1];
    }
    if (!value || /^p\.\s*@|^of (?:Sunday|the proper)/i.test(value)) continue;
    if (label === 'HYMN') result.hymn = value;
    else if (label === 'INVITATORY') result.invitatory = value;
    else if (label === 'READING') result.reading = value;
    else if (label.startsWith('RESP')) result.responsory = value;
    else if (label === 'BENEDICTUS' || label === 'MAGNIFICAT') result.gospelAntiphon = value;
    else if (label.startsWith('PRAYER')) result.prayer = value;
  }
  return result;
}

function parseSanctoralSource(text: string, hour: OfficeHour, context: LiturgicalContext): OfflineProper {
  const result = parseSource(text, hour, context);
  if (result.prayer) return result;
  const lines = text.split('\n');
  const start = lines.findIndex(line => /^PRAYER(?:S)?\s*:/i.test(line.trim()));
  if (start < 0) return result;
  const collected = [lines[start].replace(/^\s*PRAYER(?:S)?\s*:\s*/i, '')];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (SECTION_HEADER.test(line) || /^(HYMN|PSALMODY|INVITATORY|READING|BENEDICTUS|MAGNIFICAT)\b/i.test(line)) break;
    collected.push(lines[i]);
  }
  const prayer = clean(collected.join('\n'));
  return prayer ? { ...result, prayer } : result;
}

function merge(base: OfflineProper, overlay: OfflineProper, sourceFile?: string): OfflineProper {
  return {
    ...base,
    ...Object.fromEntries(Object.entries(overlay).filter(([key, value]) => key !== 'sourceFiles' && value)),
    sourceFiles: [...base.sourceFiles, ...(sourceFile ? [sourceFile] : []), ...overlay.sourceFiles],
  };
}

/**
 * romcal ids for the temporal days that have their own file. These are matched
 * exactly rather than by substring: the ids are stable and locale-independent,
 * where a display name is neither.
 */
const TRIDUUM_KEYS = new Set(['holy_thursday', 'friday_of_the_passion_of_the_lord', 'holy_saturday']);

function temporalFile(context: LiturgicalContext): string | null {
  const weekday = context.celebrationDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
  const key = context.key;
  const month = context.celebrationDate.getUTCMonth() + 1;
  const day = context.celebrationDate.getUTCDate();
  if (key === 'our_lord_jesus_christ_king_of_the_universe') return 'seasons/ordinaryTime/christtheking';
  if (context.season === 'advent' && month === 12 && day === 24) return 'seasons/advent/dec24';
  if (context.season === 'christmas') {
    if (key === 'nativity_of_the_lord') return 'seasons/christmas/dec25';
    if (key === 'mary_mother_of_god') return 'seasons/christmas/motherofgod';
    if (key === 'holy_family_of_jesus_mary_and_joseph') return 'seasons/christmas/holyfamily';
    if (key === 'epiphany_of_the_lord') return 'seasons/christmas/epiphany';
    // The weekdays either side of Epiphany have their own sections in the
    // psautier; the solemnity's own proper does not belong to them.
    if (/_after_epiphany$/.test(key)) return 'seasons/christmas/afterepiphany';
    if (/^christmas_time_january_\d+$/.test(key)) return 'seasons/christmas/jan2-epiphany';
    if (key === 'baptism_of_the_lord') return 'seasons/christmas/baptism';
    if (month === 12 && day >= 26 && day <= 28) return `seasons/christmas/dec${day}`;
    if (month === 12 && day >= 29) return 'seasons/christmas/dec29-31';
    return 'seasons/christmas/Christmas';
  }
  if (context.season === 'lent') {
    if (key === 'palm_sunday_of_the_passion_of_the_lord') return 'seasons/lent/palmsunday';
    if (TRIDUUM_KEYS.has(key)) return 'seasons/lent/triduum';
    if (context.seasonWeek === 6) return 'seasons/lent/holyweek';
    return `seasons/lent/${weekday}`;
  }
  if (context.season === 'easter') {
    if (key === 'easter_sunday') return 'seasons/easter/easter';
    if (key === 'ascension_of_the_lord') return 'seasons/easter/ascension';
    if (key === 'pentecost_sunday') return 'seasons/easter/pentecost';
    return `seasons/easter/${weekday}`;
  }
  if (context.season === 'ordinary') return `seasons/ordinaryTime/week${['one', 'two', 'three', 'four'][context.psalterWeek - 1]}`;
  if (context.season === 'advent') return `seasons/advent/${weekday}`;
  return null;
}

/**
 * The collects of the 34 Sundays of Ordinary Time, keyed by the week.
 *
 * The psalter files do not carry them: their Sunday entry reads
 * `PRAYER: of Sunday`, a pointer to this section of `seasons/Psalter`, which
 * nothing used to open. Headed `SUNDAYS IN ORDINARY TIME`, one block per
 * Sunday (`2nd Sunday, Week II:`, the first oddly `1st Week Psalter, Week I:`),
 * each ending in a `PRAYER:`.
 */
const SUNDAY_BLOCK = /^(\d{1,2})(?:st|nd|rd|th)\s+(?:Sunday|Week Psalter),\s*Week\s+[IVX]+:\s*$/;
let sundayCollectCache: Map<number, string> | null = null;

function sundayCollects(): Map<number, string> {
  if (sundayCollectCache) return sundayCollectCache;
  const collects = new Map<number, string>();
  const text = read('seasons/Psalter');
  if (!text) return (sundayCollectCache = collects);
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.trim() === 'SUNDAYS IN ORDINARY TIME');
  if (start < 0) return (sundayCollectCache = collects);

  let week: number | null = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    const block = line.match(SUNDAY_BLOCK);
    if (block) { week = Number(block[1]); continue; }
    // Another all-caps heading ends the section (the next is Christ the King).
    if (/^[A-Z][A-Z ,]{6,}$/.test(line)) break;
    if (week === null) continue;
    const prayer = line.match(/^PRAYER(?:S)?\s*:?\s*/i);
    if (!prayer) continue;
    const collected = [line.slice(prayer[0].length)];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next || SUNDAY_BLOCK.test(next) || FIELD_HEADER.test(next)) break;
      collected.push(lines[j]);
      i = j;
    }
    const value = clean(collected.join('\n'));
    if (value && !collects.has(week)) collects.set(week, value);
  }
  return (sundayCollectCache = collects);
}

function commonFile(context: LiturgicalContext, properText: string | null): string | null {
  const haystack = `${context.name}\n${context.titles.join(' ')}\n${properText || ''}`;
  return COMMON_FILES.find(([pattern]) => pattern.test(haystack))?.[1] || null;
}

/** Load English temporal, common, and sanctoral texts, in increasing precedence. */
export function getOfflineProper(context: LiturgicalContext, hour: OfficeHour): OfflineProper {
  let result: OfflineProper = { sourceFiles: [] };
  const temporal = temporalFile(context);
  if (temporal) {
    const text = read(temporal);
    if (text) result = merge(result, parseSource(text, hour, context), temporal);
  }

  const properPath = `sanctoral/${MONTHS[context.celebrationDate.getUTCMonth()]}/${context.celebrationDate.getUTCDate()}`;
  const properText = context.isSanctoral ? read(properPath) : null;
  const common = commonFile(context, properText);
  if (common) {
    const commonPath = `commons/${common}`;
    const text = read(commonPath);
    if (text) result = merge(result, parseSource(text, hour, context), commonPath);
  }
  if (properText) result = merge(result, parseSanctoralSource(properText, hour, context), properPath);

  // A weekday of Ordinary Time with no collect of its own takes the collect of
  // the Sunday of that week, per GILH — which is also what the psalter file's
  // own `PRAYER: of Sunday` is pointing at. A memorial or feast keeps whatever
  // its own proper gave it, so this only fills a genuine gap.
  //
  // Compline is excluded: its collects are a weekly cycle of its own, not the
  // day's. The books here carry no Compline section at all, so that hour stays
  // an honest gap rather than borrowing a prayer that is not its.
  if (!result.prayer && hour !== 'compline'
      && context.season === 'ordinary' && context.seasonWeek
      && (context.rank === 'FERIAL' || context.rank === 'SUNDAY')) {
    const collect = sundayCollects().get(context.seasonWeek);
    if (collect) result = merge(result, { prayer: collect, sourceFiles: [] }, 'seasons/Psalter');
  }
  return result;
}
