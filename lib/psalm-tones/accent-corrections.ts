/**
 * accent-corrections.ts — the accent editor's corrections, kept.
 *
 * accentuateEnglish gets about 92% of words right, and the accent editor is
 * how the rest get fixed. Until now a fix lived on the block and nowhere else:
 * reload the page and every click was gone, and the same psalm came round again
 * on the four-week cycle needing the same corrections.
 *
 * So they are saved, in two layers, and this module is the pure part of both:
 *
 * - **The text layer** keeps the corrected text whole, matched by the psalm's
 *   own words. Reopen that psalm and the accents come back exactly as they were
 *   left — including a word deliberately passed over, which is a fact about one
 *   line's cadence and not about the word.
 * - **The word layer** keeps `word → syllable` for the accents that were moved,
 *   and accentuateEnglish reads it ahead of the dictionary. That is what fixes
 *   a psalm nobody has opened yet. ENGLISH_STRESS was read off the Revised
 *   Grail, so a word that psalter does not use falls to the penult rule and
 *   can fall wrong — "multítude" for MUL-ti-tude. Correct it once and every
 *   psalm containing it is accented right the first time.
 *
 * Only a *moved* accent teaches the word layer. Unaccenting a word is left to
 * the text layer alone: a cadence that has to pass over "God" in one line says
 * nothing about "God" anywhere else, and a word list that learned it would
 * quietly unaccent the whole psalter.
 *
 * The store is JSON on disk (`data/accent-corrections.json`) — the user's own
 * editorial work, in the repository where it can be read and diffed. Nothing
 * here touches the filesystem; `app/api/accents/route.ts` does the I/O and this
 * module runs in the browser too, which is where the clicking happens.
 */

import {
  dictionaryAccentIndex,
  stressKey,
  stripWordAccents,
  wordAccentIndex,
} from './english-phonetic';

/** Letters, apostrophes and acutes: a word. The same class the editor cuts on. */
const WORD_RE = /[A-Za-z'’áéíóúýÁÉÍÓÚÝ]+/g;

/** One corrected text, as the accent editor left it. */
export interface SavedText {
  /** The accented text, whole. What is handed back when this text is met again. */
  accents: string;
  /** Which psalm it is — for reading the file. Never used for matching. */
  label?: string;
  /** ISO date of the last save. */
  updated: string;
}

/** Everything the accent editor has been taught, as it sits on disk. */
export interface AccentCorrections {
  version: 1;
  /** `stressKey(word)` → the syllable that carries the acute. */
  words: Record<string, number>;
  /** Corrected texts, matched by `accentTextKey` of their own accents. */
  texts: SavedText[];
}

/** An empty store, frozen: it is also the client's snapshot before the fetch lands. */
export const EMPTY_CORRECTIONS: AccentCorrections = Object.freeze({
  version: 1 as const,
  words: Object.freeze({}) as Record<string, number>,
  texts: Object.freeze([]) as unknown as SavedText[],
});

/**
 * The form a psalm text is matched under.
 *
 * The accents themselves are taken off, so a text and its corrected self
 * answer to the same key — that is the whole trick: the block holds the plain
 * psalm and the store holds the accented one. Whitespace is collapsed and the
 * curly apostrophe folded, so the same text refetched matches even if a
 * source's spacing shifts.
 *
 * Verse numbers and the `*` and `†` markers are kept. Two texts that differ by
 * a printed verse number are not the same text to hand back — the saved copy
 * would put the numbers back into a psalm the user had stripped them from.
 */
export function accentTextKey(text: string): string {
  return stripWordAccents(text.normalize('NFC'))
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** The saved accents for this text, or null if it has never been corrected. */
export function findSavedAccents(
  store: AccentCorrections,
  text: string,
): SavedText | null {
  const key = accentTextKey(text);
  return store.texts.find(t => accentTextKey(t.accents) === key) ?? null;
}

/**
 * Put this corrected text in the store, replacing any earlier correction of
 * the same psalm rather than stacking another copy beside it.
 */
export function saveTextAccents(
  store: AccentCorrections,
  accents: string,
  label?: string,
  now: Date = new Date(),
): AccentCorrections {
  const key = accentTextKey(accents);
  const entry: SavedText = {
    accents,
    ...(label ? { label } : {}),
    updated: now.toISOString().slice(0, 10),
  };
  const texts = store.texts.filter(t => accentTextKey(t.accents) !== key);
  texts.push(entry);
  return { ...store, texts };
}

/** Drop the saved correction of this text. The word layer is left alone. */
export function forgetTextAccents(
  store: AccentCorrections,
  text: string,
): AccentCorrections {
  const key = accentTextKey(text);
  return { ...store, texts: store.texts.filter(t => accentTextKey(t.accents) !== key) };
}

/**
 * What one corrected text has to say about word stress.
 *
 * A syllable index is an override to keep; `null` says to keep none — either
 * the correction agrees with the dictionary again (the accent was moved back)
 * or this very text accents the word two different ways, in which case its
 * stress is not the lexical fact an override claims it is.
 *
 * Only accented occurrences are counted. A word passed over in one line and
 * accented in another is not in disagreement with itself: the unaccented one
 * is that line's cadence, and the text layer is what remembers it.
 *
 * Words the dictionary passes over entirely (ENGLISH_RARELY_ACCENTED) teach
 * nothing here even when accented — "of" carrying a cadence in one verse must
 * not become an accented word everywhere.
 */
export function learnWordAccents(accented: string): Map<string, number | null> {
  const positions = new Map<string, Set<number>>();

  for (const m of accented.matchAll(WORD_RE)) {
    const word = m[0];
    const key = stressKey(word);
    if (!/[a-z]/.test(key)) continue;
    const at = wordAccentIndex(word);
    if (at < 0) continue;
    const seen = positions.get(key);
    if (seen) seen.add(at);
    else positions.set(key, new Set([at]));
  }

  const learned = new Map<string, number | null>();
  for (const [key, at] of positions) {
    const dictionary = dictionaryAccentIndex(key);
    if (dictionary < 0) continue;
    if (at.size > 1) { learned.set(key, null); continue; }
    const only = [...at][0];
    learned.set(key, only === dictionary ? null : only);
  }
  return learned;
}

/** Apply what a text taught: set the overrides it moved, drop the ones it undid. */
export function mergeWordAccents(
  store: AccentCorrections,
  learned: Map<string, number | null>,
): AccentCorrections {
  const words = { ...store.words };
  for (const [key, at] of learned) {
    if (at === null) delete words[key];
    else words[key] = at;
  }
  return { ...store, words };
}

/** The word layer in the form accentuateEnglish reads. */
export function wordAccentMap(store: AccentCorrections): ReadonlyMap<string, number> {
  return new Map(Object.entries(store.words));
}

/**
 * Read a store out of untrusted JSON — the file on disk, or a request body.
 *
 * Anything malformed is dropped rather than thrown over: a hand-edit that put
 * one bad entry in the file must not take the whole editor down with it.
 */
export function parseCorrections(value: unknown): AccentCorrections {
  if (!value || typeof value !== 'object') return EMPTY_CORRECTIONS;
  const raw = value as { words?: unknown; texts?: unknown };

  const words: Record<string, number> = {};
  if (raw.words && typeof raw.words === 'object') {
    for (const [key, at] of Object.entries(raw.words as Record<string, unknown>)) {
      if (typeof at === 'number' && Number.isInteger(at) && at >= 0) words[key] = at;
    }
  }

  const texts: SavedText[] = [];
  if (Array.isArray(raw.texts)) {
    for (const entry of raw.texts) {
      if (!entry || typeof entry !== 'object') continue;
      const { accents, label, updated } = entry as Record<string, unknown>;
      if (typeof accents !== 'string' || !accents.trim()) continue;
      texts.push({
        accents,
        ...(typeof label === 'string' && label ? { label } : {}),
        updated: typeof updated === 'string' ? updated : '',
      });
    }
  }

  return { version: 1, words, texts };
}
