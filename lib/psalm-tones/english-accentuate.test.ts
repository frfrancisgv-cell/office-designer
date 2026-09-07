/**
 * Accenting unaccented English, so an iBreviary psalm can be sung to the
 * lypsautierant tones.
 *
 * The English and gregorian mode families find their stresses by reading acute
 * accents, and the office texts do not have them: iBreviary prints the 1963
 * Grail plain. Before this, the only text those tones could point was
 * psautier's own accented psalter — a different translation from the one in
 * the office — and everything else came back with almost no marks on it.
 *
 * accentuateEnglish supplies the acutes from the psalters' own pointing. The
 * last test here is the one that matters: it points every hemistich of the
 * Abbey psalter twice, once from the editors' accents and once from ours, and
 * compares the marks the mode produced.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { accentuateEnglish } from './english-phonetic';
import { syllabifyLine } from './lypsautierant-syllabify';
import { applyMode, getModeNames, getVariations } from './lypsautierant-modes';
import { pointPsalmText } from './lypsautierant-engine';

const ACUTE = /[áéíóúýÁÉÍÓÚÝ]/;
const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The Abbey psalter's pointed hemistichs, one per line, verse numbers off. */
function abbeyHemistichs(): string[] {
  const dir = path.join(process.cwd(), 'vendor/psautier/theAbbeyPsalmsAndCanticles');
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (!/^(NT|OT) \d/.test(name)) continue;
    for (let line of readFileSync(path.join(dir, name), 'utf8').split('\n')) {
      line = line.replace(/^\s*\d+\s*/, '').trim();
      if (line && ACUTE.test(line)) out.push(line);
    }
  }
  return out;
}

test('the acute lands on the vowel of the stressed syllable', () => {
  assert.equal(accentuateEnglish('revelation'), 'revelátion');
  assert.equal(accentuateEnglish('generation'), 'generátion');
  assert.equal(accentuateEnglish('great'), 'gréat');       // first vowel of the nucleus
  assert.equal(accentuateEnglish('soul'), 'sóul');
  assert.equal(accentuateEnglish('everlasting'), 'everlásting');
});

test('a prefix does not take the accent', () => {
  // The psalters use "began" once, in Psalm 68, and do not point it, so the
  // dictionary cannot answer and the fallback has to. "Stress the first of
  // two" made it "bégan"; English stresses the stem, not the prefix.
  assert.equal(
    accentuateEnglish('It was there that your flock began to dwell.'),
    'It wás there that your flóck begán to dwéll.',
  );
  assert.equal(accentuateEnglish('begins'), 'begíns');
  assert.equal(accentuateEnglish('unpacked'), 'unpácked');
});

test('a word-initial y is a consonant, not the nucleus', () => {
  // Searching one vowel class found the y of "years" first and produced
  // "ýears". y carries the acute only where the syllable has no other vowel.
  assert.equal(accentuateEnglish('years'), 'yéars');
  assert.equal(accentuateEnglish('yield'), 'yíeld');
  assert.equal(accentuateEnglish('cymbals'), 'cýmbals');
  assert.equal(accentuateEnglish('why'), 'whý');
});

test('the words the cadence passes over keep their plain vowels', () => {
  // "He", "in", "his", "the" and "of" are the words under test. "holds" is
  // passed over too, which it should not be: the psalters use it three times
  // and point it once, and at RATE_MIN_OCCURRENCES = 3 that is enough to put
  // it below the line. It is the thinnest kind of evidence the rate accepts.
  assert.equal(
    accentuateEnglish('He holds in his hands the depths of the earth'),
    'He holds in his hánds the dépths of the éarth',
  );
  // Two or three accents a line, which is what the psalters do.
  const marked = accentuateEnglish('from the womb before the dawn I begot you');
  assert.equal(marked, 'from the wómb befóre the dáwn I begót you');
});

test('accents already in the text are left alone, and running twice changes nothing', () => {
  const pointed = 'Bléssed indéed is the mán';
  assert.equal(accentuateEnglish(pointed), pointed);

  const once = accentuateEnglish('Blessed be the Lord, the God of Israel');
  assert.equal(accentuateEnglish(once), once);
});

test('punctuation, verse numbers and the hemistich markers survive', () => {
  const out = accentuateEnglish('4 “Sit on my right: * your foes I will put beneath your feet.” †');
  assert.match(out, /^4 “/);
  assert.match(out, / \* /);
  assert.match(out, /†$/);
  assert.match(out, /“Sít on my ríght:/);
});

test('an unaccented English psalm points, and says where the stresses came from', () => {
  // Psalm 110 as iBreviary prints it: no accents, one hemistich a line.
  const text = [
    'The Lord’s revelation to my Master: †',
    '“Sit on my right: *',
    'your foes I will put beneath your feet.”',
  ].join('\n');

  const variation = getVariations('english', 'one')[0];
  const result = pointPsalmText(text, 'english', 'one', variation, 'en');

  // Marks, not silence: this used to come back with almost nothing on it.
  const marks = (result.html.match(/data-pt="(pl|mi)"/g) ?? []).length;
  assert.ok(marks >= 6, `expected the mode to mark the cadences, got ${marks} marks`);
  assert.match(result.warnings.join(' '), /carried no accents/);

  // Latin is not touched by any of this — it arrives already accented, and
  // accentuateEnglish knows nothing of Latin stress.
  const latin = pointPsalmText('Dominus regit me *\net nihil mihi deerit.', 'gregorian', 'one',
    getVariations('gregorian', 'one')[0], 'la');
  assert.doesNotMatch(latin.warnings.join(' '), /carried no accents/);
});

test('the tones mark the same syllables from our accents as from the editors’', () => {
  const hemistichs = abbeyHemistichs();
  assert.ok(hemistichs.length > 1500, `expected the Abbey psalter, got ${hemistichs.length}`);

  // Every accent-aware family, mode and termination, over every fourth
  // hemistich — 27,000 comparisons rather than 108,000, which keeps `npm test`
  // inside a minute without moving any of the numbers by more than a tenth of
  // a point. The comparison strips the acutes from both outputs, so what is
  // compared is where the mode put its marks, not whether we chose the same
  // letters to accent.
  const pairs = hemistichs
    .filter((_, i) => i % 4 === 0)
    .map(editors => [editors, accentuateEnglish(stripAccents(editors))] as const);
  let total = 0, same = 0;
  const perMode = new Map<string, [number, number]>();

  for (const family of ['english', 'gregorian'] as const) {
    for (const mode of getModeNames(family)) {
      for (const rule of ['first', ...getVariations(family, mode)]) {
        for (const [editors, ours] of pairs) {
          const a = applyMode(family, mode, rule, syllabifyLine(editors));
          const b = applyMode(family, mode, rule, syllabifyLine(ours));
          total++;
          const agree = stripAccents(a) === stripAccents(b);
          if (agree) same++;
          const key = `${family}/${mode}`;
          const [n, k] = perMode.get(key) ?? [0, 0];
          perMode.set(key, [n + 1, k + (agree ? 1 : 0)]);
        }
      }
    }
  }

  const rate = same / total;
  const report = [...perMode]
    .map(([k, [n, k2]]) => `${k} ${(100 * k2 / n).toFixed(0)}%`)
    .join(', ');
  assert.ok(rate > 0.88, `${(100 * rate).toFixed(1)}% of ${total} comparisons agree — ${report}`);

  // The modes that want two accents do worse than the ones that want one,
  // which is the shape of the underlying numbers: the final accent is right
  // 95% of the time and the last two together 81%.
  const twoAccents = perMode.get('english/one')!;
  const oneAccent = perMode.get('english/four')!;
  assert.ok(twoAccents[1] / twoAccents[0] > 0.78);
  assert.ok(oneAccent[1] / oneAccent[0] > 0.92);
});
