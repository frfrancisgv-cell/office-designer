/**
 * Which Abbey canticle a printed scripture reference names.
 *
 * The office prints its canticles by citation — "Canticle: See Revelation
 * 19:1-7" in English, "Canticum Cf. Ap 19, 1-2. 5-7" in Latin — while the
 * Abbey Psalms and Canticles files them by a number of their own, "NT 12".
 * `/api/psalm-text` speaks the Abbey's numbers, and the editor's
 * "Lypsautierant (EN)" and "Latin (jgabc)" buttons appear only for a block
 * that carries one, so without this translation the canticles of Vespers and
 * Lauds were the only psalmody in the office that could not be given its
 * pointed text.
 *
 * The table below is the Abbey's own order, read off the citation headings of
 * `theAbbeyPsalmsAndCanticles/canticlesOTNTlineNumbers.txt`: fifty-eight Old
 * Testament canticles, then twelve New Testament, numbered from one in each
 * series. It is not the four-week psalter's numbering, which counts the Lauds
 * slots of the cycle instead and reaches only about a third as far.
 */

interface AbbeyCanticle {
  key: string;      // "OT 4", "NT 12" — the form /api/psalm-text parses
  book: string;     // canonical book name, lowercased
  chapter: number;
  first: number;    // first verse of the citation
  last: number;     // last verse of the citation *within that chapter*
}

function ot(n: number, book: string, chapter: number, first: number, last: number): AbbeyCanticle {
  return { key: `OT ${n}`, book, chapter, first, last };
}
function nt(n: number, book: string, chapter: number, first: number, last: number): AbbeyCanticle {
  return { key: `NT ${n}`, book, chapter, first, last };
}

const CANTICLES: AbbeyCanticle[] = [
  ot(1,  'exodus', 15, 1, 18),          // 15:1-4a, 8-13, 17-18
  ot(2,  'exodus', 15, 1, 18),          // 15:1-6, 17-18
  ot(3,  'exodus', 15, 8, 17),
  ot(4,  'deuteronomy', 32, 1, 12),
  ot(5,  'deuteronomy', 32, 18, 21),
  ot(6,  'deuteronomy', 32, 26, 36),
  ot(7,  'deuteronomy', 32, 35, 41),
  ot(8,  '1 samuel', 2, 1, 10),
  ot(9,  '1 chronicles', 29, 10, 13),
  ot(10, 'tobit', 13, 1, 8),
  ot(11, 'tobit', 13, 1, 18),
  ot(12, 'tobit', 13, 8, 16),
  ot(13, 'judith', 13, 18, 19),
  ot(14, 'judith', 16, 1, 13),
  ot(15, 'proverbs', 9, 1, 12),
  ot(16, 'song of songs', 2, 10, 14),
  ot(17, 'wisdom', 3, 1, 6),
  ot(18, 'wisdom', 3, 7, 9),
  ot(19, 'wisdom', 9, 1, 11),
  ot(20, 'wisdom', 10, 17, 21),
  ot(21, 'wisdom', 16, 20, 26),         // 16:20-21, 26; 17:1a
  ot(22, 'sirach', 14, 20, 27),
  ot(23, 'sirach', 14, 20, 20),         // 14:20; 15:3-5a, 6b
  ot(24, 'sirach', 31, 8, 11),
  ot(25, 'sirach', 36, 1, 19),
  ot(26, 'sirach', 36, 17, 22),
  ot(27, 'sirach', 39, 13, 16),
  ot(28, 'isaiah', 2, 2, 5),
  ot(29, 'isaiah', 9, 1, 6),
  ot(30, 'isaiah', 12, 1, 6),
  ot(31, 'isaiah', 26, 1, 12),
  ot(32, 'isaiah', 33, 2, 10),
  ot(33, 'isaiah', 33, 13, 16),
  ot(34, 'isaiah', 38, 10, 16),         // 38:10-12d, 16
  ot(35, 'isaiah', 38, 10, 20),         // 38:10-14, 17-20
  ot(36, 'isaiah', 40, 1, 8),
  ot(37, 'isaiah', 40, 10, 17),
  ot(38, 'isaiah', 42, 10, 16),
  ot(39, 'isaiah', 45, 15, 25),
  ot(40, 'isaiah', 49, 7, 13),
  ot(41, 'isaiah', 61, 6, 9),
  ot(42, 'isaiah', 61, 10, 10),         // 61:10-62:5
  ot(43, 'isaiah', 62, 4, 7),
  ot(44, 'isaiah', 63, 1, 5),
  ot(45, 'isaiah', 66, 10, 14),
  ot(46, 'jeremiah', 7, 2, 7),
  ot(47, 'jeremiah', 14, 17, 21),
  ot(48, 'jeremiah', 17, 7, 8),
  ot(49, 'jeremiah', 31, 10, 14),
  ot(50, 'lamentations', 5, 1, 21),
  ot(51, 'ezekiel', 36, 24, 28),
  ot(52, 'daniel', 3, 26, 41),
  ot(53, 'daniel', 3, 52, 57),
  ot(54, 'daniel', 3, 57, 88),          // 3:57-88, 56 — the Benedicite
  ot(55, 'hosea', 6, 1, 6),
  ot(56, 'jonah', 2, 3, 8),
  ot(57, 'habakkuk', 3, 2, 19),
  ot(58, 'zephaniah', 3, 8, 13),

  nt(1,  'luke', 1, 46, 55),            // Magnificat
  nt(2,  'luke', 1, 68, 79),            // Benedictus
  nt(3,  'luke', 2, 29, 32),            // Nunc dimittis
  nt(4,  'ephesians', 1, 3, 10),
  nt(5,  'philippians', 2, 6, 11),
  nt(6,  'colossians', 1, 12, 20),
  nt(7,  '1 timothy', 3, 16, 16),
  nt(8,  '1 peter', 2, 21, 24),
  nt(9,  'revelation', 4, 11, 11),      // 4:11; 5:9b-10, 12b
  nt(10, 'revelation', 11, 17, 18),     // 11:17-18; 12:10b-12a
  nt(11, 'revelation', 15, 3, 4),
  nt(12, 'revelation', 19, 1, 7),
];

/**
 * Every spelling of a book name the office prints, English and Latin alike.
 *
 * The Latin office does not merely abbreviate the English: *Ier* is Jeremiah,
 * *Idt* Judith, *Sap* Wisdom, *Soph* Zephaniah and *Ap* the Apocalypse, none
 * of which a reader of the English names would recognise.
 */
const BOOK_ALIASES: Record<string, string> = {
  'ex': 'exodus', 'exod': 'exodus', 'exodus': 'exodus',
  'deut': 'deuteronomy', 'dt': 'deuteronomy', 'deuteronomy': 'deuteronomy',
  '1 sam': '1 samuel', '1 samuel': '1 samuel', '1 sm': '1 samuel',
  '1 chr': '1 chronicles', '1 chronicles': '1 chronicles', '1 par': '1 chronicles',
  'tob': 'tobit', 'tobit': 'tobit',
  'jdt': 'judith', 'idt': 'judith', 'judith': 'judith',
  'prov': 'proverbs', 'proverbs': 'proverbs', 'prv': 'proverbs',
  'song of songs': 'song of songs', 'song': 'song of songs', 'cant': 'song of songs',
  'canticle of canticles': 'song of songs', 'sg': 'song of songs',
  'wis': 'wisdom', 'wisdom': 'wisdom', 'sap': 'wisdom',
  'sir': 'sirach', 'sirach': 'sirach', 'ecclesiasticus': 'sirach',
  'is': 'isaiah', 'isa': 'isaiah', 'isaiah': 'isaiah', 'isaias': 'isaiah',
  'jer': 'jeremiah', 'ier': 'jeremiah', 'jeremiah': 'jeremiah',
  'lam': 'lamentations', 'lamentations': 'lamentations',
  'ez': 'ezekiel', 'ezek': 'ezekiel', 'ezekiel': 'ezekiel',
  'dan': 'daniel', 'daniel': 'daniel',
  'hos': 'hosea', 'hosea': 'hosea', 'os': 'hosea',
  'jon': 'jonah', 'jonah': 'jonah', 'ion': 'jonah',
  'hab': 'habakkuk', 'habakkuk': 'habakkuk',
  'zeph': 'zephaniah', 'zephaniah': 'zephaniah', 'soph': 'zephaniah',
  'lk': 'luke', 'luke': 'luke', 'lc': 'luke',
  'eph': 'ephesians', 'ephesians': 'ephesians',
  'phil': 'philippians', 'philippians': 'philippians', 'phil.': 'philippians',
  'col': 'colossians', 'colossians': 'colossians',
  '1 tim': '1 timothy', '1 timothy': '1 timothy', '1 tm': '1 timothy',
  '1 pet': '1 peter', '1 peter': '1 peter', '1 petr': '1 peter', '1 pt': '1 peter',
  'rev': 'revelation', 'revelation': 'revelation', 'ap': 'revelation',
  'apoc': 'revelation', 'apocalypse': 'revelation', 'apocalypsis': 'revelation',
};

/**
 * A citation, in either language:
 *
 *   Revelation 19:1-7        Deut 32, 1-12
 *   1 Peter 2:21-24          Ap 19, 1-2. 5-7
 *   Song of Songs 2:10bc     Is 38:10-14, 17-20
 *
 * The leading *See* / *Cf.* that marks a paraphrase is not part of the book's
 * name, and the chapter is separated from the verse by a colon in English and
 * by a comma in Latin.
 */
const CITATION = /^\s*(?:(?:cf|see|vide)\.?\s+)?(.+?)\s*(\d+)\s*[:,]\s*(\d+)([^]*)$/i;

/** A book and chapter with no verse at all — "Dan 3", "Canticum Tobiae 13". */
const BOOK_CHAPTER = /^\s*(?:(?:cf|see|vide)\.?\s+)?(.+?)\s*(\d+)\s*$/i;

function canonicalBook(name: string): string | null {
  const key = name
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/^(\d)\s*/, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();
  return BOOK_ALIASES[key] ?? null;
}

/**
 * The last verse the citation names *in its opening chapter*.
 *
 * Everything after a semicolon belongs to another chapter, and so does
 * anything past a second "N:" — "Isaiah 61:10-62:5" ends at verse 10 of 61,
 * not at verse 62 of anything. What is left is a list of verse numbers, and
 * the largest of them is where the canticle stops: Isaiah 38 is in the Abbey
 * twice, once ending at 16 and once at 20, and only that number tells the two
 * of them apart.
 */
function lastVerseInChapter(first: number, rest: string): number {
  const zone = rest.split(';')[0].split(/\d+\s*:/)[0];
  const numbers = (zone.match(/\d+/g) ?? []).map(Number);
  return numbers.length ? Math.max(first, ...numbers) : first;
}

/**
 * Turn a printed citation into the Abbey's key for that canticle, or null if
 * it names none.
 *
 * Matching is by book and chapter first, because the versification is not
 * always shared — the office numbers Judith and Sirach differently from the
 * Abbey — and only then by verse, which is needed solely to choose among the
 * several arrangements the Abbey files under one chapter (four of Deuteronomy
 * 32, three each of Exodus 15, Tobit 13 and Daniel 3).
 */
export function resolveCanticleKey(reference: string): string | null {
  const cited = reference.match(CITATION);

  let book: string | null;
  let chapter: number;
  let first: number | null = null;
  let last: number | null = null;

  if (cited) {
    book = canonicalBook(cited[1]);
    chapter = parseInt(cited[2], 10);
    first = parseInt(cited[3], 10);
    last = lastVerseInChapter(first, cited[4]);
  } else {
    const bare = reference.match(BOOK_CHAPTER);
    if (!bare) return null;
    book = canonicalBook(bare[1]);
    chapter = parseInt(bare[2], 10);
  }
  if (!book) return null;

  const candidates = CANTICLES.filter(c => c.book === book && c.chapter === chapter);
  if (!candidates.length) return null;
  if (candidates.length === 1 || first === null) return candidates[0].key;

  // The nearest opening verse wins; where two arrangements open together, the
  // one that also ends nearest. Ties keep the Abbey's own order.
  let best = candidates[0];
  let bestScore = [Infinity, Infinity];
  for (const c of candidates) {
    const score = [Math.abs(c.first - first), Math.abs(c.last - (last ?? first))];
    if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
      best = c;
      bestScore = score;
    }
  }
  return best.key;
}
