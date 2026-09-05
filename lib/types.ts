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
  gabcCandidates?: GabcCandidate[]; // Multiple OCO options; user picks one
  place?: string | null;
  /** Psalm number parsed from iBreviary rubric (e.g. 117, "119.1-8") */
  psalmNumber?: number | string;
  /** Gregorian tone detected from the preceding antiphon (e.g. "8.", "Custom") */
  psalmTone?: string;
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
}



export type PaperSize = 'Letter' | 'HalfLetter' | 'A4' | 'A5';

export interface OfficeSettings {
  paperSize: PaperSize;
  baseFontSize: number;
  fontFamily: 'serif' | 'sans';
  rubricColor: string; 
  lineSpacing: 'tight' | 'normal' | 'relaxed';
}