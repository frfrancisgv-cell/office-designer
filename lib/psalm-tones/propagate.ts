import { Block } from '@/lib/types';
import { parseToneFromAnnotation } from './parse-annotation';

export function propagateTones(enrichedBlocks: Block[]): Block[] {
  const psalmNumRx = /\bPs(?:alm)?\s*(\d+[A-Za-z]?(?:\.\d+-\d+)?)\b/i;
  let currentTone: string | undefined;
  let currentVariant: string | undefined;

  for (let i = 0; i < enrichedBlocks.length; i++) {
    const b = enrichedBlocks[i];

    // If this is a resolved antiphon, parse its tone from the annotation header
    if (b.type === 'antiphon' && b.gabcScore) {
      const annMatch = b.gabcScore.match(/^annotation:\s*([^;\n]+)/m);
      if (annMatch) {
        const parsed = parseToneFromAnnotation(annMatch[1].trim());
        if (parsed) {
          currentTone = parsed.tone;
          currentVariant = parsed.variant;
        }
      }
    }

    // If this is a rubric, try to extract a psalm number for the next psalm block
    if (b.type === 'rubric') {
      const m = b.content.match(psalmNumRx);
      if (m) {
        // Store on the next adjacent psalm block(s)
        for (let j = i + 1; j < enrichedBlocks.length; j++) {
          const nb = enrichedBlocks[j];
          if (nb.type === 'psalm' || nb.type === 'psalm-prayer') {
            if (!nb.psalmNumber) enrichedBlocks[j] = { ...nb, psalmNumber: m[1] };
            break;
          }
          if (nb.type === 'heading' || nb.type === 'subheading') break;
        }
      }
    }

    // Propagate current tone to psalm blocks
    if (b.type === 'psalm' && currentTone && !b.psalmTone) {
      enrichedBlocks[i] = { ...b, psalmTone: currentTone, psalmVariant: currentVariant ?? '' };
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
    }
  }

  return enrichedBlocks;
}
