/**
 * latin-syllabify.ts — syllable division for ecclesiastical Latin.
 *
 * The lypsautierant pointing rules count syllables, so a psalm has to be cut
 * into them before it can be pointed. For English that is done by
 * lypsautierant-syllabify.ts, a mechanical port of upstream's `sedsyllables`
 * — 180 rules about English spelling ("-ing", "-ness", "-tion"). Run Latin
 * through them and the result is nonsense: "præsídii" comes out
 * "pr -- æsí -- dii", "mihi" and "Deus" are not divided at all.
 *
 * Nor is a hyphenation dictionary the answer. TeX patterns (hyphenation.la,
 * which psalmtone.js uses) mark where a LINE may break, not where syllables
 * are: they refuse to strand a single letter and skip vowel-vowel joins, so
 * "Deus", "mea", "refúgium" and "ánima" come back whole or half-divided.
 *
 * So this divides properly, by rule. The rules below are not invented: they
 * were read off the 18,522 GABC scores in gregobase-cache.json, whose text is
 * already divided syllable by syllable by the editors who set the chant —
 * 35,094 distinct word forms, 370,585 tokens. scripts/verify-latin-syllabify.mjs
 * measures this file against that corpus on every `npm test`.
 *
 * Where the corpus is genuinely divided against itself — different editions
 * divide "omnes" and "propter" differently — the majority reading is taken
 * and noted. That is why the score is not, and cannot be, 100%.
 */

/** Vowels, including every accent the psalters use and the two ligatures. */
const VOWELS = 'aeiouyáéíóúýàèìòùâêîôûäëïöüæœ';

/**
 * Vowel pairs that are one syllable. Tested with accents stripped, so "áu"
 * and "aé" are covered. Corpus: au 99% undivided, ae 94%, ou 98%, ay 100%.
 *
 * Note what is NOT here. "eu" divides 99% of the time ("De-us", "me-us"),
 * "ei" 94% ("e-i"), "ui" 95% ("tu-i", "Spi-rí-tu-i") — the classical
 * diphthongs are not sung as diphthongs, and treating them as such was the
 * single biggest source of wrong divisions.
 */
const DIPHTHONGS = new Set(['ae', 'au', 'oe', 'ou', 'ay']);

/**
 * Consonant clusters that may open a syllable. A cluster between two vowels
 * is cut so that its longest legal-onset suffix starts the next syllable —
 * "san-ctum" (ct is an onset), but "om-ni-a"… see `mn` below.
 *
 * Anything not here splits before its last consonant: "nt" → "n-t", so
 * "sanc-ti-fi-cé-tur" style clusters divide where the ear expects.
 */
const ONSETS = new Set([
  // stop or f + liquid — the classical mute-plus-liquid group
  'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr',
  'pl', 'bl', 'cl', 'gl', 'fl',
  // s + stop, and their three-letter extensions
  'st', 'sp', 'sc', 'sm', 'str', 'spr', 'scr', 'spl',
  // digraphs for the Greek letters, which are single sounds
  'ch', 'ph', 'th', 'chr',
  // qu and gu, where the u is not a vowel at all
  'qu', 'gu',
  // clusters the chant editors keep together
  'ct', 'gn', 'ps', 'pn', 'cn', 'tl',
  // "o-mni-a", 1587 tokens, against "om-ni-a" at 1388 — a real split in the
  // sources rather than an error in either; the majority reading wins.
  'mn',
]);

/**
 * Words the general rules cannot reach, as [word-initial pattern, where the
 * cut goes]. Kept to three because every entry is a rule not learned; each is
 * here because it is both frequent in the psalter and genuinely exceptional.
 *
 *   ex-    a prefix, and not divided from itself: "ex-áu-di", "ex-ór-tum".
 *          Only before a vowel — in "ex-súl-tet" the general rules already
 *          agree. Elsewhere x is an ordinary single consonant and goes with
 *          the syllable after it, which is why "di-xit" needs no entry.
 *   sicut  sic + ut, a compound: 485 tokens against 379 for "si-cut", and it
 *          is in every doxology, so the majority reading earns its entry.
 *
 * "Christi" was tried here too and removed: the corpus prefers "Chri-sti" over
 * "Chris-ti" by 1010 tokens to 314, which the general st-onset rule already
 * gives. Measure before adding an entry — the obvious reading is not always
 * the attested one.
 */
const FORCED_CUTS: Array<[RegExp, number]> = [
  [/^ex[aeiouáéíóúæœ]/, 2],
  [/^sicut/, 3],
];

/** Strip accents and expand the ligatures, for looking a cluster up above. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe');
}

function isVowel(c: string): boolean {
  return VOWELS.includes(c.toLowerCase());
}

/**
 * Divide one word into syllables. The word must be letters only; punctuation
 * is the caller's business (syllabifyLatinLine handles it).
 */
export function splitLatinWord(word: string): string[] {
  const lc = word.toLowerCase();

  // ── 1. Which letters are actually consonants ──────────────────────────
  // Two letters look like vowels but are not, and both mislead the division
  // badly if taken at face value.
  const consonant: boolean[] = [];
  for (let i = 0; i < lc.length; i += 1) {
    if (!isVowel(lc[i])) { consonant[i] = true; continue; }
    consonant[i] = false;

    // The u of qu- and gu-: "qui-a", not "qu-i-a"; "san-guis", not "san-gu-is".
    if (lc[i] === 'u' && i > 0 && (lc[i - 1] === 'q' || lc[i - 1] === 'g')
        && i + 1 < lc.length && isVowel(lc[i + 1])) {
      consonant[i] = true;
      continue;
    }

    // Consonantal i, the letter later written j: at the start of a word before
    // a vowel ("Ie-sus", "iam") or between two vowels ("e-ius", "al-le-lú-ia").
    // The preceding letter must be a REAL vowel, which is why this test reads
    // `consonant[i - 1]` and not `isVowel` — otherwise the u of "quia" would
    // qualify and the word would come out undivided.
    if ((lc[i] === 'i' || lc[i] === 'j') && i + 1 < lc.length && isVowel(lc[i + 1])
        && (i === 0 || (isVowel(lc[i - 1]) && !consonant[i - 1]))) {
      consonant[i] = true;
    }
  }

  // ── 2. The nuclei: one per syllable ───────────────────────────────────
  const nuclei: Array<[number, number]> = [];
  for (let i = 0; i < lc.length; i += 1) {
    if (consonant[i]) continue;
    let end = i + 1;
    if (end < lc.length && !consonant[end] && DIPHTHONGS.has(fold(lc[i] + lc[end]))) end += 1;
    nuclei.push([i, end]);
    i = end - 1;
  }
  if (nuclei.length < 2) return [word];

  const folded = fold(lc);
  const forced = FORCED_CUTS.filter(([re]) => re.test(folded)).map(([, at]) => at);

  // ── 3. Cut each consonant run between two nuclei ──────────────────────
  const cuts: number[] = [];
  for (let k = 0; k < nuclei.length - 1; k += 1) {
    const from = nuclei[k][1];
    const to = nuclei[k + 1][0];

    const exception = forced.find(at => at >= from && at <= to);
    if (exception !== undefined) { cuts.push(exception); continue; }

    // Longest suffix of the run that can open a syllable; failing that, the
    // last consonant alone — or the whole gap, where two nuclei are adjacent
    // and there is no run at all ("De-us", "qui-a").
    let cut = Math.max(to - 1, from);
    for (let start = from; start < to; start += 1) {
      const cluster = fold(lc.slice(start, to));
      if (cluster.length === 1 || ONSETS.has(cluster)) { cut = start; break; }
    }
    cuts.push(cut);
  }

  const out: string[] = [];
  let at = 0;
  for (const cut of cuts) { out.push(word.slice(at, cut)); at = cut; }
  out.push(word.slice(at));
  return out.filter(Boolean);
}

/**
 * Divide a whole line, in the format the pointing rules expect: syllables
 * joined by " -- ", everything else — spaces, punctuation, verse numbers, the
 * '*' and the flex dagger — passed through untouched and left attached to the
 * syllable it follows, exactly as `sed -f sedsyllables` leaves them.
 */
export function syllabifyLatinLine(line: string): string {
  return line.replace(/\p{L}+/gu, w => splitLatinWord(w).join(' -- '));
}
