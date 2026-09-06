/**
 * The single reader for the Latin texts under `jgabc-psalms/`.
 *
 * Everything that wants Latin psalm or canticle text goes through here, so
 * that three rules are applied in exactly one place:
 *
 *  1. The files are CRLF. `.trim()` only strips the ends, so a stray `\r`
 *     used to survive on every interior line, ride through `stripPointing`
 *     unchanged, and end up inside the pointed HTML (`…</strong>.\r`).
 *  2. The doxology is not in the files. `app/api/psalm-text` appended it and
 *     the office engine did not, so the same psalm had a Gloria Patri when
 *     fetched and none when generated offline.
 *  3. A canticle is *not* a psalm. Looking one up by its bare index against
 *     the numbered psalm files is what turned NT canticle 6 (Col 1:12-20)
 *     into Psalm 6.
 */

import fs from 'fs';
import path from 'path';
import { hebrewToVulgate } from './psalm-numbering';
import { stripVerseNumbers } from '../psalm-tones/verse-numbers';

export const LATIN_DOXOLOGY =
  'Glória Patri, et Fílio, * et Spirítui Sancto.\n' +
  'Sicut erat in princípio, et nunc, et semper, * et in sǽcula sæculórum. Amen.';

/** Read one jgabc file, normalising line endings and dropping blank lines. */
function readJgabc(filename: string): string | null {
  const filePath = path.join(process.cwd(), 'jgabc-psalms', filename);
  let text: string;
  try {
    if (!fs.existsSync(filePath)) return null;
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`[latin-texts] could not read ${filename}:`, err);
    return null;
  }
  const cleaned = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
  // No canticle file carries verse numbers today; this keeps it that way if
  // one ever gains them, since a number here would be pointed as a syllable.
  return stripVerseNumbers(cleaned) || null;
}

function withDoxology(text: string | null): string | null {
  return text === null ? null : `${text}\n\n${LATIN_DOXOLOGY}`;
}

// ── The Nova Vulgata psalter ──────────────────────────────────────────────

/**
 * `NovaVulgata.txt` is the Latin psalter of the Liturgy of the Hours, and it
 * is the right book for this app: it is numbered the Hebrew way the psalter
 * schema is (`PSALMUS 23 (22)`), it carries the verse numbers a prescribed
 * range is selected by — they are stripped after selection — and its mediant
 * `*` and flex `†` are already marked.
 *
 * The numbered `NNN.txt` files are the older Vulgate of the Roman Breviary —
 * a different translation under a different numbering, which had to be
 * converted to before it could be read. They stay as a fallback.
 */
interface NovaVulgataVerse {
  num: number;
  text: string;
}

let novaVulgata: Map<number, NovaVulgataVerse[]> | null = null;

function loadNovaVulgata(): Map<number, NovaVulgataVerse[]> {
  if (novaVulgata) return novaVulgata;

  const parsed = new Map<number, NovaVulgataVerse[]>();
  const filePath = path.join(process.cwd(), 'jgabc-psalms', 'NovaVulgata.txt');
  let raw: string;
  try {
    if (!fs.existsSync(filePath)) return (novaVulgata = parsed);
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('[latin-texts] could not read NovaVulgata.txt:', err);
    return (novaVulgata = parsed);
  }

  let verses: NovaVulgataVerse[] | null = null;
  for (const line of raw.replace(/^﻿/, '').split(/\r?\n/)) {
    const text = line.trim();
    if (!text) continue;

    // "PSALMUS 23 (22)" — the parenthesis is the old Vulgate number.
    const heading = text.match(/^PSALMUS\s+(\d+)\b/);
    if (heading) {
      verses = [];
      parsed.set(Number(heading[1]), verses);
      continue;
    }
    if (!verses) continue; // the file's own title lines, before Psalm 1

    // A leading number opens a verse; anything else continues the last one,
    // because a long verse is printed over several lines.
    const opening = text.match(/^(\d+)\s+(.*)$/);
    if (opening) {
      verses.push({ num: Number(opening[1]), text: opening[2] });
    } else if (verses.length) {
      verses[verses.length - 1].text += `\n${text}`;
    }
  }

  return (novaVulgata = parsed);
}

/** Parse "1-8", "7-14" or "5" into a predicate over verse numbers. */
function verseFilter(verses?: string): ((num: number) => boolean) | null {
  if (!verses) return null;
  const range = verses.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) {
    const from = Number(range[1]);
    const to = Number(range[2]);
    return (num) => num >= from && num <= to;
  }
  const single = verses.trim().match(/^\d+$/);
  if (single) return (num) => num === Number(verses.trim());
  return null;
}

function getNovaVulgataPsalmText(id: number | string, verses?: string): string | null {
  // A subdivided id carries its own range: "119.1-8".
  const [numberPart, subdivision] = String(id).split('.');
  const psalm = parseInt(numberPart, 10);
  if (isNaN(psalm)) return null;

  const all = loadNovaVulgata().get(psalm);
  if (!all || !all.length) return null;

  const wanted = verseFilter(subdivision) ?? verseFilter(verses);
  const chosen = wanted ? all.filter((v) => wanted(v.num)) : all;
  if (!chosen.length) return null;

  // The numbers were needed to select the verses; they are not wanted in the
  // office, and one left after a mediant is counted as a syllable. A verse's
  // own number is simply not put back, and `stripVerseNumbers` takes the
  // mid-line ones the file writes after a `*` or `†`.
  return stripVerseNumbers(chosen.map((v) => v.text).join('\n'));
}

/**
 * Latin text of a psalm named by its Hebrew (liturgical) number, optionally
 * limited to the verses the office actually prescribes ("1-6").
 */
export function getLatinPsalmText(id: number | string, verses?: string): string | null {
  const novaVulgataText = getNovaVulgataPsalmText(id, verses);
  if (novaVulgataText) return withDoxology(novaVulgataText);

  // Fallback: the Roman Breviary Vulgate, which needs the number converted
  // and has no verse divisions to select from.
  const vulgate = hebrewToVulgate(id);
  return withDoxology(readJgabc(`${String(vulgate).padStart(3, '0')}.txt`));
}

/**
 * Abbey OT canticle number → jgabc filename.
 *
 * Deliberately partial. A canticle is only listed where the file and the
 * Abbey's own citation name the same passage; guessing would put the wrong
 * canticle in the office just as surely as the psalm-number bug did. Anything
 * absent here has no Latin text on file and must say so.
 *
 * Keyed by the Abbey's number because that is what an "OT N" key means
 * everywhere else — it is the English index `/api/psalm-text` reads, and the
 * number the editor's two text buttons both send. See `canticle-refs.ts`.
 */
const OT_CANTICLE_FILES: Record<number, string> = {
  4:  'Canticum Moysis.1 (Deut 32, 1-21).txt', // Deut 32:1-12
  8:  'Canticum Annae.txt',                    // 1 Sam 2
  9:  'Canticum David.txt',                    // 1 Chr 29
  10: 'Canticum Tobiae.txt',                   // Tob 13
  14: 'Canticum Judith.txt',                   // Jdt 16
  30: 'Canticum Isaiae 12.txt',                // Is 12:1-6
  35: 'Canticum Ezechiae.txt',                 // Is 38:10-20
  37: 'Canticum Isaiæ 40, 10-17.txt',          // Is 40:10-17
  38: 'Canticum Isaiæ 42, 10-16.txt',          // Is 42:10-16
  51: 'Canticum Ezechielis 36, 24-28.txt',     // Ez 36:24-28
  54: 'Canticum Trium puerorum.txt',           // Dan 3:57-88 — the Benedicite
  57: 'Canticum Habacuc.txt',                  // Hab 3
};

/**
 * The four-week psalter's canticle slot → the Abbey canticle it stands for.
 *
 * `psalter-schema.ts` numbers the Old Testament canticles by their place in
 * the Lauds cycle, one to twenty-four; the Abbey files number all fifty-eight
 * of its canticles straight through. The two have nothing to do with each
 * other, and an "OT 4" from the offline psalter and an "OT 4" read off an
 * imported rubric are different canticles — Judith 16 and Deuteronomy 32.
 *
 * Every pairing below is the one the slot already had: it is read off the
 * Latin file each slot was mapped to, not chosen afresh. Slots absent here
 * had no Latin text before and still have none.
 *
 * The slots this leaves out are the ones whose English is wrong today, since
 * the engine hands its slot number straight to the Abbey index: slot 1 asks
 * for the Benedicite and is given Exodus 15. Putting that right means saying
 * which canticle each of the twenty-four slots is, which is a question for
 * the psalter, not for this table.
 */
const SLOT_TO_ABBEY: Record<number, number> = {
  1: 54, 2: 9, 3: 10, 4: 14, 5: 30, 6: 57, 7: 4, 8: 54, 9: 35,
  11: 8, 12: 57, 15: 37, 16: 37, 17: 38, 19: 38, 20: 51, 24: 51,

  // These five have no Latin file; the pairing is read off the citation the
  // slot itself prints as its title, which is the same citation the Abbey
  // files the canticle under.
  13: 28,  // Is 2:2-5
  14: 31,  // Is 26:9  — the Abbey's Is 26:1-4, 7-9, 12
  18: 19,  // Wis 9:10 — the Abbey's Wis 9:1-6, 9-11
  21: 42,  // Is 61:10 — the Abbey's Is 61:10-62:5
  22: 45,  // Is 66    — the Abbey's Is 66:10-14a

  // Slots 10 and 23 are left out on purpose. Slot 10 says "Is 1", and there
  // is no canticle of Isaiah 1 in the Abbey or in the office; slot 23 says
  // nothing at all. Both print the Abbey canticle that happens to share their
  // number, which is the wrong text, and neither can be put right from what
  // the schema records.
};

/** The Benedicite carries its own ending and must not take the Gloria Patri. */
const SELF_CLOSING = new Set(['Canticum Trium puerorum.txt']);

/**
 * Latin text of an Office canticle, by the Abbey's number.
 *
 * The New Testament canticles are Nova Vulgata and are not part of the jgabc
 * corpus, so `nt` always returns null rather than a plausible-looking wrong
 * text.
 */
export function getLatinCanticleText(kind: 'ot' | 'nt', num: number): string | null {
  if (kind === 'nt') return null;
  const filename = OT_CANTICLE_FILES[num];
  if (!filename) return null;
  const text = readJgabc(filename);
  return SELF_CLOSING.has(filename) ? text : withDoxology(text);
}

/**
 * The Abbey canticle a four-week psalter slot stands for, or null when the
 * pairing is not on record and the slot can only speak for itself.
 */
export function abbeyNumberForSlot(slot: number): number | null {
  return SLOT_TO_ABBEY[slot] ?? null;
}

const GOSPEL_CANTICLE_FILES: Record<string, string> = {
  'benedictus': 'Benedictus.txt',
  'magnificat': 'Magnificat.txt',
  'nunc dimittis': 'Nunc dimittis.txt',
  'nunc-dimittis': 'Nunc dimittis.txt',
};

/** Latin text of a Gospel canticle, named as "Magnificat", "Benedictus", … */
export function getLatinGospelCanticleText(name: string): string | null {
  const filename = GOSPEL_CANTICLE_FILES[name.trim().toLowerCase()];
  return filename ? withDoxology(readJgabc(filename)) : null;
}
