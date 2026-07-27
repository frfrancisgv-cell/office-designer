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

import { Block, OfficeSettings, PaperSize } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RenderedDocument {
  texContent: string;
  /** Map of filename (e.g. "antiphon-3.gabc") → gabc file contents */
  gabcFiles: Record<string, string>;
}

// ---------------------------------------------------------------------------
// LaTeX escape helpers
// ---------------------------------------------------------------------------

/**
 * Escape LaTeX special characters. Preserves UTF-8 (LuaLaTeX + fontspec).
 */
function escLtx(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
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
    .replace(/<span[^>]*style="[^"]*font-weight:\s*(?:bold|700)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00BOLD_OPEN\x00$1\x00BOLD_CLOSE\x00')
    .replace(/<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00IT_OPEN\x00$1\x00IT_CLOSE\x00')
    .replace(/<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00UL_OPEN\x00$1\x00UL_CLOSE\x00')
    // Catch standard tags with any attributes (use space check to avoid matching <br> as <b>)
    .replace(/<strong(?:\s+[^>]*)?>([\s\S]*?)<\/strong>/gi, '\x00BOLD_OPEN\x00$1\x00BOLD_CLOSE\x00')
    .replace(/<b(?:\s+[^>]*)?>([\s\S]*?)<\/b>/gi, '\x00BOLD_OPEN\x00$1\x00BOLD_CLOSE\x00')
    .replace(/<em(?:\s+[^>]*)?>([\s\S]*?)<\/em>/gi, '\x00IT_OPEN\x00$1\x00IT_CLOSE\x00')
    .replace(/<i(?:\s+[^>]*)?>([\s\S]*?)<\/i>/gi, '\x00IT_OPEN\x00$1\x00IT_CLOSE\x00')
    .replace(/<u(?:\s+[^>]*)?>([\s\S]*?)<\/u>/gi, '\x00UL_OPEN\x00$1\x00UL_CLOSE\x00')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((line) => escLtx(line.trim()))
    .filter((line) => line.length > 0)
    .join('\\\\\n')
    .replace(/\x00BOLD_OPEN\x00/g, '\\textbf{')
    .replace(/\x00BOLD_CLOSE\x00/g, '}')
    .replace(/\x00IT_OPEN\x00/g, '\\textit{')
    .replace(/\x00IT_CLOSE\x00/g, '}')
    .replace(/\x00UL_OPEN\x00/g, '\\underline{')
    .replace(/\x00UL_CLOSE\x00/g, '}');
}

/**
 * Convert one line of psalm text: escape LaTeX, apply pointing markup, psalm markers.
 */
function psalmLineToLatex(line: string): string {
  return escLtx(line)
    .replace(/\*/g, '{\\psalmstar}')
    .replace(/†/g, '{\\psalmflex}')
    .replace(/\x00BOLD_OPEN\x00/g,  '\\textbf{')
    .replace(/\x00BOLD_CLOSE\x00/g, '}')
    .replace(/\x00IT_OPEN\x00/g,  '\\textit{')
    .replace(/\x00IT_CLOSE\x00/g, '}')
    .replace(/\x00UL_OPEN\x00/g,  '\\underline{')
    .replace(/\x00UL_CLOSE\x00/g, '}');
}

/**
 * Psalm text with liturgical pointing.
 * Returns an array of strophes, each being a LaTeX string with \\\ line breaks.
 * Blank lines in content = strophe boundaries.
 */
function psalmToLatexStrophes(content: string): string[] {
  // Convert pointing markup before stripping HTML
  const withPointing = content
    .replace(/<span[^>]*style="[^"]*font-weight:\s*(?:bold|700)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00BOLD_OPEN\x00$1\x00BOLD_CLOSE\x00')
    .replace(/<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00IT_OPEN\x00$1\x00IT_CLOSE\x00')
    .replace(/<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '\x00UL_OPEN\x00$1\x00UL_CLOSE\x00')
    .replace(/<strong(?:\s+[^>]*)?>([\s\S]*?)<\/strong>/gi, '\x00BOLD_OPEN\x00$1\x00BOLD_CLOSE\x00')
    .replace(/<b(?:\s+[^>]*)?>([\s\S]*?)<\/b>/gi,           '\x00BOLD_OPEN\x00$1\x00BOLD_CLOSE\x00')
    .replace(/<em(?:\s+[^>]*)?>([\s\S]*?)<\/em>/gi,         '\x00IT_OPEN\x00$1\x00IT_CLOSE\x00')
    .replace(/<i(?:\s+[^>]*)?>([\s\S]*?)<\/i>/gi,           '\x00IT_OPEN\x00$1\x00IT_CLOSE\x00')
    .replace(/<u(?:\s+[^>]*)?>([\s\S]*?)<\/u>/gi,           '\x00UL_OPEN\x00$1\x00UL_CLOSE\x00');

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

// Keep single-string version for backward compat
function psalmToLatex(content: string): string {
  return psalmToLatexStrophes(content).join('\\\\\n');
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

function buildPreamble(settings: OfficeSettings): string {
  const geo = geometryOptions(settings.paperSize);
  const fontSize = `${settings.baseFontSize}pt`;

  const mainFont =
    settings.fontFamily === 'sans' ? 'Latin Modern Sans' : 'Linux Libertine O';
  const fallbackFont =
    settings.fontFamily === 'sans' ? 'Latin Modern Sans' : 'Latin Modern Roman';

  // Line-height multiplier only — does NOT affect parskip or paragraph spacing
  const baselineStretch =
    settings.lineSpacing === 'tight'   ? '1.0' :
    settings.lineSpacing === 'relaxed' ? '1.35' : '1.15';

  const rubricHex = settings.rubricColor.replace(/^#/, '');

  return `\\documentclass[${fontSize}, final]{article}

% ── Engine ───────────────────────────────────────────────────────────────────
\\usepackage{fontspec}

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
// Block rendering
// ---------------------------------------------------------------------------

function renderBlock(
  block: Block,
  gabcIndex: { count: number },
  gabcFiles: Record<string, string>,
): string {
  const out: string[] = [];

  switch (block.type) {

    case 'heading':
      out.push(`\\officevlg\n\\section*{${escLtx(block.content)}}`);
      break;

    case 'subheading':
      out.push(`\\officevmd\n\\subsection*{${escLtx(block.content)}}`);
      break;

    case 'rubric':
      out.push(`\\officevsm\n{\\color{rubricred}\\itshape\\noindent ${htmlToLatex(block.content)}}\\par`);
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
  const gabcIndex = { count: 0 };

  const preamble = buildPreamble(settings);

  // Track whether the previous block was a hymn with a GABC score so we can
  // suppress its attribution rubric lines (Tune:, Text:, Music:, etc.)
  const ATTRIBUTION_RE = /^(Tune|Text|Music|Mode|Melody|Copyright):/i;
  let lastBlockWasScoredHymn = false;

  const bodyParts: string[] = [];
  for (const block of blocks) {
    const isAttrib = block.type === 'rubric' && ATTRIBUTION_RE.test(block.content);
    if (isAttrib && lastBlockWasScoredHymn) {
      // Skip attribution lines that follow a GABC-scored hymn
      continue;
    }
    lastBlockWasScoredHymn = block.type === 'hymn' && !!block.gabcScore;
    bodyParts.push(renderBlock(block, gabcIndex, gabcFiles));
  }

  const texContent = preamble + '\n' + bodyParts.join('\n') + '\n\\end{document}\n';

  return { texContent, gabcFiles };
}

