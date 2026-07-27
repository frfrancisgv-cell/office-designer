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
 * The index is built once at module load time (server-side only).
 */

import fs from 'fs';
import path from 'path';

export type PsalmCollection = 'grail' | 'abbey';

export interface PsalmEntry {
  key: string;           // e.g. "psalm-1", "ot-3", "nt-2"
  source: PsalmCollection;
  title: string;         // original file name
  rawText: string;       // full text as stored, with stress marks
  verses: string[];      // individual verse texts (may span multiple lines)
}

type PsalmIndex = Map<string, PsalmEntry>;

// ─── Build the index ──────────────────────────────────────────────────────────

const LYPSAUTIER_ROOT = path.join(process.cwd(), 'lypsautierant', 'psautier');
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

function parseVerses(rawText: string): string[] {
  // Split on verse numbers: lines starting with a digit and a space
  // e.g. "1 Blessed..." starts a new verse
  const lines = rawText.split('\n');
  const verses: string[] = [];
  let current = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // blank line — flush current verse
      if (current.trim()) verses.push(current.trim());
      current = '';
      continue;
    }
    if (/^\d+\s/.test(trimmed)) {
      if (current.trim()) verses.push(current.trim());
      current = trimmed;
    } else {
      current += ' ' + trimmed;
    }
  }
  if (current.trim()) verses.push(current.trim());
  return verses;
}

function loadDir(dir: string, source: PsalmCollection, index: PsalmIndex): void {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.startsWith('.')) continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      const rawText = fs.readFileSync(fullPath, 'utf8');
      const key = normaliseKey(file);
      const entry: PsalmEntry = {
        key,
        source,
        title: file,
        rawText,
        verses: parseVerses(rawText),
      };
      index.set(key, entry);
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

/**
 * Get stressed psalm text by psalm number.
 * Falls back from abbey → grail if requested collection not found.
 */
export function getPsalmText(
  psalmNum: number | string,
  collection: PsalmCollection = 'grail'
): PsalmEntry | null {
  const idx = getIndex();
  const rawNum = String(psalmNum).toLowerCase();
  const key = `psalm-${rawNum}`;
  const entry = idx.get(key);
  if (entry) return entry;

  // Fallback match for sub-parts e.g. "116" -> combine "psalm-116a", "psalm-116b"
  // or "119" -> combine all 22 strophes "psalm-119.1-8" ...
  const matchingKeys = Array.from(idx.keys()).filter(k => 
    k === `psalm-${rawNum}a` || 
    k === `psalm-${rawNum}b` || 
    k.startsWith(`psalm-${rawNum}.`)
  );

  if (matchingKeys.length > 0) {
    const combinedTexts: string[] = [];
    let source: PsalmCollection = 'grail';

    for (const k of matchingKeys) {
      const e = idx.get(k);
      if (e) {
        source = e.source;
        combinedTexts.push(e.rawText);
      }
    }

    const fullRawText = combinedTexts.join('\n\n');
    return {
      key,
      source,
      title: `Psalm ${rawNum}`,
      rawText: fullRawText,
      verses: parseVerses(fullRawText),
    };
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
