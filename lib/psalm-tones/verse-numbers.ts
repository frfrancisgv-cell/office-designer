/**
 * Removing verse numbers from psalm and canticle text.
 *
 * The books carry them — the Nova Vulgata writes "2 Quam dilécta tabernácula
 * tua, Dómine virtútum! * 3 Concupíscit…", the Abbey canticles "68 Blessed be
 * the Lord God of Israel" — and the office does not want them. They are
 * stripped where the text is *read*, not where it is rendered, because a
 * number that survives into the pointing engines is syllabified as a token
 * and every mark counted from the end of that hemistich shifts by one. That
 * was 106 mispointed lines of the Latin psalter, all of them the mid-line
 * form after a `*` or `†`.
 *
 * Three shapes, matching what the books actually write — a plain number, a
 * part-verse letter ("1b"), and the bracketed form the Grail uses after a
 * portion divider ("[14] ", and in Psalm 72 "[18]" with no space):
 *
 *   - at the start of a line;
 *   - straight after a mediant `*` or a flex `†`, where the second hemistich
 *     of the line opens a new verse.
 *
 * A bare number with no space after it is taken only before a capital
 * ("6Your ríght hand"), so that the "b" of a part-verse is never mistaken for
 * the start of a word.
 *
 * `* * *`, the portion divider, has no digit after its asterisks and so is
 * left alone — as are Psalm 118/119's stanza titles, which carry none.
 *
 * No heavy imports: this is read by the API routes, the office engine and the
 * iBreviary parser alike.
 */

/** "[14] ", "[18]" — always a label, so no space is required after it. */
const BRACKETED = String.raw`\[(?:\d+:)?\d+[a-z]?\][ \t]*`;

/** "10 ", "1b ", "11:17 " — a bare number, which needs the space to be one. */
const SPACED = String.raw`(?:\d+:)?\d+[a-z]?[ \t]+`;

/** "6Your" — the space simply missing, admitted only before a capital. */
const UNSPACED = String.raw`(?:\d+:)?\d+(?=[A-ZÁÉÍÓÚ])`;

const LABEL = `(?:${BRACKETED}|${SPACED}|${UNSPACED})`;

const LEADING = new RegExp(String.raw`^[ \t]*${LABEL}`, 'gm');
const AFTER_MEDIANT = new RegExp(String.raw`([*†])[ \t]*${LABEL}`, 'g');

/** Drop verse numbers, leading and after a mediant or flex mark. */
export function stripVerseNumbers(text: string): string {
  return text
    .replace(AFTER_MEDIANT, '$1 ')
    .replace(LEADING, '');
}
