/**
 * The words the English syllabification audit ruled on.
 *
 * `sedsyllables`' character classes are lower-case only, so a capital
 * silently defeated the rule that should split the word: "hóly" split and
 * "Hóly" did not, in 271 places. Four structural rules were added on top of
 * that — a syllable holds a vowel — and between them they replaced some fifty
 * single-word repairs.
 *
 * These are pinned because `lypsautierant-syllabify.ts` is generated from
 * `vendor/psautier/sedsyllables` by `scripts/gen-lypsautierant.mjs`, and
 * `npm run test:lyps` proves the port faithful to whatever sed is on disk —
 * it cannot tell you which sed you wanted. A regeneration from an unmirrored
 * copy would put every one of these back and nothing else would notice.
 *
 * A changed syllable count moves every pointing mark in its hemistich, so
 * each of these was measured over the corpus before it went in: 666 of the
 * 11823 lines split differently, and 325 point differently.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { syllabifyLine } from './lypsautierant-syllabify';

const split = (word: string) => syllabifyLine(word).split(' -- ').join('-');
const same = (rows: Array<[string, string]>) => {
  for (const [word, expected] of rows) assert.equal(split(word), expected, word);
};

test('a capital no longer defeats the rule that splits the word', () => {
  same([
    // The word the user named, and the largest single group in the audit.
    ['Hóly', 'Hó-ly'], ['Holy', 'Ho-ly'], ['hóly', 'hó-ly'],
    ['Mary', 'Ma-ry'], ['Mány', 'Má-ny'], ['Body', 'Bo-dy'], ['City', 'Ci-ty'],
    ['Very', 'Ve-ry'], ['Míghty', 'Mí-ghty'], ['Daughter', 'Daugh-ter'],
    ['Beloved', 'Be-lo-ved'], ['Redeemer', 'Re-dee-mer'],
    ['Forever', 'For-ev-er'], ['Whatever', 'Wha-te-ver'],
    ['Whomever', 'Who-me-ver'], ['Splendor', 'Splen-dor'],
    ['Instrúct', 'In-strúct'], ['Síon', 'Sí-on'], ['Síon’s', 'Sí-on’s'],
  ]);
});

test('the words whose capital was already right are untouched', () => {
  // The audit's do-not-touch list: here the lower-cased form is the broken
  // one, and a widened class would have broken the word rather than mended it.
  same([
    ['Christ', 'Christ'], ['Chríst', 'Chríst'], ['Christ’s', 'Christ’s'],
    ['Alleluia', 'Al-le-lu-ia'], ['Allelúia', 'Al-le-lú-ia'],
    ['Savior', 'Sa-vi-or'], ['Sávior', 'Sá-vi-or'],
    ['Whoever', 'Who-e-ver'], ['Whoéver', 'Who-é-ver'],
    ['Christmas', 'Christ-mas'], ['Wórthy', 'Wór-thy'], ['Lórd’s', 'Lórd’s'],
    ['Blest', 'Blest'], ['Blést', 'Blést'], ['Flesh', 'Flesh'],
  ]);
});

test('a syllable holds a vowel', () => {
  same([
    // A final cluster with none.
    ['hymn', 'hymn'], ['Hymn', 'Hymn'], ['burnt', 'burnt'], ['myrrh', 'myrrh'],
    ['léngth', 'léngth'], ['warmth', 'warmth'], ['prompt', 'prompt'],
    ['Lord’s', 'Lord’s'], ['doesn’t', 'doesn’t'], ['triumphs', 'tri-umphs'],
    ['thousandth', 'thou-sandth'],
    // An initial one.
    ['spread', 'spread'], ['spríngs', 'spríngs'], ['sprínkle', 'sprín-kle'],
    ['whole', 'whole'], ['While', 'While'], ['dwelling', 'dwel-ling'],
    ['Christe', 'Christe'], ['Bless', 'Bless'], ['Bléss', 'Bléss'],
    ['male', 'male'], ['smile', 'smile'],
    // And an empty one, which only ever showed on a line-opening word.
    ['blessed', 'blessed'], ['bléssed', 'bléssed'], ['flesh', 'flesh'],
  ]);
});

test('a silent -le after a vowel is not a syllable, and after a consonant it is', () => {
  same([
    ['rúles', 'rúles'], ['hóles', 'hóles'], ['scáles', 'scáles'],
    ['smíles', 'smíles'], ['ísles', 'ísles'], ['éxiles', 'éx-iles'],
    ['péoples', 'péo-ples'], ['apostles', 'a-pos-tles'], ['nóbles', 'nó-bles'],
    ['trémbles', 'trém-bles'], ['disciples', 'dis-ci-ples'],
    // "less" is not a "-les": the audit's own rule for it still stands.
    ['blámeless', 'bláme-less'], ['sénseless', 'sénse-less'],
  ]);
});

test('the over-split words the audit listed', () => {
  same([
    ['Bridegroom', 'Bride-groom'], ['Scripture', 'Scrip-ture'],
    ['Prayer', 'Prayer'], ['prayer', 'prayer'], ['tímbrel', 'tím-brel'],
  ]);
});

test('the -sion ending still splits, and Sion is still a place', () => {
  // The Sion rule runs before anything cuts a "-sion" ending, or it would
  // fire inside "com -- pás -- sion" and make a fourth syllable of it.
  same([
    ['compássion', 'com-pás-sion'], ['transgréssions', 'trans-grés-sions'],
    ['vision', 'vi-sion'], ['mánsion', 'mán-sion'],
  ]);
});
