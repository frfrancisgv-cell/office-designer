/**
 * The psalter schema's own tone, as the pointing fields of a psalm block.
 *
 * `psalter-schema.ts` names a `defaultTone` per slot — `'8.G'`, `'1.D'`,
 * `'4.E'` — and until the antiphon has been resolved that is all the office
 * engine knows. `propagateTones` overwrites these from OCO's recorded mode
 * wherever it can read one; what survives is the fallback the user accepted,
 * and `toneSource` is what makes it countable afterwards.
 *
 * The lypsautierant fields are filled from the same tone, so an English office
 * on the fallback is pointed to the tone the schema named rather than to
 * `english/eight`, which is what `BlockEditor` assumes when nothing is set.
 */

import type { Block } from '@/lib/types';
import { resolveToneFromMode } from '@/lib/psalm-tones/mode-map';
import { getVariants } from '@/lib/psalm-tones/tone-data';

type Pointing = Pick<Block,
  'psalmTone' | 'psalmVariant' | 'toneSource'
  | 'lypsautierantFamily' | 'lypsautierantMode' | 'lypsautierantVariation'>;

export function defaultTonePointing(defaultTone: string): Pointing {
  const [tone, rawVariant = ''] = defaultTone.split('.');
  const jgabcTone = tone + '.';
  // The schema writes `2.D`, and mode 2 has one termination and no code for
  // it. A code the tone does not have makes `getPresetGabc` fall through to
  // the mediant, so it is dropped rather than carried.
  const variants = getVariants(jgabcTone);
  const variant = variants.find(v => v.toLowerCase() === rawVariant.toLowerCase()) ?? '';
  // "8.G" is OCO's "8g"; the map reads the mode-and-termination spelling.
  const resolved = resolveToneFromMode(tone + rawVariant);

  return {
    psalmTone: jgabcTone,
    psalmVariant: variant,
    toneSource: 'default',
    ...(resolved.ok ? {
      lypsautierantFamily: resolved.tone.lypsFamily,
      lypsautierantMode: resolved.tone.lypsMode,
      lypsautierantVariation: resolved.tone.lypsVariation,
    } : {}),
  };
}
