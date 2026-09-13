/**
 * occasion-index.ts
 *
 * Finding the chant for a day by the day's name, instead of by the antiphon's
 * first words.
 *
 * `IDX_ANT.csv` files the sanctoral by date — `8/9` is 8 September — and the
 * commons by an abbreviation — `BMV`, `Past`, `UnM`. Neither is a thing anyone
 * would type, and neither carries the celebration's name, so the only way into
 * the index from the editor was to know the incipit already: to find the
 * Magnificat antiphon of the Nativity of the Blessed Virgin Mary you had to
 * know it begins *Gloriosae Virginis Mariae*, which is the thing you were
 * looking it up to discover.
 *
 * The names come from romcal, which is already this app's calendar authority,
 * by asking what each dated code's date is celebrating. A fixed date can be
 * displaced in any given year — the Conversion of Saint Paul falls on a Sunday
 * in 2026, and four April dates are inside Holy Week — so each date is tried
 * over four consecutive years and the first year that keeps it as a saint's
 * day supplies the name. That leaves two of the 191 dated codes unnamed, both
 * of them dates the calendar in use never keeps; they stay searchable by code.
 */
import { getAnts } from './gabc-loaders';
import { getCommonOccasionCode, getObservances } from '@/lib/liturgy/calendar-context';

export interface Occasion {
  /** The `IDX_ANT.csv` occasion code, e.g. `8/9` or `BMV`. */
  code: string;
  /** What to call it in English. */
  label: string;
  kind: 'sanctoral' | 'common';
  /**
   * The OCO common this celebration falls back on, where romcal names one.
   * A day whose own section holds no Gospel-canticle antiphon sings the
   * common's, and this is how the search offers it.
   */
  commonCode?: string;
}

/**
 * The commons, in English.
 *
 * Only the fourteen that hold a Gospel-canticle antiphon are listed: the
 * Eastertide variants (`BMVexTP`, `ApExTp`) hold psalm antiphons alone, and a
 * common offered for a Magnificat it does not have would be an empty answer
 * dressed as a choice. `Viro` and `Mul` are the OCO's "of a man" and "of a
 * woman" — the holy men and holy women who fall under no other common.
 */
export const COMMON_LABELS: Record<string, string> = {
  BMV: 'Common of the Blessed Virgin Mary',
  Ap: 'Common of Apostles',
  Past: 'Common of Pastors',
  Doct: 'Common of Doctors of the Church',
  Virg: 'Common of Virgins',
  UnM: 'Common of One Martyr',
  PlM: 'Common of Several Martyrs',
  Mul: 'Common of Holy Women',
  Viro: 'Common of Holy Men',
  Rel: 'Common of Religious',
  Mis: 'Common of Missionaries',
  Educ: 'Common of Educators',
  Ded: 'Dedication of a Church',
  Def: 'Office of the Dead',
};

/** Strip accents and case so "Ávila" answers to "avila". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** "8/9" as "8 September", which is how the code is worth showing. */
export function describeDateCode(code: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(code);
  if (!match) return code;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[1])} ${month}` : code;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SEASONS: Record<string, string> = { H: 'Ordinary Time', A: 'Advent', Q: 'Lent', P: 'Eastertide' };

/**
 * An occasion code in English, for a heading over its antiphons.
 *
 * The shapes are the index's own: `8/9` a date, `3H3` the psalter's week and
 * weekday (the ferias count from Sunday, so `H3` is Tuesday), `23D` a Sunday of
 * Ordinary Time, and the bare abbreviations the commons. Anything else — the
 * dated codes of Advent and Christmastide, the little hours' own sections — is
 * left as it stands rather than guessed at.
 */
export function describeOccasionCode(code: string): string {
  if (/^\d{1,2}\/\d{1,2}$/.test(code)) return describeDateCode(code);
  if (COMMON_LABELS[code]) return COMMON_LABELS[code];

  const sunday = /^(\d{1,2})D$/.exec(code);
  if (sunday) return `Sunday ${sunday[1]} in Ordinary Time`;

  const ferial = /^(\d)([HAQP])(\d)$/.exec(code);
  if (ferial) {
    const weekday = WEEKDAYS[Number(ferial[3]) - 1];
    if (weekday) return `${SEASONS[ferial[2]]}, psalter week ${ferial[1]} — ${weekday}`;
  }
  return code;
}

const indexes = new Map<number, Promise<Occasion[]>>();

/**
 * Every occasion the antiphon index holds that can be named: the dated
 * sanctoral, and the commons.
 *
 * Built once per starting year and kept. romcal caches a generated year, so
 * the four years this walks are four calendars and the whole index costs well
 * under a tenth of a second.
 */
export function occasionIndex(fromYear = new Date().getUTCFullYear()): Promise<Occasion[]> {
  let built = indexes.get(fromYear);
  if (!built) {
    built = build(fromYear);
    indexes.set(fromYear, built);
  }
  return built;
}

async function build(fromYear: number): Promise<Occasion[]> {
  const dated = [...new Set(getAnts().map(entry => entry.occasion)
    .filter(code => /^\d{1,2}\/\d{1,2}$/.test(code)))];

  const sanctoral: Occasion[] = [];
  for (const code of dated) {
    const [day, month] = code.split('/').map(Number);
    let named: Occasion | null = null;
    for (let year = fromYear; year < fromYear + 4 && !named; year++) {
      const observances = await getObservances(new Date(Date.UTC(year, month - 1, day)));
      const saint = observances.find(observance => observance.isSanctoral);
      if (saint) {
        named = {
          code,
          label: saint.name,
          kind: 'sanctoral',
          ...(getCommonOccasionCode(saint) ? { commonCode: getCommonOccasionCode(saint)! } : {}),
        };
      }
    }
    sanctoral.push(named ?? { code, label: describeDateCode(code), kind: 'sanctoral' });
  }

  const commons: Occasion[] = Object.entries(COMMON_LABELS)
    .map(([code, label]) => ({ code, label, kind: 'common' as const }));

  return [...sanctoral, ...commons];
}

/**
 * The occasions a typed query names, best first.
 *
 * An exact code wins outright — someone who typed `8/9` or `BMV` means it.
 * Otherwise every word of the query must begin a word of the label, so
 * "nativity virgin" finds the Nativity of the Blessed Virgin Mary and "nat"
 * finds it too, while "mary" does not drag in "Rosemary". Shorter labels rank
 * first, on the reasoning that a query matching a short name matches it more
 * nearly than it matches a long one that happens to contain the same words.
 */
export function findOccasions(query: string, index: Occasion[]): Occasion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const exact = index.filter(occasion => fold(occasion.code) === fold(trimmed));
  if (exact.length) return exact;

  const words = fold(trimmed).split(/[^a-z0-9/]+/).filter(Boolean);
  if (!words.length) return [];

  return index
    .filter(occasion => {
      const labelWords = fold(occasion.label).split(/[^a-z0-9]+/).filter(Boolean);
      return words.every(word => labelWords.some(labelWord => labelWord.startsWith(word)));
    })
    .sort((a, b) => a.label.length - b.label.length);
}

/** The `Place` column read aloud: "Magnificat", "Psalm antiphon 2". */
export function describePlace(place = ''): string {
  const trimmed = place.trim();
  if (!trimmed) return '';
  if (/^Nunc/i.test(trimmed)) return 'Nunc dimittis';
  const canticle = (letter: string) => letter === 'M' ? 'Magnificat' : 'Benedictus';
  const year = /^([MB])([abc])$/.exec(trimmed);
  if (year) return `${canticle(year[1])} (Year ${year[2].toUpperCase()})`;
  const adLibitum = /^([MB])[\s-](.+)$/.exec(trimmed);
  if (adLibitum) return `${canticle(adLibitum[1])} (${adLibitum[2]})`;
  if (trimmed === 'M' || trimmed === 'B') return canticle(trimmed);
  if (/^[123]$/.test(trimmed)) return `Psalm antiphon ${trimmed}`;
  return trimmed;
}

/** True for the places a Gospel canticle's antiphon is filed under. */
export function isGospelPlace(place = ''): boolean {
  return /^([MB]|Nunc)/.test(place.trim());
}
