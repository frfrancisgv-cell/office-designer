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
  dropCap?: boolean;
  place?: string | null;
  /** Psalm number parsed from iBreviary rubric (e.g. 117, "119.1-8") */
  psalmNumber?: number | string;
  /** Gregorian tone detected from the preceding antiphon (e.g. "8.", "Custom") */
  psalmTone?: string;
  /** Tone variant/termination code (e.g. "G", "G*", "D") */
  psalmVariant?: string;
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
}



export type PaperSize = 'Letter' | 'HalfLetter' | 'A4' | 'A5';

export interface OfficeSettings {
  paperSize: PaperSize;
  baseFontSize: number;
  fontFamily: 'serif' | 'sans';
  rubricColor: string; 
  lineSpacing: 'tight' | 'normal' | 'relaxed';
}