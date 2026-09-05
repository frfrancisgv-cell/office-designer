/**
 * Calendar facts shared by the offline office engine and its API route.
 *
 * This is the single calendar authority. Everything here comes from romcal;
 * nothing is parsed out of a display name, so the office does not change
 * meaning when a locale string changes.
 *
 * romcal returns a day's celebrations in order of precedence: entry 0 is the
 * one actually observed, and any optional memorials follow it. We take entry 0,
 * so an unobserved optional memorial never displaces the feria — see
 * `getObservances` for the full list.
 */

import { Romcal } from 'romcal';
import { UnitedStates_En, UnitedStates_La } from '@romcal/calendar.united-states';
import type { LiturgicalCalendar, LiturgicalDay } from 'romcal';

export type OfficeHour = 'lauds' | 'vespers' | 'compline' | 'terce' | 'sext' | 'none' | 'readings';
export type OfficeRank = 'SOLEMNITY' | 'SUNDAY' | 'FEAST' | 'MEMORIAL' | 'FERIAL';

export interface LiturgicalContext {
  date: Date;
  celebrationDate: Date;
  /** English display name, e.g. "Friday of the twenty-second week of Ordinary Time". */
  name: string;
  /** The same celebration in Latin, e.g. "feria sexta, hebdomada vigesima secunda per annum". */
  latinName: string;
  /** Stable romcal id, e.g. `holy_thursday`. Match on this, never on `name`. */
  key: string;
  rank: OfficeRank;
  /** romcal's own rank, which unlike `rank` distinguishes an optional memorial. */
  romcalRank: string;
  /** romcal's precedence, e.g. `GENERAL_SOLEMNITY_3`. */
  precedence: string;
  season: 'ordinary' | 'advent' | 'christmas' | 'lent' | 'easter';
  seasonWeek: number | null;
  psalterWeek: 1 | 2 | 3 | 4;
  liturgicalYear: 'a' | 'b' | 'c';
  /** Title enum values, e.g. `['PRIEST', 'DOCTOR_OF_THE_CHURCH']`. */
  titles: string[];
  /** romcal's commons for the day, e.g. `['DoctorsOfTheChurch', 'Pastors']`. */
  commons: string[];
  /** How many saints the celebration names; 'many' for an unnumbered group. */
  saintCount: number | 'many';
  isSanctoral: boolean;
  isFirstVespers: boolean;
  ferialOccasionCode: string;
  properOccasionCode: string | null;
}

/** One celebration available on a date: the observed one, then any optional memorials. */
export interface Observance {
  key: string;
  name: string;
  romcalRank: string;
  titles: string[];
  commons: string[];
  saintCount: number | 'many';
  isSanctoral: boolean;
  isOptional: boolean;
}

const DAY_MS = 86_400_000;

/**
 * romcal computes a whole liturgical year per call, so one instance per locale
 * is reused and each Gregorian year is generated at most once. The promise
 * itself is cached so concurrent requests share a single generation.
 *
 * The two calendars are the same calendar; only the names differ. The Latin one
 * is what lets a Latin office print a Latin title.
 */
const romcal = {
  en: new Romcal({ localizedCalendar: UnitedStates_En, scope: 'gregorian' }),
  la: new Romcal({ localizedCalendar: UnitedStates_La, scope: 'gregorian' }),
};
const calendars = { en: new Map<number, Promise<LiturgicalCalendar>>(), la: new Map<number, Promise<LiturgicalCalendar>>() };

function calendarFor(year: number, locale: 'en' | 'la'): Promise<LiturgicalCalendar> {
  let calendar = calendars[locale].get(year);
  if (!calendar) {
    calendar = romcal[locale].generateCalendar(year);
    calendars[locale].set(year, calendar);
  }
  return calendar;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

async function dayFor(date: Date, locale: 'en' | 'la' = 'en'): Promise<LiturgicalDay[]> {
  const calendar = await calendarFor(date.getUTCFullYear(), locale);
  const days = calendar[isoDate(date)];
  if (!days?.length) {
    // Gregorian scope covers 1 January to 31 December, so this only happens
    // for an invalid date. Guessing a ferial week-1 office would be worse.
    throw new Error(`romcal has no liturgical day for ${isoDate(date)}`);
  }
  return days;
}

function rankOf(romcalRank: string): OfficeRank {
  switch (romcalRank) {
    case 'SOLEMNITY': return 'SOLEMNITY';
    case 'SUNDAY': return 'SUNDAY';
    case 'FEAST': return 'FEAST';
    // An optional memorial is only ever entry 0 if it was chosen deliberately;
    // by default the feria comes first and this maps to FERIAL below.
    case 'MEMORIAL':
    case 'OPTIONAL_MEMORIAL': return 'MEMORIAL';
    default: return 'FERIAL';
  }
}

/**
 * Collapse romcal's seasons onto the five the office data is organised by.
 *
 * Order matters. Easter Sunday is both PASCHAL_TRIDUUM and EASTER_TIME and
 * belongs to Easter; Good Friday and Holy Saturday carry PASCHAL_TRIDUUM alone
 * and are kept with Lent, which is where their proper texts live.
 */
function seasonOf(day: LiturgicalDay): LiturgicalContext['season'] {
  const seasons = day.seasons as string[];
  if (seasons.includes('EASTER_TIME')) return 'easter';
  if (seasons.includes('LENT') || seasons.includes('PASCHAL_TRIDUUM')) return 'lent';
  if (seasons.includes('ADVENT')) return 'advent';
  if (seasons.includes('CHRISTMAS_TIME')) return 'christmas';
  return 'ordinary';
}

/** Holy Week is the sixth week of Lent; the OCO indexes it 6Q1 to 6Q7. */
const HOLY_WEEK = 6;

/**
 * romcal counts Good Friday and Holy Saturday as week 1 of the Paschal
 * Triduum, its own season. Folded back into Lent by `seasonOf`, they belong to
 * Holy Week — which is what romcal itself reports for Holy Thursday, and what
 * puts their chant at 6Q6 and 6Q7 rather than in Lent's first week.
 */
function seasonWeekOf(day: LiturgicalDay, season: LiturgicalContext['season']): number | null {
  if (season === 'lent' && (day.seasons as string[]).includes('PASCHAL_TRIDUUM')) return HOLY_WEEK;
  return day.calendar.weekOfSeason ?? null;
}

function saintCountOf(day: LiturgicalDay): number | 'many' {
  const saints = day.martyrology || [];
  if (saints.some(saint => saint.count === 'many')) return 'many';
  return saints.reduce(
    (total, saint) => total + (typeof saint.count === 'number' ? saint.count : 1),
    0,
  );
}

function ferialCode(season: LiturgicalContext['season'], week: number | null, psalterWeek: number, day: number): string {
  if (season === 'advent') return `${week || psalterWeek}A${day}`;
  if (season === 'lent') return `${week || psalterWeek}Q${day}`;
  if (season === 'easter') return `${week || 1}P${day}`;
  return `${psalterWeek}H${day}`;
}

/**
 * Resolve the observed celebration through romcal. Saturday Vespers is resolved
 * against Sunday because it is ordinarily the Sunday's First Vespers.
 */
export async function getLiturgicalContext(date: Date, hour: OfficeHour): Promise<LiturgicalContext> {
  const isFirstVespers = hour === 'vespers' && date.getUTCDay() === 6;
  const celebrationDate = isFirstVespers ? addDays(date, 1) : date;
  const [day, latinDay] = await Promise.all([
    dayFor(celebrationDate, 'en').then(days => days[0]),
    dayFor(celebrationDate, 'la').then(days => days[0]),
  ]);

  const season = seasonOf(day);
  const rank = rankOf(day.rank);
  const isSanctoral = day.cycles.properCycle === 'PROPER_OF_SAINTS';
  const psalterWeek = Number(day.cycles.psalterWeek.slice(-1)) as 1 | 2 | 3 | 4;
  const seasonWeek = seasonWeekOf(day, season);
  const ocoDay = celebrationDate.getUTCDay() + 1;
  const dateCode = `${celebrationDate.getUTCDate()}/${celebrationDate.getUTCMonth() + 1}`;

  return {
    date,
    celebrationDate,
    name: day.name,
    latinName: latinDay.name,
    key: day.id,
    rank,
    romcalRank: day.rank,
    precedence: day.precedence,
    season,
    seasonWeek,
    psalterWeek,
    liturgicalYear: day.cycles.sundayCycle.slice(-1).toLowerCase() as 'a' | 'b' | 'c',
    titles: [...day.titles],
    commons: (day.commonsDef as string[]).filter(common => common !== 'None'),
    saintCount: saintCountOf(day),
    isSanctoral,
    isFirstVespers,
    ferialOccasionCode: ferialCode(season, seasonWeek, psalterWeek, ocoDay),
    properOccasionCode: isSanctoral && (rank === 'SOLEMNITY' || rank === 'FEAST' || rank === 'MEMORIAL') ? dateCode : null,
  };
}

/**
 * Every celebration available on a date: the observed one first, then the
 * optional memorials that may be taken up in its place.
 */
export async function getObservances(date: Date): Promise<Observance[]> {
  return (await dayFor(date)).map(day => ({
    key: day.id,
    name: day.name,
    romcalRank: day.rank,
    titles: [...day.titles],
    commons: (day.commonsDef as string[]).filter(common => common !== 'None'),
    saintCount: saintCountOf(day),
    isSanctoral: day.cycles.properCycle === 'PROPER_OF_SAINTS',
    isOptional: day.rank === 'OPTIONAL_MEMORIAL',
  }));
}

/**
 * The OCO common for a celebration, or null when there is none to name.
 *
 * romcal carries the Roman commons per celebration (`commonsDef`), which is
 * what this reads; titles cover the commons romcal has no entry for, chiefly
 * the apostles. Precedence follows COMMON_FILES in offline-propers.ts so the
 * Latin and English sides choose the same common.
 *
 * Only codes that exist in the local OCO indexes are returned. romcal's generic
 * `Saints` common has no unambiguous OCO counterpart — it would have to be
 * split by sex into Viro/Mul and romcal does not populate `sex` — so it yields
 * null and the caller falls back to the ferial office rather than to a guess.
 *
 * The Easter-time variants (`ApExTp`, `BMVexTP`) are not selected here.
 */
export function getCommonOccasionCode(context: Pick<LiturgicalContext, 'commons' | 'titles' | 'saintCount'>): string | null {
  const commons = new Set(context.commons);
  const titles = new Set(context.titles);
  const has = (...names: string[]) => names.some(name => commons.has(name) || titles.has(name));

  if (has('DoctorsOfTheChurch', 'DOCTOR_OF_THE_CHURCH')) return 'Doct';
  if (has('APOSTLE', 'EVANGELIST')) return 'Ap';
  if (has('BlessedVirginMary')) return 'BMV';
  if (has('Virgins', 'VirginMartyrs', 'VIRGIN')) return 'Virg';
  if (has('Martyrs', 'MissionaryMartyrs', 'WomanMartyrs', 'MARTYR')) {
    const several = context.saintCount === 'many' || context.saintCount > 1;
    return several ? 'PlM' : 'UnM';
  }
  if (has('Pastors', 'PopeOrBishop', 'Bishops', 'POPE', 'BISHOP', 'PRIEST')) return 'Past';
  if (has('Religious', 'Monks', 'Nuns', 'Abbots', 'ABBOT', 'ABBESS', 'MONK', 'RELIGIOUS')) return 'Rel';
  if (has('Missionaries', 'MISSIONARY')) return 'Mis';
  if (has('Educators')) return 'Educ';
  if (has('HolyWomen')) return 'Mul';
  return null;
}

/**
 * A movable celebration that `IDX_INV.csv` names by a code of its own rather
 * than by date. Keyed on romcal's stable id, never on the display name.
 *
 * `Bapt`, `Fam` and `Ded` are feasts and the rest solemnities; all of them
 * fall on a different date each year (or, for the Lateran, have a date the
 * index prefers not to use), which is why `properOccasionCode` cannot reach
 * them.
 */
const INVITATORY_BY_KEY: Record<string, string> = {
  most_holy_trinity: 'Trn',
  most_holy_body_and_blood_of_christ: 'Corp',
  most_sacred_heart_of_jesus: 'Cord',
  our_lord_jesus_christ_king_of_the_universe: 'Reg',
  holy_family_of_jesus_mary_and_joseph: 'Fam',
  baptism_of_the_lord: 'Bapt',
  commemoration_of_all_the_faithful_departed: 'Def',
  dedication_of_the_lateran_basilica: 'Ded',
};

/**
 * `getCommonOccasionCode`'s answer → the invitatory index's own codes.
 *
 * Two of the commons are split by rank in `IDX_INV.csv` — a martyr's feast
 * takes "Regem martyrum" in mode 4*, a martyr's memorial the shorter mode-E
 * setting — so the pair is returned in rank order. `Mis` and `Educ` have no
 * invitatory of their own and fall through to the season or the ferial.
 */
function invitatoryCommonCodes(
  common: string | null,
  rank: OfficeRank,
): { codes: string[]; easterStems: string[] } {
  const solemn = rank === 'SOLEMNITY' || rank === 'FEAST' || rank === 'SUNDAY';
  switch (common) {
    case 'Doct': return { codes: ['Doct'], easterStems: ['Doct'] };
    case 'Ap':   return { codes: ['Ap'], easterStems: ['Ap'] };
    case 'BMV':  return { codes: ['BMV'], easterStems: ['BMV'] };
    case 'Past': return { codes: ['Past'], easterStems: ['Past'] };
    case 'Virg': return { codes: [solemn ? 'Virg soll. fest.' : 'Virg mem.'], easterStems: ['Virg'] };
    case 'PlM':
    case 'UnM':  return {
      codes: [solemn ? 'Mart soll. fest.' : 'Mart mem.'],
      easterStems: ['Mart', 'PlM'],
    };
    case 'Rel':
    case 'Mul':  return { codes: ['Vir Mul Rel'], easterStems: ['Vir Mul Rel'] };
    default:     return { codes: [], easterStems: [] };
  }
}

/** The season's own invitatory codes, most specific first. */
function invitatorySeasonCodes(context: Pick<LiturgicalContext,
  'season' | 'seasonWeek' | 'key' | 'celebrationDate' | 'ferialOccasionCode'>): string[] {
  const date = context.celebrationDate;
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;

  switch (context.season) {
    case 'advent': {
      // Split on 17 December, and on Sunday against the weekdays — which is
      // what the index's "H1" and "H2-7" mean.
      const late = month === 12 && day >= 17;
      return [`Adv ${late ? 'post' : 'ante'} 17/12 ${date.getUTCDay() === 0 ? 'H1' : 'H2-7'}`];
    }
    case 'christmas': {
      if (context.key === 'epiphany_of_the_lord') return ['Ep'];
      if (month === 12 && day === 25) return ['N-25/12'];
      if (month === 1 && day === 1) return ['N-1/1'];
      // Epiphany opens the third week of Christmas, whichever day it falls on,
      // so the week number is the boundary and does not depend on whether the
      // calendar keeps Epiphany on 6 January or on the Sunday.
      return [(context.seasonWeek ?? 1) >= 3 ? 'N post Ep' : 'N ante Ep'];
    }
    case 'lent':
      // "Q" is the two ad libitum Lenten invitatories. The ferial code is
      // tried first because Good Friday and Holy Saturday have their own —
      // "6Q6" and "6Q7" — and nothing else in Lent matches that shape.
      return [context.ferialOccasionCode, 'Q'];
    case 'easter': {
      if (context.key === 'ascension_of_the_lord') return ['Asc'];
      if (context.key === 'pentecost_sunday') return ['Pent'];
      // Ascension opens the seventh week of Easter in the configured calendar;
      // `invitatoryOccasionCodes` has a test pinning that, because a calendar
      // that kept Ascension on the Thursday would move the boundary into the
      // sixth week. Note upstream's lower-case "Tp" in the second code.
      return [(context.seasonWeek ?? 1) >= 7 ? 'Tp post Asc' : 'TP ante Asc'];
    }
    default:
      return [];
  }
}

/**
 * The `IDX_INV.csv` occasion codes to try for a day, most specific first.
 *
 * The invitatory index does not use the codes the rest of the app computes.
 * `app/api/liturgy/route.ts` asks OCO for a ferial `1H4`, a dated `15/8` or a
 * common `Doct`; `IDX_INV.csv` writes the ferial cycle as `1-4H4` — one set of
 * seven for every psalter week — Lent as `Q`, Advent as
 * `Adv ante 17/12 H2-7`, and Easter as `TP ante Asc`. So the old
 * `find(e => e.occasion === occasionCode)` matched on a handful of commons and
 * dated feasts and on **no ferial, Advent, Lent, Christmas or Easter day at
 * all**, which is most of the year.
 *
 * In Easter season the alleluia variant of whichever code wins is tried first.
 * Upstream spaces those inconsistently — `Ded TP` but `BMVTP`, `Past TP` but
 * `DefTP` — so both spellings are offered and the lookup takes whichever the
 * index actually has.
 */
export function invitatoryOccasionCodes(context: Pick<LiturgicalContext,
  'season' | 'seasonWeek' | 'key' | 'celebrationDate' | 'ferialOccasionCode'
  | 'properOccasionCode' | 'rank' | 'commons' | 'titles' | 'saintCount'>): string[] {
  const proper = context.properOccasionCode;
  const byKey = INVITATORY_BY_KEY[context.key];
  const common = invitatoryCommonCodes(getCommonOccasionCode(context), context.rank);

  // Each step is one level of precedence: the codes it contributes, and the
  // stems whose Easter variant stands for it. They differ where the index
  // splits a common by rank — the plain code is "Virg mem." but the alleluia
  // one is "Virg TP".
  const steps: { codes: string[]; easterStems: string[] }[] = [
    { codes: proper ? [proper] : [], easterStems: proper ? [proper] : [] },
    { codes: byKey ? [byKey] : [], easterStems: byKey ? [byKey] : [] },
    { codes: common.codes, easterStems: common.easterStems },
    { codes: invitatorySeasonCodes(context), easterStems: [] },
    // The seven ferial invitatories, one per weekday, shared by all four
    // psalter weeks — which is what the "1-4" in the code means.
    { codes: [`1-4H${context.celebrationDate.getUTCDay() + 1}`], easterStems: [] },
  ];

  const easter = context.season === 'easter';
  return steps.flatMap(step => [
    // The alleluia variant is preferred *within its own step*, not ahead of
    // every step. Hoisting it to the front made St Mark take "Ap TP", the
    // apostles' Easter invitatory, when his own dated row — "25/4", "Dominum
    // loquentem in evangelio … alleluia" — is already the alleluia form, 25
    // April always falling in Easter. Upstream spaces these inconsistently
    // ("Ded TP" but "BMVTP", "Past TP" but "DefTP"), so both spellings are
    // offered and the lookup takes whichever the index has.
    ...(easter ? step.easterStems.flatMap(stem => [`${stem} TP`, `${stem}TP`]) : []),
    ...step.codes,
  ]);
}
