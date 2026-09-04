/**
 * Converts an array of Blocks + OfficeSettings into a LuaLaTeX document string.
 * Also returns a map of { filename -> content } for .gabc files that must be
 * written to the temp directory alongside the .tex file.
 *
 * Layout philosophy:
 *   - ALL spacing is explicit. No package is allowed to add or modify spacing
 *     without our knowledge (no parskip, no verse package, no needspace).
 *   - Environments are minimal custom ones defined in the preamble.
 *   - \parindent and \parskip are set to zero; all vertical rhythm uses
 *     \smallofficebreak / \medofficebreak macros.
 *   - GABC scores are referenced as pre-compiled .gtex files (antiphon-N.gtex)
 *     so gregoriotex never tries to shell out during the lualatex run.
 */

import type { Block, OfficeSettings, PaperSize } from '@/lib/types';
import { isPsalmRubric, isSuppressedAttribution } from '@/lib/blocks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RenderedDocument {
  texContent: string;
  /** Map of filename (e.g. "antiphon-3.gabc") → gabc file contents */
  gabcFiles: Record<string, string>;
  /**
   * Map of filename → base64 payload for uploaded score images.
   * Kept separate from gabcFiles because these are binary and must not be
   * handed to gregorio for pre-compilation.
   */
  imageFiles: Record<string, string>;
}

// ---------------------------------------------------------------------------
// LaTeX escape helpers
// ---------------------------------------------------------------------------

/**
 * LaTeX special characters, replaced in ONE pass. UTF-8 is preserved as-is
 * (LuaLaTeX + fontspec handle it).
 *
 * Doing these as a chain of .replace() calls is wrong in two ways, and both
 * bugs were live: '_' was simply missing, so any underscore in any block
 * ("Missing $ inserted") killed the whole document; and because the
 * backslash rule ran first, the braces IT introduced were then escaped by
 * the later brace rules, turning "a\\b" into "a\\textbackslash\\{\\}b". A
 * single regex over a lookup table cannot re-process its own output.
 *
 * NOTE for anyone adding a \x00 sentinel: its name must contain no character
 * that appears in this table. escLtx runs *between* the pass that turns
 * <strong>/<em> into sentinels and the pass that turns sentinels into LaTeX,
 * so an underscore in a sentinel name gets escaped to "\_" and the second
 * pass then fails to match it — the marker reaches lualatex verbatim and
 * dies as "Text line contains an invalid character". That is exactly what
 * happened to \x00BOLD_OPEN\x00 when '_' was added above, which broke PDF
 * export for every pointed psalm; the names are now underscore-free.
 */
const LTX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  '$': '\\$',
  '#': '\\#',
  '_': '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

function escLtx(text: string): string {
  return text
    .replace(/[\\&%$#_{}~^]/g, c => LTX_ESCAPES[c])
    .replace(/℣/g, '\\versicle{}')
    .replace(/℟/g, '\\response{}');
}

/**
 * Strip light iBreviary HTML and convert to LaTeX inline markup.
 * Each line is individually escaped after tag removal.
 */
function htmlToLatex(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div)>/gi, '\n') // Preserve paragraph/div boundaries
    // Catch spans with explicit styles (common when pasting from Word/Browsers)
    .replace(/<span[^>]*style="[^"]*font-weight:\s*(?:bold|700)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00BOLDOPEN\x00$1\x00BOLDCLOSE\x00')
    .replace(/<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00ITOPEN\x00$1\x00ITCLOSE\x00')
    .replace(/<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00ULOPEN\x00$1\x00ULCLOSE\x00')
    // Catch standard tags with any attributes (use space check to avoid matching <br> as <b>)
    .replace(/<strong(?:\s+[^>]*)?>([\s\S]*?)<\/strong>/gi, '\x00BOLDOPEN\x00$1\x00BOLDCLOSE\x00')
    .replace(/<b(?:\s+[^>]*)?>([\s\S]*?)<\/b>/gi, '\x00BOLDOPEN\x00$1\x00BOLDCLOSE\x00')
    .replace(/<em(?:\s+[^>]*)?>([\s\S]*?)<\/em>/gi, '\x00ITOPEN\x00$1\x00ITCLOSE\x00')
    .replace(/<i(?:\s+[^>]*)?>([\s\S]*?)<\/i>/gi, '\x00ITOPEN\x00$1\x00ITCLOSE\x00')
    .replace(/<u(?:\s+[^>]*)?>([\s\S]*?)<\/u>/gi, '\x00ULOPEN\x00$1\x00ULCLOSE\x00')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((line) => guardLeadingBracket(escLtx(line.trim())))
    .filter((line) => line.length > 0)
    .join('\\\\\n')
    .replace(/\x00BOLDOPEN\x00/g, '\\textbf{')
    .replace(/\x00BOLDCLOSE\x00/g, '}')
    .replace(/\x00ITOPEN\x00/g, '\\textit{')
    .replace(/\x00ITCLOSE\x00/g, '}')
    .replace(/\x00ULOPEN\x00/g, '\\underline{')
    .replace(/\x00ULCLOSE\x00/g, '}');
}

/**
 * Mark glyphs as LaTeX, keyed by the rule name the engine puts in data-pt.
 * Mirrors psautier/psalter.sty, which uses a bold '+' and an en dash.
 * Keyed by name rather than by glyph so the exporter does not depend on
 * which Unicode dash the on-screen rendering happens to use.
 */
const LYPS_MARK_LATEX: Record<string, string> = {
  pl:   '+',
  pp:   '++',
  plmi: '+\\textendash',
  mipl: '\\textendash+',
  mi:   '\\textendash',
  mimi: '\\textendash\\textendash',
  dmi:  '=',
};

/**
 * Turn lypsautierant pointing markup into sentinels that survive the HTML
 * strip further down, and become \lypsmark calls in psalmLineToLatex.
 *
 * Without this the mark glyphs — which are real text nodes so CSS can place
 * them — would be stripped to bare text, exporting "of" with a '+' under it
 * as the word "of+".
 *
 * This walks the tags with a stack rather than matching them with a regex:
 * the markup nests (a mark span and a syllable span inside a wrapper span),
 * and a lazy regex stops at the first </span>, which is the inner one. Tags
 * that are not ours are re-emitted verbatim so the generic bold/italic
 * handling below still sees them.
 */
function lypsToSentinels(html: string): string {
  if (!html.includes('lyps-')) return html;

  interface Frame { cls: string; open: string; tag: string; pt?: string; buf: string; marks: string[] }

  const stack: Frame[] = [];
  let out = '';
  const emit = (s: string) => {
    if (stack.length) stack[stack.length - 1].buf += s;
    else out += s;
  };

  const tagRe = /<(\/?)(span|sup)\b([^>]*)>/gi;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(html)) !== null) {
    emit(html.slice(last, m.index));
    last = tagRe.lastIndex;

    if (m[1] !== '/') {
      stack.push({
        cls: /class="([^"]*)"/.exec(m[3])?.[1] ?? '',
        pt: /data-pt="([^"]*)"/.exec(m[3])?.[1],
        open: m[0],
        tag: m[2].toLowerCase(),
        buf: '',
        marks: [],
      });
      continue;
    }

    const frame = stack.pop();
    if (!frame) continue;                    // stray close tag; drop it
    const parent = stack[stack.length - 1];

    switch (frame.cls) {
      case 'lyps-mk':
        // Belongs to the enclosing wrapper and contributes no text. The rule
        // NAME travels in the sentinel, not its LaTeX: escLtx runs between
        // here and lypsSentinelsToLatex and would escape the backslashes.
        if (parent && frame.pt && LYPS_MARK_LATEX[frame.pt]) parent.marks.push(frame.pt);
        break;
      case 'lyps-pt': {
        // Innermost mark first, so the outermost ends up wrapping the rest.
        const body = frame.marks.reduce(
          (acc, mk) => `\u0000LYPSMARK\u0000${acc}\u0000LYPSMID\u0000${mk}\u0000LYPSEND\u0000`,
          frame.buf,
        );
        emit(body);
        break;
      }
      case 'lyps-verse':
        emit(`\u0000LYPSVERSE\u0000${frame.buf}\u0000LYPSEND\u0000`);
        break;
      case 'lyps-rule':
        emit('\u0000LYPSRULE\u0000');
        break;
      case 'lyps-sy':
      case 'lyps-star':
      case 'lyps-divider':
      case 'lyps-flex':
        // Plain text the psalm-line converter already knows how to render.
        emit(frame.buf);
        break;
      default:
        // Not ours — hand it back untouched.
        emit(`${frame.open}${frame.buf}</${frame.tag}>`);
    }
  }

  emit(html.slice(last));
  // Any tag left unclosed: keep its content rather than losing the text.
  while (stack.length) {
    const frame = stack.pop()!;
    const text = frame.cls.startsWith('lyps-') ? frame.buf : `${frame.open}${frame.buf}`;
    if (stack.length) stack[stack.length - 1].buf += text;
    else out += text;
  }
  return out;
}

/**
 * Replace the sentinels left by lypsToSentinels with the real macros. Runs
 * after escLtx, so everything it introduces stays unescaped.
 */
function lypsSentinelsToLatex(latex: string): string {
  return latex
    .replace(/\u0000LYPSMARK\u0000/g, '\\lypsmark{')
    .replace(/\u0000LYPSMID\u0000([a-z]+)\u0000LYPSEND\u0000/g,
             (_m, name: string) => `}{${LYPS_MARK_LATEX[name] ?? ''}}`)
    .replace(/\u0000LYPSVERSE\u0000/g, '\\lypsverse{')
    .replace(/\u0000LYPSEND\u0000/g, '}')
    .replace(/\u0000LYPSRULE\u0000/g, '\\lypsrule{}');
}

/**
 * Guard a line that begins with '[' .
 *
 * Lines are joined with "\\", and LaTeX reads "\\[...]" as the optional
 * vertical-space argument of "\\". A line starting with a bracket therefore
 * gets swallowed and, unless its contents happen to be a valid dimension,
 * fails the build with "Illegal unit of measure" — which is how a psalter
 * verse written "[19]ever blést…" took down a whole document. An empty group
 * stops the optional-argument scan without printing anything.
 */
function guardLeadingBracket(line: string): string {
  return line.startsWith('[') ? `{}${line}` : line;
}

/**
 * Convert one line of psalm text: escape LaTeX, apply pointing markup, psalm markers.
 */
function psalmLineToLatex(line: string): string {
  return guardLeadingBracket(lypsSentinelsToLatex(escLtx(line))
    .replace(/\*/g, '{\\psalmstar}')
    .replace(/†/g, '{\\psalmflex}')
    .replace(/\x00BOLDOPEN\x00/g,  '\\textbf{')
    .replace(/\x00BOLDCLOSE\x00/g, '}')
    .replace(/\x00ITOPEN\x00/g,  '\\textit{')
    .replace(/\x00ITCLOSE\x00/g, '}')
    .replace(/\x00ULOPEN\x00/g,  '\\underline{')
    .replace(/\x00ULCLOSE\x00/g, '}'));
}

/**
 * Psalm text with liturgical pointing.
 * Returns an array of strophes, each being a LaTeX string with \\\ line breaks.
 * Blank lines in content = strophe boundaries.
 */
function psalmToLatexStrophes(content: string): string[] {
  // Convert pointing markup before stripping HTML. Lypsautierant markup goes
  // first: its spans are nested, and the generic span rules below would eat
  // the wrappers and leave the mark glyphs behind as literal text.
  const withPointing = lypsToSentinels(content)
    .replace(/<span[^>]*style="[^"]*font-weight:\s*(?:bold|700)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00BOLDOPEN\x00$1\x00BOLDCLOSE\x00')
    .replace(/<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00ITOPEN\x00$1\x00ITCLOSE\x00')
    .replace(/<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00ULOPEN\x00$1\x00ULCLOSE\x00')
    .replace(/<strong(?:\s+[^>]*)?>([\s\S]*?)<\/strong>/gi, '\x00BOLDOPEN\x00$1\x00BOLDCLOSE\x00')
    .replace(/<b(?:\s+[^>]*)?>([\s\S]*?)<\/b>/gi,           '\x00BOLDOPEN\x00$1\x00BOLDCLOSE\x00')
    .replace(/<em(?:\s+[^>]*)?>([\s\S]*?)<\/em>/gi,         '\x00ITOPEN\x00$1\x00ITCLOSE\x00')
    .replace(/<i(?:\s+[^>]*)?>([\s\S]*?)<\/i>/gi,           '\x00ITOPEN\x00$1\x00ITCLOSE\x00')
    .replace(/<u(?:\s+[^>]*)?>([\s\S]*?)<\/u>/gi,           '\x00ULOPEN\x00$1\x00ULCLOSE\x00');

  const text = withPointing
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');

  // Split on blank lines → strophes
  return text
    .split(/\n{2,}/)
    .map(strophe =>
      strophe
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(psalmLineToLatex)
        .join('\\\\\n')
    )
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

function geometryOptions(size: PaperSize): string {
  switch (size) {
    case 'Letter':     return 'letterpaper, top=1in, bottom=1in, left=1in, right=1in';
    case 'HalfLetter': return 'paperwidth=5.5in, paperheight=8.5in, top=0.75in, bottom=0.75in, left=0.75in, right=0.6in';
    case 'A4':         return 'a4paper, top=25mm, bottom=25mm, left=25mm, right=25mm';
    case 'A5':         return 'a5paper, top=18mm, bottom=18mm, left=18mm, right=15mm';
    default:           return 'letterpaper, top=1in, bottom=1in, left=1in, right=1in';
  }
}

// ---------------------------------------------------------------------------
// Preamble
// ---------------------------------------------------------------------------

/**
 * Base sizes extarticle actually implements. `article` only has 10/11/12 and
 * silently ignores anything else — it warns "Unused global option" and stays
 * at 10pt, so a user setting 13pt got a document that looked untouched. We
 * use extarticle (extsizes, a drop-in for article) and snap to the nearest
 * size it supports, so the setting always does something visible.
 */
const EXTARTICLE_SIZES = [8, 9, 10, 11, 12, 14, 17, 20];

function nearestBaseFontSize(requested: number): number {
  if (!Number.isFinite(requested)) return 12;
  return EXTARTICLE_SIZES.reduce((best, size) =>
    Math.abs(size - requested) < Math.abs(best - requested) ? size : best,
  );
}

function buildPreamble(settings: OfficeSettings): string {
  const geo = geometryOptions(settings.paperSize);
  const fontSize = `${nearestBaseFontSize(settings.baseFontSize)}pt`;

  // Match the names the Typography selector shows (LeftSidebar). Both are
  // installed system-wide here; \IfFontExistsTF below keeps the document
  // building on a machine where they are not.
  const mainFont =
    settings.fontFamily === 'sans' ? 'Inter' : 'EB Garamond';
  const fallbackFont =
    settings.fontFamily === 'sans' ? 'Latin Modern Sans' : 'Latin Modern Roman';

  // Line-height multiplier only — does NOT affect parskip or paragraph spacing
  const baselineStretch =
    settings.lineSpacing === 'tight'   ? '1.0' :
    settings.lineSpacing === 'relaxed' ? '1.35' : '1.15';

  const rubricHex = settings.rubricColor.replace(/^#/, '');

  return `\\documentclass[${fontSize}, final]{extarticle}

% ── Engine ───────────────────────────────────────────────────────────────────
\\usepackage{fontspec}
\\usepackage{graphicx}

% ── Page geometry ────────────────────────────────────────────────────────────
\\usepackage[${geo}]{geometry}

% ── Font ─────────────────────────────────────────────────────────────────────
\\IfFontExistsTF{${mainFont}}{%
  \\setmainfont{${mainFont}}[Ligatures=TeX]%
}{%
  \\setmainfont{${fallbackFont}}[Ligatures=TeX]%
}

% ── Line spacing (baseline only — no parskip magic) ──────────────────────────
\\renewcommand{\\baselinestretch}{${baselineStretch}}

% ── Paragraph control — all spacing is explicit ──────────────────────────────
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\setlength{\\topsep}{0pt}
\\setlength{\\partopsep}{0pt}
\\setlength{\\itemsep}{0pt}
\\setlength{\\parsep}{0pt}

% ── Color ────────────────────────────────────────────────────────────────────
\\usepackage{xcolor}
\\definecolor{rubricred}{HTML}{${rubricHex}}

% ── Gregorian chant ──────────────────────────────────────────────────────────
\\usepackage{gregoriotex}
% Scores are pre-compiled to .gtex before lualatex runs; never shell out.
\\gresetcompilegabc{never}

% ── Section headings ─────────────────────────────────────────────────────────
\\usepackage{titlesec}
% {format}{before-sep}{after-sep}  — all spacing in fixed pt
\\titleformat{\\section}{\\centering\\large\\scshape}{}{0pt}{}
\\titleformat{\\subsection}{\\centering\\normalsize\\itshape}{}{0pt}{}
\\titlespacing*{\\section}{0pt}{10pt}{5pt}
\\titlespacing*{\\subsection}{0pt}{7pt}{3pt}

% ── Liturgical symbols ───────────────────────────────────────────────────────
\\usepackage{xspace}
\\newcommand{\\versicle}{{\\char"2123}\\xspace}
\\newcommand{\\response}{{\\char"211F}\\xspace}
% Psalm mediant (*) and flex (†) — used in prose psalm text outside GABC scores
\\newcommand{\\psalmstar}{\\kern2pt{\\normalfont\\small$*$}\\kern2pt}
\\newcommand{\\psalmflex}{{\\dag}}

% ── Lypsautierant pointing ───────────────────────────────────────────────────
% A small mark set centred UNDERNEATH a syllable, as psautier/psalter.sty does
% with \\oalign. \\vtop takes its baseline from its first box, so the syllable
% stays on the text baseline and the mark hangs below it.
%
% Marks nest — the rules sometimes re-mark an already-marked syllable — so the
% scratch box is set inside a group, keeping it safe under recursion.
\\newbox\\lypsbox
\\newcommand{\\lypsmarkfont}{\\fontsize{5}{5}\\selectfont\\bfseries}
\\newcommand{\\lypsmark}[2]{%
  \\leavevmode
  \\begingroup
  \\setbox\\lypsbox=\\hbox{#1}%
  \\vtop{\\baselineskip=0pt \\lineskip=1pt
    \\copy\\lypsbox
    \\hbox to \\wd\\lypsbox{\\hss\\lypsmarkfont #2\\hss}%
  }%
  \\endgroup
}
% Verse number, set small and raised (psautier/verse.sty sets it in the margin).
\\newcommand{\\lypsverse}[1]{{\\raisebox{1ex}{\\tiny #1}}\\,}
% \\rule{2ex}{.5pt} — a short lengthening stroke after a syllable.
\\newcommand{\\lypsrule}{\\rule{2ex}{.5pt}}

% ── Office vertical rhythm macros ────────────────────────────────────────────
% Use these instead of \\smallskip / \\medskip to keep full control.
\\newcommand{\\officevsm}{\\vspace{3pt}}      % small gap between inline elements
\\newcommand{\\officevmd}{\\vspace{6pt}}      % gap between blocks
\\newcommand{\\officevlg}{\\vspace{10pt}}     % gap before/after major sections

% ── Psalm / hymn verse environment ───────────────────────────────────────────
% A simple indented block with NO extra topsep / parskip.
\\newenvironment{psalmverse}{%
  \\par\\officevsm
  \\begin{list}{}{%
    \\setlength{\\leftmargin}{1.2em}%
    \\setlength{\\rightmargin}{0pt}%
    \\setlength{\\topsep}{0pt}%
    \\setlength{\\partopsep}{0pt}%
    \\setlength{\\itemsep}{0pt}%
    \\setlength{\\parsep}{0pt}%
    \\setlength{\\itemindent}{0pt}%
    \\setlength{\\listparindent}{0pt}%
  }%
  \\item\\relax
}{%
  \\end{list}%
  \\officevsm
}

% ── Misc ─────────────────────────────────────────────────────────────────────
\\pagestyle{plain}
\\hyphenpenalty=9999       % avoid hyphenation in short liturgical lines
\\exhyphenpenalty=9999

\\begin{document}%
`;
}

// ---------------------------------------------------------------------------
// Uploaded score images
// ---------------------------------------------------------------------------

/**
 * Image types both a browser and lualatex's graphicx can handle.
 * SVG and WebP are deliberately absent: a browser shows them happily, so an
 * upload can look fine in the editor and be unusable in the PDF. Those are
 * reported rather than silently dropped.
 */
const LATEX_IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'application/pdf': 'pdf',
};

/**
 * Register a block's uploaded score image as a file to be written alongside
 * the .tex, returning the filename to \\includegraphics.
 *
 * Returns null when the data URI is malformed or of a type lualatex cannot
 * read; the caller then leaves a visible note in the document instead of
 * omitting the score in silence, which is what happened before uploaded
 * images were handled here at all.
 */
function registerImage(
  dataUri: string,
  index: number,
  imageFiles: Record<string, string>,
): string | null {
  // [\s\S] rather than the /s flag: the tsconfig target is ES2017.
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(dataUri.trim());
  if (!m) return null;
  const ext = LATEX_IMAGE_EXT[m[1].toLowerCase()];
  if (!ext) return null;

  const filename = `score-${index}.${ext}`;
  imageFiles[filename] = m[2];
  return filename;
}

// ---------------------------------------------------------------------------
// Block rendering
// ---------------------------------------------------------------------------

function renderBlock(
  block: Block,
  gabcIndex: { count: number },
  gabcFiles: Record<string, string>,
  imageFiles: Record<string, string>,
  centerRubric = false,
): string {
  const out: string[] = [];

  // An uploaded score image replaces the engraved GABC score but not the
  // block's own text, matching the editor: BlockEditor renders EditableText,
  // then hides GabcRenderer when musicDataUri is set and shows the image
  // instead (with print:w-full, so it is meant to print). Nothing read
  // musicDataUri here before, so a scanned score showed in the preview and in
  // browser print and then vanished from the server PDF.
  if (block.musicDataUri) {
    const withoutImage = { ...block, musicDataUri: undefined, gabcScore: undefined };
    const body = renderBlock(withoutImage, gabcIndex, gabcFiles, imageFiles, centerRubric);
    const filename = registerImage(block.musicDataUri, gabcIndex.count++, imageFiles);
    const figure = filename
      ? `\\noindent\\includegraphics[width=\\linewidth]{${filename}}\\par`
      : '{\\color{rubricred}\\itshape\\noindent ' +
        '[uploaded score image omitted: only PNG, JPEG and PDF can be typeset]}\\par';
    return `${body}\n${figure}`;
  }

  switch (block.type) {

    case 'heading':
      out.push(`\\officevlg\n\\section*{${escLtx(block.content)}}`);
      break;

    case 'subheading':
      out.push(`\\officevmd\n\\subsection*{${escLtx(block.content)}}`);
      break;

    case 'rubric':
      out.push(`\\officevsm\n{\\color{rubricred}\\itshape${centerRubric ? '\\centering' : '\\noindent'} ${htmlToLatex(block.content)}\\par}`);
      break;

    case 'text':
      out.push(`\\officevmd\n\\noindent ${htmlToLatex(block.content)}\\par`);
      break;

    case 'hymn': {
      out.push('\\officevmd');
      if (block.gabcScore) {
        const idx = gabcIndex.count++;
        const gabcFilename = `hymn-${idx}.gabc`;
        const title = block.content.split(/[\n<]/)[0].slice(0, 60).replace(/[^a-zA-Z0-9 ]/g, '').trim();
        gabcFiles[gabcFilename] = buildGabcFile(title || `Hymn ${idx}`, block.gabcScore);
        out.push(`\\gregorioscore{hymn-${idx}.gtex}`);
        if (block.content) {
          out.push(`\\officevsm\n\\begin{center}\\itshape\\small ${htmlToLatex(block.content)}\\end{center}\\par`);
        }
      } else {
        const stanzas = block.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .split(/\n{2,}/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stanza of stanzas) {
          const lines = stanza.split('\n').map((l) => escLtx(l.trim())).filter(Boolean);
          out.push(`\\begin{psalmverse}\n${lines.join('\\\\\n')}\n\\end{psalmverse}`);
          out.push('\\officevsm');
        }
      }
      break;
    }

    case 'psalm': {
      const strophes = psalmToLatexStrophes(block.content);
      out.push('\\officevmd');
      for (const strophe of strophes) {
        out.push(`\\begin{psalmverse}\n${strophe}\n\\end{psalmverse}`);
        out.push('\\officevsm');
      }
      break;
    }

    case 'psalm-prayer':
      out.push(`\\officevsm\n{\\itshape\\noindent ${htmlToLatex(block.content)}}\\par`);
      break;

    case 'invitatory-antiphon':
    case 'antiphon': {
      out.push('\\officevmd');

      if (block.gabcScore) {
        const idx = gabcIndex.count++;
        const gabcFilename = `antiphon-${idx}.gabc`;
        const title = block.content.split(/[\n<]/)[0].slice(0, 60)
          .replace(/[^a-zA-Z0-9 ]/g, '').trim();
        gabcFiles[gabcFilename] = buildGabcFile(title || `Antiphon ${idx}`, block.gabcScore);
        // Reference the pre-compiled .gtex file directly
        out.push(`\\gregorioscore{antiphon-${idx}.gtex}`);
        if (block.content) {
          out.push(`\\officevsm\n\\begin{center}\\itshape\\small ${htmlToLatex(block.content)}\\end{center}\\par`);
        }
      } else {
        const text = htmlToLatex(block.content);
        out.push(`\\noindent{\\itshape Ant.\\enspace ${text}}\\par`);
      }
      out.push('\\officevsm');
      break;
    }

    case 'page-break':
      out.push('\\newpage');
      break;

    default:
      out.push(`\\officevmd\n\\noindent ${htmlToLatex(block.content)}\\par`);
  }

  return out.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// GABC file builder
// ---------------------------------------------------------------------------

/**
 * Wrap raw GABC notation in a proper .gabc file.
 * Preserves annotation: and other headers if already present.
 */
function buildGabcFile(name: string, rawGabc: string): string {
  const sepIndex = rawGabc.indexOf('%%');
  let annotation = '';
  let body = rawGabc.trim();
  if (sepIndex !== -1) {
    const headers = rawGabc.slice(0, sepIndex);
    const annMatch = headers.match(/annotation:\s*([^;\n]+);/);
    if (annMatch) annotation = annMatch[1].trim();
    body = rawGabc.slice(sepIndex + 2).trim();
  }
  const annLine = annotation ? `annotation: ${annotation};\n` : '';
  return `name: ${name.replace(/[;]/g, ',')};
gabc-copyright: ;
${annLine}score-copyright: ;
%%
${body}
`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function buildLatexDocument(blocks: Block[], settings: OfficeSettings): RenderedDocument {
  const gabcFiles: Record<string, string> = {};
  const imageFiles: Record<string, string> = {};
  const gabcIndex = { count: 0 };

  const preamble = buildPreamble(settings);

  const bodyParts: string[] = [];
  for (let i = 0; i < blocks.length; i++) {
    // Attribution rubrics (Tune:, Text:, …) are dropped when the hymn they
    // belong to already carries a GABC score. Shared with the preview so the
    // two cannot diverge — see lib/blocks.ts.
    if (isSuppressedAttribution(blocks, i)) continue;
    bodyParts.push(renderBlock(blocks[i], gabcIndex, gabcFiles, imageFiles, isPsalmRubric(blocks, i)));
  }

  const texContent = preamble + '\n' + bodyParts.join('\n') + '\n\\end{document}\n';

  return { texContent, gabcFiles, imageFiles };
}
