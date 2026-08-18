/**
 * lypsautierant-engine.ts
 *
 * Applies a lypsautierant mode+variation to psalm text.
 * Handles syllabification, hemistich splitting, and output in both
 * HTML (simplified bold/italic for screen) and LaTeX (for PDF export).
 *
 * For accent-aware families (english/gregorian), the text should
 * already contain acute accent marks on stressed syllables (e.g.
 * from the pre-accented Grail psalter text loaded via "Lypsautierant (EN)").
 */

import { englishPhoneticSyllabify } from './english-phonetic';
import {
  applyMode,
  getVariations,
  getModeNames,
  toHtml,
  toLatex,
  ModeFamily,
  ModeName,
  MarkedSyllable,
} from './lypsautierant-modes';

export type { ModeFamily, ModeName };
export { getVariations, getModeNames };

export interface LypsautierantResult {
  /** HTML string for on-screen display (bold=pl, italic=mi) */
  html: string;
  /** LaTeX string for PDF export (\pl{}, \mi{}, etc.) */
  latex: string;
}

/**
 * Split a word into syllables using the English syllabifier.
 * Returns an array of syllable strings (no hyphens).
 */
function syllabifyToArray(word: string): string[] {
  // Strip punctuation for syllabification, but re-attach to last syllable
  const leading = word.match(/^[^a-zA-ZáéíóúýÁÉÍÓÚÝ]*/)?.[0] ?? '';
  const trailing = word.match(/[^a-zA-ZáéíóúýÁÉÍÓÚÝ]*$/)?.[0] ?? '';
  const core = word.slice(leading.length, word.length - trailing.length);
  if (!core) return word ? [word] : [];

  // englishPhoneticSyllabify returns string[] e.g. ["Glo","ri","fy"]
  const parts = englishPhoneticSyllabify(core);

  // Re-attach leading/trailing punctuation
  if (parts.length === 0) return [word];
  parts[0] = leading + parts[0];
  parts[parts.length - 1] = parts[parts.length - 1] + trailing;
  return parts;
}

/**
 * Convert a hemistich (plain text, no HTML) into syllable array.
 * Words separated by spaces; each word is broken into syllables.
 */
function hemisticToSyllables(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const syls: string[] = [];
  for (const word of words) {
    if (!word) continue;
    const wordSyls = syllabifyToArray(word);
    syls.push(...wordSyls);
  }
  return syls;
}

/**
 * Apply lypsautierant pointing to a full psalm verse line.
 *
 * A verse is split at '*' into first half (reciting tone) and second half (termination).
 * If no '*', the whole line is treated as the termination.
 *
 * @param line        Plain-text verse line (may contain acute accents for accent-aware families)
 * @param family      Mode family
 * @param mode        Mode name
 * @param firstVar    Variation for the first half (typically 'first')
 * @param secondVar   Variation for the second half (e.g. 'a', 'b', 'a_prime')
 */
function pointLine(
  line: string,
  family: ModeFamily,
  mode: ModeName,
  firstVar: string,
  secondVar: string,
): { html: string; latex: string } {
  const starIdx = line.indexOf('*');
  let firstHalf = '';
  let secondHalf = line.trim();
  let hasStar = false;

  if (starIdx !== -1) {
    firstHalf = line.slice(0, starIdx).trim();
    secondHalf = line.slice(starIdx + 1).trim();
    hasStar = true;
  }

  function applyHalf(text: string, variation: string): MarkedSyllable[] {
    const syls = hemisticToSyllables(text);
    return applyMode(family, mode, variation, syls);
  }

  if (hasStar) {
    const first = applyHalf(firstHalf, firstVar);
    const second = applyHalf(secondHalf, secondVar);
    return {
      html:  toHtml(first)  + ' * ' + toHtml(second),
      latex: toLatex(first) + ' * ' + toLatex(second),
    };
  } else {
    const second = applyHalf(secondHalf, secondVar);
    return {
      html:  toHtml(second),
      latex: toLatex(second),
    };
  }
}

/**
 * Apply lypsautierant pointing to a full psalm text block.
 *
 * Lines ending with '!' are flex cadences (use 'flex' variation for the half before '!').
 * Blank lines are preserved as stanza breaks.
 *
 * @param text        The psalm text (may be pre-accented for accent-aware families)
 * @param family      'modes'|'french'|'english'|'gregorian'
 * @param mode        'one'|'two'|...|'peregrinus'
 * @param variation   Termination variation ('a'|'b'|'a_prime'|etc.)
 */
export function pointPsalmText(
  text: string,
  family: ModeFamily,
  mode: ModeName,
  variation: string,
): LypsautierantResult {
  const lines = text.split('\n');
  const htmlLines: string[] = [];
  const latexLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Blank line = stanza break
    if (!line.trim()) {
      htmlLines.push('');
      latexLines.push('');
      continue;
    }

    // Detect flex (!) — applies 'flex' variation to the line ending with !
    const isFlex = line.endsWith('!');
    const cleanLine = isFlex ? line.slice(0, -1).trimEnd() : line;

    const termVar = isFlex ? 'flex' : variation;

    const result = pointLine(cleanLine, family, mode, 'first', termVar);
    htmlLines.push(result.html + (isFlex ? ' <sup>†</sup>' : ''));
    latexLines.push(result.latex + (isFlex ? '\\flagflex{\\dag}' : ''));
  }

  return {
    html:  htmlLines.join('\n'),
    latex: latexLines.join('\n'),
  };
}
