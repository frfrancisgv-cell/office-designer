/** Calendar facts shared by the offline office engine and its API route. */

import * as romcal from 'romcal';

export type OfficeHour = 'lauds' | 'vespers' | 'compline' | 'terce' | 'sext' | 'none' | 'readings';
export type OfficeRank = 'SOLEMNITY' | 'SUNDAY' | 'FEAST' | 'MEMORIAL' | 'FERIAL';

interface RomcalDay {
  moment: string;
  type: string;
  name: string;
  key?: string;
  prioritized?: boolean;
  source?: string;
  data?: {
    season?: { key?: string; value?: string };
    meta?: {
      titles?: string[];
      psalterWeek?: { key?: number; value?: string };
      cycle?: { key?: number; value?: string };
    };
  };
}

export interface LiturgicalContext {
  date: Date;
  celebrationDate: Date;
  name: string;
  key: string;
  rank: OfficeRank;
  romcalType: string;
  season: 'ordinary' | 'advent' | 'christmas' | 'lent' | 'easter';
  seasonWeek: number | null;
  psalterWeek: 1 | 2 | 3 | 4;
  liturgicalYear: 'a' | 'b' | 'c';
  titles: string[];
  isSanctoral: boolean;
  isFirstVespers: boolean;
  ferialOccasionCode: string;
  properOccasionCode: string | null;
}

const DAY_MS = 86_400_000;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function rankOf(type: string): OfficeRank {
  if (type === 'SOLEMNITY') return 'SOLEMNITY';
  if (type === 'SUNDAY') return 'SUNDAY';
  if (type === 'FEAST') return 'FEAST';
  if (type === 'MEMORIAL' || type === 'OPT_MEMORIAL') return 'MEMORIAL';
  return 'FERIAL';
}

function seasonOf(day?: RomcalDay): LiturgicalContext['season'] {
  const season = `${day?.data?.season?.key || ''} ${day?.data?.season?.value || ''}`.toLowerCase();
  if (season.includes('advent')) return 'advent';
  if (season.includes('christmas')) return 'christmas';
  if (season.includes('lent')) return 'lent';
  if (season.includes('easter')) return 'easter';
  return 'ordinary';
}

function selectDay(calendar: RomcalDay[], date: Date): RomcalDay | undefined {
  const matches = calendar.filter(day => day.moment.startsWith(isoDate(date)));
  return matches.find(day => day.prioritized) || matches[0];
}

function numberedWeek(day: RomcalDay | undefined): number | null {
  const source = `${day?.key || ''} ${day?.name || ''}`;
  const match = source.match(/(?:^|\D)(\d{1,2})(?:st|nd|rd|th)?(?:Week|\s+week|Sunday)/i);
  return match ? Number(match[1]) : null;
}

function findSeasonWeek(calendar: RomcalDay[], day: RomcalDay | undefined, date: Date): number | null {
  const direct = numberedWeek(day);
  if (direct) return direct;
  const season = seasonOf(day);
  for (let distance = 1; distance <= 6; distance++) {
    for (const direction of [-1, 1]) {
      const nearby = selectDay(calendar, addDays(date, distance * direction));
      if (seasonOf(nearby) !== season) continue;
      const week = numberedWeek(nearby);
      if (week) return week;
    }
  }
  return null;
}

function liturgicalYearOf(day: RomcalDay | undefined, date: Date): 'a' | 'b' | 'c' {
  const value = day?.data?.meta?.cycle?.value?.match(/Year\s+([ABC])/i)?.[1]?.toLowerCase();
  if (value === 'a' || value === 'b' || value === 'c') return value;
  const startYear = date.getUTCMonth() === 11 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return (['a', 'b', 'c'] as const)[((startYear - 2022) % 3 + 3) % 3];
}

function ferialCode(season: LiturgicalContext['season'], week: number | null, psalterWeek: number, day: number): string {
  if (season === 'advent') return `${week || psalterWeek}A${day}`;
  if (season === 'lent') return `${week || psalterWeek}Q${day}`;
  if (season === 'easter') return `${week || 1}P${day}`;
  return `${psalterWeek}H${day}`;
}

function commonCode(day: RomcalDay | undefined): string | null {
  const name = (day?.name || '').toLowerCase();
  const titles = day?.data?.meta?.titles || [];
  if (titles.includes('DOCTOR_OF_THE_CHURCH') || name.includes('doctor')) return 'Doct';
  if (name.includes('apostle') || name.includes('evangelist')) return 'Apost';
  if (name.includes('virgin')) return 'Virg';
  if (name.includes('martyr')) return 'Mart';
  if (name.includes('mary') || name.includes('lady')) return 'BMV';
  if (/\b(pope|bishop|priest|pastor)\b/.test(name)) return 'Past';
  const rank = rankOf(day?.type || '');
  return rank === 'FERIAL' || rank === 'SUNDAY' ? null : 'Sanct';
}

/**
 * Resolve the observed celebration through romcal. Saturday Vespers is resolved
 * against Sunday because it is ordinarily the Sunday's First Vespers.
 */
export function getLiturgicalContext(date: Date, hour: OfficeHour): LiturgicalContext {
  const isFirstVespers = hour === 'vespers' && date.getUTCDay() === 6;
  const celebrationDate = isFirstVespers ? addDays(date, 1) : date;
  const year = celebrationDate.getUTCFullYear();
  const calendar = romcal.calendarFor({ year, country: 'unitedStates' }) as RomcalDay[];
  const day = selectDay(calendar, celebrationDate);
  const season = seasonOf(day);
  const seasonWeek = findSeasonWeek(calendar, day, celebrationDate);
  const romcalPsalterWeek = day?.data?.meta?.psalterWeek?.key;
  const psalterWeek = (
    romcalPsalterWeek && romcalPsalterWeek >= 1 && romcalPsalterWeek <= 4
      ? romcalPsalterWeek
      : (((seasonWeek || 1) - 1) % 4) + 1
  ) as 1 | 2 | 3 | 4;
  const ocoDay = celebrationDate.getUTCDay() + 1;
  const dateCode = `${celebrationDate.getUTCDate()}/${celebrationDate.getUTCMonth() + 1}`;
  const rank = rankOf(day?.type || '');
  const isSanctoral = day?.source === 'g' || /\b(saint|saints|blessed|our lady)\b/i.test(day?.name || '');

  return {
    date,
    celebrationDate,
    name: day?.name || isoDate(celebrationDate),
    key: day?.key || '',
    rank,
    romcalType: day?.type || 'FERIA',
    season,
    seasonWeek,
    psalterWeek,
    liturgicalYear: liturgicalYearOf(day, celebrationDate),
    titles: day?.data?.meta?.titles || [],
    isSanctoral,
    isFirstVespers,
    ferialOccasionCode: ferialCode(season, seasonWeek, psalterWeek, ocoDay),
    properOccasionCode: isSanctoral && (rank === 'SOLEMNITY' || rank === 'FEAST' || rank === 'MEMORIAL') ? dateCode : null,
  };
}

/** Prefer a dated OCO proper when it exists; callers may fall back to this common. */
export function getCommonOccasionCode(context: LiturgicalContext): string | null {
  return commonCode({ name: context.name, type: context.romcalType, moment: '', data: { meta: { titles: context.titles } } });
}
