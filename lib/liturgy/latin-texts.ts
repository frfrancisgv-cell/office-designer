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
  return cleaned || null;
}

function withDoxology(text: string | null): string | null {
  return text === null ? null : `${text}\n\n${LATIN_DOXOLOGY}`;
}

// ── The Nova Vulgata psalter ──────────────────────────────────────────────

/**
 * `NovaVulgata.txt` is the Latin psalter of the Liturgy of the Hours, and it
 * is the right book for this app: it is numbered the Hebrew way the psalter
 * schema is (`PSALMUS 23 (22)`), it carries verse numbers, and its mediant
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

  return chosen.map((v) => `${v.num} ${v.text}`).join('\n');
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
 * OT canticle index (as used by `psalter-schema.ts`) → jgabc filename.
 *
 * Deliberately partial. A canticle is only listed where the schema's own
 * citation and the file name name the same passage; guessing would put the
 * wrong canticle in the office just as surely as the psalm-number bug did.
 * Anything absent here has no Latin text on file and must say so.
 */
const OT_CANTICLE_FILES: Record<number, string> = {
  1: 'Canticum Trium puerorum.txt',      // Dan 3
  2: 'Canticum David.txt',               // 1 Chr 29
  3: 'Canticum Tobiae.txt',              // Tob 13
  4: 'Canticum Judith.txt',              // Jdt 16
  5: 'Canticum Isaiae 12.txt',           // Is 12:1-6
  6: 'Canticum Habacuc 3, 1-6.txt',      // Hab 3:2-19
  7: 'Canticum Moysis.1 (Deut 32, 1-21).txt', // Deut 32:1-12
  8: 'Canticum Trium puerorum.txt',      // Dan 3
  9: 'Canticum Ezechiae.txt',            // Is 38
  11: 'Canticum Annae.txt',              // 1 Sam 2
  12: 'Canticum Habacuc.txt',            // Hab 3
  15: 'Canticum Isaiæ 40, 10-17.txt',    // Is 40:10-17
  16: 'Canticum Isaiæ 40, 10-17.txt',    // Is 40
  17: 'Canticum Isaiæ 42, 10-16.txt',    // Is 42
  19: 'Canticum Isaiæ 42, 10-16.txt',    // Is 42
  20: 'Canticum Ezechielis 36, 24-28.txt', // Ez 36
  24: 'Canticum Ezechielis 36, 24-28.txt', // Ez 36:26
};

/** The Benedicite carries its own ending and must not take the Gloria Patri. */
const SELF_CLOSING = new Set(['Canticum Trium puerorum.txt']);

/**
 * Latin text of an Office canticle.
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
