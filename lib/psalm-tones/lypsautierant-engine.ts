/**
 * lypsautierant-engine.ts
 *
 * Applies a lypsautierant mode + termination to psalm text.
 *
 * The pipeline mirrors the upstream tool (psautier/modes.pl):
 *
 *   psalm text
 *     -> split into hemistichs, one per line, verse numbers pulled out
 *     -> assign each hemistich a role: mediant ("first"), termination, or flex
 *     -> syllabifyLine()            (psautier/sedsyllables)
 *     -> applyMode(role)            (psautier/<family>/<mode>.pm)
 *     -> render                     (HTML for screen, LaTeX for export)
 *
 * The two generated modules do the actual pointing and are verified
 * byte-for-byte against the upstream perl and sed by
 * scripts/verify-lypsautierant.sh. Everything specific to *this* file is the
 * verse structure — which hemistich is a mediant and which a termination —
 * and the rendering.
 *
 * Three things here are load-bearing and were the source of earlier wrong
 * output:
 *
 *  - Roles. Upstream psalter text has ONE HEMISTICH PER LINE and no '*': the
 *    mediant is every other line, not something you find by searching for a
 *    star. Pointing every line as a termination silently produces a
 *    plausible-looking but wrong psalm.
 *  - Verse numbers. A leading "5 " must be removed before syllabifying. The
 *    positional modes count syllables from the end, but the accent-aware ones
 *    scan the whole hemistich, and a stray numeral shifts their marks.
 *  - Accents. The accent-aware families (english, gregorian) read acute
 *    accents to find the stresses. Given unaccented text they mark almost
 *    nothing, so this file reports that rather than returning silent mush.
 */

import { syllabifyLine } from './lypsautierant-syllabify';
import { syllabifyLatinLine } from './latin-syllabify';
import {
  applyMode,
  getVariations,
  getModeNames,
  getFamilyNames,
  hasVariation,
  type ModeFamily,
  type ModeName,
} from './lypsautierant-modes';

export type { ModeFamily, ModeName };
export { getVariations, getModeNames, getFamilyNames, hasVariation };

/** Families that find their stresses by reading acute accents in the text. */
const ACCENT_AWARE: ModeFamily[] = ['english', 'gregorian'];

const ACCENT_RE = /[áéíóúýÁÉÍÓÚÝ]/;

export interface LypsautierantResult {
  /** HTML for on-screen display: marks set under their syllables. */
  html: string;
  /** LaTeX in the upstream shape, for export via psalter.sty. */
  latex: string;
  /** Problems worth showing the user; the result is still usable. */
  warnings: string[];
}

/**
 * What a hemistich is sung to.
 *  - 'first'       the mediant half of the verse, up to the '*'
 *  - 'termination' the second half, which takes the chosen variation
 *  - 'flex'        an extra half-verse in an odd stanza, marked with a dagger
 */
export type Role = 'first' | 'termination' | 'flex' | 'divider';

interface Hemistich {
  /** Verse number that began the line, rendered in the margin. */
  verse?: string;
  /** Plain text of the hemistich, verse number and markers removed. */
  text: string;
  role: Role;
}

/** A run of consecutive hemistichs; blank lines in the source separate them. */
type Stanza = Hemistich[];

// ─── Parsing ──────────────────────────────────────────────────────────────

/**
 * Markers a source line may carry to state its own role.
 *
 * Only the dagger marks a flex, matching psalm-tone-engine's inferMediants().
 * NOT '!' — upstream psalm text is full of real exclamation marks ("Not só
 * are the wícked, not só!"), and treating those as flexes both mispoints the
 * line and, because one marker makes the whole stanza count as marked,
 * wrecks the mediant/termination pairing for every line after it. The '\\!'
 * in modes.pl's output is a LaTeX stanza break, not an input marker.
 */
const MEDIANT_MARKS = ['*'];
const FLEX_MARKS = ['†'];

interface RawLine {
  verse?: string;
  text: string;
  /** Role stated by a marker in the source, if there was one. */
  marked?: Role;
  /** The source line as written, which is what the flex lookahead reads. */
  raw: string;
}

/**
 * Break one source line into hemistichs.
 *
 * Handles both conventions the app sees: upstream psalter files put one
 * hemistich on each line with no marker at all, while text from elsewhere
 * (and anything inferMediants has already touched) marks the mediant with a
 * trailing '*' and a flex with a trailing dagger. A '*' in the *middle* of a
 * line means both halves are on one line, so it yields two hemistichs.
 */
function parseLine(rawLine: string): RawLine[] {
  const raw = rawLine.trim();
  let text = raw;
  if (!text) return [];

  // "* * *" divides a long psalm into portions; it is not a hemistich and
  // must not be pointed or counted (modes.pl passes it through untouched).
  if (/^[*\s]+$/.test(text)) return [{ text, marked: 'divider', raw }];

  // Pull a leading verse number out before anything else counts syllables.
  //
  // The psalter writes these two ways: "19 ever blést…" and "[19]ever blést…"
  // (the bracketed form appears in Psalms 41, 72 and 89, sometimes with no
  // space after the bracket). Missing the bracketed form is not cosmetic —
  // "[19]ever" is then syllabified and pointed as though it were a word, so
  // every mark on the line shifts, and the literal "[19]" reaches the LaTeX
  // export where, following a "\\", it is swallowed as the optional vertical
  // space argument of "\\[<dimen>]" and fails the whole build.
  let verse: string | undefined;
  const vm = text.match(/^\[(\d+[a-z]?)\]\s*(.*)$/) ?? text.match(/^(\d+[a-z]?)\s+(.*)$/);
  if (vm) {
    verse = vm[1];
    text = vm[2];
  }

  // A trailing marker states this line's role.
  let marked: Role | undefined;
  const last = text.slice(-1);
  if (FLEX_MARKS.includes(last)) {
    marked = 'flex';
    text = text.slice(0, -1).trimEnd();
  } else if (MEDIANT_MARKS.includes(last)) {
    marked = 'first';
    text = text.slice(0, -1).trimEnd();
  }

  // An interior '*' splits one line into mediant + termination.
  const star = text.indexOf('*');
  if (star !== -1) {
    const before = text.slice(0, star).trim();
    const after = text.slice(star + 1).trim();
    const out: RawLine[] = [];
    if (before) out.push({ verse, text: before, marked: 'first', raw });
    if (after) out.push({ verse: before ? undefined : verse, text: after, marked: marked ?? 'termination', raw });
    if (out.length) return out;
  }

  if (!text) return [];
  return [{ verse, text, marked, raw }];
}

/** A line that closes a sentence. modes.pl tests /[.?"!]$/ on the raw line. */
const SENTENCE_END = /["!.?]$/;

/** In Perl, indexing past the end of @lines gives undef, which =~ /^$/ matches. */
function isBlankAt(lines: string[], i: number): boolean {
  return i >= lines.length || !lines[i].trim();
}

/**
 * Assign a role to every hemistich of a psalm whose source carries no
 * markers, following modes.pl.
 *
 * Verses are two hemistichs: mediant then termination. A stanza with an odd
 * number of them holds one three-line verse — flex, mediant, termination —
 * and the flex is what makes the count odd.
 *
 * Which verse is the long one is decided by punctuation, not by position:
 * the flex falls on the first line of an odd stanza whose sentence ends two
 * lines later, or failing that on the third-from-last line. This is NOT "the
 * first line of the stanza", which is what psalm-tone-engine's
 * inferMediants() assumes. For the five-line stanzas that fill the Grail
 * psalter the two disagree, and upstream is right: "Hé is like a trée that
 * is plánted / besíde the flówing wáters," is already a complete verse, so
 * the flex belongs to the three lines that follow it.
 *
 * The lookahead deliberately reads the raw file lines rather than stopping at
 * the stanza, because that is what modes.pl does and the blank line between
 * stanzas is part of what it tests for.
 *
 * @param lines  every source line, blanks included, in order
 * @returns      a role for each non-blank, non-divider line, in order
 */
function inferRoles(lines: string[]): Map<number, Role> {
  const roles = new Map<number, Role>();

  // Length of the stanza each line belongs to, and whether that stanza has
  // had its flex placed yet. modes.pl keeps these in $plines, recounting at
  // each blank line and forcing it even once a flex is placed so a stanza
  // gets at most one.
  const stanzaLen: number[] = new Array(lines.length).fill(0);
  for (let i = 0; i < lines.length; i++) {
    if (isBlankAt(lines, i) || stanzaLen[i]) continue;
    let end = i;
    while (end < lines.length && !isBlankAt(lines, end)) end++;
    for (let k = i; k < end; k++) stanzaLen[k] = end - i;
  }

  // Alternation runs across the whole psalm, as $reallines does upstream.
  let reallines = 1;
  const flexedStanza = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (isBlankAt(lines, i)) continue;
    const text = lines[i].trim();
    // "* * *" is passed through untouched and takes no part in the count.
    if (/^[*\s]+$/.test(text)) continue;

    const stanza = firstOfStanza(lines, i);
    const canFlex = stanzaLen[i] % 2 === 1 && !flexedStanza.has(stanza);

    if (canFlex && (SENTENCE_END.test((lines[i + 2] ?? '').trim()) || isBlankAt(lines, i + 3))) {
      roles.set(i, 'flex');
      flexedStanza.add(stanza);
      continue;
    }

    roles.set(i, reallines % 2 === 1 ? 'first' : 'termination');
    reallines++;
  }

  return roles;
}

/** Index of the first line of the stanza containing line i. */
function firstOfStanza(lines: string[], i: number): number {
  let k = i;
  while (k > 0 && !isBlankAt(lines, k - 1)) k--;
  return k;
}

/** Split the text into stanzas of hemistichs with a role on each. */
function parseStanzas(text: string): Stanza[] {
  const srcLines = text.split('\n');
  const parsed = srcLines.map(parseLine);

  // Markers are all-or-nothing. Text that already carries '*' and daggers
  // (from inferMediants, or written by hand) is taken at its word; text with
  // none — every psalm under lypsautierant/psautier — gets inferred roles.
  const anyMarked = parsed.some(ls => ls.some(l => l.marked && l.marked !== 'divider'));
  const inferred = anyMarked ? null : inferRoles(srcLines);

  const stanzas: Stanza[] = [];
  let current: Hemistich[] = [];

  srcLines.forEach((line, i) => {
    if (!line.trim()) {
      if (current.length) stanzas.push(current);
      current = [];
      return;
    }
    for (const l of parsed[i]) {
      const role: Role = l.marked === 'divider'
        ? 'divider'
        : anyMarked
          ? (l.marked ?? 'termination')
          : (inferred!.get(i) ?? 'termination');
      current.push({ verse: l.verse, text: l.text, role });
    }
  });
  if (current.length) stanzas.push(current);

  return stanzas;
}

// ─── Rendering ────────────────────────────────────────────────────────────

/**
 * Mark glyphs, from psautier/psalter.sty. Each macro sets its glyph centred
 * underneath the syllable; these are the on-screen equivalents.
 *   \pl \textbf{+}      \pp \textbf{++}     \plmi \textbf{+--}
 *   \mipl \textbf{--+}  \mi OMS char0       \mimi OMS char0 char0
 *   \dmi \textbf{=}
 */
const MARK_GLYPHS: Record<string, string> = {
  pl: '+',
  pp: '++',
  plmi: '+–',
  mipl: '–+',
  mi: '−',
  mimi: '−−',
  dmi: '=',
};

const MARK_NAMES = Object.keys(MARK_GLYPHS);

/** Argument-less LaTeX macros the pointing rules emit. */
const SYMBOLS: Record<string, string> = {
  dag: '†',
  ddag: '‡',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert one pointed hemistich from LaTeX macros into HTML.
 *
 * Macros nest — the rules mark a syllable and then sometimes re-mark one
 * already marked, giving e.g. \mi{\pl{word}} — so marks are collected into a
 * stack and rendered as successive rows under the syllable, which is what
 * the nested \oalign boxes do in print.
 */
function latexToHtml(pointed: string): string {
  let i = 0;
  let out = '';

  /** Parse up to `stop`, or to the end when stop is null. */
  function parse(stop: string | null): { html: string; marks: string[]; text: string } {
    let html = '';
    let text = '';
    const marks: string[] = [];
    while (i < pointed.length) {
      if (stop && pointed[i] === stop) { i++; break; }
      if (pointed[i] === '\\') {
        const m = /^\\([a-zA-Z]+)\{/.exec(pointed.slice(i));
        if (m) {
          const name = m[1];
          i += m[0].length;
          const inner = parse('}');

          if (MARK_NAMES.includes(name)) {
            // A mark wrapping content: stack this mark under whatever the
            // content already carries.
            const stacked = [...inner.marks, name];
            if (inner.text) {
              html += renderPointed(inner.text, stacked);
              text += inner.text;
            } else {
              // Marking something that is not text, e.g. \mi{\rule{2ex}{.5pt}}
              html += `<span class="lyps-pt">${inner.html}${stacked.map(markSpan).join('')}</span>`;
            }
            marks.length = 0;
            continue;
          }

          if (name === 'flagflex') {
            // A dagger set in the right margin, marking the flex cadence.
            html += `<sup class="lyps-flex">${escapeHtml(inner.text) || '†'}</sup>`;
            continue;
          }

          if (name === 'rule') {
            // \rule{width}{height} — a short horizontal line. The second
            // brace group is the thickness and follows immediately.
            const h = /^\{[^}]*\}/.exec(pointed.slice(i));
            if (h) i += h[0].length;
            html += '<span class="lyps-rule"></span>';
            continue;
          }

          html += inner.html;
          text += inner.text;
          continue;
        }

        // A macro with no argument, e.g. the \dag inside \flagflex{\dag}.
        const sym = /^\\([a-zA-Z]+)\s?/.exec(pointed.slice(i));
        if (sym) {
          i += sym[0].length;
          const glyph = SYMBOLS[sym[1]] ?? '';
          html += escapeHtml(glyph);
          text += glyph;
          continue;
        }
      }
      // Plain character.
      const ch = pointed[i];
      html += escapeHtml(ch);
      text += ch;
      i++;
    }
    return { html, marks, text };
  }

  const res = parse(null);
  out += res.html;
  return out;
}

/**
 * One mark row. data-pt carries the rule's own name for the mark, so the
 * LaTeX exporter can reach for the right macro instead of reverse-engineering
 * the glyph.
 */
function markSpan(name: string): string {
  return `<span class="lyps-mk" data-pt="${name}">${MARK_GLYPHS[name]}</span>`;
}

/** One syllable with its stack of marks set underneath. */
function renderPointed(text: string, marks: string[]): string {
  const rows = marks.map(markSpan).join('');
  return `<span class="lyps-pt"><span class="lyps-sy">${escapeHtml(text)}</span>${rows}</span>`;
}

/** The end-of-line marker shown after a hemistich, matching the printed book. */
function lineMarker(role: Role): string {
  if (role === 'first') return ' <span class="lyps-star">*</span>';
  return '';
}

// ─── Public entry point ───────────────────────────────────────────────────

/**
 * Point a whole psalm text block.
 *
 * @param text      Psalm text, one hemistich per line, blank lines between
 *                  stanzas. Should carry acute accents on stressed syllables
 *                  for the english and gregorian families.
 * @param family    'modes' | 'french' | 'english' | 'gregorian'
 * @param mode      'one' … 'eight' | 'peregrinus'
 * @param variation Termination variation; must be one that exists for this
 *                  family and mode (see getVariations).
 * @param lang      Which syllabifier to cut the text with. Upstream only ever
 *                  had the English one — `sedsyllables` is 180 rules about
 *                  English spelling — so Latin psalms pointed as 'en' come out
 *                  divided in the wrong places ("pr -- æsí -- dii") and every
 *                  mark that counts from them lands on the wrong syllable.
 */
export function pointPsalmText(
  text: string,
  family: ModeFamily,
  mode: ModeName,
  variation: string,
  lang: 'en' | 'la' = 'en',
): LypsautierantResult {
  const warnings: string[] = [];
  const syllabify = lang === 'la' ? syllabifyLatinLine : syllabifyLine;

  if (!hasVariation(family, mode, variation)) {
    const known = getVariations(family, mode);
    throw new Error(
      `lypsautierant: ${family}/${mode} has no termination "${variation}". ` +
      `Available: ${known.join(', ') || '(none)'}`,
    );
  }

  if (ACCENT_AWARE.includes(family) && !ACCENT_RE.test(text)) {
    warnings.push(
      `The "${family}" tones locate stresses from acute accents, and this text has none. ` +
      `Load the accented psalter text first, or use the "modes"/"french" tones, ` +
      `which count syllables instead.`,
    );
  }

  const stanzas = parseStanzas(text);
  if (!stanzas.length) return { html: '', latex: '', warnings };

  const htmlStanzas: string[] = [];
  const latexStanzas: string[] = [];

  for (const stanza of stanzas) {
    const htmlLines: string[] = [];
    const latexLines: string[] = [];

    stanza.forEach((h, k) => {
      if (h.role === 'divider') {
        htmlLines.push(`<span class="lyps-divider">${escapeHtml(h.text)}</span>`);
        latexLines.push(h.text + '\\\\!');
        return;
      }

      const rule = h.role === 'termination' ? variation : h.role;
      const pointed = applyMode(family, mode, rule, syllabify(h.text));

      // The verse number is parsed out (see parseLine) but not printed: the
      // office does not want it. `h.verse` stays as the record of what was
      // removed, and the renderer keeps its \lypsverse handling, so a block
      // saved before this change still typesets.
      htmlLines.push(latexToHtml(pointed) + lineMarker(h.role));

      // Upstream line endings: '\\*' keeps the mediant with its termination,
      // '\\' ends a verse, and '\\!' ends a stanza (verse.sty).
      const isLast = k === stanza.length - 1;
      const ending = isLast ? '\\\\!' : h.role === 'termination' ? '\\\\' : '\\\\*';
      latexLines.push(pointed + ending);
    });

    htmlStanzas.push(htmlLines.join('\n'));
    latexStanzas.push(latexLines.join('\n'));
  }

  return {
    html: htmlStanzas.join('\n\n'),
    latex: latexStanzas.join('\n\n'),
    warnings,
  };
}

/**
 * Roles this text would be pointed with, without pointing it.
 *
 * No UI consumes this yet — it exists so scripts/verify-lypsautierant.sh can
 * compare our role sequence against modes.pl's without comparing the pointed
 * text. Do not delete it as dead code; check 3 of that script imports it.
 */
export function describeStructure(text: string): { text: string; role: Role; verse?: string }[][] {
  return parseStanzas(text);
}

/** Re-exported for convenience; the implementation has no heavy imports. */
export { stripLypsautierantHtml } from './lypsautierant-strip';
