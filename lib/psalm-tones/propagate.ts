import type { Block } from '@/lib/types';
import { parseToneFromAnnotation } from './parse-annotation';
import { resolveToneFromMode } from './mode-map';
import type { ResolvedTone } from './mode-map';
import { resolveCanticleKey } from '@/lib/liturgy/canticle-refs';

/**
 * The psalm's number, out of the rubric that titles it.
 *
 * The Latin office prints both numberings — "Psalmus 109 (110), 1-5. 7" — and
 * the parenthesised one is the Hebrew, which is what both text loaders want:
 * the Grail psalter is numbered that way, and the Latin loader converts back
 * to the Vulgate itself. Until the Latin word was matched at all, every psalm
 * of a Latin import went without a number, and so without either button.
 */
const PSALM_NUMBER =
  /\bPs(?:alm(?:us)?)?\.?\s*\d+[A-Za-z]?\s*\((\d+)\)|\bPs(?:alm(?:us)?)?\.?\s*(\d+[A-Za-z]?(?:\.\d+-\d+)?)\b/i;

/**
 * The rubric that titles a canticle, and the citation inside it.
 *
 * iBreviary writes it "Canticle: Deuteronomy 32:1-12" and "Canticle: See
 * Revelation 19:1-7", the Latin "Canticum Deut 32, 1-12" and "Canticum Cf. Ap
 * 19, 1-2. 5-7"; the subtitle that follows is on the next line. Only the
 * parenthesised form was ever matched, and the office prints none, so no
 * canticle in an imported hour was ever given a number.
 */
const CANTICLE_RUBRIC = /^(?:NT |OT )?Cantic(?:le|um)\s*:?\s*\(?\s*([^)\n]+)/i;

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
      const m = b.content.match(PSALM_NUMBER);
      let assignedNumber: string | null = m ? (m[1] ?? m[2]) : null;

      if (!assignedNumber) {
        const cantMatch = b.content.match(CANTICLE_RUBRIC);
        if (cantMatch) assignedNumber = resolveCanticleKey(cantMatch[1]);
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
