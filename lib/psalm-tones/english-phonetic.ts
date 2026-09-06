/**
 * English syllable division and word stress — the one source both the
 * Gregorian tone engine (server) and the 1/2/3 pointer (client) read from.
 *
 * No Node dependencies, so it runs in the browser, and it is also what
 * psalmtone.js is given to divide English with (see psalmtone-wrapper.ts).
 */
import { ENGLISH_STRESS, ENGLISH_RARELY_ACCENTED } from './english-stress';

export const ENGLISH_PSALM_DICT: Record<string, string[]> = {
  'remembering': ['re', 'mem', 'bering'], 'remémbering': ['re', 'mém', 'bering'],
  'remember': ['re', 'mem', 'ber'], 'remémber': ['re', 'mém', 'ber'],
  'remembered': ['re', 'mem', 'bered'], 'remémbered': ['re', 'mém', 'bered'],
  'gathering': ['gath', 'ering'], 'gáthering': ['gáth', 'ering'],
  'offering': ['of', 'fering'], 'óffering': ['óf', 'fering'],
  'offerings': ['of', 'ferings'], 'ófferings': ['óf', 'ferings'],
  'suffering': ['suf', 'fering'], 'súffering': ['súf', 'fering'],
  'sufferings': ['suf', 'ferings'], 'súfferings': ['súf', 'ferings'],
  'natural': ['nat', 'ural'], 'nátural': ['nát', 'ural'],
  'several': ['sev', 'eral'], 'séveral': ['sév', 'eral'],
  'general': ['gen', 'eral'], 'géneral': ['gén', 'eral'],
  'cultural': ['cul', 'tural'], 'cúltural': ['cúl', 'tural'],
  'pastoral': ['pas', 'toral'], 'pástoral': ['pás', 'toral'],
  'every': ['ev', 'ery'], 'évery': ['év', 'ery'],
  'tongue': ['tongue'], 'tongues': ['tongues'], 'tóngue': ['tóngue'], 'tóngues': ['tóngues'],
  'zion': ['zi', 'on'], 'zíon': ['zí', 'on'], 'sion': ['si', 'on'], 'síon': ['sí', 'on'],

  'israel': ['is', 'ra', 'el'], 'ísrael': ['ís', 'ra', 'el'],
  'jerusalem': ['je', 'ru', 'sa', 'lem'], 'jerúsalem': ['je', 'rú', 'sa', 'lem'],
  'babylon': ['bab', 'y', 'lon'], 'bábylon': ['báb', 'y', 'lon'],
  'blessed': ['bles', 'sed'], 'blessèd': ['bles', 'sèd'], 'blesséd': ['blés', 'sed'],
  'scorners': ['scor', 'ners'], 'scorner': ['scor', 'ner'],
  'abides': ['a', 'bides'], 'abide': ['a', 'bide'],
  'ever': ['ev', 'er'], 'forever': ['for', 'ev', 'er'],
  'rebel': ['reb', 'el'], 'rebels': ['reb', 'els'],
  'righteous': ['righ', 'teous'], 'righteousness': ['righ', 'teous', 'ness'],
  'enemy': ['en', 'e', 'my'], 'enemies': ['en', 'e', 'mies'],
  'holy': ['ho', 'ly'], 'glory': ['glo', 'ry'], 'mercy': ['mer', 'cy'],
  'father': ['fa', 'ther'], 'spirit': ['spi', 'rit'],
  'heavens': ['heav', 'ens'], 'heaven': ['heav', 'en'],
  'majestic': ['ma', 'jes', 'tic'], 'majesty': ['ma', 'jes', 'ty'],
  'children': ['chil', 'dren'], 'peoples': ['peo', 'ples'], 'nations': ['na', 'tions'],
  'fetters': ['fet', 'ters'], 'counsel': ['coun', 'sel'], 'company': ['com', 'pa', 'ny'],
  'salvation': ['sal', 'va', 'tion'], 'delight': ['de', 'light'], 'ponders': ['pon', 'ders'],
  'conspire': ['con', 'spire'], 'shatter': ['shat', 'ter'], 'shattered': ['shat', 'tered'],
  'truest': ['tru', 'est'], 'highest': ['high', 'est'], 'lowest': ['low', 'est'],
  'power': ['pow', 'er'], 'powers': ['pow', 'ers'], 'prayer': ['pray', 'er'], 'prayers': ['pray', 'ers'],
  'shelter': ['shel', 'ter'], 'refuge': ['ref', 'uge'], 'fortress': ['for', 'tress'],
  'deliver': ['de', 'liv', 'er'], 'deliverer': ['de', 'liv', 'er', 'er'], 'deliverance': ['de', 'liv', 'er', 'ance'],
  'blessing': ['bless', 'ing'], 'blessings': ['bless', 'ings'],
  'lovingkindness': ['lov', 'ing', 'kind', 'ness'], 'steadfast': ['stead', 'fast'], 'faithfulness': ['faith', 'ful', 'ness'],
  'assembly': ['as', 'sem', 'bly'], 'heritage': ['her', 'i', 'tage'], 'possession': ['pos', 'ses', 'sion'],
  'exult': ['ex', 'ult'], 'trembling': ['trem', 'bling'], 'blazing': ['bla', 'zing'],
  'dishonored': ['dis', 'hon', 'ored'], 'futile': ['fu', 'tile'], 'wonders': ['won', 'ders'],
  'faithful': ['faith', 'ful'], 'sacrifice': ['sac', 'ri', 'fice'], 'increase': ['in', 'crease'],
  'asleep': ['a', 'sleep'], 'safety': ['safe', 'ty'], 'anguish': ['an', 'guish'],
  'torment': ['tor', 'ment'], 'reproach': ['re', 'proach'], 'grief': ['grief'],
  'trouble': ['trou', 'ble'], 'lament': ['la', 'ment'], 'darkness': ['dark', 'ness'],
  'light': ['light'], 'stronghold': ['strong', 'hold'], 'chaff': ['chaff'], 'wind': ['wind'],
  'wicked': ['wick', 'ed'], 'sinners': ['sin', 'ners'], 'scorn': ['scorn'], 'law': ['law'],
  'day': ['day'], 'night': ['night'], 'tree': ['tree'], 'planted': ['plant', 'ed'],
  'streams': ['streams'], 'water': ['wa', 'ter'], 'yields': ['yields'], 'fruit': ['fruit'],
  'season': ['sea', 'son'], 'leaves': ['leaves'], 'wither': ['with', 'er'], 'prospers': ['pros', 'pers']
};

/**
 * The form a word is looked up under in ENGLISH_STRESS and ENGLISH_UNSTRESSED.
 * scripts/build-english-stress.mjs keys the dictionary exactly this way; the
 * two must not drift apart.
 */
export function stressKey(word: string): string {
  return word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\u2019/g, "'");
}

/** Split English word into phonetic singing syllables. */
export function englishPhoneticSyllabify(word: string): string[] {
  if (!word) return [];
  const clean = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (ENGLISH_PSALM_DICT[clean]) {
    const parts = ENGLISH_PSALM_DICT[clean];
    const res: string[] = [];
    let pos = 0;
    for (const p of parts) {
      res.push(word.slice(pos, pos + p.length));
      pos += p.length;
    }
    if (pos < word.length) res[res.length - 1] += word.slice(pos);
    return res;
  }

  // Silent 'ue' / 'ues' check: words like tongue, tongues, plague, plagues, rogue, vague, league
  if (/(?:ng|g|q)ues?$/i.test(clean)) {
    return [word];
  }

  // Compound prefix rules e.g. with-in, with-out, with-hold, with-held, with-drawn
  if (/^with(in|out|hold|held|drawn|stand)/i.test(clean)) {
    const p1 = word.slice(0, 4);
    const p2 = englishPhoneticSyllabify(word.slice(4));
    return [p1, ...p2];
  }

  // Phonetic nucleus syllabifier
  const vowelPattern = /[aeiouy]+(?:[aeiouy]+)?/gi;
  let tempWord = clean;
  if (/[b-df-hj-np-tv-z]e$/i.test(tempWord) && !/[aeiouy]{2}e$/i.test(tempWord)) tempWord = tempWord.slice(0, -1);
  if (/[b-df-hj-np-tv-z]es$/i.test(tempWord) && !/(?:[cszx]|ch|sh)$/i.test(tempWord.slice(0, -2))) tempWord = tempWord.slice(0, -2);
  if (/[b-df-hj-np-tv-z]ed$/i.test(tempWord) && !/[td]$/i.test(tempWord.slice(0, -2))) tempWord = tempWord.slice(0, -2);

  const matches: Array<{ index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = vowelPattern.exec(tempWord)) !== null) {
    matches.push({ index: m.index, length: m[0].length });
  }

  if (matches.length <= 1) return [word];

  const sylls: string[] = [];
  let lastEnd = 0;
  for (let i = 0; i < matches.length - 1; i++) {
    const currV = matches[i];
    const nextV = matches[i + 1];
    const consBetween = clean.slice(currV.index + currV.length, nextV.index);

    let splitOffset = Math.floor(consBetween.length / 2);
    if (consBetween.length >= 2) splitOffset = 1;

    // Digraph rule: keep 'th', 'sh', 'ch', 'ph', 'wh' together
    if (consBetween.length >= 2 && /^(th|sh|ch|ph|wh)/i.test(consBetween)) {
      splitOffset = 0; // Digraph stays together at onset of next syllable
    }

    const cutPoint = currV.index + currV.length + splitOffset;
    sylls.push(word.slice(lastEnd, cutPoint));
    lastEnd = cutPoint;
  }
  sylls.push(word.slice(lastEnd));
  return sylls;
}

/**
 * Where the stress falls in an English word.
 *
 * The answer comes from ENGLISH_STRESS: 1,900 word forms read off the acutes
 * that the editors of the Revised Grail psalter and The Abbey Psalms and
 * Canticles put on their own text. Two hand-written lists used to stand here
 * instead — about fifty words with their stress patterns, and forty-five
 * "functional words" — and between them they covered a fraction of a psalm.
 *
 * `sylls` must be this file's own division of the word: the dictionary stores
 * a syllable number, and the number only means anything against
 * englishPhoneticSyllabify.
 *
 * Words the dictionary has never seen fall back to the old rule — the penult,
 * or the first of two. On the Abbey psalter that rule alone was right 83.4%
 * of the time and the dictionary 99.5% of the time on the 89.2% it covered.
 *
 * A word the psalters seldom point at all gets no stress: the cadence has to
 * pass over it. That is a claim about which WORD carries the accent, and it
 * is only consulted when the text marks none of its own — where the acutes
 * are there, in Latin or in lypsautierant's English psalms, they decide.
 */
export function inferEnglishWordStress(word: string, sylls: string[]): boolean[] {
  const key = stressKey(word);
  const res = new Array(sylls.length).fill(false);

  const known = ENGLISH_STRESS.get(key);
  if (known !== undefined && known < sylls.length) {
    res[known] = true;
    return res;
  }

  if (ENGLISH_RARELY_ACCENTED.has(key)) return res;
  if (sylls.length === 1) return [true];

  res[sylls.length === 2 ? 0 : Math.max(0, sylls.length - 2)] = true;
  return res;
}

/**
 * True when the psalters seldom point this word — under 30% of the time — so
 * a cadence should pass over it and land on the word before.
 */
export function isUnstressedWord(word: string): boolean {
  return ENGLISH_RARELY_ACCENTED.has(stressKey(word));
}
