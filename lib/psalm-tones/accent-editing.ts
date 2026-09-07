/**
 * accent-editing.ts — the accented psalm text as something you can click on.
 *
 * The lypsautierant english and gregorian tones find their stresses by reading
 * acute accents. accentuateEnglish puts them on office text that has none, and
 * gets about 92% of words right — so the wrong ones have to be correctable,
 * and "type an á" is not a correction anyone can make on a US keyboard.
 *
 * So the accents are shown as syllables to click. This module is the pure part
 * of that: it cuts the text into words and syllables, says which syllable each
 * word's acute sits on, and writes a moved accent back into the text without
 * disturbing anything else. No React, no DOM, and no rule tables — it runs in
 * the browser, which is where the clicking happens.
 *
 * The syllables are englishPhoneticSyllabify's, the same division
 * ENGLISH_STRESS is numbered against. lypsautierant divides the text again its
 * own way (sedsyllables) before pointing it, and the two do not always agree —
 * but the acute is written onto a *letter*, so whichever syllable lypsautierant
 * decides that letter belongs to is the one that gets the mark. Clicking never
 * lands the accent on a different vowel than the one shown.
 */

import {
  englishPhoneticSyllabify,
  setWordAccent,
  stripWordAccents,
  wordAccentIndex,
} from './english-phonetic';

/** Letters, apostrophes and acutes: a word. Everything else is a gap. */
const WORD_RE = /[A-Za-z'’áéíóúýÁÉÍÓÚÝ]+/g;

export interface AccentGap {
  kind: 'gap';
  /** Spaces, punctuation, verse numbers, the `*` and `†` markers. */
  text: string;
}

export interface AccentWord {
  kind: 'word';
  text: string;
  /**
   * Its syllables, as drawn and as clicked — carrying the acute where the
   * word carries it, so what is drawn is the letter that will be marked.
   * An accent does not change a word's length, so these are the plain
   * division's lengths applied to the accented word, and the indices are the
   * same ones setAccentAt takes.
   */
  syllables: string[];
  /** Which syllable carries the acute, or -1 for a word the cadence passes over. */
  accent: number;
  /** Position within its line, for addressing a click back to the text. */
  index: number;
}

export type AccentToken = AccentGap | AccentWord;

/**
 * Cut accented psalm text into lines of clickable tokens.
 *
 * The tokens cover the line exactly — joining their `text` back together
 * reproduces it — so nothing in the psalm is lost by being drawn.
 */
export function parseAccentLines(text: string): AccentToken[][] {
  return text.split('\n').map(line => {
    const tokens: AccentToken[] = [];
    let last = 0;
    let index = 0;

    for (const m of line.matchAll(WORD_RE)) {
      if (m.index > last) tokens.push({ kind: 'gap', text: line.slice(last, m.index) });
      const word = m[0];
      const plain = englishPhoneticSyllabify(stripWordAccents(word));
      const syllables: string[] = [];
      for (let at = 0, i = 0; i < plain.length; i++) {
        syllables.push(word.slice(at, at + plain[i].length));
        at += plain[i].length;
      }
      tokens.push({
        kind: 'word',
        text: word,
        syllables,
        accent: wordAccentIndex(word),
        index: index++,
      });
      last = m.index + word.length;
    }
    if (last < line.length) tokens.push({ kind: 'gap', text: line.slice(last) });
    return tokens;
  });
}

/**
 * Move one word's accent, and give back the whole text.
 *
 * `syllable` is null to take the accent off — which is how you tell the tone
 * to pass the word over, the thing the stress dictionary gets wrong when it
 * accents a word the phrase does not stress.
 *
 * Out-of-range addresses return the text unchanged rather than throwing: the
 * caller is a click handler holding indices from a render that may be stale.
 */
export function setAccentAt(
  text: string,
  line: number,
  word: number,
  syllable: number | null,
): string {
  const lines = text.split('\n');
  if (line < 0 || line >= lines.length) return text;

  let seen = 0;
  let changed = false;
  const rewritten = lines[line].replace(WORD_RE, (w) => {
    if (seen++ !== word) return w;
    changed = true;
    return setWordAccent(w, syllable);
  });
  if (!changed) return text;

  lines[line] = rewritten;
  return lines.join('\n');
}

/** How many words in the line carry an accent — two or three, in psalmody. */
export function countAccents(tokens: AccentToken[]): number {
  return tokens.filter(t => t.kind === 'word' && t.accent >= 0).length;
}
