/**
 * Pure English phonetic syllabifier and stress inference.
 * Used for both Gregorian pointing (server-side) and auto-pointing (client-side).
 * Contains no Node.js dependencies (unlike hypher).
 */

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

export const ENGLISH_STRESS_DICT: Record<string, boolean[]> = {
  'zion': [true, false], 'sions': [true, false], 'zíon': [true, false],
  'jerusalem': [false, false, true, false], 'jerúsalem': [false, false, true, false],
  'babylon': [true, false, false], 'bábylon': [true, false, false],
  'remembering': [false, true, false], 'remémbering': [false, true, false], 'remember': [false, true, false],

  'natural': [true, false], 'nátural': [true, false],
  'several': [true, false], 'séveral': [true, false],
  'general': [true, false], 'géneral': [true, false],
  'forget': [false, true], 'wither': [true, false], 'rivers': [true, false],

  'tongue': [true], 'tongues': [true], 'tóngue': [true], 'tóngues': [true],
  'cleave': [true], 'roof': [true], 'heavens': [true, false], 'heaven': [true, false],
  'blessed': [true, false], 'counsel': [true, false], 'wicked': [true, false],
  'sinners': [true, false], 'scorners': [true, false], 'company': [true, false, false],
  'delight': [false, true], 'ponders': [true, false], 'salvation': [false, true, false],
  'righteous': [true, false], 'righteousness': [true, false, false],
  'lovingkindness': [true, false, true, false], 'faithfulness': [true, false, false],
  'steadfast': [true, false], 'deliver': [false, true, false],
  'deliverer': [false, true, false, false], 'deliverance': [false, true, false],
  'majestic': [false, true, false], 'majesty': [true, false, false],
  'children': [true, false], 'peoples': [true, false], 'nations': [true, false],
  'glory': [true, false], 'holy': [true, false], 'mercy': [true, false],
  'father': [true, false], 'spirit': [true, false]
};

export const FUNCTIONAL_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'with', 'from',
  'by', 'or', 'nor', 'but', 'if', 'then', 'so', 'as', 'my', 'your', 'his', 'her',
  'its', 'our', 'their', 'this', 'that', 'these', 'those', 'it', 'he', 'she', 'we',
  'they', 'you', 'me', 'him', 'us', 'them'
]);

/** Infer primary word stress for unaccented English words. */
export function inferEnglishWordStress(word: string, sylls: string[]): boolean[] {
  const clean = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  if (ENGLISH_STRESS_DICT[clean]) return ENGLISH_STRESS_DICT[clean];
  if (sylls.length === 1) return [!FUNCTIONAL_WORDS.has(clean)];
  const res = new Array(sylls.length).fill(false);
  if (sylls.length === 2) res[0] = true;
  else res[Math.max(0, sylls.length - 2)] = true;
  return res;
}
