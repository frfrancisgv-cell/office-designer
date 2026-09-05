import type { Block } from '@/lib/types';
import { parseToneFromAnnotation } from './parse-annotation';
import { resolveToneFromMode } from './mode-map';
import type { ResolvedTone } from './mode-map';

/**
 * Carry the antiphon's tone down onto the psalms it governs.
 *
 * The tone is not a property of the psalm; it is the antiphon's, and OCO
 * records it on the antiphon as a `Mode`. `withAnnotation` writes that mode
 * into the score's `annotation:` header, so by the time the blocks are
 * enriched the tone is sitting on each antiphon waiting to be read.
 *
 * `mode-map.ts` answers for both pointing engines at once — the jgabc tone
 * that points the Latin and the lypsautierant `english` variation that points
 * the English — so a psalm carries one decision, not two that can drift.
 * Where the mode maps to nothing, the block keeps whatever tone it arrived
 * with, which is the caller's fallback.
 */
export function propagateTones(enrichedBlocks: Block[]): Block[] {
  const psalmNumRx = /\bPs(?:alm)?\s*(\d+[A-Za-z]?(?:\.\d+-\d+)?)\b/i;
  let currentTone: string | undefined;
  let currentVariant: string | undefined;
  let currentLyps: ResolvedTone | undefined;

  for (let i = 0; i < enrichedBlocks.length; i++) {
    const b = enrichedBlocks[i];

    // If this is a resolved antiphon, parse its tone from the annotation header
    if (b.type === 'antiphon' && b.gabcScore) {
      const annMatch = b.gabcScore.match(/^annotation:\s*([^;\n]+)/m);
      if (annMatch) {
        const resolved = resolveToneFromMode(annMatch[1].trim());
        if (resolved.ok) {
          currentTone = resolved.tone.jgabcTone;
          currentVariant = resolved.tone.jgabcVariant;
          currentLyps = resolved.tone;
        } else {
          // A mode the table does not reach leaves the psalms on whatever the
          // caller gave them. It must not leave them on the *previous*
          // antiphon's tone either — that would be a wrong answer wearing the
          // last right one's clothes.
          currentTone = undefined;
          currentVariant = undefined;
          currentLyps = undefined;
          const parsed = parseToneFromAnnotation(annMatch[1].trim());
          if (parsed) {
            currentTone = parsed.tone;
            currentVariant = parsed.variant;
          }
        }
      }
    }

    // If this is a rubric, try to extract a psalm number for the next psalm block
    if (b.type === 'rubric') {
      const m = b.content.match(psalmNumRx);
      let assignedNumber: string | null = m ? m[1] : null;

      if (!assignedNumber) {
        const cantMatch = b.content.match(/^(?:NT |OT )?Canticle(?: \(([^)]+)\))?/i);
        if (cantMatch) {
          const ref = cantMatch[1] || '';
          if (/Eph/i.test(ref)) assignedNumber = 'NT 4';
          else if (/Phil/i.test(ref)) assignedNumber = 'NT 5';
          else if (/Col/i.test(ref)) assignedNumber = 'NT 6';
          else if (/1\s*Tim/i.test(ref)) assignedNumber = 'NT 7';
          else if (/1\s*Pet/i.test(ref)) assignedNumber = 'NT 8';
          else if (/Rev.*4/i.test(ref)) assignedNumber = 'NT 9';
          else if (/Rev.*11/i.test(ref)) assignedNumber = 'NT 10';
          else if (/Rev.*15/i.test(ref)) assignedNumber = 'NT 11';
          else if (/Rev.*19/i.test(ref)) assignedNumber = 'NT 12';
          else if (/1\s*Chr/i.test(ref)) assignedNumber = 'OT 2';
          else if (/Tob/i.test(ref)) assignedNumber = 'OT 3';
          else if (/Jdt/i.test(ref)) assignedNumber = 'OT 4';
          else if (/Is.*12/i.test(ref)) assignedNumber = 'OT 5';
          else if (/Hab/i.test(ref)) assignedNumber = 'OT 6';
          else if (/Deut/i.test(ref)) assignedNumber = 'OT 7';
          else if (/Dan/i.test(ref)) assignedNumber = 'OT 1';
          else if (/1\s*Sam/i.test(ref)) assignedNumber = 'OT 11';
          else if (/Is.*38/i.test(ref)) assignedNumber = 'OT 9';
          else if (/Is.*40/i.test(ref)) assignedNumber = 'OT 16';
          else if (/Is.*42/i.test(ref)) assignedNumber = 'OT 17';
          else if (/Is.*61/i.test(ref)) assignedNumber = 'OT 21';
          else if (/Is.*66/i.test(ref)) assignedNumber = 'OT 22';
          else if (/Ez/i.test(ref)) assignedNumber = 'OT 20';
          else if (/Wis/i.test(ref)) assignedNumber = 'OT 18';
        }
      }

      if (assignedNumber) {
        // Store on the next adjacent psalm block(s)
        for (let j = i + 1; j < enrichedBlocks.length; j++) {
          const nb = enrichedBlocks[j];
          if (nb.type === 'psalm' || nb.type === 'psalm-prayer') {
            if (!nb.psalmNumber) enrichedBlocks[j] = { ...nb, psalmNumber: assignedNumber };
            break;
          }
          if (nb.type === 'heading' || nb.type === 'subheading') break;
        }
      }
    }

    // Assign canticle name to the next psalm block if this is a canticle heading
    if (b.type === 'heading') {
      let canticleName: string | null = null;
      if (/MAGNIFICAT|MARY/i.test(b.content)) canticleName = 'Magnificat';
      else if (/BENEDICTUS|ZECHARIAH/i.test(b.content)) canticleName = 'Benedictus';
      else if (/NUNC DIMITTIS|SIMEON/i.test(b.content)) canticleName = 'Nunc dimittis';
      
      if (canticleName) {
        for (let j = i + 1; j < enrichedBlocks.length; j++) {
          const nb = enrichedBlocks[j];
          if (nb.type === 'psalm') {
            if (!nb.psalmNumber) enrichedBlocks[j] = { ...nb, psalmNumber: canticleName };
            break;
          }
          if (nb.type === 'heading' && j !== i) break;
        }
      }
    }

    // Propagate current tone to psalm blocks. A psalm that carries its own
    // score — the invitatory's Venite exsultemus — is engraved rather than
    // pointed, and must not be given a tone to be pointed to.
    if (b.type === 'psalm' && currentTone && !b.gabcScore) {
      enrichedBlocks[i] = {
        ...b,
        psalmTone: currentTone,
        psalmVariant: currentVariant ?? '',
        toneSource: 'oco' as const,
        ...(currentLyps ? {
          lypsautierantFamily: currentLyps.lypsFamily,
          lypsautierantMode: currentLyps.lypsMode,
          lypsautierantVariation: currentLyps.lypsVariation,
        } : {}),
      };
    }

    // Reset tone propagation after the Gospel Canticle heading
    if (
      b.type === 'heading' &&
      (b.content.toUpperCase().includes('GOSPEL CANTICLE') ||
        b.content.toUpperCase().includes('BENEDICTUS') ||
        b.content.toUpperCase().includes('MAGNIFICAT'))
    ) {
      currentTone = undefined;
      currentVariant = undefined;
      currentLyps = undefined;
    }
  }

  return enrichedBlocks;
}
