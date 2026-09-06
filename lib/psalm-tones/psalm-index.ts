/**
 * Psalm text index for the lypsautierant collection.
 *
 * Reads plain-text psalm files with acute-accent stress markings:
 *   é á í ó ú on stressed vowels (e.g. "Bléssed", "mán")
 *
 * Collections:
 *   revisedGrailPsalter/  — Psalm N (Revised Grail psalms)
 *   theAbbeyPsalmsAndCanticles/ — OT N, NT N (Abbey canticles)
 *
 * File shape, which the parser below relies on and which was verified across
 * every file in both collections:
 *
 *   Psalm 116B          ← optional heading line, alone in its own block
 *                       ← blank line
 *   10 first verse…     ← a strophe: one or more verses, no blank line inside
 *   second line of 10
 *   11 next verse…
 *                       ← blank line separates strophes
 *   12 …
 *
 *   Glóry to the Fáther…← the doxology, always the last block, always its own
 *
 * The blank lines are the strophes, and the strophes are what gets sung, so
 * they are carried through parsing as `strophe` and put back by `render`.
 *
 * The index is built once at module load time (server-side only).
 */

import fs from 'fs';
import path from 'path';

export type PsalmCollection = 'grail' | 'abbey';

export interface PsalmVerse {
  num: number;           // verse number as printed ("11:17" and "1b" both count)
  text: string;          // the verse's own lines, joined with '\n', label stripped
  strophe: number;       // index of the blank-line-separated block it belongs to
}

export interface PsalmEntry {
  key: string;           // e.g. "psalm-1", "ot-3", "nt-2"
  source: PsalmCollection;
  title: string;         // original file name
  heading: string;       // the file's own heading line, e.g. "Psalm 116B" ('' if none)
  rawText: string;       // full text as stored, with stress marks
  verses: PsalmVerse[];  // individual verse texts (may span multiple lines)
  doxology: string;      // The Glory Be
}

type PsalmIndex = Map<string, PsalmEntry>;

// ─── Build the index ──────────────────────────────────────────────────────────

// vendor/psautier, not the lypsautierant submodule: this is read on every
// request, and a clone without --recurse-submodules must still serve psalms.
// See vendor/psautier/VENDORED.md.
const LYPSAUTIER_ROOT = path.join(process.cwd(), 'vendor', 'psautier');
const GRAIL_DIR = path.join(LYPSAUTIER_ROOT, 'revisedGrailPsalter');
const ABBEY_DIR = path.join(LYPSAUTIER_ROOT, 'theAbbeyPsalmsAndCanticles');

let _index: PsalmIndex | null = null;

function normaliseKey(filename: string): string {
  // "Psalm 1" → "psalm-1"
  // "Psalm 116A" → "psalm-116a"
  // "Psalm 119.1-8" → "psalm-119.1-8"
  // "OT 3" → "ot-3"
  // "NT 12" → "nt-12"
  return filename.toLowerCase().replace(/\s+/g, '-');
}

// A verse label: "10 ", "1b " (Abbey's part-verses), "11:17 " (Abbey's
// chapter:verse canticle references). The captured number is the *verse*, so
// "11:17" is verse 17 — a chapter number is not something a range asks for.
//
// Two more shapes were text rather than labels until this matched them, so
// their digits were syllabified as words — every mark on the line shifted —
// and no verse range reached them:
//
//   "[14] Blést be the Lórd"  Psalms 41, 72 and 106, after the portion
//   "[18]Blést be the Lórd"   divider, sometimes with no space at all;
//   "6Your ríght hand"        OT 2 and OT 15, the space simply missing.
//
// The unspaced bare form is admitted only before a capital, so that the "b"
// of a part-verse "12b" is never mistaken for the start of a word.
const VERSE_LABEL = /^(?:(?:\d+:)?(\d+)[a-z]?\s+|\[(?:\d+:)?(\d+)[a-z]?\]\s*|(?:\d+:)?(\d+)(?=[A-ZÁÉÍÓÚ]))(\S.*)$/;

// A heading is the file naming itself — "Psalm 116B", "Psalm 119:1-8", "OT 2" —
// alone on its block's only line. Anything else in first place is text of the
// canticle, whatever becomes of it later: NT 12 opens on "Allelúia!" and NT 7
// on a response, and neither names the piece.
const HEADING = /^(?:Psalm|Canticle|OT|NT)\s+[\d.:A-Za-z-]+(?:\s+[A-Z])?$/i;

/**
 * The Hebrew *Hallelujah* that heads or closes fifteen of the Grail psalms,
 * standing alone in a strophe of its own.
 *
 * It is a superscription, not a verse, and the office does not sing it. The
 * psalter of the Liturgy of the Hours drops it: `jgabc-psalms/NovaVulgata.txt`
 * — the office's own Latin psalter, Psalm 111 (110) and the rest of the Hallel
 * included — has not one "alleluia" in all 150 psalms. The Grail files keep it
 * because the psautier prints the psalter, not the office, and the two
 * languages have disagreed here ever since.
 *
 * Left in, it is worse than a stray word. A strophe of one line takes a slot
 * in the mediant/termination alternation that runs the length of the psalm, so
 * every hemistich after it is pointed backwards: the eight psalms that open on
 * one were mispointed from their first line to their last, and the ten that
 * close on one had their Glory Be inverted.
 *
 * Only a strophe that is *nothing but* the Alleluia goes. NT 12, the canticle
 * of Revelation 19, opens each of its strophes with an "Allelúia!" that is the
 * response and is sung; it stands with the two lines of its verse, never
 * alone, and is left where it is.
 */
const LONE_ALLELUIA = /^allel[uú]ia\s*[!.]?$/i;

/**
 * `R.` is the psautier's own marker for a response, and in all of
 * `vendor/psautier` it falls in one file: `theAbbeyPsalmsAndCanticles/NT 7`,
 * the canticle of 1 Timothy 3:16 sung at Week 4 Tuesday Vespers, where
 * "R. O práise the Lórd, all you nátions." stands four times as a strophe of
 * its own between the verses.
 *
 * It is the same defect as the Hallel's Alleluia from a different cause. Each
 * response takes a slot in the alternation, so the whole canticle comes out
 * inverted — termination where the mediant belongs, from the first hemistich
 * to the last.
 *
 * The response is real text of the Liturgy of the Hours, where the Alleluia
 * was not, but it is sung the way an antiphon is sung and not as a hemistich
 * of the canticle. The user's ruling: "Drop the alleluias like we do in the
 * LOTH." So it is dropped here, where the text is read, and the pointing
 * engines are left alone.
 */
const LONE_RESPONSE = /^R\.\s/;

/** How many verses share a strophe — one means the verse is the whole of it. */
function stropheSize(verses: PsalmVerse[], strophe: number): number {
  return verses.reduce((n, v) => n + (v.strophe === strophe ? 1 : 0), 0);
}

/**
 * A superscription standing alone in its strophe: the Hallel's Alleluia, or
 * NT 7's response. Standing alone is the whole of the test — a refrain that
 * comes with the lines it belongs to is sung with them, which is why NT 12's
 * "Allelúia!" survives it.
 */
function isLoneRefrain(verse: PsalmVerse, verses: PsalmVerse[]): boolean {
  const text = verse.text.trim();
  return (LONE_ALLELUIA.test(text) || LONE_RESPONSE.test(text))
    && stropheSize(verses, verse.strophe) === 1;
}

function isDoxology(line: string): boolean {
  const plain = stripStressMarks(line).toLowerCase();
  return plain.startsWith('glory to the father') || plain.startsWith('glory be to the father');
}

/** Split a file into its blank-line-separated blocks of trimmed lines. */
function splitBlocks(rawText: string): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) {
      current.push(trimmed);
    } else if (current.length) {
      blocks.push(current);
      current = [];
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

interface ParsedFile {
  heading: string;
  verses: PsalmVerse[];
  doxology: string;
}

function parsePsalmFile(rawText: string): ParsedFile {
  const blocks = splitBlocks(rawText);

  let heading = '';
  if (blocks.length && blocks[0].length === 1
      && !VERSE_LABEL.test(blocks[0][0])
      && HEADING.test(stripStressMarks(blocks[0][0]))) {
    heading = blocks.shift()![0];
  }

  let doxology = '';
  if (blocks.length && isDoxology(blocks[blocks.length - 1][0])) {
    doxology = blocks.pop()!.join('\n');
  }

  const verses: PsalmVerse[] = [];
  blocks.forEach((block, strophe) => {
    let current: PsalmVerse | null = null;
    for (const line of block) {
      const match = line.match(VERSE_LABEL);
      if (match) {
        current = { num: parseInt(match[1] ?? match[2] ?? match[3], 10), text: match[4], strophe };
        verses.push(current);
      } else if (current) {
        // A continuation line of the verse in progress.
        current.text += '\n' + line;
      } else {
        // Unnumbered text opening a strophe — NT 7's response, the line under
        // a Hallel psalm's "1 Alleluia!". It is sung with the verse it stands
        // next to, so it inherits that number and a range that reaches the
        // neighbour reaches it too.
        current = { num: verses.length ? verses[verses.length - 1].num : 0, text: line, strophe };
        verses.push(current);
      }
    }
  });

  // The lone refrains are dropped here rather than before parsing so that the
  // verse number they carry is still inherited by the line beneath — Psalm 111
  // writes "1 Alleluia!" and leaves "I will práise the Lórd" unlabelled, and
  // that line is verse 1.
  return { heading, verses: verses.filter(v => !isLoneRefrain(v, verses)), doxology };
}

/** Put the verses back as text, one blank line between strophes, none inside. */
function render(verses: PsalmVerse[], doxology: string): string {
  const strophes: string[][] = [];
  let currentStrophe: number | null = null;
  for (const verse of verses) {
    if (verse.strophe !== currentStrophe) {
      strophes.push([]);
      currentStrophe = verse.strophe;
    }
    strophes[strophes.length - 1].push(verse.text);
  }
  const parts = strophes.map(lines => lines.join('\n'));
  if (doxology) parts.push(doxology);
  return parts.join('\n\n');
}

function loadDir(dir: string, source: PsalmCollection, index: PsalmIndex): void {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.startsWith('.')) continue;
    // accents.pl and fixformat live beside the texts; they are tooling.
    if (!/^(?:Psalm|Canticle|OT|NT)\b/i.test(file)) continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      const rawText = fs.readFileSync(fullPath, 'utf8');
      const key = normaliseKey(file);
      const { heading, verses, doxology } = parsePsalmFile(rawText);

      index.set(key, {
        key,
        source,
        title: file,
        heading,
        rawText: render(verses, doxology),
        verses,
        doxology,
      });
    } catch {
      // Skip unreadable files silently
    }
  }
}

function buildIndex(): PsalmIndex {
  const index: PsalmIndex = new Map();
  loadDir(GRAIL_DIR, 'grail', index);
  loadDir(ABBEY_DIR, 'abbey', index);
  return index;
}

function getIndex(): PsalmIndex {
  if (!_index) _index = buildIndex();
  return _index;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Parse "10-19", "10–19" or a bare "10" into inclusive bounds. */
function parseRange(versesRange: string): { start: number, end: number } | null {
  const match = versesRange.trim().match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
  if (!match) return null;
  const start = parseInt(match[1], 10);
  const end = match[2] === undefined ? start : parseInt(match[2], 10);
  return end < start ? null : { start, end };
}

/**
 * Cut an entry down to a verse range. Returns null when the range names no
 * verse the psalm has: the caller's placeholder is a better answer than a
 * psalm consisting of nothing but its Glory Be, which is what a silently
 * empty selection used to produce.
 */
function applyVersesRange(entry: PsalmEntry, versesRange?: string): PsalmEntry | null {
  if (!versesRange) return entry;

  const range = parseRange(versesRange);
  if (!range) return entry;

  const filtered = entry.verses.filter(v => v.num >= range.start && v.num <= range.end);
  if (!filtered.length) return null;

  return { ...entry, verses: filtered, rawText: render(filtered, entry.doxology) };
}

/**
 * Order the parts of a split psalm as they are prayed: 116A before 116B, and
 * 119.9-16 before 119.105-112 — which is the opposite of what sorting the keys
 * as strings gives.
 */
function comparePartKeys(a: string, b: string): number {
  const first = (key: string) => {
    const match = key.match(/\.(\d+)/);
    return match ? parseInt(match[1], 10) : NaN;
  };
  const [na, nb] = [first(a), first(b)];
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

/** Join the parts of a split psalm into one entry, with a single doxology. */
function combineParts(key: string, parts: PsalmEntry[]): PsalmEntry {
  const verses: PsalmVerse[] = [];
  let stropheOffset = 0;
  for (const part of parts) {
    for (const verse of part.verses) {
      verses.push({ ...verse, strophe: verse.strophe + stropheOffset });
    }
    stropheOffset += part.verses.reduce((max, v) => Math.max(max, v.strophe), -1) + 1;
  }
  // Every part carries its own Glory Be; the joined psalm gets one, at the end.
  const doxology = parts.map(p => p.doxology).find(Boolean) ?? '';

  return {
    key,
    source: parts[0].source,
    title: key,
    heading: parts[0].heading,
    rawText: render(verses, doxology),
    verses,
    doxology,
  };
}

/**
 * Get stressed psalm text by psalm number.
 * Falls back from abbey → grail if requested collection not found.
 */
export function getPsalmText(
  psalmNum: number | string,
  collection: PsalmCollection = 'grail',
  versesRange?: string
): PsalmEntry | null {
  const idx = getIndex();
  const rawNum = String(psalmNum).toLowerCase();
  const key = `psalm-${rawNum}`;
  const entry = idx.get(key);
  if (entry) return applyVersesRange(entry, versesRange);

  // Psalms 116, 119 and 147 are on file only in their prayed parts: combine
  // "psalm-116a" + "psalm-116b", or all 22 strophes of "psalm-119.N-M".
  const matchingKeys = Array.from(idx.keys()).filter(k =>
    k === `psalm-${rawNum}a` ||
    k === `psalm-${rawNum}b` ||
    k.startsWith(`psalm-${rawNum}.`)
  ).sort(comparePartKeys);

  if (matchingKeys.length > 0) {
    // Combine the parsed verses, not the rendered text: re-parsing the joined
    // text found part A's doxology in the middle and swept everything after it
    // into the Glory Be, which is how Psalm 116:10-19 came out doxology-first.
    const parts = matchingKeys.map(k => idx.get(k)!).filter(Boolean);
    return applyVersesRange(combineParts(key, parts), versesRange);
  }

  return null;
}


/**
 * Get an OT or NT canticle by its number.
 */
export function getCanticleText(type: 'ot' | 'nt', num: number): PsalmEntry | null {
  const idx = getIndex();
  const key = `${type}-${num}`;
  return idx.get(key) ?? null;
}

/**
 * Get any entry by its normalised key (e.g. "psalm-1", "ot-3", "psalm-119.1-8").
 */
export function getEntryByKey(key: string): PsalmEntry | null {
  return getIndex().get(key.toLowerCase()) ?? null;
}

/**
 * List all available keys (useful for debugging / UI autocomplete).
 */
export function listAllKeys(): string[] {
  return Array.from(getIndex().keys()).sort();
}

/**
 * Extract the plain text (without stress marks) for comparison with iBreviary text.
 * Removes acute accents from stressed vowels.
 */
export function stripStressMarks(text: string): string {
  return text
    .replace(/[áàâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ÁÀÂÄ]/g, 'A')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÍÌÎÏ]/g, 'I')
    .replace(/[ÓÒÔÖ]/g, 'O')
    .replace(/[ÚÙÛÜ]/g, 'U');
}
