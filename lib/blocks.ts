/**
 * Small predicates over a block list, shared by the on-screen preview and the
 * LaTeX exporter so the two cannot disagree about what gets rendered.
 */

import type { Block } from '@/lib/types';

/** Rubrics that credit a hymn's tune, text, or mode rather than saying anything. */
export const ATTRIBUTION_RE = /^(Tune|Text|Music|Mode|Melody|Copyright):/i;

export function isAttributionRubric(block: Block | undefined): boolean {
  return !!block && block.type === 'rubric' && ATTRIBUTION_RE.test(block.content);
}

/**
 * True when this block is an attribution rubric belonging to a hymn that
 * already carries a GABC score, whose annotation shows the same information.
 *
 * The walk back over preceding attribution rubrics matters: a hymn is usually
 * followed by two or three of them ("Tune: …", "Text: …"), and they should be
 * suppressed as a group. The preview used to look only one block back, so it
 * hid the first and kept the rest, while the exporter carried a sticky flag
 * that it never cleared and hid them all. Same input, different pages.
 */
export function isSuppressedAttribution(blocks: Block[], idx: number): boolean {
  if (!isAttributionRubric(blocks[idx])) return false;

  let k = idx - 1;
  while (k >= 0 && isAttributionRubric(blocks[k])) k--;

  return k >= 0 && blocks[k].type === 'hymn' && !!blocks[k].gabcScore;
}

/**
 * Psalm titles, subtitles, and citations arrive as one or more generic rubric
 * blocks immediately before the psalm. Detect the whole run without changing
 * the alignment of reading citations, hymn credits, or general instructions.
 */
export function isPsalmRubric(blocks: Block[], idx: number): boolean {
  if (blocks[idx]?.type !== 'rubric') return false;

  let k = idx + 1;
  while (k < blocks.length && blocks[k].type === 'rubric') k++;

  return blocks[k]?.type === 'psalm' || blocks[k]?.type === 'psalm-prayer';
}
