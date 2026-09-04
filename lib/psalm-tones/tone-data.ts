/**
 * Gregorian psalm tone definitions ported from bbloomf/jgabc psalmtone.js
 * Pure data — no DOM dependency, no localStorage.
 *
 * GABC notation: lowercase letters are notes (a=lowest ... k=highest),
 * ' = accent on next note, r = repercussio, x = liquescent, + = virga
 * Termination keys match the variant labels used by jgabc (e.g. "D", "g", "G*")
 */

export interface ToneSpec {
  clef: string;
  initium?: string;
  intonation?: string;
  flex?: string;
  mediant: string;
  solemn?: string;
  shortMediant?: string;
  shortSolemn?: string;
  /** Single termination (modes with only one) */
  termination?: string;
  /** Multiple terminations keyed by variant code */
  terminations?: Record<string, string>;
}

export type ToneDict = Record<string, ToneSpec>;

/**
 * The complete dictionary of Gregorian psalm tones.
 * Key = tone name as displayed in UI (e.g. "1.", "8.", "per.")
 */
export const PSALM_TONES: ToneDict = {
  '1.': {
    clef: 'c4',
    mediant: "f gh hr 'ixi hr 'g hr h.",
    solemn: "f gh hr hg ixgi h hr 'hg gh..",
    terminations: {
      'D':  "hr g f 'gh gr gvFED.",
      'D-': "hr g f 'g gr gvFED.",
      'D2': "hr g f gr 'gf d.",
      'f':  "hr g f 'gh gr gf..",
      'g':  "hr g f 'gh gr g.",
      'g2': "hr g f 'g gr ghg.",
      'g3': "hr g f 'g gr g.",
      'a':  "hr g f 'g hr h.",
      'a2': "hr g f 'g gr gh..",
      'a3': "hr g f 'gh gr gh..",
    },
  },
  '2.': {
    clef: 'f3',
    mediant: "e f hr 'i hr h.",
    solemn: "e fe eh hr hg hi i 'hi hr h.",
    termination: "hr g 'e fr f.",
  },
  '2. monasticus': {
    clef: 'f3',
    mediant: "e f hr 'i hr h.",
    solemn: "e fe eh hr hg hi i 'hi hr h.",
    termination: "hr g er 'ef f.",
  },
  '3.': {
    clef: 'c4',
    mediant: "g hj jr 'k jr jr 'ih j.",
    solemn: "g hj jr 'jk jr jr 'ih hj..",
    terminations: {
      'b':  "jr h 'j jr i.",
      'a':  "jr h 'j jr ih..",
      'a2': "jr ji hi 'h gr gh..",
      'g':  "jr ji hi 'h gr g.",
      'g2': "jr h j i 'h gr g.",
    },
  },
  '3. antiquo': {
    clef: 'c4',
    mediant: "g hi ir 'k jr jr 'ih j.",
    solemn: "g hi ir 'jk jr jr 'ih hj..",
    terminations: {
      'b':  "ir 'j hr hr 'j jr i.",
      'a':  "ir 'j hr hr 'j jr ih..",
      'a2': "ir 'j hr hi 'h gr gh..",
      'a3': "ir 'ji hr hi 'h gr gh..",
      'g':  "ir 'j hr hi 'h gr g.",
      'g2': "ir 'ji hr hi 'h gr g.",
    },
  },
  '4.': {
    clef: 'c4',
    mediant: "h gh hr g h 'i hr h.",
    solemn: "h gh hr hg gi i 'hi hr h.",
    terminations: {
      'g': "hr 'h gr g.",
      'E': "hr g h ih gr 'gf e.",
    },
  },
  '4. antiquo': {
    clef: 'c4',
    mediant: "e gh hr g h 'i hr h.",
    solemn: "h gh hr hg gi i 'hi hr h.",
    terminations: {
      'g': "hr 'h gr g.",
      'E': "hr g h ih gr 'gf e.",
    },
  },
  '4. alt': {
    clef: 'c3',
    mediant: "i hi ir h i 'j ir i.",
    solemn: "i hi ir ih hj j 'ij ir i.",
    terminations: {
      'c':  "ir 'i hr h.",
      'A':  "ir h i j 'h fr f.",
      'A*': "ir h i j 'h fr fg..",
      'd':  "ir h i j 'h ir i.",
    },
  },
  '4. antiquo alt': {
    clef: 'c3',
    mediant: "f hi ir h i 'j ir i.",
    solemn: "i hi ir ih hj j 'ij ir i.",
    terminations: {
      'c':  "ir 'i hr h.",
      'A':  "ir h i j 'h fr f.",
      'A*': "ir h i j 'h fr fg..",
      'd':  "ir h i j 'h ir i.",
    },
  },
  '5.': {
    clef: 'c3',
    mediant: "d f hr 'i hr h.",
    solemn: "d f hr i 'i hr h.",
    termination: "hr 'i gr 'h fr f.",
  },
  '6.': {
    clef: 'c4',
    mediant: "f gh hr 'ixi hr 'g hr h.",
    solemn: "f gh hr hg ixgi h hr 'hg gh..",
    termination: "hr f gh 'g fr f.",
  },
  '6. alt': {
    clef: 'c4',
    mediant: "f gh hr g 'h fr f.",
    termination: "hr f gh 'g fr f.",
  },
  '7.': {
    clef: 'c3',
    mediant: "hg hi ir 'k jr 'i jr j.",
    solemn: "ehg hi ir 'ik jr jr 'ji ij..",
    shortMediant: "hg hi ir i.",
    shortSolemn: "ehg hi ir i.",
    terminations: {
      'a':  "ir 'j ir 'h hr gf..",
      'b':  "ir 'j ir 'h hr g.",
      'c':  "ir 'j ir 'h hr gh..",
      'c2': "ir 'j ir 'h hr ih..",
      'd':  "ir 'j ir 'h hr gi..",
    },
  },
  '8.': {
    clef: 'c4',
    mediant: "g h jr 'k jr j.",
    solemn: "g hg gj jr ji jk k 'jk jr j.",
    terminations: {
      'G':  "jr i j 'h gr g.",
      'G*': "jr i j 'h gr gh..",
      'c':  "jr h j 'k jr j.",
    },
  },
  'per.': {
    clef: 'c4',
    mediant: "ixhi hr g ixi h 'g fr f.",
    termination: "gr d 'f fr ed..",
  },
  'per.-alt': {
    clef: 'c4',
    mediant: "ixhi hr ixi h 'g fr f.",
    termination: "ixhi gr d 'f fr ed..",
  },
  'irregularis': {
    clef: 'c4',
    mediant: "f gh hr 'g fr f.",
    terminations: {
      'a':  "hr ixi g ixi h.",
      'a2': "hr 'ixi gr gr 'ixi ir h.",
    },
  },
  'in dir. romanus': {
    clef: 'c3',
    mediant: "hr g f 'h hr h.",
    termination: "hr 'h fr f.",
  },
  'in dir. monasticus': {
    clef: 'c3',
    mediant: "hr g f 'h hr h.",
    termination: "hr h.",
  },
  'in dir. T.P.': {
    clef: 'c3',
    mediant: "e f hr i 'i fr f.",
    termination: "hr e f 'g fr f.",
  },
  // Introit tones
  'Introit 1': {
    clef: 'c4',
    mediant: "f gh hr 'hj hr hr 'hg gh..",
    termination: "gf gh hr hjh g f fff d.",
  },
  'Introit 2': {
    clef: 'f3',
    mediant: "e fe eh hr hg hi i 'hi hr h.",
    termination: "hf fh hr i hf h ge fgf.",
  },
  'Introit 3': {
    clef: 'c4',
    mediant: "g hj jr 'k jr jr 'ih jjj",
    termination: "ig hj jr j/ji hg h i gh..",
  },
  'Introit 4': {
    clef: 'c4',
    mediant: "hg gh hr hg gi i 'hi hr h.",
    termination: "hg gh hr gf gh g e.",
  },
  'Introit 5': {
    clef: 'c3',
    mediant: "d f hr i 'i hr h.",
    termination: "f hr 'i gr 'h fr f.",
  },
  'Introit 6': {
    clef: 'c4',
    mediant: "fg gf gh hr g 'ixi hr 'g fr f.",
    termination: "(h | f gh | f gh h) 'hj g fr g fd f 'g fr f.",
  },
  'Introit 7': {
    clef: 'c3',
    mediant: "ehg hi ir 'ik jr jr 'ji ij..",
    termination: "ig hi ir i!jwk i h hhh fe..",
  },
  'Introit 8': {
    clef: 'c4',
    mediant: "g hg gj jr ji jk k 'jk jr j.",
    termination: "jh hj jr j/ji gh ji 'h hr g.",
  },
  // Versicle tones
  'V.1': {
    clef: 'c3',
    mediant: "hr h g_hvGFEfgf.",
  },
  'V.2': {
    clef: 'c4',
    mediant: "hr h h/hf,fgwhvGFEfg/gf",
  },
  'V. Solemnior': {
    clef: 'c3',
    mediant: "hr 'hi hr h_,",
    termination: "hr f e 'f_h hr hiHGhih.ghGFE'fggf.",
  },
};

/** Return all available tone names */
export function getToneNames(): string[] {
  return Object.keys(PSALM_TONES);
}

/**
 * Return available variant codes for a given tone.
 * Returns [''] (single empty variant) for tones with only one termination.
 */
export function getVariants(tone: string): string[] {
  const spec = PSALM_TONES[tone];
  if (!spec) return [];
  if (spec.terminations) return Object.keys(spec.terminations);
  if (spec.termination) return [''];
  return [''];
}

/** Get default mediant & termination GABC strings for a given tone + variant */
export function getPresetGabc(tone: string, variant: string): { mediant: string; termination: string } {
  const spec = PSALM_TONES[tone];
  if (!spec) return { mediant: '', termination: '' };
  const mediant = spec.mediant || '';
  const termination = (spec.terminations ? spec.terminations[variant] : spec.termination) || spec.mediant || '';
  return { mediant, termination };
}

/** Whether a tone has a solemn mediant, i.e. whether offering the choice makes sense. */
export function hasSolemnForm(tone: string): boolean {
  return Boolean(PSALM_TONES[tone]?.solemn);
}

/** The canticles that are sung to the solemn tone unless told otherwise. */
export const SOLEMN_BY_DEFAULT = ['Magnificat', 'Benedictus', 'Nunc dimittis'];
