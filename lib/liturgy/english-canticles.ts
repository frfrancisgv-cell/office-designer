/**
 * The English Gospel canticles, read out of the Abbey Psalms and Canticles.
 *
 * They are not separate files there — the whole New Testament section lives
 * in one `canticlesOTNTlineNumbers.txt`, each canticle introduced by its
 * citation and title. Before this existed, `getGospelCanticleText` looked for
 * them under a `lypsautierant/psautier/revisedGrailPsalter/` path that no
 * longer exists (the submodule was vendored to `vendor/psautier/`), missed,
 * and fell through to `jgabc-psalms/Magnificat.txt` — so an English Vespers
 * printed the Magnificat in Latin.
 */

import fs from 'fs';
import path from 'path';

export type GospelCanticle = 'Benedictus' | 'Magnificat' | 'Nunc dimittis';

/**
 * Accented to match the Grail psalter's own doxology, so that a canticle and
 * the psalms around it point and typeset alike. The Abbey text stops at the
 * last verse; the Gospel canticles are always concluded with the Gloria Patri.
 */
export const ENGLISH_DOXOLOGY =
  'Glóry to the Fáther, and to the Són,\n' +
  'and to the Hóly Spírit:\n' +
  'as it wás in the begínning, is nów,\n' +
  'and will be for éver. Amén.';

/** Each canticle runs from the line after its title down to the next heading. */
const BOUNDS: Record<GospelCanticle, { title: string; until: string }> = {
  'Magnificat': { title: 'Canticle of Mary (Magnificat)', until: 'Luke 1:68-79' },
  'Benedictus': { title: 'Canticle of Zechariah (Benedictus)', until: 'Luke 2:29-32' },
  'Nunc dimittis': { title: 'Canticle of Simeon (Nunc dimittis)', until: 'Ephesians 1:3-10' },
};

let cache: Partial<Record<GospelCanticle, string | null>> = {};

export function getEnglishGospelCanticleText(name: GospelCanticle): string | null {
  if (name in cache) return cache[name] ?? null;

  const bounds = BOUNDS[name];
  if (!bounds) return null;

  const source = path.join(
    process.cwd(), 'vendor', 'psautier', 'theAbbeyPsalmsAndCanticles',
    'canticlesOTNTlineNumbers.txt',
  );

  let text: string;
  try {
    if (!fs.existsSync(source)) return (cache[name] = null);
    text = fs.readFileSync(source, 'utf8');
  } catch (err) {
    console.error('[english-canticles] could not read the Abbey canticles:', err);
    return (cache[name] = null);
  }

  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map(line => line.trim());
  const start = lines.indexOf(bounds.title);
  if (start < 0) return (cache[name] = null);
  const end = lines.indexOf(bounds.until, start + 1);
  if (end < 0) return (cache[name] = null);

  // Keep the blank lines: they are the stanza breaks the pointing engines
  // read, and the Abbey text carries no `*`.
  const body = lines
    .slice(start + 1, end)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return (cache[name] = body ? `${body}\n\n${ENGLISH_DOXOLOGY}` : null);
}

/** Exposed so a test can force a re-read; not used in the request path. */
export function clearEnglishCanticleCache(): void {
  cache = {};
}
