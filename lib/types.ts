import type { CreatedTone } from './psalm-tones/creator';
export type BlockType = 
  | 'heading' 
  | 'subheading'
  | 'rubric' 
  | 'text' 
  | 'psalm'
  | 'psalm-prayer' 
  | 'antiphon' 
  | 'invitatory-antiphon'
  | 'hymn'
  | 'page-break';

/** A single GABC candidate from OCO / gregobase for user selection */
export interface GabcCandidate {
  incipit: string;
  gabc: string;
  mode?: string;
  office?: string;
  occasion?: string;
  source: 'OCO' | 'gregobase';
  gbId?: number;
  place?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  musicDataUri?: string;
  gabcScore?: string;
  /** Include accompanying translation below the chant; defaults to true. */
  printTranslation?: boolean;
  gabcCandidates?: GabcCandidate[]; // Multiple OCO options; user picks one
  place?: string | null;
  /** Psalm number parsed from iBreviary rubric (e.g. 117, "119.1-8") */
  psalmNumber?: number | string;
  /** Gregorian tone detected from the preceding antiphon (e.g. "8.", "Custom") */
  psalmTone?: string;
  /** Visual examples and derived formula travel with saved/shared offices. */
  createdTone?: CreatedTone;
  /** Tone variant/termination code (e.g. "G", "G*", "D") */
  psalmVariant?: string;
  /**
   * Where `psalmTone` came from: `'oco'` when the antiphon over this psalm
   * recorded a mode the table in `lib/psalm-tones/mode-map.ts` could read,
   * `'default'` when it did not and the psalter schema's own tone stood. The
   * user has accepted a plausible fallback for the *tone*, so the difference
   * is recorded rather than hidden — a fallback nobody can count is a fallback
   * nobody notices growing.
   */
  toneSource?: 'oco' | 'default';
  /**
   * Sing the tone's solemn mediant rather than its simple one. Traditional
   * for the Gospel canticles, which is why it defaults on for them — but it
   * changes the chant, so it is stored and shown rather than inferred at the
   * moment of pointing.
   */
  solemnTone?: boolean;
  /** Optional custom GABC string for mediant formula (e.g. "g h jr 'k jr j.") */
  customMediant?: string;
  /** Optional custom GABC string for termination formula (e.g. "jr i j 'h gr g.") */
  customTermination?: string;
  /** Clean unpointed source text baseline before pointing was applied */
  originalContent?: string;
  /** Original iBreviary text before lypsautierant stressed text was loaded */
  ibreviaryContent?: string;
  /** Language for pointing engine ('en' | 'la') */
  lang?: 'en' | 'la';
  /** Lypsautierant mode family ('modes'|'french'|'english'|'gregorian') */
  lypsautierantFamily?: string;
  /** Lypsautierant mode name ('one'|'two'|...|'peregrinus') */
  lypsautierantMode?: string;
  /** Lypsautierant termination variation ('a'|'b'|'a_prime'|...) */
  lypsautierantVariation?: string;
  /**
   * The accented text the english/gregorian lypsautierant tones are pointed
   * from, one hemistich per line.
   *
   * It has to be kept apart from `content` and `originalContent`. `content` is
   * pointed HTML with the mark glyphs in it as real text nodes, and
   * `originalContent` may only ever hold unpointed text — so hand-corrections
   * to the accents had nowhere to live and were thrown away on every
   * re-point. This is where they live.
   */
  lypsautierantAccents?: string;
  /** True while `lypsautierantAccents` is what the stress dictionary guessed. */
  lypsautierantAccentsDerived?: boolean;
}



export type PaperSize = 'Letter' | 'HalfLetter' | 'A4' | 'A5';

export interface OfficeSettings {
  paperSize: PaperSize;
  baseFontSize: number;
  fontFamily: 'serif' | 'sans';
  rubricColor: string; 
  lineSpacing: 'tight' | 'normal' | 'relaxed';
}

export type OfficeLanguage = 'en' | 'la' | 'it' | 'fr' | 'es';
export type PointingEngine = 'gregorian' | 'lypsautierant' | 'simple' | 'none';
export type PointingSystem = 'auto' | 'english' | 'gregorian' | 'modes' | 'french';

export type PsalmLanguage = 'office' | 'en' | 'la';

export interface PsalmPointingPreference {
  language: PsalmLanguage;
  engine: PointingEngine;
  /** Lypsautierant family. `auto` follows the family inferred from the antiphon. */
  family: PointingSystem;
  simplePreparations: 1 | 2 | 3;
  /**
   * Sing the Gregorian tone's solemn mediant rather than its simple one — the
   * `solemnTone` of each psalm block, chosen once for a whole class of them.
   *
   * Traditional for the Gospel canticles and for nothing else, which is why
   * the two profiles default differently. It was inferred from the canticle
   * rather than stored, so the one place it is not wanted — a house that
   * sings the Benedictus to the simple mediant — had no way to say so.
   * Read only by the Gregorian engine; the other three have no such mediant.
   */
  solemnTone: boolean;
}

/** A lypsautierant family a psalm can actually be sung by; `auto` is not one. */
export type PointingFamily = Exclude<PointingSystem, 'auto'>;

/**
 * The engines an override may name. `simple` and `none` are left out on
 * purpose: an override says which *tone* to sing, and neither of those two
 * sings one.
 */
export type OverrideEngine = 'gregorian' | 'lypsautierant' | 'created';

/**
 * One row of the psalm-tone override table.
 *
 * The row is keyed — in `UserPreferences.psalmToneOverrides` — on the
 * Gregorian tone and termination the antiphon called for, which is what
 * `propagateTones` and `defaultTonePointing` have already written onto the
 * psalm block as `psalmTone` and `psalmVariant`. Where a row matches and is
 * enabled, the engine chosen under Psalm defaults is bypassed altogether and
 * this is sung instead.
 *
 * Which of the target fields are read depends on `engine`, and the ones that
 * are not are still kept: a row switched from one engine to another and back
 * finds its old target where it left it.
 */
export interface PsalmToneOverride {
  enabled: boolean;
  engine: OverrideEngine;
  /** `gregorian`: a key of `PSALM_TONES`, e.g. `'4. alt'`. */
  tone?: string;
  /** `gregorian`: one of `getVariants(tone)`. */
  variant?: string;
  /** `lypsautierant`: the psautier book to point from. */
  family?: PointingFamily;
  /** `lypsautierant`: `'one'` … `'eight'`, `'peregrinus'`. */
  mode?: string;
  /** `lypsautierant`: a variation that family and mode actually define. */
  variation?: string;
  /** `created`: the id of a tone saved in the Psalm Tone Creator. */
  createdToneId?: string;
  /** The name that id had when it was chosen, for naming a tone since deleted. */
  createdToneName?: string;
}

export type IbreviarySection =
  | 'introduction' | 'invitatory' | 'hymn' | 'psalmody' | 'reading'
  | 'responsory' | 'gospel-canticle' | 'intercessions' | 'lords-prayer'
  | 'concluding-prayer' | 'dismissal';

export interface OfficeBlockVisibility {
  metadata: boolean;
  rubrics: boolean;
  psalmPrayers: boolean;
  repeatedAntiphons: boolean;
}

export interface OfficeStructureTemplate {
  sectionOrder: IbreviarySection[];
  /**
   * What the saved office did with the blocks that sit INSIDE its sections —
   * read off that office when it was saved, so deleting every psalm prayer and
   * every repeated antiphon and then saving the structure is remembered as
   * such. Section order alone cannot express that: both live under headings
   * the office keeps.
   *
   * Undefined in templates saved before this was recorded, and by that older
   * meaning those offices deferred to the general `blockVisibility`; they keep
   * doing so rather than being guessed at retroactively.
   */
  blockVisibility?: OfficeBlockVisibility;
}

/**
 * Which setting each part of the sung ordinary uses — a gregobase id from
 * `ORDINARY_CHANTS`, or the empty string to leave that part spoken.
 */
export interface ChantedOrdinaryPreference {
  introduction: string;
  lordsPrayer: string;
  dismissal: string;
}

/** Browser-local defaults used when a new office is loaded or generated. */
export interface UserPreferences {
  version: 1;
  defaultLanguage: OfficeLanguage;
  showTranslations: boolean;
  psalms: PsalmPointingPreference;
  gospelCanticles: PsalmPointingPreference;
  selectProperGospelAntiphon: boolean;
  /**
   * On a ferial weekday of Ordinary Time, say the collect of that week's
   * Sunday rather than the psalter's own prayer for the day.
   */
  sundayCollectOnFerials: boolean;
  chantedOrdinary: ChantedOrdinaryPreference;
  ibreviarySections: Record<IbreviarySection, boolean>;
  /**
   * Per-tone overrides, keyed by `psalmToneOverrideKey(tone, variant)` — the
   * tone and termination the antiphon called for.
   */
  psalmToneOverrides: Record<string, PsalmToneOverride>;
  blockVisibility: OfficeBlockVisibility;
  structureTemplates: Record<string, OfficeStructureTemplate>;
}
