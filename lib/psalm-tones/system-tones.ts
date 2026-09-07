/**
 * The tones the app already sings, offered to the creator as starting points.
 *
 * Two families are on file and neither is stored in the creator's own shape:
 * the psautier pointing rules are functions, and the Gregorian tones are GABC
 * formulas. Both are read back the same way — sing the model text with the
 * existing tone, then read the result onto the staff — so what appears in the
 * editor is what that tone actually does to this text, not a transcription of
 * it. The reading is lossy where the editor is simpler than the engine (see
 * scoredSyllables), and the copy is a new tone from the moment it is made:
 * nothing here is ever written back to.
 */
import { CADENCES, exampleSyllables, gabcFormula, markedSyllables, scoredSyllables, type Cadence, type CreatedTone, type ToneExample } from './creator';
import { PSALM_TONES, type ToneSpec } from './tone-data';
import { applyMode, getModeNames, getVariations, hasVariation, type ModeFamily, type ModeName } from './lypsautierant-modes';
import { syllabifyLine } from './lypsautierant-syllabify';
import { syllabifyLatinLine } from './latin-syllabify';
import { applyPsalmTone, getGabcTones, markEnglishAccents, syllabifyLineForScore } from './psalmtone-wrapper';

export interface SystemTone {
  id: string;
  name: string;
  group: string;
  backend: CreatedTone['backend'];
  clef: string;
}
interface Entry extends SystemTone {
  build(samples: Record<Cadence, string>, lang: 'en' | 'la'): { examples: Record<Cadence, ToneExample>; warnings: string[] };
}

/** psautier/french is byte-identical to psautier/modes, so it is not listed twice. */
const FAMILIES: { family: ModeFamily; group: string }[] = [
  { family: 'english', group: 'Psautier · English' },
  { family: 'gregorian', group: 'Psautier · Gregorian' },
  { family: 'modes', group: 'Psautier · positional' },
];
const MODE_NUMBER: Record<ModeName, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', peregrinus: 'peregrinus',
};

function lypsEntry(family: ModeFamily, group: string, mode: ModeName, variation: string): Entry {
  return {
    id: `system:lyps:${family}:${mode}:${variation}`,
    name: `${MODE_NUMBER[mode]} · ${variation.replace('_dprime', '″').replace('_prime', '′')}`,
    group,
    backend: 'lyps',
    clef: 'c4',
    build(samples, lang) {
      const syllabify = lang === 'la' ? syllabifyLatinLine : syllabifyLine;
      const rule = (key: Cadence) => key === 'termination' ? variation : key;
      const examples = {} as Record<Cadence, ToneExample>;
      const warnings: string[] = [];
      for (const key of CADENCES) {
        const syllabified = syllabify(samples[key]);
        if (!hasVariation(family, mode, rule(key))) {
          warnings.push(`${key}: this mode has no ${key} rule of its own, so its syllables come across unmarked.`);
          examples[key] = { syllables: exampleSyllables(syllabified), anchor: 'end' };
          continue;
        }
        examples[key] = { syllables: markedSyllables(syllabified, applyMode(family, mode, rule(key), syllabified)), anchor: 'end' };
      }
      return { examples, warnings };
    },
  };
}

function gabcEntry(name: string, spec: ToneSpec, ending: string): Entry {
  /**
   * Most of these tones carry no flex of their own. A flex is not a second
   * mediant — psalm-tone-engine reads one as a single accent over the tenor,
   * with nothing prepared before it and nothing after — so that is what is
   * drawn: the tenor, and the accent falling to the tone's own flex note.
   * Standing in the mediant's place instead gave a cadence longer than a flex
   * line, which jgabc then had to compress, and the staff no longer showed
   * what was sung.
   */
  const flexFormula = () => {
    if (spec.flex) return spec.flex;
    const { toneTenor, toneFlex } = getGabcTones(spec.mediant, undefined, undefined, spec.clef);
    // Recite on the tenor, fall to the tone's own flex note at the last
    // accent, and stay there to the end of the line. Written the way the
    // editor writes that same drawing, so the copy comes in settled.
    return toneTenor && toneFlex ? `${toneTenor}r '${toneFlex} ${toneFlex}r ${toneFlex}.` : spec.mediant;
  };
  const formulaFor = (key: Cadence) => key === 'first' ? spec.mediant
    : key === 'flex' ? flexFormula()
    : ending ? spec.terminations![ending] : spec.termination ?? spec.mediant;
  return {
    id: `system:jgabc:${name}:${ending}`,
    name: ending ? `${name} ${ending}` : name,
    group: 'Gregorian psalm tones',
    backend: 'jgabc',
    clef: spec.clef,
    build(samples, lang) {
      const examples = {} as Record<Cadence, ToneExample>;
      const warnings: string[] = [];
      const sing = (line: string, gabc: string) => applyPsalmTone({
        text: lang === 'en' ? markEnglishAccents(line) : line,
        gabc, clef: spec.clef, lang, useBoldItalic: false,
      });
      for (const key of CADENCES) {
        const formula = formulaFor(key);
        const read = scoredSyllables(sing(samples[key], formula), formula);
        if (!read) {
          warnings.push(`${key}: the engine sang nothing on this line, so its syllables come across unmarked.`);
          examples[key] = { syllables: exampleSyllables(syllabifyLineForScore(samples[key])), anchor: 'end' };
          continue;
        }
        // What the editor deduces from the drawing is the tone from here on,
        // and it is not always the formula the drawing was read from: a line
        // shorter than the tone was written for, or an accent jgabc moves to
        // fit, lays out differently. So the drawing is read once more from
        // what it now says, and kept if the two have come to rest — drawn and
        // sung then agree, which is the whole use of the staff.
        const drawn = gabcFormula({ syllables: read.syllables, anchor: 'end' });
        const again = scoredSyllables(sing(samples[key], drawn), drawn);
        const settled = again && gabcFormula({ syllables: again.syllables, anchor: 'end' }) === drawn;
        if (!settled) warnings.push(`${key}: jgabc lays this cadence out differently from the tone it came from; the staff shows what it sings.`);
        warnings.push(...read.simplified.map(w => `${key}: ${w}.`));
        examples[key] = { syllables: settled ? again.syllables : read.syllables, anchor: 'end' };
      }
      return { examples, warnings };
    },
  };
}

let catalogue: Map<string, Entry> | null = null;
function entries(): Map<string, Entry> {
  if (catalogue) return catalogue;
  const all: Entry[] = [];
  for (const { family, group } of FAMILIES) {
    for (const mode of getModeNames(family)) {
      for (const variation of getVariations(family, mode)) all.push(lypsEntry(family, group, mode, variation));
    }
  }
  for (const [name, spec] of Object.entries(PSALM_TONES)) {
    const endings = spec.terminations ? Object.keys(spec.terminations) : [''];
    for (const ending of endings) all.push(gabcEntry(name, spec, ending));
  }
  catalogue = new Map(all.map(entry => [entry.id, entry]));
  return catalogue;
}

/** The catalogue as the sidebar shows it, without the readers behind it. */
export function listSystemTones(): SystemTone[] {
  return [...entries().values()].map(({ id, name, group, backend, clef }) => ({ id, name, group, backend, clef }));
}

/**
 * One built-in tone, read onto the model text as a new and unsaved tone. The
 * name says it is a copy, and the id is new, so saving it can never land on
 * anything the app ships with.
 */
export function copySystemTone(id: string, samples: Record<Cadence, string>, lang: 'en' | 'la'): { tone: CreatedTone; warnings: string[] } {
  const entry = entries().get(id);
  if (!entry) throw new Error('That tone is not in the library.');
  const { examples, warnings } = entry.build(samples, lang);
  return {
    tone: { version: 1, id: crypto.randomUUID(), name: `${entry.name} (copy)`.slice(0, 100), backend: entry.backend, clef: entry.clef, examples },
    warnings,
  };
}
