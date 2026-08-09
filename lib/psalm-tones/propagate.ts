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
