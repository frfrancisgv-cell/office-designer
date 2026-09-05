/**
 * OCO's `Mode` column → the tone to sing the psalms under that antiphon to,
 * on both sides: the jgabc tone that points the Latin, and the lypsautierant
 * `english` variation that points the English.
 *
 * `IDX_ANT.csv` records 53 distinct modes over its 2814 antiphons, and they
 * are richer than a bare tone number: terminations with a serial number
 * (`1d2`, `1d3`), starred modes from the Antiphonale (`2*a`, `4*e`), a
 * mode 2*-and-4 hybrid (`2*-4a`), a transposition flag (`7at`), the tonus
 * peregrinus (`per.`), the 2005 Antiphonale's letter-modes (`E`, `Dg`, `Cc2`),
 * bare mode numbers with no termination at all, and 241 blanks.
 *
 * The `english` table below is the user's, verbatim, and is the reason this
 * file exists as data rather than as a chain of conditionals. It is keyed on
 * **mode and termination** for tones 1, 4, 7 and 8, and on **the mode alone**
 * for 2, 3, 5 and 6 — those four map whole. Whether a serial number on the
 * termination is ignored is likewise per row: `1d`, `1g`, `1a`, `7c` and `8g`
 * carry all their numbered variants, `1f`, `4g`, `4e`, `7a`, `7b`, `7d` and
 * `8c` do not. Under it 2531 of the 2814 rows map — 89.9%.
 *
 * What is left is left deliberately. 241 rows record no mode at all, and 41
 * record one this table does not reach; two thirds of those 41 are the
 * letter-mode family, which has no eight-mode equivalent in principle and not
 * merely in this repo. Both ride the caller's fallback, which is the user's
 * ruling: for a *tone* — a musical choice — a plausible answer beats a gap.
 * That licence extends to no text anywhere in this app.
 */

import { PSALM_TONES, getVariants } from './tone-data';

export interface ResolvedTone {
  /** A key of `PSALM_TONES`, e.g. `'8.'` or `'4. alt'`. */
  jgabcTone: string;
  /** One of `getVariants(jgabcTone)` — never a code the tone does not have. */
  jgabcVariant: string;
  /**
   * True when OCO's termination has no jgabc equivalent and the nearest one
   * was taken: `8g2` and `1d3` are real terminations that `tone-data.ts` does
   * not carry, so they sing `8G` and `1D`. The Latin is still pointed to the
   * right mode; only the cadence is the neighbour's.
   */
  jgabcApproximated: boolean;
  lypsFamily: 'english';
  /** `'one'` … `'eight'`, `'peregrinus'`. */
  lypsMode: string;
  /** A variation of that mode: `'a'`, `'b'`, `'a_prime'`, `'b_prime'`. */
  lypsVariation: string;
}

export type ToneResolution =
  | { ok: true; mode: string; tone: ResolvedTone }
  | { ok: false; mode: string; reason: string };

/** Modes 2, 3, 5 and 6 map whole: the termination does not change the tone. */
const BY_MODE_ALONE: Record<string, [string, string]> = {
  '2': ['two', 'b'],
  '3': ['three', 'a'],
  '5': ['five', 'b'],
  '6': ['six', 'a_prime'],
};

/** Mode + termination, with any serial number on the termination ignored. */
const BY_TERMINATION_ANY_SERIAL: Record<string, [string, string]> = {
  '1d': ['one', 'b_prime'],
  '1g': ['one', 'a_prime'],
  '1a': ['one', 'a'],
  '7c': ['seven', 'b'],
  '8g': ['eight', 'b'],
};

/**
 * Mode + termination exactly: a serial number here means a termination the
 * table has not spoken for. `4c` and `4a` are the user's "4 alt c" and
 * "4 alt A", which OCO writes starred as `4*c` and `4*a`; bare `4a` is read
 * as the same row, which is a reading of mine over a single row rather than
 * the user's words.
 */
const BY_TERMINATION_EXACT: Record<string, [string, string]> = {
  '1f': ['one', 'b'],
  '4g': ['four', 'a'],
  '4c': ['four', 'a'],
  '4e': ['four', 'b'],
  '4a': ['four', 'b_prime'],
  '7a': ['seven', 'b_prime'],
  '7b': ['seven', 'a'],
  '7d': ['seven', 'b'],
  '8c': ['eight', 'a'],
};

/**
 * An OCO mode, or an exsurge `annotation:` header, reduced to one spelling.
 *
 * Both reach `propagateTones` — `withAnnotation` writes OCO's `Mode` verbatim
 * into scores that have no headers of their own, and a Gregobase score that
 * already carries `%%` keeps its own annotation, which is written the jgabc
 * way ("Ant. 4. alt g", "8 G"). After this they are both `4*g` and `8g`.
 *
 * A termination is lower-cased; a bare letter with no mode number in front of
 * it is a letter-mode and keeps its case, so `E` stays the Antiphonale's mode
 * E and does not become a termination of nothing.
 */
export function normaliseMode(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^(?:ant|inv|resp|hymn|off|comm)\.?\s*/i, '');
  if (/^per\.?$/i.test(s)) return 'per.';
  // "4. alt g" and "4 alt g" are OCO's "4*g".
  s = s.replace(/^([1-8])\.?\s*alt\.?\s*/i, '$1*');
  // "8 G" and "8. G" are "8g"; a lone "8." is "8".
  s = s.replace(/^([1-8])(\*{0,2}(?:-[1-8])?)\.?\s*/, '$1$2');
  return s.replace(/^([1-8][*\-1-8]*)([A-Z])/, (_, head, letter) => head + letter.toLowerCase());
}

/**
 * The mode as OCO writes it, split into its parts.
 *
 * `2*-4a` is a mode 2*-and-4 hybrid and takes its leading mode; mode 2 maps whole
 * to one variation, so nothing turns on that, but it is a reading of mine
 * rather than the user's words. `7at` — mode 7a "transposed" — deliberately
 * does not parse: the `t` is not a serial number and the table has not spoken
 * for it, so it rides the fallback rather than being quietly read as `7a`.
 */
const OCO_MODE = /^([1-8])(\*{0,2})(?:-[1-8])?([a-z])?(\d)?$/;

/** The jgabc half: a tone key and a termination code the tone actually has. */
function jgabcFor(base: string, starred: boolean, letter: string, serial: string) {
  // The starred modes of the Antiphonale are jgabc's "N. alt", but only where
  // that tone carries the termination asked for: `4*c` and `4*a` are "4. alt"
  // c and A, while `4*e` has no alt form and is sung as plain mode 4 E.
  //
  // The alt tone is reached without a star too, when the plain tone has no
  // such termination and the alt one does. That is what makes bare `4a` — the
  // user's "4 alt A" — sing 4.alt A rather than falling back to 4.g, and it
  // is the same reading the `english` table already takes of that row.
  const alt = `${base}. alt`;
  const plain = `${base}.`;
  const wanted = (letter + serial).toLowerCase();
  const has = (tone: string) => Boolean(PSALM_TONES[tone])
    && getVariants(tone).some(v => v.toLowerCase() === wanted);
  const jgabcTone = (starred || !has(plain)) && has(alt) ? alt : plain;

  const variants = getVariants(jgabcTone);
  if (variants.length === 1 && variants[0] === '') {
    // One termination and no code for it — modes 2, 5 and 6.
    return { jgabcTone, jgabcVariant: '', jgabcApproximated: false };
  }
  const exact = variants.find(v => v.toLowerCase() === wanted);
  if (exact !== undefined) return { jgabcTone, jgabcVariant: exact, jgabcApproximated: false };

  const sameLetter = variants.find(v => v.toLowerCase() === letter.toLowerCase());
  return {
    jgabcTone,
    jgabcVariant: sameLetter ?? variants[0],
    jgabcApproximated: true,
  };
}

/**
 * The tone an antiphon's recorded mode calls for, or the reason there is none.
 *
 * A refusal is always explained, because the count and the shape of the
 * refusals are the measure of this table: a silent fall-through to tone 1
 * would make an unmapped mode look like a decision.
 */
export function resolveToneFromMode(rawMode: string | undefined | null): ToneResolution {
  const mode = (rawMode ?? '').trim();
  if (!mode) return { ok: false, mode, reason: 'no mode recorded' };

  const normalised = normaliseMode(mode);

  if (normalised === 'per.') {
    return {
      ok: true,
      mode,
      tone: {
        jgabcTone: 'per.', jgabcVariant: '', jgabcApproximated: false,
        lypsFamily: 'english', lypsMode: 'peregrinus', lypsVariation: 'b',
      },
    };
  }

  const m = normalised.match(OCO_MODE);
  if (!m) {
    // The 2005 Antiphonale Monasticum's letter-modes, and the one row that
    // names two options ("E/4*e"). Neither has an eight-mode equivalent to
    // map onto, so neither is a gap to close.
    return {
      ok: false, mode,
      reason: /^[A-G]/.test(normalised)
        ? 'a letter-mode of the Antiphonale Monasticum, which has no eight-mode tone'
        : `"${normalised}" is not a mode and termination this table has a row for`,
    };
  }

  const [, base, stars, letter = '', serial = ''] = m;
  const starred = stars.length > 0;

  const english = BY_MODE_ALONE[base]
    ?? (letter && BY_TERMINATION_ANY_SERIAL[base + letter])
    ?? (letter && !serial && BY_TERMINATION_EXACT[base + letter]);

  if (!english) {
    return {
      ok: false, mode,
      reason: !letter
        ? `mode ${base} with no termination recorded`
        : `mode ${base}, termination ${letter}${serial}, is not in the table`,
    };
  }

  const [lypsMode, lypsVariation] = english;
  return {
    ok: true,
    mode,
    tone: {
      ...jgabcFor(base, starred, letter, serial),
      lypsFamily: 'english', lypsMode, lypsVariation,
    },
  };
}
