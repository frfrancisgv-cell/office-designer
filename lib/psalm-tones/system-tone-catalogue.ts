import type { CreatedTone } from './creator';

/** The browser-safe description of one tone the server can copy. */
export interface SystemTone {
  id: string;
  name: string;
  backend: CreatedTone['backend'];
  family: string;
  tone: string;
  variant: string;
  clef: string;
}

/** Narrow the catalogue through notation, family, tone, and ending selectors. */
export function narrowSystemTones(
  system: SystemTone[],
  choice: { backend: string; family: string; tone: string; variant: string },
) {
  const keep = (values: string[], wanted: string) => values.includes(wanted) ? wanted : values[0] ?? '';
  const options = (list: SystemTone[], key: 'family' | 'tone' | 'variant') => [...new Set(list.map(t => t[key]))];
  const inBackend = system.filter(t => t.backend === choice.backend);
  const families = options(inBackend, 'family');
  const family = keep(families, choice.family);
  const inFamily = inBackend.filter(t => t.family === family);
  const tones = options(inFamily, 'tone');
  const tone = keep(tones, choice.tone);
  const inTone = inFamily.filter(t => t.tone === tone);
  const variants = options(inTone, 'variant');
  const variant = keep(variants, choice.variant);
  return { families, family, tones, tone, variants, variant, picked: inTone.find(t => t.variant === variant) ?? null };
}
