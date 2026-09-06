/**
 * The Latin office's propers, taken from the score OCO prescribes for the day.
 *
 * `vendor/psautier` is an English book, so `getOfflineProper` is guarded to
 * `lang === 'en'` and a Latin office has never had a proper of any kind: it
 * printed the generic ferial hymn out of `data/hymns.ts`, `Ant. 1. Psalm 63`
 * where the antiphon belongs, and the same "Ant. Magníficat ánima mea Dóminum."
 * at every Vespers of the year. Over 61 sampled days of 2026 a Latin Lauds and
 * Vespers between them produced **one** collect and **two** readings.
 *
 * But the Latin office is the one part of this app whose sources are all here:
 * OCO names the antiphon and the hymn for every day, `populateGabc` already
 * finds them, and the score it hangs on each block carries the words. Nothing
 * needs to be looked up twice — the text is read off the chant that was chosen,
 * so the words and the music on a block can never name different antiphons.
 *
 * This runs after `populateGabc`, in `app/api/liturgy/route.ts`, for the same
 * reason `propagateTones` does: the chant indexes live under
 * `app/api/ibreviary` and `lib/` is not to reach into them, so the engine
 * assembles the office and the route fills in what OCO answers for.
 *
 * Two things it deliberately does not do:
 *
 *  - **It never invents.** A block with no score keeps whatever the engine
 *    wrote, and a block still offering `gabcCandidates` is a choice the editor
 *    has not made yet, so its text is left alone rather than guessing at one of
 *    them. Both are visible gaps, which is the rule.
 *  - **It does not touch English text.** An English booklet's antiphons are
 *    ICEL's and are not in the repo (see the sourcing section of the plan);
 *    printing the Latin under an English psalm would be a different office, not
 *    a fuller one.
 */

import type { Block } from '@/lib/types';
import { antiphonText } from './gabc-text';

/**
 * The label an antiphon block opens with — "Ant. 1.", "Ant." — which numbers
 * the antiphon's place in the psalmody and is the engine's, not the chant's.
 * It is kept and the words after it replaced.
 */
const ANTIPHON_LABEL = /^(Ant\.(?:\s*\d+)?\s*[.:]?)\s*/;

/** Blocks whose text is the chant's own words when a chant has been chosen. */
const SUNG = new Set(['antiphon', 'hymn']);

/**
 * Put the words of each block's chosen score onto the block.
 *
 * A score is only chosen — rather than offered — when OCO answered the day
 * unambiguously, which is exactly when its words can be trusted as this day's
 * antiphon or hymn.
 */
export function textFromChant(blocks: Block[]): Block[] {
  return blocks.map(block => {
    if (!SUNG.has(block.type) || !block.gabcScore || block.gabcCandidates?.length) return block;

    const words = antiphonText(block.gabcScore);
    if (!words) return block;

    if (block.type === 'hymn') return { ...block, content: words };

    const label = block.content.match(ANTIPHON_LABEL)?.[1].trim();
    return { ...block, content: label ? `${label} ${words.replace(/\n/g, ' ')}` : words };
  });
}

/** How many blocks of each kind took their text from a score — for the log. */
export function chantTextCoverage(before: Block[], after: Block[]): Record<string, [number, number]> {
  const tally: Record<string, [number, number]> = {};
  before.forEach((block, i) => {
    if (!SUNG.has(block.type)) return;
    const seen = tally[block.type] ?? (tally[block.type] = [0, 0]);
    seen[1]++;
    if (after[i]?.content !== block.content) seen[0]++;
  });
  return tally;
}
