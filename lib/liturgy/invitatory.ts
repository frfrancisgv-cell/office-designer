/**
 * The Invitatory: the versicle, the antiphon, and Psalm 94 sung under it.
 *
 * Three things about this office are settled and shape the whole file:
 *
 *  1. **Psalm 94 is the only invitatory psalm.** There is no option and no
 *     rubric about one.
 *  2. **The antiphon and the psalm are Gregorian chant, in Latin**, at an
 *     English office as much as a Latin one. So there is no English pointing
 *     path here, and an English booklet says so in a rubric rather than
 *     quietly printing the one Latin page in the hour without explanation.
 *  3. **The psalm's text comes out of its own score.** Gregobase's *Venite
 *     exsultemus* is not a tone formula but the whole psalm written out with
 *     its melody, and the text it carries is the Roman Psalter's — "Quóniam
 *     non repéllet Dóminus plebem suam" is sung in it and is not in the Nova
 *     Vulgata at all. Setting the Nova Vulgata text under that score would
 *     print words the music contradicts, which is the same fault as the
 *     "Christus apparuit" text on the Christmas antiphon.
 *
 * The score is already divided into the five strophes and the doxology that
 * the antiphon is repeated after; this file cuts it at those divisions and
 * lets the office engine interleave the antiphon.
 */

import type { Block, GabcCandidate } from '@/lib/types';

/**
 * The day's invitatory, as OCO and Gregobase answer for it. Resolved by the
 * caller — `lib/` does not read the chant indexes, `app/api/ibreviary` does —
 * and handed to the office engine, which only assembles it.
 */
export interface InvitatoryChant {
  /** The antiphon's text, from `IDX_INV.csv`'s `Text` column. */
  antiphon: string;
  /** Its score, when one is taken rather than offered. */
  antiphonGabc?: string;
  /** The day's other antiphons, where the index gives an *ad libitum* choice. */
  antiphonCandidates?: GabcCandidate[];
  /** The mode the antiphon records, which is what chose the tone. */
  mode?: string;
  /** The whole of Psalm 94 with its melody, from Gregobase. */
  toneGabc?: string;
}

/**
 * *Domine, labia mea aperies*, which opens the day and is signed on the lips.
 * Written the way the engine writes the *Deus in adiutorium* it replaces.
 */
export const INVITATORY_VERSICLE: Record<'en' | 'la', string> = {
  la: 'V. Dómine, lábia mea apéries.\nR. Et os meum annuntiábit laudem tuam.',
  en: 'Lord, + open my lips. — And my mouth will proclaim your praise.',
};

/**
 * The English booklet's note that this one part of Lauds is in Latin. It is
 * the user's intent, not an oversight, so it is stated rather than mended.
 */
export const INVITATORY_LATIN_NOTE =
  'The Invitatory is sung in Latin, to the Gregorian tone of its own antiphon.';

/**
 * Cut a *Venite exsultemus* at its double bars: five strophes and the
 * doxology, each of which the antiphon is sung after.
 *
 * The bar is not always its own group. Most of the eleven scores write it
 * `(::Z)` or `(::/)`, but mode 4* hangs it off the last note of the strophe —
 * `i.(d/eed.::Z)` — so the cut is made after whichever group contains the
 * `::`, not after groups that are nothing but a bar. Blank lines are no guide
 * either: mode 4** transcribes six strophes in four paragraphs.
 */
export function splitInvitatoryTone(gabc: string): string[] {
  const pieces: string[] = [];
  let start = 0;
  for (const m of gabc.matchAll(/::[^)]*\)/g)) {
    const end = m.index + m[0].length;
    const piece = gabc.slice(start, end).trim();
    if (piece) pieces.push(piece);
    start = end;
  }
  const tail = gabc.slice(start).trim();
  if (tail) pieces.push(tail);
  return pieces;
}

/**
 * The words of a piece of GABC, one line per bar.
 *
 * A group holding `;` or `:` is a half or full bar and ends a verse; `(,)` is
 * a quarter bar inside one and is left where it falls. The two-letter capital
 * that opens a score is a drop cap — "VEníte" is one word, not a shout. A
 * whole-line `%` comment is the transcriber talking, not a word of the psalm;
 * mode 4** has one sitting on top of its doxology.
 */
export function gabcText(gabc: string): string {
  const lines: string[] = [];
  let current = '';
  for (const m of gabc.replace(/^[ \t]*%[^\n]*$/gm, '').matchAll(/([^()]*)\(([^)]*)\)/g)) {
    current += m[1];
    if (/[;:]/.test(m[2])) {
      const line = current.replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
      current = '';
    }
  }
  const last = current.replace(/\s+/g, ' ').trim();
  if (last) lines.push(last);
  return lines
    .join('\n')
    .replace(/\b([A-ZÆŒ])([A-ZÆŒ]+)(?=[a-zæœàáâäèéêëìíîïòóôöùúûü])/g,
      (_, first, rest) => first + rest.toLowerCase());
}

/**
 * The Invitatory as blocks, in the order it is sung: the versicle, then the
 * antiphon before each of the psalm's six divisions and again after the last.
 *
 * Nothing here is invented. When the day resolves no antiphon, or the mode it
 * records has no *Venite exsultemus*, the gap is printed as a rubric — a
 * plausible wrong psalm would be worse than a visible hole.
 */
export function buildInvitatoryBlocks(
  lang: 'en' | 'la',
  chant: InvitatoryChant | null | undefined,
  newId: () => string,
): Block[] {
  const blocks: Block[] = [];
  const push = (block: Omit<Block, 'id'>) => blocks.push({ id: newId(), ...block } as Block);

  push({ type: 'heading', content: 'INVITATORY' });
  if (lang === 'en') push({ type: 'rubric', content: INVITATORY_LATIN_NOTE });
  push({ type: 'text', content: INVITATORY_VERSICLE[lang] });

  if (!chant?.antiphon) {
    push({
      type: 'rubric',
      content: '[No invitatory antiphon for this day in OCO’s IDX_INV.csv, '
             + 'and so no tone for Psalm 94 either.]',
    });
    return blocks;
  }

  // One choice offered is one choice not yet made: an antiphon with
  // alternatives carries them instead of a score, the way `populateGabc`
  // leaves an *ad libitum* antiphon for the editor to settle.
  const offered = (chant.antiphonCandidates?.length ?? 0) > 1;
  const antiphon = (): Omit<Block, 'id'> => ({
    type: 'invitatory-antiphon',
    content: chant.antiphon,
    ...(offered
      ? { gabcCandidates: chant.antiphonCandidates }
      : chant.antiphonGabc ? { gabcScore: chant.antiphonGabc } : {}),
  });

  const strophes = chant.toneGabc ? splitInvitatoryTone(chant.toneGabc) : [];
  if (!strophes.length) {
    push(antiphon());
    push({
      type: 'rubric',
      content: `[No Venite exsultemus in Gregobase for mode ${chant.mode || '—'}, `
             + 'so Psalm 94 has no score to be sung from.]',
    });
    push(antiphon());
    return blocks;
  }

  for (const strophe of strophes) {
    push(antiphon());
    push({
      type: 'psalm',
      content: gabcText(strophe),
      gabcScore: strophe,
      // Hebrew numbering, as everywhere else in the app; the score's own text
      // is the Roman Psalter's, which is why it is not loaded from the
      // psalter. Deliberately no `psalmTone`: this psalm is engraved, not
      // pointed, and a tone here would invite the pointing engine to set it.
      psalmNumber: '95',
      lang: 'la',
    });
  }
  push(antiphon());

  return blocks;
}
