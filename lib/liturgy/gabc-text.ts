/**
 * The words of a piece of GABC.
 *
 * A score is written as `lyric(neumes)lyric(neumes)…`, so the words are what
 * falls outside the parentheses — but not quite, because the lyric stream also
 * carries the typesetting the book needs: the star that marks where the choir
 * joins, the dagger of a pause, an italic rubric, a ligature written as a font
 * code point, an alternative word set under the one printed.
 *
 * This matters because **the words of a chant come from its own score**, not
 * from a text printed beside it. That ruling was made for the invitatory psalm
 * — Gregobase's *Venite exsultemus* sings the Roman Psalter, not the Nova
 * Vulgata — and it holds just as firmly for the antiphons: `IDX_ANT.csv`'s
 * `Text` column and its `gabc` column genuinely disagree in places ("ipse natus
 * est **hodie** Salvator mundi" against the score's "**nobis**"), and the words
 * the music is written under are the ones that are sung.
 */

/**
 * What the score's inline markup means in plain text.
 *
 * Named rather than sniffed, because the index is a fixed corpus that can be
 * read: these ten are every distinct `<v>…</v>` payload in all 2813 rows of
 * `IDX_ANT.csv`, and a heuristic over ten known strings would only be a way of
 * being wrong later.
 *
 *   \greheightstar   the asterisk the choir joins at (`/greheightstar` in one
 *                    row is upstream's typo for it)
 *   \GreDagger       the dagger of a pause, with or without a leading space
 *   \char508         œ — "ob\char508diens" is obœdiens, as the Text column says
 *   \char182         a pilcrow marking a further division, which the index's
 *                    own Text column does not write, so neither do we
 *   --\kern4pt       a dash between two halves of a divided antiphon
 *   \lower8pt\rlap{} an alternative word set under the one printed: "Hic", or
 *                    "Hæc" when the saint is a woman
 *   ( and )          a literal parenthesis, which cannot be written bare in a
 *                    format whose syntax is parentheses
 */
const VERBATIM: Record<string, string> = {
  '\\greheightstar': '*',
  '/greheightstar': '*',
  '\\GreDagger': '†',
  '\\ \\GreDagger': '†',
  '\\char508': 'œ',
  '\\char182': '',
  '--\\kern4pt': '—',
  '\\lower8pt\\rlap{Hæc}': '(Hæc)',
  '(': '\u{E000}',
  ')': '\u{E001}',
};

/**
 * A parenthesis a `<v>` asked for, held out of the way while the words are
 * read — the reader finds the neumes by their parentheses, so a literal one
 * in the lyrics would end a group that never began.
 */
const PAREN = /[\u{E000}\u{E001}]/gu;

/** Resolve the inline markup, leaving only the words. */
function resolveMarkup(gabc: string): string {
  return gabc
    // `<v>…</v>` is verbatim typesetting; every payload the index uses is above.
    .replace(/<v>(.*?)<\/v>/g, (_, payload: string) => VERBATIM[payload] ?? '')
    // The star and the dagger are also written bare, outside any tag.
    .replace(/\\greheightstar/g, '*')
    // `<i>T.P.</i>`, `<e>e</e>`, `<c>*</c>` — a style on words that are sung.
    .replace(/<\/?(?:i|b|e|c|sc|sp|ul|tt)>/g, '');
}

/**
 * The differentia — *E u o u a e*, the vowels of "sæculorum. Amen."
 *
 * Matched as a run of vowels at the very end rather than as a whole line,
 * because a score may put a bar inside it: *Omnes nationes* closes
 * `E(fhfg) u(e) o(e) (::) u() a() e.()`, which reads as one line ending "E u o"
 * and another reading "u a e."
 */
const EUOUAE = /\s*\bE\s*u\s*o\s*u\s*a\s*e\s*[.!,]?\s*$/i;

/**
 * A score after its headers.
 *
 * `withAnnotation` puts a `name:` and an `annotation:` above a `%%` line so
 * that the mode shows over the engraved score. Those lines are outside any
 * neume group, so a reader that takes everything outside the parentheses reads
 * them as the opening words — which is how "name: Fiat pax; annotation: 1a2;"
 * came to be printed as the first half of the antiphon.
 */
function body(gabc: string): string {
  const at = gabc.indexOf('%%');
  return at === -1 ? gabc : gabc.slice(at + 2);
}

/**
 * The words of a piece of GABC, one line per bar.
 *
 * A group holding `;` or `:` is a half or full bar and ends a verse; `(,)` is
 * a quarter bar inside one and is left where it falls. The two-letter capital
 * that opens a score is a drop cap — "VEníte" is one word, not a shout. A
 * whole-line `%` comment is the transcriber talking, not a word of the psalm;
 * mode 4** has one sitting on top of its doxology.
 */
export function gabcText(gabc: string): string {
  const groups = [...resolveMarkup(body(gabc)).replace(/^[ \t]*%[^\n]*$/gm, '')
    .matchAll(/([^()]*)\(([^)]*)\)/g)];

  const lines: string[] = [];
  let current = '';
  groups.forEach((m, i) => {
    current += m[1];
    // A bar only ends a verse between words. *Omnes nationes* writes
    // `por(;ed~)tán(e)tes(f)`, hanging a divisio off the middle of "portántes",
    // and breaking there splits the word in half.
    const continuesAWord = /^\S/.test(groups[i + 1]?.[1] ?? '');
    if (/[;:]/.test(m[2]) && !continuesAWord) {
      const line = current.replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
      current = '';
    }
  });
  const last = current.replace(/\s+/g, ' ').trim();
  if (last) lines.push(last);
  return lines
    .join('\n')
    .replace(PAREN, ch => (ch === '\u{E000}' ? '(' : ')'))
    .replace(/\b([A-ZÆŒ])([A-ZÆŒ]+)(?=[a-zæœàáâäèéêëìíîïòóôöùúûü])/g,
      (_, first, rest) => first + rest.toLowerCase());
}

/**
 * The words of an antiphon: its score, without the psalm-tone ending.
 *
 * 2561 of the 2580 scored antiphons close on the differentia — the vowels of
 * *sæculorum. Amen.*, written out so the singer knows which ending of the tone
 * the psalm under this antiphon takes. It is the tone's, not the antiphon's,
 * and printing it as though it were the last words of the text is how a stray
 * "E u o u a e." reached the page.
 *
 * Returns an empty string when the score yields no words, so a caller can fall
 * back to whatever text it has rather than print nothing.
 */
export function antiphonText(gabc: string): string {
  // Repeatedly: *In cymbalis* writes out two differentiae, one after the other.
  let text = gabcText(gabc);
  for (let previous = ''; text !== previous; ) {
    previous = text;
    text = text.replace(EUOUAE, '');
  }
  return text.trim();
}
