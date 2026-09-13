/**
 * The sung form of the three parts of the ordinary an office says the same way
 * every day: the opening versicle, the Lord's Prayer, and the dismissal.
 *
 * The offline engine and iBreviary both hand these over as plain text, which is
 * right for an office that is read and wrong for one that is sung. Each part
 * here names a set of Gregorian settings from `gregobase-cache.json` — the same
 * 18,522-score cache the antiphons, hymns and responsories already come from,
 * so the notation is the app's own and nothing is transcribed by hand — and the
 * chosen one is attached to the block as its score.
 *
 * The scores stay in the cache: this file is the catalogue (what the options
 * are and what they are called) and the rule for applying one, and both halves
 * have to run in the browser. `/api/chanted-ordinary` serves the GABC itself.
 *
 * Compline is deliberately not covered, and is turned away by name. Its
 * opening is *Convérte nos*, not *Deus in adiutórium* — a hour whose first
 * words are different would otherwise be given a score that sings something
 * else — and gregobase has no setting of *Convérte nos* outside the Dominican
 * books. Its dismissal is written into the office as one block with the
 * *Salva nos* antiphon rather than under a heading of its own. Both stay
 * spoken rather than being given a chant that is not theirs.
 */

import type { Block, ChantedOrdinaryPreference } from './types';
import { sectionForHeading } from './user-preferences';

export type OrdinaryPart = 'introduction' | 'lords-prayer' | 'dismissal';

export interface OrdinaryChant {
  /** A gregobase id, and the key of `gregobase-cache.json`. */
  id: string;
  part: OrdinaryPart;
  /** How the option reads in the settings menu. */
  name: string;
  /** The book gregobase took it from. */
  source: string;
}

/** The preference field each part is chosen under. */
export const ORDINARY_PART_FIELDS: Record<OrdinaryPart, keyof ChantedOrdinaryPreference> = {
  introduction: 'introduction',
  'lords-prayer': 'lordsPrayer',
  dismissal: 'dismissal',
};

export const ORDINARY_PART_LABELS: Record<OrdinaryPart, string> = {
  introduction: 'Introduction — Deus in adiutórium',
  'lords-prayer': "Lord's Prayer — Pater noster",
  dismissal: 'Dismissal — Benedicámus Dómino',
};

/**
 * The settings offered, chosen from what gregobase carries for each part.
 *
 * Not everything it holds: there are 70-odd settings of *Benedicámus Dómino*
 * alone, most of them a particular rank in a particular book. These are the
 * ones an Office of the Hours actually asks for — the ferial tone, the Sunday
 * and festal tones, the solemn tone, and the little-hours tone where the books
 * give one — each named by the day it belongs to rather than by its number.
 */
export const ORDINARY_CHANTS: OrdinaryChant[] = [
  { id: '4121', part: 'introduction', name: 'Ferial tone', source: 'Solesmes 2000s' },
  { id: '18178', part: 'introduction', name: 'Sundays and feasts', source: 'Solesmes 2000s' },
  { id: '7864', part: 'introduction', name: 'Solemnities, Lauds and Vespers', source: 'Solesmes 2000s' },
  { id: '15354', part: 'introduction', name: 'Ferial tone', source: 'Solesmes' },
  { id: '7417', part: 'introduction', name: 'Festive tone', source: 'Solesmes 1961' },
  { id: '7402', part: 'introduction', name: 'Solemn tone', source: 'Solesmes' },

  { id: '8161', part: 'lords-prayer', name: 'At Lauds and Vespers', source: 'Solesmes 1934' },
  { id: '4321', part: 'lords-prayer', name: 'Ferial tone', source: 'Solesmes 2000s' },
  { id: '15303', part: 'lords-prayer', name: 'Festive tone', source: 'Solesmes 2000s' },
  { id: '8046', part: 'lords-prayer', name: 'Little hours and Compline (incipit only)', source: 'Solesmes 1934' },

  { id: '15741', part: 'dismissal', name: 'Ferias', source: 'Solesmes' },
  { id: '17844', part: 'dismissal', name: 'Ferias, at Lauds', source: 'Solesmes 1934' },
  { id: '17845', part: 'dismissal', name: 'Ferias, at Vespers', source: 'Solesmes 1934' },
  { id: '16976', part: 'dismissal', name: 'Sundays through the year', source: 'Solesmes 2000s' },
  { id: '612', part: 'dismissal', name: 'Solemnities, at Lauds', source: 'Solesmes' },
  { id: '8121', part: 'dismissal', name: 'Eastertide', source: 'Solesmes 1961' },
  { id: '9106', part: 'dismissal', name: 'Little hours', source: 'Solesmes 1934' },
];

export function chantsForPart(part: OrdinaryPart): OrdinaryChant[] {
  return ORDINARY_CHANTS.filter(chant => chant.part === part);
}

export function ordinaryChant(id: string): OrdinaryChant | undefined {
  return ORDINARY_CHANTS.find(chant => chant.id === id);
}

/**
 * Two spellings gregobase writes in its lyrics that no renderer reads.
 *
 * `s'aecula` is the æ ligature written the way gregorio's `<sp>'ae</sp>` is
 * written inside it, with the tags lost; `Allelú{ia}` is the source's own way
 * of marking the syllable an alleluia elides onto. Both print literally —
 * "s'aecula", "Allelú{ia}" — in the score and in the PDF. Undoing exactly these
 * two is mechanical and reversible; nothing else in the score is touched.
 */
export function cleanOrdinaryGabc(gabc: string): string {
  return gabc.replace(/'ae/g, 'æ').replace(/'oe/g, 'œ').replace(/\{([^{}()]*)\}/g, '$1');
}

/**
 * The words *Benedicámus Dómino* sings.
 *
 * Alone of the three, the dismissal chant does not say what the block already
 * says: the Liturgy of the Hours ends Lauds and Vespers with a blessing, and
 * printing that under a score that sings "Let us bless the Lord" would caption
 * the chant with something it is not. So this part's text is replaced, and only
 * this part's. Both lines are the office engine's own wording for the same
 * versicle at Compline — no new translation is made here, and an office in a
 * language neither of these covers keeps the Latin with no translation claimed
 * under it.
 */
export const BENEDICAMUS_WORDS: Record<'en' | 'la', string> = {
  la: 'V. Benedicámus Dómino.\n℟. Deo grátias.',
  en: 'V. Let us bless the Lord.\n℟. Thanks be to God.',
};

/**
 * Which part of the ordinary a heading opens, if any.
 *
 * `sectionForHeading` already reads the office's headings in every language
 * the app serves; the one addition is iBreviary's English dismissal, which it
 * heads BLESSING rather than DISMISSAL.
 */
export function ordinaryPartForHeading(content: string): OrdinaryPart | null {
  const section = sectionForHeading(content);
  if (section === 'introduction') return 'introduction';
  if (section === 'lords-prayer') return 'lords-prayer';
  if (section === 'dismissal') return 'dismissal';
  const text = content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  return /BLESSING|BENEDIZIONE|BENDICION|BENEDICTION/.test(text) ? 'dismissal' : null;
}

export interface ChantedOrdinaryResult {
  blocks: Block[];
  /**
   * The parts this office actually sang.
   *
   * A part asked for and not found is normal rather than a fault: Lauds opens
   * with the invitatory and has no introduction at all (GILH 34), and only
   * Lauds and Vespers say the Lord's Prayer. What the caller can read from an
   * empty list is the one case worth saying out loud — the office recognised
   * none of its ordinary, so turning the chant on appeared to do nothing.
   */
  sung: OrdinaryPart[];
}

/**
 * Give the chosen parts of the ordinary their chant.
 *
 * The block becomes an `antiphon`: that is the block type this app engraves a
 * score on with its words underneath, and the same one the editor's own "apply
 * a tone" produces for a psalm's first verse. Nothing else about it changes —
 * the words already under an introduction or a Lord's Prayer are the words the
 * chant sings, in whatever language the office was loaded in, so they are kept
 * and become the translation line beneath the staff.
 *
 * A Latin office prints no line: the score is already carrying those words, and
 * setting them again underneath says the same thing twice.
 */
export function applyChantedOrdinary(
  blocks: Block[],
  chosen: ChantedOrdinaryPreference,
  gabcById: Record<string, string>,
  lang: string,
  showTranslations: boolean,
  hour?: string,
): ChantedOrdinaryResult {
  if (hour === 'compline') return { blocks, sung: [] };
  const wanted = new Map<OrdinaryPart, string>();
  for (const [part, field] of Object.entries(ORDINARY_PART_FIELDS) as [OrdinaryPart, keyof ChantedOrdinaryPreference][]) {
    const id = chosen[field];
    if (id && gabcById[id]) wanted.set(part, gabcById[id]);
  }
  if (!wanted.size) return { blocks, sung: [] };

  const done = new Set<OrdinaryPart>();
  let current: OrdinaryPart | null = null;
  const out = blocks.map(block => {
    if (block.type === 'heading') {
      current = ordinaryPartForHeading(block.content);
      return block;
    }
    // The first body block under the heading carries the part; a rubric before
    // it stays a rubric, and anything after it is left alone.
    if (!current || done.has(current) || block.type !== 'text' || !block.content.trim()) return block;
    const gabc = wanted.get(current);
    if (!gabc) return block;
    const part = current;
    done.add(part);

    // The words stay on the block even where they are not printed: a score
    // that fails to engrave must not take the text of the office with it.
    const dismissalWords = BENEDICAMUS_WORDS[lang === 'en' ? 'en' : 'la'];
    const content = part === 'dismissal' ? dismissalWords : block.content;
    // A line under the staff is only printed where it says something the score
    // does not: the office's own words for the introduction and the Lord's
    // Prayer, and the dismissal's versicle in English. A Latin office, or an
    // office in a language this dismissal has no wording for, would be setting
    // the Latin twice.
    const translates = part === 'dismissal' ? lang === 'en' : lang !== 'la';

    return {
      ...block,
      type: 'antiphon' as const,
      content,
      originalContent: block.originalContent ?? block.content,
      gabcScore: cleanOrdinaryGabc(gabc),
      printTranslation: translates && showTranslations,
    };
  });

  return { blocks: out, sung: [...done] };
}
