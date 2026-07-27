/**
 * gabc-loaders.ts
 *
 * Responsible for reading and caching all OCO data files:
 *   IDX_ANT.csv      — psalm antiphons
 *   IDX_INV.csv      — invitatory antiphons
 *   IDX_RB.csv       — short responsories
 *   OCO/INDEX_HYM2.json — hymn metadata
 *   gregobase-cache.json — Gregorian chant GABC notation cache
 *
 * All data is loaded lazily on first access and cached in module-level variables.
 * Re-exported getters are the only public API; callers never touch the raw loaders.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AntEntry {
  incipit: string;
  normTitle: string;
  titleWords: string[];
  gabc: string;
  gbId: number;
  mode: string;
  office: string;
  occasion: string;
  place: string;   // e.g. "1", "2", "M", "Ma", "Ba", "M-I ad lib"
}

export interface HymEntry {
  incipit: string;
  normIncipit: string;
  incipitWords: string[];
  gregobaseId: number;
  officePart: string;
  seasonCode: string;
  page?: string;
}

export interface InvEntry {
  incipit: string;
  normTitle: string;
  titleWords: string[];
  gabc: string;
  gbId: number;
  mode: string;
  occasion: string;
}

export interface RbEntry {
  incipit: string;
  gabc: string;
  mode: string;
  seasonCode: string;
}

export interface GregoCacheEntry {
  incipit: string;
  officePart: string;
  gabc: string;
  version?: string;
}

export type GregoCache = Record<string, GregoCacheEntry>;

// ── Normalisation ─────────────────────────────────────────────────────────────

/** Strip diacritics, lower-case, collapse whitespace, keep only alphanum+space. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function toWords(n: string): string[] {
  return n.split(' ').filter(Boolean);
}

// ── CSV parser ────────────────────────────────────────────────────────────────

export function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let inQ = false;
  let cur = '';
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

// ── Module caches ─────────────────────────────────────────────────────────────

let antCache: AntEntry[] | null = null;
let hymCache: HymEntry[] | null = null;
let invCache: InvEntry[] | null = null;
let gregoCache: GregoCache | null = null;
let rbCache: RbEntry[] | null = null;

// ── Loaders ───────────────────────────────────────────────────────────────────

function loadAntCsv(): AntEntry[] {
  const p = path.join(process.cwd(), 'IDX_ANT.csv');
  let text: string;
  try { text = fs.readFileSync(p, 'utf-8'); } catch { return []; }
  const out: AntEntry[] = [];
  let skip = false;
  for (const line of text.split('\n')) {
    if (!skip) { skip = true; continue; }
    if (!line.trim()) continue;
    const c = parseCsvLine(line);
    if (c.length < 8) continue;
    // Title(0) Text(1) Src(2) Mode(3) Melody(4) Src1(5) Src2(6) gabc(7) GB_ID(8) Occasion(9) Office(10) Place(11)
    const incipit  = c[0] || '';
    const gabc     = c[7] || '';
    const gbId     = parseInt(c[8] || '0', 10) || 0;
    const mode     = c[3] || '';
    const occasion = c[9] || '';
    const office   = c[10] || '';
    const place    = c[11] || '';
    if (!incipit) continue;
    const norm = normalize(incipit);
    out.push({ incipit, normTitle: norm, titleWords: toWords(norm), gabc, gbId, mode, office, occasion, place });
  }
  console.log(`[OCO] Loaded ${out.length} antiphon entries from IDX_ANT.csv`);
  return out;
}

function loadHymJson(): HymEntry[] {
  const p = path.join(process.cwd(), 'OCO', 'INDEX_HYM2.json');
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as Array<{
      incipit: string; season_code: string; office_part: string; grebobase_id: string; page?: string;
    }>;
    return raw.map(e => {
      const norm = normalize(e.incipit || '');
      return {
        incipit: e.incipit,
        normIncipit: norm,
        incipitWords: toWords(norm),
        gregobaseId: parseInt(e.grebobase_id || '0', 10) || 0,
        officePart: e.office_part || '',
        seasonCode: e.season_code || '',
        page: e.page,
      };
    }).filter(e => e.gregobaseId > 0);
  } catch { return []; }
}

function loadInvCsv(): InvEntry[] {
  const p = path.join(process.cwd(), 'IDX_INV.csv');
  let text: string;
  try { text = fs.readFileSync(p, 'utf-8'); } catch { return []; }
  const out: InvEntry[] = [];
  let skip = false;
  for (const line of text.split('\n')) {
    if (!skip) { skip = true; continue; }
    if (!line.trim()) continue;
    const c = parseCsvLine(line);
    if (c.length < 9) continue;
    // Title(0) Text(1) Src(2) Mode(3) Melody(4) Src1(5) gabc(6) GB_ID(7) Occasion(8)
    const incipit  = c[0] || '';
    const gabc     = c[6] || '';
    const gbId     = parseInt(c[7] || '0', 10) || 0;
    const mode     = c[3] || '';
    const occasion = c[8] || '';
    if (!incipit) continue;
    const norm = normalize(incipit);
    out.push({ incipit, normTitle: norm, titleWords: toWords(norm), gabc, gbId, mode, occasion });
  }
  console.log(`[OCO] Loaded ${out.length} invitatory entries from IDX_INV.csv`);
  return out;
}

function loadRbCsv(): RbEntry[] {
  const p = path.join(process.cwd(), 'IDX_RB.csv');
  try {
    const lines = fs.readFileSync(p, 'utf-8').split('\n');
    let skip = false;
    const out: RbEntry[] = [];
    for (const line of lines) {
      if (!skip) { skip = true; continue; }
      if (!line.trim()) continue;
      const c = parseCsvLine(line);
      if (c.length < 8) continue;
      // Title(0) Text(1) Src(2) Mode(3) Melody(4) Src1(5) Src2(6) gabc(7) GB_ID(8) Occasion(9) Office(10)
      const incipit    = c[0] || '';
      const gabc       = c[7] || '';
      const mode       = c[3] || '';
      const seasonCode = `${c[9] || ''}|${c[10] || ''}`;
      if (incipit && gabc) out.push({ incipit, gabc, mode, seasonCode });
    }
    console.log(`[OCO] Loaded ${out.length} responsory entries from IDX_RB.csv`);
    return out;
  } catch { return []; }
}

function loadGregoCache(): GregoCache {
  const p = path.join(process.cwd(), 'gregobase-cache.json');
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { console.warn('[OCO] gregobase-cache.json not found'); return {}; }
}

// ── Public getters (lazy-load + cache) ────────────────────────────────────────

export function getAnts(): AntEntry[]   { return antCache   ??= loadAntCsv(); }
export function getHyms(): HymEntry[]   { return hymCache   ??= loadHymJson(); }
export function getInvs(): InvEntry[]   { return invCache   ??= loadInvCsv(); }
export function getRbs(): RbEntry[]     { return rbCache    ??= loadRbCsv(); }
export function getGrego(): GregoCache  { return gregoCache ??= loadGregoCache(); }
// Trigger HMR
