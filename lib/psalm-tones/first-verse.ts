/**
 * Where the first verse of a psalm ends, which is not always the first line.
 *
 * `pointPsalm` reads a psalm line by line and takes each line's cadence from
 * the marker it ends on, so a verse whose halves are printed on separate
 * lines is pointed correctly without ever being joined up: the line ending
 * in `*` gets the mediant and the line under it gets the termination.
 * iBreviary prints every verse that way, and `inferMediants` marks unpointed
 * text the same way.
 *
 * Engraving the verse does need it joined. The score is built by splitting
 * one line on its `*`, and a line that ends on the marker has nothing left
 * for the termination half — so the whole score came out empty and a Latin
 * office imported from iBreviary printed its Magnificat as pointed text with
 * no notation at all.
 *
 * The range is returned rather than the text so that a caller holding both
 * the pointed HTML and the words it was pointed from can take the same lines
 * out of each.
 */
export function firstVerseRange(text: string): { start: number; end: number } | null {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.trim().length > 0);
  if (start < 0) return null;

  // A line ending on a marker is half a verse; the rest of it is the line
  // below. A blank line is the end of the stanza and stops the search, so a
  // psalm whose last line is left hanging on a `*` cannot run away.
  let end = start + 1;
  while (end < lines.length && /[*†]$/.test(lines[end - 1].trim()) && lines[end].trim()) end++;
  return { start, end };
}

/** The first verse as one line, with its halves rejoined by a single space. */
export function firstVerseText(text: string): string {
  const range = firstVerseRange(text);
  if (!range) return '';
  return text.split('\n').slice(range.start, range.end).map(line => line.trim()).join(' ');
}
