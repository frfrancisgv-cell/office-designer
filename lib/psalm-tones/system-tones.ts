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
import { CADENCES, CROWDING, DEFAULT_DISCERNED_RULE, applyMarkExample, exampleSyllables, gabcFormula, markGroups, markedSyllables, scoredSyllables, type Cadence, type CreatedTone, type DiscernedToneRule, type ToneExample } from './creator';
import { PSALM_TONES, type ToneSpec } from './tone-data';
import { applyMode, getModeNames, getVariations, hasVariation, type ModeFamily, type ModeName } from './lypsautierant-modes';
import { syllabifyLine } from './lypsautierant-syllabify';
import { syllabifyLatinLine } from './latin-syllabify';
import { applyPsalmTone, getGabcTones, markEnglishAccents, syllabifyLineForScore } from './psalmtone-wrapper';
import type { SystemTone } from './system-tone-catalogue';

export type { SystemTone } from './system-tone-catalogue';
export { narrowSystemTones } from './system-tone-catalogue';
interface Entry extends SystemTone {
  discerned?: DiscernedToneRule;
  /**
   * `probes` are the other half-lines of the same model text. A tone read onto
   * one line is only a guess at the rule behind it, and these are what that
   * guess is then tried against.
   */
  build(samples: Record<Cadence, string>, lang: 'en' | 'la', probes: string[]): { examples: Record<Cadence, ToneExample>; warnings: string[] };
}

/** The one complete conditional tone supplied so far. */
function discernedEntry(): Entry {
  return {
    id: 'system:discerned:english:tone-1',
    name: 'Conditional Tone 1',
    backend: 'discerned',
    family: 'English — phrase stress',
    tone: '1',
    variant: '',
    clef: 'c4',
    discerned: DEFAULT_DISCERNED_RULE,
    build(samples, lang) {
      if (lang !== 'en') throw new Error('Conditional stress-and-distance tones currently support English only.');
      const examples = Object.fromEntries(CADENCES.map(key => [
        key,
        { syllables: exampleSyllables(syllabifyLineForScore(samples[key])), anchor: 'end' },
      ])) as Record<Cadence, ToneExample>;
      return { examples, warnings: [] };
    },
  };
}

/** psautier/french is byte-identical to psautier/modes, so it is not listed twice. */
const FAMILIES: { family: ModeFamily; label: string }[] = [
  { family: 'english', label: 'English — stress aware' },
  { family: 'gregorian', label: 'Gregorian — stress aware' },
  { family: 'modes', label: 'Positional — syllable count' },
];
const MODE_NUMBER: Record<ModeName, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', peregrinus: 'peregrinus',
};
/** The variation as it is written in the books: a′ and a″, not a_prime. */
function variationLabel(variation: string): string {
  return variation.replace('_dprime', '″').replace('_prime', '′');
}
/**
 * The chant tones have no families on file, so they are read off their names:
 * the office psalm tones, and the three shorter sets that live beside them.
 * The family's own word is dropped from the tone under it, which would only
 * say the same thing twice — “Introit tones › 3”, not “Introit tones › Introit 3”.
 */
const GABC_FAMILIES: { label: string; prefix: RegExp }[] = [
  { label: 'In directum', prefix: /^in dir\.\s*/ },
  { label: 'Introit tones', prefix: /^Introit\s*/ },
  { label: 'Canticle verses', prefix: /^V\.\s*/ },
];
function gabcPlace(name: string): { family: string; tone: string } {
  for (const { label, prefix } of GABC_FAMILIES) {
    if (prefix.test(name)) return { family: label, tone: name.replace(prefix, '') };
  }
  return { family: 'Psalm tones', tone: name };
}

function lypsEntry(family: ModeFamily, label: string, mode: ModeName, variation: string): Entry {
  return {
    id: `system:lyps:${family}:${mode}:${variation}`,
    name: `${MODE_NUMBER[mode]} · ${variationLabel(variation)}`,
    backend: 'lyps',
    family: label,
    tone: MODE_NUMBER[mode],
    variant: variationLabel(variation),
    clef: 'c4',
    build(samples, lang, probes) {
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
        // The flex rules end in \flagflex{\dag}, the dagger in the margin.
        // pointPsalmText adds that itself around a custom rule, so it is not
        // part of what the editor has to reproduce.
        const point = (line: string) => applyMode(family, mode, rule(key), line).replace('\\flagflex{\\dag}', '');
        const lines = probes.map(syllabify).filter(line => line.trim());
        const agreement = (example: ToneExample) =>
          lines.filter(line => applyMarkExample(line, example) === point(line)).length;
        /**
         * A rule read off one line is a guess, and which line it is read off
         * decides how much of the rule is visible at all.
         *
         * Two things cannot be seen from a single line. The anchor: where a
         * line's last accent is also its last syllable, counting from the end
         * and counting from the accent land in the same place. And the shape
         * of the cadence: the mediant of English 1, 6 and 7 is two figures
         * hung on two accents, but on a line where those accents fall close
         * together the marks come out adjacent and read as one figure counted
         * from one place — which then drags the opening figure off its accent
         * on every line spaced differently.
         *
         * So every half-line of the psalm is tried as the model, each under
         * both anchors and with or without the opening mark pinned, and the
         * reading that follows the rule over the most of the psalm is kept.
         * The cadence's own sample line leads, so it wins where it does as
         * well as any other and the editor opens on the expected text.
         */
        const readings = [syllabified, ...lines].flatMap(model => {
          const syllables = markedSyllables(model, point(model));
          const pin = syllables.map((s, i) => i === 0 && s.mark ? { ...s, atStart: true } : s);
          return [
            { syllables, anchor: 'end' as const },
            { syllables, anchor: 'accent' as const },
            ...(syllables[0]?.mark ? [{ syllables: pin, anchor: 'end' as const }, { syllables: pin, anchor: 'accent' as const }] : []),
          ];
        });
        /**
         * The third thing a single line cannot show: what a figure does on a
         * line with no room for it, because the model line has room. So each
         * figure is tried under every rule in turn and keeps the one that
         * points most of the psalm as the tone itself does — the figures at
         * the end of the cadence first, since they are laid down first and
         * are what crowds the figures behind them.
         */
        const tune = (example: ToneExample): ToneExample => {
          if (example.anchor !== 'accent') return example;
          let best = example;
          let matched = agreement(best);
          for (const group of markGroups(example).sort((a, b) => a.ordinal - b.ordinal)) {
            for (const crowded of CROWDING) {
              const candidate = { ...best, syllables: best.syllables.map((s, i) => group.indices.includes(i) ? { ...s, crowded } : s) };
              const n = agreement(candidate);
              if (n > matched) { best = candidate; matched = n; }
            }
          }
          return best;
        };
        let best = tune(readings[0]);
        let matched = agreement(best);
        for (const reading of readings) {
          if (matched >= lines.length) break;
          const tuned = tune(reading);
          const n = agreement(tuned);
          if (n > matched) { best = tuned; matched = n; }
        }
        // A rule no figure ever has to move for says so by not saying it: the
        // stored tone carries a short-line rule only where one was chosen.
        best = { ...best, syllables: best.syllables.map(s => s.crowded === 'step' ? { ...s, crowded: undefined } : s) };
        if (lines.length && matched < lines.length) {
          warnings.push(`${key}: this rule changes shape with the line — the copy points ${matched} of the ${lines.length} half-lines of this psalm as the tone itself does, and the rest differently.`);
        }
        const modelText = best.syllables.map(s => (s.join ? '' : ' ') + s.text).join('').trim();
        const sampleText = syllabified.split(' -- ').join('').trim().split(/\s+/).join(' ');
        if (modelText !== sampleText) {
          warnings.push(`${key}: modelled on “${modelText}”, which shows more of this rule than the first ${key} line of the psalm does.`);
        }
        examples[key] = best;
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
    backend: 'jgabc',
    ...gabcPlace(name),
    variant: ending,
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
  for (const { family, label } of FAMILIES) {
    for (const mode of getModeNames(family)) {
      for (const variation of getVariations(family, mode)) all.push(lypsEntry(family, label, mode, variation));
    }
  }
  for (const [name, spec] of Object.entries(PSALM_TONES)) {
    const endings = spec.terminations ? Object.keys(spec.terminations) : [''];
    for (const ending of endings) all.push(gabcEntry(name, spec, ending));
  }
  all.push(discernedEntry());
  catalogue = new Map(all.map(entry => [entry.id, entry]));
  return catalogue;
}

/** The catalogue as the sidebar shows it, without the readers behind it. */
export function listSystemTones(): SystemTone[] {
  return [...entries().values()]
    .map(({ id, name, backend, family, tone, variant, clef }) => ({ id, name, backend, family, tone, variant, clef }));
}

/**
 * The catalogue narrowed to one tone, a step at a time, for the four selectors
 * the sidebar offers in place of a list of everything.
 *
 * Each step keeps the choice below it wherever that choice still exists, so
 * moving from the English rules to the positional ones stays on the same mode
 * and the same ending; where it does not exist, the first of what is left
 * stands in. The four therefore always name a tone, and never a gap.
 */
/**
 * One built-in tone, read onto the model text as a new and unsaved tone. The
 * name says it is a copy, and the id is new, so saving it can never land on
 * anything the app ships with.
 */
export function copySystemTone(id: string, samples: Record<Cadence, string>, lang: 'en' | 'la', probes: string[] = []): { tone: CreatedTone; warnings: string[] } {
  const entry = entries().get(id);
  if (!entry) throw new Error('That tone is not in the library.');
  const { examples, warnings } = entry.build(samples, lang, probes);
  return {
    tone: {
      version: 1,
      id: crypto.randomUUID(),
      name: `${entry.name} (copy)`.slice(0, 100),
      backend: entry.backend,
      clef: entry.clef,
      examples,
      ...(entry.discerned ? { discerned: entry.discerned } : {}),
    },
    warnings,
  };
}
