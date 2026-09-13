/**
 * day-search.ts
 *
 * The editor's chant search, asked by day instead of by incipit.
 *
 * `GabcSearchPanel` could only ever search the antiphon index by the first
 * words of the antiphon, which is no use for the case it is wanted in: the
 * office has given the Gospel canticle an antiphon you doubt, and you want to
 * see what the book actually appoints for the day. This answers that — by
 * date, or by the celebration's name — and, where the day's own section holds
 * no Gospel-canticle antiphon, offers the commons it would sing instead.
 *
 * Kept out of `gabc-search/route.ts` because a Next route imports
 * `next/server` and cannot be loaded by the tests.
 */
import type { GabcCandidate } from '@/lib/types';
import { antsByCodes, magBenByCodes } from './gabc-lookup';
import {
  COMMON_LABELS, describeDateCode, describeOccasionCode, describePlace, findOccasions, isGospelPlace,
  occasionIndex,
} from './occasion-index';
import { antiphonOccasionCodes, getLiturgicalContext, type OfficeHour } from '@/lib/liturgy/calendar-context';

const OFFICE_HOURS: OfficeHour[] = [
  'lauds', 'vespers', 'compline', 'terce', 'sext', 'none', 'readings',
];

/**
 * The editor's hour names, which are not quite the calendar's: its menu offers
 * "Matins / Readings" and sends `matins`, where `OfficeHour` calls the same
 * hour `readings`. An hour it does not recognise falls to Vespers rather than
 * refusing, since the search is a lookup and a wrong hour is visible in the
 * `L`/`V` on every row it returns.
 */
export function toOfficeHour(raw: string | null): OfficeHour {
  const hour = (raw || '').toLowerCase().trim();
  if (hour === 'matins' || hour === 'office-of-readings' || hour === 'office_of_readings') return 'readings';
  return OFFICE_HOURS.includes(hour as OfficeHour) ? hour as OfficeHour : 'vespers';
}

export type DayRow = GabcCandidate & { placeLabel: string };

/** One occasion's antiphons for the hour asked about. */
export interface DayGroup {
  code: string;
  label: string;
  /** Why this occasion is in the answer, when it is not the one searched for. */
  note?: string;
  results: DayRow[];
}

export interface DayAnswer {
  heading: string;
  groups: DayGroup[];
}

/**
 * Everything one occasion code holds for one hour, the Gospel canticle first.
 *
 * At Vespers both First and Second are asked for and the answers merged. The
 * office itself must choose between them — a feast's First Vespers is a
 * different office from its Second — but someone looking a day up wants to see
 * what the day has, and every row carries the `1V` or `2V` it is filed under.
 */
export function rowsFor(code: string, hour: OfficeHour): DayRow[] {
  const vespers = hour === 'vespers';
  const collected = [
    ...magBenByCodes([code], hour, false),
    ...(vespers ? magBenByCodes([code], hour, true) : []),
    ...antsByCodes([code], hour, false),
    ...(vespers ? antsByCodes([code], hour, true) : []),
  ];
  const seen = new Set<string>();
  return collected
    .filter(row => {
      if (!row.gabc) return false;
      const key = `${row.office}|${row.place}|${row.incipit}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(row => ({ ...row, placeLabel: describePlace(row.place) }));
}

/** A day named by its date: what the calendar says it is, and what it sings. */
export async function searchByDate(iso: string, hour: OfficeHour): Promise<DayAnswer> {
  const context = await getLiturgicalContext(new Date(`${iso}T00:00:00.000Z`), hour);
  const groups: DayGroup[] = [];
  for (const code of antiphonOccasionCodes(context, hour)) {
    const results = rowsFor(code, hour);
    if (!results.length) continue;
    groups.push({
      code,
      // The day's own section carries the day's name; everything under it is
      // named for what it is — the psalter's weekday, the saint's common.
      label: /^\d{1,2}\/\d{1,2}$/.test(code) && !groups.length
        ? `${context.name} (${describeDateCode(code)})`
        : describeOccasionCode(code),
      // The codes arrive most specific first, so everything after the first
      // that answers is what the day falls back on rather than what it keeps.
      ...(groups.length ? { note: 'What the day falls back on, where its own section is silent.' } : {}),
      results,
    });
  }
  return {
    heading: context.isFirstVespers ? `First Vespers of ${context.name}` : context.name,
    groups,
  };
}

/**
 * A day named in words: "nativity of the virgin mary", "8/9", "common of
 * apostles".
 *
 * Where the celebrations found hold no Gospel-canticle antiphon of their own,
 * the commons are offered instead — its own common where romcal names one, and
 * otherwise all of them — because that is what the book does, and because a
 * search for a Magnificat antiphon that answers "there is none" and stops has
 * not answered the question that was asked.
 */
export async function searchByName(query: string, hour: OfficeHour): Promise<DayAnswer> {
  const matches = findOccasions(query, await occasionIndex()).slice(0, 6);
  const groups: DayGroup[] = [];
  for (const match of matches) {
    const results = rowsFor(match.code, hour);
    if (!results.length) continue;
    groups.push({
      code: match.code,
      label: match.kind === 'sanctoral' ? `${match.label} (${describeDateCode(match.code)})` : match.label,
      results,
    });
  }

  const hasGospel = groups.some(group => group.results.some(row => isGospelPlace(row.place)));
  if (matches.length && !hasGospel) {
    const own = matches.find(match => match.commonCode)?.commonCode;
    const note = own
      ? 'This day has no Gospel-canticle antiphon of its own; it sings its common’s.'
      : 'Nothing is filed under this day for the Gospel canticle, and no common is named for it. These are the commons to choose from.';
    for (const code of own ? [own] : Object.keys(COMMON_LABELS)) {
      const results = rowsFor(code, hour).filter(row => isGospelPlace(row.place));
      if (results.length) groups.push({ code, label: COMMON_LABELS[code] ?? code, note, results });
    }
  }

  return {
    heading: matches.length ? matches[0].label : `Nothing in the antiphon index answers to “${query}”.`,
    groups,
  };
}

/** The panel's one query box: an ISO date, or a name. */
export function searchByDay(query: string, hour: OfficeHour): Promise<DayAnswer> {
  return /^\d{4}-\d{2}-\d{2}$/.test(query.trim())
    ? searchByDate(query.trim(), hour)
    : searchByName(query, hour);
}
