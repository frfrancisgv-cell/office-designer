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

function getSection(text: string, hour: OfficeHour, firstVespers: boolean): string {
  const lines = text.split('\n');
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
  const section = getSection(text, hour, context.isFirstVespers);
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
  return result;
}
