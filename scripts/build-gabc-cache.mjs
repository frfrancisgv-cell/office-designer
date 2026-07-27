/**
 * One-time build script: parses gregobase_online.sql and extracts
 * id → gabc mappings into gregobase-cache.json for use by gabc-lookup.ts.
 *
 * Usage:  node scripts/build-gabc-cache.mjs
 * Output: gregobase-cache.json  (in project root)
 *
 * The gregobase `gabc` column is a JSON array of the form:
 *   [["tex","\\preamble..."],["gabc","(c4) actual gabc notation...",...],...]
 * We extract the string at position [1][1] of that array.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// ── Column indices for gregobase_chants INSERT rows (0-based) ────────────────
// id(0) cantusid(1) version(2) incipit(3) initial(4) office-part(5)
// mode(6) mode_var(7) transcriber(8) commentary(9) headers(10)
// gabc(11) gabc_verses(12) tex_verses(13) remarks(14) copyrighted(15) duplicateof(16)
const COL_ID         = 0;
const COL_VERSION    = 2;  // 'Solesmes', 'Other', etc.
const COL_INCIPIT    = 3;
const COL_OFFICEPART = 5;
const COL_GABC       = 11;
const COL_GABCVERSES = 12;

// ── MySQL token parser ────────────────────────────────────────────────────────

/**
 * Parse one MySQL VALUES row (the portion between the outer parentheses).
 * Returns an array of values (string | number | null).
 * Handles:  NULL  |  integer/float  |  'single-quoted MySQL string'
 */
function parseMySQLRow(line) {
  // Strip leading ( and trailing ),  or );
  const inner = line.replace(/^\s*\(/, '').replace(/\)[,;]?\s*$/, '');
  const values = [];
  let i = 0;
  const len = inner.length;

  while (i < len) {
    const startI = i;
    // skip whitespace and commas between values
    while (i < len && (inner[i] === ',' || inner[i] === ' ')) i++;
    if (i >= len) break;

    if (inner[i] === 'N' && inner.slice(i, i + 4) === 'NULL') {
      values.push(null);
      i += 4;
    } else if (inner[i] === "'") {
      // MySQL single-quoted string
      let str = '';
      i++; // skip opening '
      while (i < len) {
        if (inner[i] === '\\') {
          // MySQL escape sequences
          i++;
          switch (inner[i]) {
            case "'":  str += "'";  break;
            case '\\': str += '\\'; break;
            case 'n':  str += '\n'; break;
            case 'r':  str += '\r'; break;
            case 'Z':  str += '\x1a'; break;
            default:   str += inner[i]; break;
          }
          i++;
        } else if (inner[i] === "'") {
          i++; // closing quote
          // MySQL allows '' as escaped single quote
          if (i < len && inner[i] === "'") { str += "'"; i++; }
          else break;
        } else {
          str += inner[i++];
        }
      }
      values.push(str);
    } else {
      // numeric or keyword
      let tok = '';
      while (i < len && inner[i] !== ',' && inner[i] !== ')') tok += inner[i++];
      const t = tok.trim();
      values.push(t === 'NULL' ? null : isNaN(Number(t)) ? t : Number(t));
    }

    if (i === startI) {
      i++;
    }
  }

  return values;
}

/**
 * Extract the raw GABC notation string from the gregobase `gabc` JSON column.
 * The column value may be:
 *  - A JSON array: [["tex","..."],["gabc","(c4)..."],...]
 *  - A raw GABC file string with "%%" header/body separator
 *  - A JSON-encoded bare string starting with a double-quote (e.g. "\"(f3)MAg...")
 * Returns the GABC notation string, or null if unparseable.
 */
function extractGabc(jsonColumnValue) {
  if (!jsonColumnValue || typeof jsonColumnValue !== 'string') return null;
  
  let val = jsonColumnValue;

  // 1. Try JSON.parse (handles arrays and properly-encoded strings)
  try {
    const parsed = JSON.parse(jsonColumnValue);
    if (typeof parsed === 'string') {
      val = parsed;
    } else if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (Array.isArray(entry) && entry[0] === 'gabc' && typeof entry[1] === 'string') {
          return stripHtml(entry[1].trim()) || null;
        }
      }
      // No gabc entry found in array
      return null;
    }
  } catch {
    // ignore JSON parsing errors, continue with raw val
  }

  // 2. Handle JSON-encoded bare string starting with a quote (e.g. ID 9154)
  //    These have double-escaped unicode like \\u00e6 that we need to resolve.
  if (val.startsWith('"') && val.endsWith('"')) {
    try {
      // val is already a JSON string — parse it to resolve unicode escapes
      const inner = JSON.parse(val);
      if (typeof inner === 'string') val = inner;
    } catch {
      // strip surrounding quotes manually
      val = val.slice(1, -1);
    }
    // Now resolve any remaining \\uXXXX sequences (double-escaped)
    val = val.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    val = val.replace(/\\r/g, '\r').replace(/\\n/g, '\n');
  }

  // 3. GABC file with %% separator: take everything after the last %%
  if (val.includes('%%')) {
    const parts = val.split('%%');
    let notation = parts[parts.length - 1].trim();
    // remove trailing quote if still present
    if (notation.endsWith('"')) notation = notation.slice(0, -1).trim();
    if (notation.endsWith("'")) notation = notation.slice(0, -1).trim();
    return stripHtml(notation) || null;
  }

  // 4. If val looks like raw GABC notation (starts with clef), return it directly
  if (/^\(([cfCF][1-4]|cb[1-3])\)/.test(val.trim())) {
    return stripHtml(val.trim()) || null;
  }

  // 5. Regex fallback for "gabc" key in stringified array
  const m = jsonColumnValue.match(/"gabc"\s*,\s*"((?:[^"\\]|\\.)*)"/);
  if (m) {
    try { return stripHtml(JSON.parse(`"${m[1]}"`).trim()) || null; } catch { /* ignore */ }
  }

  return null;
}

/**
 * Strip HTML tags from a GABC string. Some GregoBase entries embed <i>...</i>
 * tags around editorial notes (e.g. "neuma" markings). These are not valid GABC
 * and cause score rendering to fail. Remove the tags but keep the enclosed text.
 */
function stripHtml(s) {
  if (!s) return s;
  return s.replace(/<[^>]+>/g, '');
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('Reading gregobase_online.sql …');
const sql = readFileSync(join(ROOT, 'gregobase_online.sql'), 'utf8');
const lines = sql.split('\n');

const cache = {}; // id (number) → { incipit, officePart, gabc }
let inChantInsert = false;
let parsed = 0;
let skipped = 0;
let pendingRow = '';  // accumulates multi-line row fragments

for (const rawLine of lines) {
  const line = rawLine.trim();

  if (line.startsWith('INSERT INTO `gregobase_chants`')) {
    inChantInsert = true;
    continue;
  }
  if (line === '' || line.startsWith('--') || line.startsWith('/*') || line.startsWith('*')) {
    if (line.endsWith(';')) inChantInsert = false;
    continue;
  }
  if (!inChantInsert) continue;

  // Data rows begin with ( — but rows with embedded newlines in quoted strings
  // span multiple physical lines. Accumulate fragments until the row closes.
  if (line.startsWith('(')) {
    pendingRow = line;
  } else if (pendingRow) {
    // Continuation of a multi-line row
    pendingRow += '\n' + line;
  } else {
    if (line === ';' || line.endsWith(';')) inChantInsert = false;
    continue;
  }

  // Check if this is a complete row: ends with ),  or );
  // A row is complete when it ends with ), or ); (outside of string context)
  // Simple heuristic: if the accumulated content ends with ), or ); treat as complete
  const trimmedPending = pendingRow.trimEnd();
  const isComplete = /\)[,;]\s*$/.test(trimmedPending);
  if (!isComplete) continue;

  const fullRow = pendingRow;
  pendingRow = '';

  try {
    const cols = parseMySQLRow(fullRow);
    const id = Number(cols[COL_ID]);
    const version    = String(cols[COL_VERSION] ?? '');
    const incipit    = cols[COL_INCIPIT] ?? '';
    const officePart = cols[COL_OFFICEPART] ?? '';
    const gabcRaw    = cols[COL_GABC];
    const gabcVersesRaw = cols[COL_GABCVERSES];
    let gabc         = extractGabc(typeof gabcRaw === 'string' ? gabcRaw : null);

    if (gabc && typeof gabcVersesRaw === 'string' && gabcVersesRaw.trim() && gabcVersesRaw.trim() !== 'NULL') {
      let verses = gabcVersesRaw.trim();
      if (verses.startsWith("'") && verses.endsWith("'")) verses = verses.slice(1, -1).trim();
      if (verses.startsWith('"') && verses.endsWith('"')) verses = verses.slice(1, -1).trim();
      verses = verses.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
      if (verses) {
        gabc = gabc + '\n' + verses;
      }
    }

    if (id && gabc) {
      cache[id] = { incipit: String(incipit), officePart: String(officePart), version, gabc };
      parsed++;
    } else {
      skipped++;
    }
  } catch (err) {
    skipped++;
  }
}

console.log(`Parsed ${parsed} chants with GABC notation, skipped ${skipped}.`);

const outPath = join(ROOT, 'gregobase-cache.json');
writeFileSync(outPath, JSON.stringify(cache), 'utf8');
const sizeKB = Math.round(Buffer.byteLength(JSON.stringify(cache)) / 1024);
console.log(`Written → gregobase-cache.json  (${sizeKB} KB, ${parsed} entries)`);
