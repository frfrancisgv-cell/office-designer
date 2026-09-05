/**
 * Parse a psalm tone and variant from an antiphon annotation string.
 *
 * Annotation strings from exsurge GABC headers take forms like:
 *   "8 G"         → tone "8.", variant "G"
 *   "8 g"         → tone "8.", variant "g"  (lower-case for some editions)
 *   "1 D"         → tone "1.", variant "D"
 *   "Ant. 4 g"    → tone "4.", variant "g"
 *   "4. alt g"    → tone "4. alt", variant "g"
 *   "per."        → tone "per.", variant ""
 *   "8."          → tone "8.", variant ""
 *   "Ant.\n8 G"   → tone "8.", variant "G"   (multi-line)
 */

import { PSALM_TONES, getVariants } from './tone-data';

export interface ParsedTone {
  tone: string;
  variant: string;
}

/**
 * Known tone name prefixes (longest first so "4. alt" beats "4.").
 * Dynamically built from PSALM_TONES keys.
 */
const TONE_NAMES = Object.keys(PSALM_TONES).sort((a, b) => b.length - a.length);

export function parseToneFromAnnotation(annotation: string): ParsedTone | null {
  if (!annotation) return null;

  // Flatten multi-line annotations
  const flat = annotation.replace(/\s+/g, ' ').trim();

  // Strip leading labels like "Ant.", "Ant", "Inv.", etc.
  const stripped = flat.replace(/^(ant|inv|resp|hymn|off|comm)\.?\s*/i, '').trim();

  // Try to match a known tone name (with trailing period or known suffix)
  for (const toneName of TONE_NAMES) {
    // Build a pattern that matches the tone key at start of stripped string
    // The tone may be followed by whitespace + variant code, or end of string
    // Escape dots in tone name for regex
    const escaped = toneName.replace(/\./g, '\\.').replace(/\s+/g, '\\s+');
    const rx = new RegExp(`^${escaped}(?:\\s+([A-Za-z][A-Za-z0-9*-]*))?`, 'i');
    const m = stripped.match(rx);
    if (m) {
      const candidateVariant = m[1] ?? '';
      // Validate variant against known variants for this tone
      const validVariants = getVariants(toneName);
      // Accept exact match, or empty if tone has single termination
      if (
        candidateVariant === '' ||
        validVariants.includes(candidateVariant) ||
        validVariants.map(v => v.toLowerCase()).includes(candidateVariant.toLowerCase())
      ) {
        // Normalise variant case to match the dict key
        const normVariant = validVariants.find(
          v => v.toLowerCase() === candidateVariant.toLowerCase()
        ) ?? candidateVariant;
        return { tone: toneName, variant: normVariant };
      }
      // A termination this tone does not have is not a termination. Returning
      // it raw looked like an answer and was not: `getPresetGabc` finds no
      // such key and quietly sings the mediant in its place, so "7at" came out
      // as tone 7 with a cadence belonging to no mode at all. Say no instead,
      // and let the caller's fallback stand.
      return null;
    }
  }

  // Fallback: try plain number pattern like "8" or "8G" or "8 G"
  const numRx = /^([1-8])\s*\.?\s*([A-Za-z][A-Za-z0-9*-]*)?/;
  const numM = stripped.match(numRx);
  if (numM) {
    const toneNum = numM[1];
    const variant = numM[2] ?? '';
    const toneName = `${toneNum}.`;
    if (PSALM_TONES[toneName]) {
      const validVariants = getVariants(toneName);
      const normVariant = validVariants.find(
        v => v.toLowerCase() === variant.toLowerCase()
      );
      // Same rule as above: no invented terminations.
      if (variant && normVariant === undefined) return null;
      return { tone: toneName, variant: normVariant ?? '' };
    }
  }

  return null;
}
