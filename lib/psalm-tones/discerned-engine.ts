/**
 * Experimental note-specific English psalmody.
 *
 * These tones are not fixed GABC formulae.  They first discern stresses in a
 * phrase, then choose notes from the distance between those stresses.  GABC
 * is consequently the result of this module, not its input language.
 *
 * Only Tone 1 is present: it is the only tone for which we have both a
 * mediation and an ending.  Missing melodies must not be silently guessed.
 */
import { accentuateEnglish } from './english-phonetic';
import { DEFAULT_DISCERNED_RULE, type DiscernedToneRule } from './creator';
import { describeStructure } from './lypsautierant-engine';
import { syllabifyLineForScore } from './psalmtone-wrapper';

const ACUTE = /[áéíóúýÁÉÍÓÚÝ]/;

export type DiscernedStress = 'none' | 'minor' | 'major';
export type DiscernedCadence = 'mediation' | 'ending' | 'flex';
export interface DiscernedSyllable {
  text: string;
  /** True when this syllable continues the preceding word. */
  join: boolean;
  stress: DiscernedStress;
  /** GABC notes under this syllable, in a c4 clef. */
  notes: string;
}
export interface DiscernedLine {
  syllables: DiscernedSyllable[];
  warnings: string[];
}
export interface DiscernedResult {
  gabc: string;
  warnings: string[];
  /** Phrase stresses supplied by the rhythmic heuristic, for human review. */
  inferences: string[];
  accented: string;
  accentsDerived: boolean;
}

/** Words which can bear a secondary phrase accent more readily than glue words. */
const PRONOUNS = new Set('i you he she we they me him her us them who whom'.split(' '));
const RHYTHMIC = new Set('not no now then there here still yet all each both'.split(' '));
const POSSESSIVES = new Set('my your his her our their its'.split(' '));
const GLUE = new Set(('a an the and or but for nor so yet as at by from in into of off on onto per ' +
  'than to up upon with without am are be been being is was were do does did have has had may might ' +
  'must shall should can could will would').split(' '));

function plain(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z']/g, '');
}

/** Read the score syllabifier's ` -- ` convention into stable syllable records. */
function divided(line: string): DiscernedSyllable[] {
  const result: DiscernedSyllable[] = [];
  let join = false;
  for (const token of syllabifyLineForScore(line).trim().split(/\s+/)) {
    if (token === '--') { join = true; continue; }
    result.push({ text: token, join, stress: ACUTE.test(token) ? 'major' : 'none', notes: 'h' });
    join = false;
  }
  return result;
}

/** The complete word containing a syllable, used only to rank minor stresses. */
function wordAt(syllables: DiscernedSyllable[], at: number): string {
  let first = at;
  while (first > 0 && syllables[first].join) first--;
  let last = at + 1;
  while (last < syllables.length && syllables[last].join) last++;
  return plain(syllables.slice(first, last).map(s => s.text).join(''));
}

function minorSuitability(word: string): number {
  if (PRONOUNS.has(word)) return 40;
  if (RHYTHMIC.has(word)) return 35;
  if (POSSESSIVES.has(word)) return 15;
  if (GLUE.has(word)) return 0;
  return 25;
}

/**
 * Add one secondary stress inside a gap of three or more unstressed syllables.
 *
 * The psalter dictionary deliberately passes over function words.  Here that
 * is useful evidence, but not an absolute prohibition: personal pronouns can
 * bear a rhythmic secondary stress (the supplied example chooses "you"),
 * whereas an article, preposition, or auxiliary is a last resort.  A tie is
 * settled by proximity to the middle of the gap, then by the earlier word.
 */
function addMinorStresses(syllables: DiscernedSyllable[]): void {
  const majors = syllables.flatMap((s, i) => s.stress === 'major' ? [i] : []);
  for (let k = 1; k < majors.length; k++) {
    const left = majors[k - 1], right = majors[k];
    if (right - left - 1 <= 2) continue;
    const middle = (left + right) / 2;
    const candidates = [] as { at: number; suitability: number; distance: number }[];
    for (let at = left + 1; at < right; at++) {
      // A word receives a phrase stress on its own lexical syllable.  In
      // already-accentuated text an unaccented multisyllable word supplies no
      // trustworthy lexical position, so do not manufacture one inside it.
      if (syllables[at].join || syllables[at + 1]?.join) continue;
      candidates.push({ at, suitability: minorSuitability(wordAt(syllables, at)), distance: Math.abs(at - middle) });
    }
    candidates.sort((a, b) => b.suitability - a.suitability || a.distance - b.distance || a.at - b.at);
    if (candidates[0] && candidates[0].suitability > 0) syllables[candidates[0].at].stress = 'minor';
  }
}

export function analyzeDiscernedLine(line: string): DiscernedSyllable[] {
  const syllables = divided(line);
  addMinorStresses(syllables);
  return syllables;
}

function stresses(syllables: DiscernedSyllable[]): number[] {
  return syllables.flatMap((s, i) => s.stress !== 'none' ? [i] : []);
}

/** Apply the rules supplied for Tone 1, without filling in any missing tone. */
export function applyDiscernedTone1(
  line: string,
  cadence: DiscernedCadence,
  rule: DiscernedToneRule = DEFAULT_DISCERNED_RULE,
): DiscernedLine {
  const syllables = analyzeDiscernedLine(line).map(s => ({ ...s, notes: rule.reciting }));
  const warnings: string[] = [];
  const accented = stresses(syllables);

  if (cadence === 'flex') {
    warnings.push(`Tone 1 flex was not supplied; this flex remains on the reciting note ${rule.reciting}.`);
    return { syllables, warnings };
  }
  if (!accented.length) {
    warnings.push(`Tone 1 ${cadence} needs a stress, but none was found; this line remains on ${rule.reciting}.`);
    return { syllables, warnings };
  }

  const last = accented.at(-1)!;
  if (cadence === 'ending') {
    // Earlier-to-later, the two syllables before the final stress are G, F;
    // the final stress and any syllables following it remain on D.
    if (last >= 2) {
      syllables[last - 2].notes = rule.ending.preparations[0];
      syllables[last - 1].notes = rule.ending.preparations[1];
    } else {
      warnings.push('Tone 1 ending has fewer than two syllables before its final stress; only the notes that fit were used.');
      if (last === 1) syllables[0].notes = rule.ending.preparations[1];
    }
    for (let i = last; i < syllables.length; i++) syllables[i].notes = rule.ending.final;
    return { syllables, warnings };
  }

  if (accented.length < 2) {
    syllables[last].notes = rule.mediation.return;
    warnings.push(`Tone 1 mediation needs two stresses; only the final ${rule.mediation.return} could be placed.`);
    return { syllables, warnings };
  }
  const previous = accented.at(-2)!;
  const between = last - previous - 1;
  syllables[previous].notes = rule.mediation.previous;
  syllables[last].notes = rule.mediation.return;

  if (between === 1) {
    syllables[previous].notes = rule.mediation.previous + rule.mediation.return;
    syllables[previous + 1].notes = rule.mediation.passing;
  } else if (between === 2) {
    syllables[previous + 1].notes = rule.mediation.return;
    syllables[previous + 2].notes = rule.mediation.passing;
  } else if (between >= 3) {
    if (last === syllables.length - 1) {
      syllables[last - 2].notes = rule.mediation.passing;
      syllables[last - 1].notes = rule.mediation.return;
    } else {
      syllables[last - 1].notes = rule.mediation.passing;
    }
  } else {
    // Two adjacent stressed syllables have no place for the intervening G.
    // Preserve both stated anchor notes and report the compression.
    warnings.push('Tone 1 mediation has adjacent final stresses; B-flat and the returning A were kept without an intervening G.');
  }
  return { syllables, warnings };
}

function gabcLine(syllables: DiscernedSyllable[]): string {
  return syllables.map((s, i) => `${s.join ? '' : i ? ' ' : ''}${s.text}(${s.notes}${i === syllables.length - 1 ? '.' : ''})`).join('');
}

/** Point a complete English psalm and serialize the chosen notes as GABC. */
export function pointDiscernedTone1(text: string, rule: DiscernedToneRule = DEFAULT_DISCERNED_RULE, clef = 'c4'): DiscernedResult {
  const accentsDerived = !ACUTE.test(text);
  const accented = accentsDerived ? accentuateEnglish(text) : text;
  const warnings: string[] = [];
  const inferences: string[] = [];
  const stanzas = describeStructure(accented);
  const score = stanzas.map(stanza => stanza.map(part => {
    if (part.role === 'divider') return '';
    const cadence: DiscernedCadence = part.role === 'first' ? 'mediation'
      : part.role === 'termination' ? 'ending' : 'flex';
    const applied = applyDiscernedTone1(part.text, cadence, rule);
    warnings.push(...applied.warnings.map(w => `${part.text}: ${w}`));
    const minor = applied.syllables.filter(s => s.stress === 'minor').map(s => `“${s.text.replace(/[^\p{L}\p{M}'’-]/gu, '')}”`);
    if (minor.length) inferences.push(`${part.text}: inferred minor ${minor.length === 1 ? 'stress' : 'stresses'} on ${minor.join(', ')}.`);
    const marker = part.role === 'first' ? ' *(:)' : part.role === 'flex' ? ' †(;)' : ' (::)';
    return gabcLine(applied.syllables) + marker;
  }).filter(Boolean).join(' ')).join(' ');
  return {
    gabc: `(${clef}) ${score}`,
    warnings: [...new Set(warnings)],
    inferences: [...new Set(inferences)],
    accented,
    accentsDerived,
  };
}
