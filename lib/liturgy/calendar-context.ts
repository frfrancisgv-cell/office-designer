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

/**
 * The Ordinary Time week whose *Sunday* Gospel-canticle antiphons this hour may
 * take, or null when it may take none.
 *
 * OCO indexes those under a code of the day alone — "13D" — with the antiphon
 * proper to each liturgical year at place `Ma`/`Mb`/`Mc`. They belong to the
 * Sunday. Asking for them on a Tuesday put them beside the ferial antiphon, so
 * the lookup had a choice to make rather than an answer and left the block
 * reading "Ant. Magníficat ánima mea Dóminum."; over 2026 that happened at 264
 * of the 356 Ordinary Time weekday Lauds and Vespers.
 *
 * Two conditions, and the second is the one that is easy to miss:
 *
 *  - **the day being celebrated is the Sunday.** Not the calendar date — a
 *    Saturday evening is the Sunday's First Vespers, and `celebrationDate` has
 *    already been moved onto the Sunday for it.
 *  - **it is being kept as that Sunday**, which is what `occasionCode` still
 *    being the ferial code says. A Sunday under a proper of its own — Trinity,
 *    Christ the King — sings that proper's antiphon, and the Sunday of the
 *    psalter it displaced has no claim on it.
 */
export function sundayGospelAntiphonWeek(
  context: Pick<LiturgicalContext, 'season' | 'seasonWeek' | 'celebrationDate'>,
  occasionCode: string | null,
  ferialCode: string | null,
): number | null {
  if (context.season !== 'ordinary') return null;
  if (context.celebrationDate.getUTCDay() !== 0) return null;
  if (!occasionCode || occasionCode !== ferialCode) return null;
  return context.seasonWeek ?? null;
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

/**
 * `getCommonOccasionCode`'s answer → the hymn index's own codes, most specific
 * first.
 *
 * `INDEX_HYM2.json` splits four of the commons by how many saints are kept —
 * "Past" against "PastPl", "Mul" against "MulPl" — and spells the virgins'
 * three ways ("Virg", "Vir", "VirPl", "VirgPl"), so every spelling the index
 * actually contains is offered and the lookup takes whichever answers. A
 * virgin martyr has a hymn of her own ("Virg Una mart", "Vir Una mart") which
 * comes before the plain common.
 */
function hymnCommonCodes(
  context: Pick<LiturgicalContext, 'commons' | 'titles' | 'saintCount' | 'rank' | 'season'>,
): string[] {
  const common = getCommonOccasionCode(context);
  const many = context.saintCount === 'many' || context.saintCount > 1;
  const martyr = context.titles.includes('MARTYR') || context.commons.includes('Martyrs')
    || context.commons.includes('VirginMartyrs') || context.commons.includes('WomanMartyrs');
  const rankCode = context.rank === 'SOLEMNITY' ? 'soll.'
    : context.rank === 'FEAST' ? 'fest.' : 'mem.';

  switch (common) {
    // The apostles' Easter hymns are a separate row, not a suffix on "Ap".
    case 'Ap':   return context.season === 'easter' ? ['Ap TP', 'Ap'] : ['Ap'];
    case 'Doct': return ['Doct'];
    // "BMV Sab" is Saturday's memorial of Our Lady, which the ranked rows
    // ("BMV fest.", "BMV mem.") do not cover.
    case 'BMV':  return [`BMV ${rankCode}`, 'BMV Sab', 'BMV'];
    case 'Virg': return martyr
      ? ['Virg Una mart', 'Vir Una mart', 'Virg', 'Vir']
      : (many ? ['VirgPl', 'VirPl', 'Virg', 'Vir'] : ['Virg', 'Vir']);
    case 'PlM':  return ['PlM', 'Mart'];
    case 'UnM':  return ['UnM', 'Mart'];
    case 'Past': return many ? ['PastPl', 'Past'] : ['Past'];
    case 'Mul':  return many ? ['MulPl', 'Mul'] : ['Mul'];
    case 'Rel':  return ['Rel'];
    // "Mis" and "Educ" have no hymn of their own; they fall through to the
    // season, exactly as they do for the invitatory.
    default:     return [];
  }
}

/**
 * The `INDEX_HYM2.json` season codes to try for an hour, most specific first.
 *
 * The hymn index is the one OCO file organised the way the book is: a hymn
 * belongs to a *section* — this feast, else this common, else this season,
 * else this day of the psalter's two-week hymn cycle — and only the innermost
 * section that has one answers. `hymnByOccasion` used to be handed the single
 * code `app/api/liturgy/route.ts` had settled on and matched it exactly, so a
 * memorial with no dated hymn of its own found nothing rather than falling
 * back to its common, and **989 of 2555 hymn blocks over 2026 came up empty
 * against an index that has a hymn for every one of them**. This is the same
 * fix `invitatoryOccasionCodes` already is, for the same reason.
 *
 * Two things about the index decide the shape of the codes:
 *
 *  - **The little hours and Compline are keyed by rank and by nothing else**
 *    inside a week — "1.3H soll.", "1.3H mem.", "1.3H2-7" — because *Nunc
 *    Sancte* does not change with the day the way Lauds' hymn does. Asking
 *    them for "1H5" could never match; there is no such row and never was.
 *  - **"1.3" and "2.4" are the psalter's two-week hymn cycle**, but Lent's
 *    Compline pair ("1.3.5Q", "2.4Q") counts *weeks of Lent*, which run to
 *    five and so cannot be the same number.
 */
export function hymnOccasionCodes(
  context: Pick<LiturgicalContext, 'season' | 'seasonWeek' | 'psalterWeek' | 'key' | 'rank'
    | 'celebrationDate' | 'commons' | 'titles' | 'saintCount' | 'properOccasionCode'>,
  hour: OfficeHour,
): string[] {
  const date = context.celebrationDate;
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const feria = date.getUTCDay() + 1;
  const isSunday = feria === 1;
  const little = hour === 'terce' || hour === 'sext' || hour === 'none';
  const short = little || hour === 'compline';
  // Compline on a Saturday follows the Sunday's First Vespers — the book files
  // it under "Post I Vesperas dominicæ et sollemnitatum" — so it belongs to the
  // week that has just begun, not the one ending. `getLiturgicalContext` makes
  // that shift for Vespers and not for Compline, so it is made here.
  const week = hour === 'compline' && feria === 7 ? context.psalterWeek + 1 : context.psalterWeek;
  const pair = week % 2 === 1 ? '1.3' : '2.4';
  const rankCode = context.rank === 'SOLEMNITY' ? 'soll.'
    : context.rank === 'FEAST' ? 'fest.' : context.rank === 'MEMORIAL' ? 'mem.' : null;

  // The day of the psalter's hymn cycle, at the granularity the hour uses.
  // Lauds, Vespers and the Office of Readings have a hymn for each of the
  // seven days; the little hours and Compline have one for Sunday and one for
  // the rest of the week — and Compline's "rest of the week" stops at Friday,
  // Saturday night being the Sunday's First Vespers.
  const ferialCodes = short
    ? (isSunday || (hour === 'compline' && feria === 7) ? [`${pair}H1`]
      : little ? [`${pair}H2-7`]
      : [`${pair}H2-6`])
    : [`${pair}H${feria}`];

  const season = (): string[] => {
    switch (context.season) {
      case 'advent':
        return [`Adv ${month === 12 && day >= 17 ? 'post' : 'ante'} 17/12`];
      case 'christmas': {
        const afterEpiphany = (context.seasonWeek ?? 1) >= 3;
        return [
          ...(context.key === 'epiphany_of_the_lord' ? ['Ep N post Ep', 'Ep 1V N post Ep'] : []),
          ...(context.key === 'baptism_of_the_lord' ? ['Bapt'] : []),
          ...(month === 12 && day === 25 ? ['N'] : []),
          ...(month === 1 && day === 1 ? ['N-1/1'] : []),
          afterEpiphany ? 'N post Ep' : 'N ante Ep',
        ];
      }
      case 'lent': {
        const holyWeek = context.seasonWeek === 6;
        // Good Friday and Holy Saturday are the only days in the year whose
        // little hours have hymns of their own.
        const triduum = holyWeek && feria === 6 ? ['6Q6'] : holyWeek && feria === 7 ? ['6Q7'] : [];
        if (little) return [...triduum, 'Q'];
        // Compline counts weeks of Lent, not psalter weeks.
        if (hour === 'compline') return [(context.seasonWeek ?? 1) % 2 === 1 ? '1.3.5Q' : '2.4Q'];
        return [
          ...triduum,
          ...(holyWeek ? ['6Q 14/9', '6Q1-5', '6Q1 Hm', '6Q'] : []),
          ...(isSunday ? ['1-5Q1', 'Q1'] : ['0-5Q2-7', '0-5Q2-6']),
        ];
      }
      case 'easter': {
        if (context.key === 'pentecost_sunday') return hour === 'compline' ? ['Pent C', 'PC'] : ['Pent'];
        if (context.key === 'ascension_of_the_lord') return ['Asc'];
        const afterAscension = (context.seasonWeek ?? 1) >= 7;
        if (hour === 'compline') return ['PC'];
        if (little) return ['P', 'TP'];
        return [
          ...(afterAscension ? ['Pent P post Asc'] : []),
          'P ante Asc', 'P2-7 ante Asc', 'P2-6 ante Asc',
        ];
      }
      default:
        // Ordinary Time's own "season" is the psalter's hymn cycle, and for
        // the hours keyed by rank the rank row comes before the ferial one.
        return short && rankCode && !isSunday ? [`${pair}H ${rankCode}`] : [];
    }
  };

  // The last two weeks of Ordinary Time have proper Office-of-Readings and
  // Vespers hymns; the index writes them "34H2-6" and "34H2-7".
  const lastWeeks = context.season === 'ordinary' && (context.seasonWeek ?? 0) >= 33 && !isSunday
    ? ['34H2-6', '34H2-7'] : [];

  return [
    ...(context.properOccasionCode ? [context.properOccasionCode] : []),
    ...(HYMN_BY_KEY[context.key] ? [HYMN_BY_KEY[context.key]] : []),
    ...hymnCommonCodes(context),
    ...season(),
    ...lastWeeks,
    ...ferialCodes,
  ];
}

/**
 * A movable celebration the hymn index names by a code of its own rather than
 * by date — the same list `INVITATORY_BY_KEY` keeps, keyed on romcal's id.
 */
const HYMN_BY_KEY: Record<string, string> = {
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
 * `getCommonOccasionCode`'s answer → the antiphon index's own codes.
 *
 * `IDX_ANT.csv` writes the commons much as the hymn index does, with two
 * differences: it has `Viro`, a holy man who is neither pastor nor martyr nor
 * religious, and it keeps no plural forms — one common serves however many
 * saints are kept, the place column marking the "pro plur." antiphons within
 * it. Easter has its own row only for Our Lady (`BMVexTP`).
 */
function antiphonCommonCodes(
  context: Pick<LiturgicalContext, 'commons' | 'titles' | 'saintCount' | 'season'>,
): string[] {
  const common = getCommonOccasionCode(context);
  if (!common) return [];
  if (common === 'BMV') return context.season === 'easter' ? ['BMVexTP', 'BMV'] : ['BMV'];
  // A saint under no common of his own — a confessor, a founder — is filed
  // under `Viro`, which `getCommonOccasionCode` cannot name because romcal has
  // no commons entry for it. Offering it after the named common is harmless:
  // the named one wins whenever it answers.
  return [common, 'Viro'];
}

/**
 * The `IDX_ANT.csv` occasion codes to try for an hour, most specific first.
 *
 * The counterpart of `hymnOccasionCodes`, and it exists for the same reason:
 * `antsByOccasion` was handed one code and matched it exactly, so a memorial
 * with no antiphons of its own found nothing rather than falling back to its
 * common, and 766 of 2555 antiphon blocks over 2026 came up empty.
 *
 * Where this index differs from the hymn one, and each difference costs a
 * branch:
 *
 *  - **The seasons name their weekdays twice.** Late Advent is both
 *    `A-17/12`…`A-24/12` and `5A2`…`5A7`; Easter after the octave is both
 *    `2P4` and `2-7P4`. The dated or numbered form is the day's own and comes
 *    first, the shared form is the fallback.
 *  - **The little hours have three sources**, in order: the day's own hora
 *    media (`1H2` under office `Hm`), the season's (`Q`, `A`, `2-7P`), and the
 *    complementary psalmody's fixed set (`H` under `T`/`S`/`N`), which is what
 *    is said when a second or third midday hour is added. `officeTiers`
 *    handles the last of those; the first two are codes.
 *  - **Compline is a week of its own** — `H0`…`H6`, where `H0` is *post I
 *    Vesperas dominicæ*, which is Saturday night. `antsByOccasion` already
 *    makes that translation and it is left there.
 */
export function antiphonOccasionCodes(
  context: Pick<LiturgicalContext, 'season' | 'seasonWeek' | 'psalterWeek' | 'key' | 'rank'
    | 'celebrationDate' | 'commons' | 'titles' | 'saintCount' | 'properOccasionCode'
    | 'ferialOccasionCode'>,
  hour: OfficeHour,
): string[] {
  const date = context.celebrationDate;
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const feria = date.getUTCDay() + 1;
  const isSunday = feria === 1;
  const week = context.seasonWeek ?? 1;
  const little = hour === 'terce' || hour === 'sext' || hour === 'none';

  // Compline keeps its own week and takes nothing from the season or the
  // sanctoral: the book gives one Compline per weekday and the Sunday's after
  // First and Second Vespers. `antsByOccasion` maps the ferial code onto it.
  if (hour === 'compline') {
    // `antsByOccasion` translates a psalter code — "1H4" — into Compline's own
    // week, where "H0" is *post I Vesperas dominicæ*, which is Saturday night.
    // Only the weekday digit is read, so the week in front of it is a carrier;
    // a season's `ferialOccasionCode` ("1Q4") is not that shape and reached
    // nothing at all, which left Compline blank for the whole of Lent, Advent
    // and Easter.
    return [
      `${context.psalterWeek}H${feria}`,
      ...(context.season === 'easter' ? ['2-7P', 'Dom&TP', 'fer TpA'] : []),
    ];
  }

  const season = (): string[] => {
    switch (context.season) {
      case 'advent': {
        // 17–24 December is a week of its own that the index numbers "5" and
        // also dates; both name the same day and the dated row is the finer.
        const late = month === 12 && day >= 17;
        if (little) return late && day === 24 ? ['A-24/12', 'A'] : ['A'];
        return late
          ? [`A-${day}/12`, `5A${feria}`, context.ferialOccasionCode]
          : [context.ferialOccasionCode];
      }
      case 'christmas': {
        const dated = month === 12 ? `N-${day}/12` : `N-${day}/1`;
        const afterEpiphany = week >= 3;
        return [
          ...(context.key === 'epiphany_of_the_lord' ? ['Ep'] : []),
          ...(context.key === 'baptism_of_the_lord' ? ['Bapt'] : []),
          ...(context.key === 'holy_family_of_jesus_mary_and_joseph' ? ['Fam'] : []),
          // After Epiphany the weekdays are dated from it, not from Christmas.
          ...(afterEpiphany && month === 1 ? [`Ep-${day}/1`] : []),
          dated,
          ...(little ? [afterEpiphany ? 'N post Ep' : 'N ante Ep'] : []),
        ];
      }
      case 'lent': {
        const holyWeek = week === 6;
        if (little) return holyWeek
          ? [feria === 6 ? '6Q6' : feria === 7 ? '6Q7' : '6Q', '6Q', 'Q']
          : ['Q'];
        return [context.ferialOccasionCode];
      }
      case 'easter': {
        if (context.key === 'pentecost_sunday') return ['Pent'];
        if (context.key === 'ascension_of_the_lord') return ['Asc'];
        // The octave is one celebration, not seven ferias, and is the only
        // part of Easter with antiphons at the little hours of its own.
        const octave = week === 1;
        return [
          context.ferialOccasionCode,
          ...(octave ? ['1P'] : []),
          ...(little ? ['2-7P'] : [`2-7P${feria}`, '2-7P2-7', ...(isSunday ? [] : ['2-6P2-6'])]),
        ];
      }
      default: {
        // Ordinary Time's Sundays are numbered "02D".."33D" and its weekdays
        // are the psalter's own "1H2"; `ferialOccasionCode` is already the
        // second of those, and never the first.
        const sunday = isSunday && week ? [String(week).padStart(2, '0') + 'D'] : [];
        return [...sunday, context.ferialOccasionCode];
      }
    }
  };

  return dedupe([
    ...(context.properOccasionCode ? [context.properOccasionCode] : []),
    ...(ANTIPHON_BY_KEY[context.key] ? [ANTIPHON_BY_KEY[context.key]] : []),
    ...antiphonCommonCodes(context),
    ...season(),
    // **Advent and Lent say the Office of Readings from the running week of
    // the psalter**, not from the season: the seasonal codes there ("07Q1-5",
    // "01Av") hold only the Gospel-canticle antiphon. So every season ends by
    // falling back on the psalter's own code, which `ferialOccasionCode` is
    // only in Ordinary Time. This is the last resort for the other hours too,
    // and costs them nothing: a season that named the day has already won.
    `${context.psalterWeek}H${feria}`,
    // The complementary psalmody, said at whichever midday hours are added to
    // the day's own.
    ...(little ? ['H'] : []),
  ]);
}

/** The chain with its repeats removed, first occurrence kept. */
function dedupe(codes: string[]): string[] {
  return [...new Set(codes)];
}

/**
 * A movable celebration `IDX_ANT.csv` names by a code of its own rather than
 * by date, keyed on romcal's id — the same list the invitatory and the hymn
 * keep, less the Lateran, which this index dates.
 */
const ANTIPHON_BY_KEY: Record<string, string> = {
  most_holy_trinity: 'Trn',
  most_holy_body_and_blood_of_christ: 'Corp',
  most_sacred_heart_of_jesus: 'Cord',
  our_lord_jesus_christ_king_of_the_universe: 'Reg',
  holy_family_of_jesus_mary_and_joseph: 'Fam',
  baptism_of_the_lord: 'Bapt',
  epiphany_of_the_lord: 'Ep',
  ascension_of_the_lord: 'Asc',
  pentecost_sunday: 'Pent',
  commemoration_of_all_the_faithful_departed: 'Def',
  dedication_of_the_lateran_basilica: 'Ded',
};

/**
 * `getCommonOccasionCode`'s answer → the responsory index's own codes.
 *
 * `IDX_RB.csv` spells the commons a third way again: it writes the plural with
 * a space ("Past Pl", "Vir Pl", not "PastPl"), keeps both `Vir` and `Virg`,
 * and marks Eastertide with a trailing "TP" on the code rather than in a row
 * of its own — sometimes on the plain code, sometimes only on the plural, and
 * once on a code that names two commons at once ("PlM TP UnM TP"). Every
 * spelling the index holds is offered and the lookup takes whichever answers.
 */
function responsoryCommonCodes(
  context: Pick<LiturgicalContext, 'commons' | 'titles' | 'saintCount' | 'season'>,
): string[] {
  const common = getCommonOccasionCode(context);
  if (!common) return [];
  const many = context.saintCount === 'many' || context.saintCount > 1;
  const stems = ((): string[] => {
    switch (common) {
      case 'Doct': return ['Doct'];
      case 'Ap':   return ['Ap'];
      case 'BMV':  return ['BMV'];
      case 'Virg': return many ? ['Virg Pl', 'Vir Pl', 'Virg', 'Vir'] : ['Virg', 'Vir'];
      case 'PlM':  return ['PlM'];
      case 'UnM':  return ['UnM'];
      case 'Past': return many ? ['Past Pl', 'Past'] : ['Past'];
      case 'Mul':  return many ? ['Mul Pl', 'Mul'] : ['Mul'];
      case 'Rel':  return ['Vir', 'Mul'];
      default:     return [];
    }
  })();
  // The alleluia form is preferred within its own step, never hoisted ahead of
  // a more specific one — the rule `invitatoryOccasionCodes` had to learn.
  return context.season === 'easter'
    ? stems.flatMap(stem => [`${stem} TP`, stem])
    : stems;
}

/**
 * The `IDX_RB.csv` occasion codes to try for an hour, most specific first.
 *
 * The third of the three chains, and the index it reads is the smallest: 210
 * responsories over 105 occasions, at Lauds, at First and Second Vespers, and
 * — this is the part nothing reached — **at Compline**, which has eight of its
 * own and which `app/api/liturgy/route.ts` excluded outright.
 *
 * The little hours and the Office of Readings are absent from the index on
 * purpose: a midday hour has a versicle rather than a short responsory, and
 * the Office of Readings has the long ones, which OCO does not index. An empty
 * list for those hours is the right answer, not a gap.
 */
export function responsoryOccasionCodes(
  context: Pick<LiturgicalContext, 'season' | 'seasonWeek' | 'psalterWeek' | 'key' | 'rank'
    | 'celebrationDate' | 'commons' | 'titles' | 'saintCount' | 'properOccasionCode'>,
  hour: OfficeHour,
): string[] {
  if (hour !== 'lauds' && hour !== 'vespers' && hour !== 'compline') return [];

  const date = context.celebrationDate;
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const feria = date.getUTCDay() + 1;
  const isSunday = feria === 1;
  const week = context.seasonWeek ?? 1;
  const pair = context.psalterWeek % 2 === 1 ? '1.3' : '2.4';
  // Lauds runs the week to Saturday; Vespers stops at Friday, Saturday evening
  // being the Sunday's First Vespers. The index writes that as the difference
  // between "H2-7" and "H2-6".
  const throughSaturday = hour === 'lauds';

  // Compline's responsory is *In manus tuas*, and the eight rows are that one
  // responsory in its seasonal forms — "In manus tuas 1" through 3 and the
  // alleluia one — plus the Triduum's *Christus factus est*. It does not
  // change with the weekday, only with the season.
  if (hour === 'compline') {
    if (context.season === 'easter') return ['P', 'H1'];
    if (context.season === 'advent') return ['Adv', 'H1'];
    if (context.season === 'lent') {
      const triduum = week === 6 && feria >= 5 ? [`6Q${feria}`] : [];
      return [...triduum, 'Q', 'H1'];
    }
    return ['H1'];
  }

  const season = (): string[] => {
    switch (context.season) {
      case 'advent':
        return month === 12 && day === 24 ? ['Adv 24/12', 'Adv']
          : isSunday ? ['Adv H1', 'Adv']
          : [throughSaturday ? 'Adv H2-7' : 'Adv H2-6', 'Adv'];
      case 'christmas':
        return [
          ...(context.key === 'epiphany_of_the_lord' ? ['Ep'] : []),
          ...(context.key === 'baptism_of_the_lord' ? ['Bapt'] : []),
          ...(context.key === 'holy_family_of_jesus_mary_and_joseph' ? ['Fam'] : []),
          ...(month === 12 && day === 25 ? ['N-25/12'] : []),
          ...(isSunday ? ['N2H1'] : []),
          'N',
        ];
      case 'lent': {
        // Holy Week's codes are ranges of days, and the two hours cut them in
        // different places: *Redemisti nos* runs at Lauds to the Thursday,
        // *Adoramus te* at Vespers only to the Wednesday, and from the
        // Thursday evening each day has its own *Christus factus est*.
        if (week === 6) return [
          ...(feria >= 6 ? [`6Q${feria}`]
            : throughSaturday ? ['6Q1-5']
            : feria === 5 ? ['6Q5'] : ['6Q1-4']),
          'Q',
        ];
        return isSunday ? ['1-5Q1', 'Q'] : [throughSaturday ? '0-5Q2-7' : '0-5Q2-6', 'Q'];
      }
      case 'easter': {
        if (context.key === 'pentecost_sunday') return ['Pent', 'P'];
        if (context.key === 'ascension_of_the_lord') return ['Asc', 'P'];
        const afterAscension = week >= 7;
        // The octave is one celebration; the index writes it "1P1-8", with
        // "1P1-8a" the form that carries the alleluia.
        return [
          ...(week === 1 ? ['1P1-8a', '1P1-8'] : []),
          ...(afterAscension ? ['P post Asc'] : []),
          // "P1" is the Sunday of Easter at Lauds — the fourth of the four
          // *Christe Fili Dei* rows, beside Advent's, Christmas's and Lent's,
          // which is what identifies it. Vespers has "P1 usque Asc".
          ...(isSunday ? ['P1', 'P1 usque Asc'] : [throughSaturday ? 'P2-7' : 'P2-6 usque Asc']),
          'P',
        ];
      }
      default:
        return [`${pair}H${feria}`];
    }
  };

  return dedupe([
    ...(context.properOccasionCode ? [context.properOccasionCode] : []),
    ...(RESPONSORY_BY_KEY[context.key] ? [RESPONSORY_BY_KEY[context.key]] : []),
    ...responsoryCommonCodes(context),
    ...season(),
    // A season that named no responsory for the day still has the psalter's.
    `${pair}H${feria}`,
  ]);
}

/**
 * A movable celebration `IDX_RB.csv` names by a code of its own. The Lateran
 * is here where the antiphon index dated it — each index made its own choice
 * and none of the three agree, which is why there are three of these tables.
 */
const RESPONSORY_BY_KEY: Record<string, string> = {
  most_holy_trinity: 'Trn',
  most_holy_body_and_blood_of_christ: 'Corp',
  most_sacred_heart_of_jesus: 'Cord',
  our_lord_jesus_christ_king_of_the_universe: 'Reg',
  holy_family_of_jesus_mary_and_joseph: 'Fam',
  baptism_of_the_lord: 'Bapt',
  epiphany_of_the_lord: 'Ep',
  ascension_of_the_lord: 'Asc',
  pentecost_sunday: 'Pent',
  commemoration_of_all_the_faithful_departed: 'Def',
  dedication_of_the_lateran_basilica: 'Ded',
};
