/**
 * The Latin pointing is jgabc's, not a second implementation of it.
 *
 * There used to be two engines in this repo. psalmtone.js laid out the notes
 * of the engraved verse, and psalm-tone-engine.ts read the same formulas
 * again, with its own rules, to decide where the bold and the italics went in
 * the text. The two disagreed on 38 of the 108 formulas in tone-data, because
 * the local reader kept counting preparatory syllables across an accent while
 * jgabc resets the count at every one. On the mediant of tones 1, 6 and 7 —
 * two accents, no preparatory syllables — that produced an italic syllable
 * before the first accent that belongs to no cadence: "Et exsultá<i>vit</i>
 * <b>spí</b>ritus <b>me</b>us".
 *
 * Both jobs now go through psalmtone.js: getGabcTones reads the formula and
 * addBoldItalic points the Latin, over the same regexLatin syllables the
 * score is engraved on.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseGabcToneCounts, pointPsalm } from './psalm-tone-engine';
import { applyPsalmTone, getGabcTones } from './psalmtone-wrapper';
import { PSALM_TONES } from './tone-data';

/** Every formula in the catalogue, as (label, gabc, clef). */
function allFormulas(): Array<[string, string, string]> {
  const out: Array<[string, string, string]> = [];
  for (const [name, spec] of Object.entries(PSALM_TONES)) {
    const formulas: Array<[string, string | undefined]> = [
      ['mediant', spec.mediant],
      ['solemn', spec.solemn],
      ['shortMediant', spec.shortMediant],
      ['shortSolemn', spec.shortSolemn],
      ['termination', spec.termination],
      ...Object.entries(spec.terminations ?? {}).map(
        ([k, v]) => [`termination ${k}`, v] as [string, string],
      ),
    ];
    for (const [label, gabc] of formulas) {
      if (gabc) out.push([`${name} ${label}`, gabc, spec.clef]);
    }
  }
  return out;
}

test('every formula is read by jgabc, not by a second parser', () => {
  const formulas = allFormulas();
  assert.ok(formulas.length > 100, 'the catalogue should be the whole thing');

  for (const [label, gabc, clef] of formulas) {
    const ours = parseGabcToneCounts(gabc, clef);
    const theirs = getGabcTones(gabc, undefined, false, clef);
    assert.deepEqual(
      {
        accents: ours.accents,
        preparatory: ours.preparatory,
        afterLastAccent: ours.afterLastAccent,
        intonation: ours.intonation,
      },
      {
        accents: theirs.accents,
        preparatory: theirs.preparatory,
        afterLastAccent: theirs.afterLastAccent,
        intonation: theirs.intonation,
      },
      label,
    );
  }
});

test('a two-accent mediant has no preparatory syllables', () => {
  // The formula that started this: "f gh hr 'ixi hr 'g hr h.". The reciting
  // note between the two accents is not a preparatory syllable, and the
  // "hr h." after the second accent is not one either.
  for (const tone of ['1.', '6.', '7.']) {
    const counts = parseGabcToneCounts(PSALM_TONES[tone].mediant, PSALM_TONES[tone].clef);
    assert.equal(counts.accents, 2, `${tone} accents`);
    assert.equal(counts.preparatory, 0, `${tone} preparatory`);
  }
});

test('the Magnificat at tone 1g points as jgabc points it', () => {
  const text = [
    'Magníficat * ánima mea Dóminum.',
    'Et exsultávit spíritus meus * in Deo salutári meo.',
    'Quia respéxit humilitátem ancíllæ suæ: * ecce enim ex hoc beátam me dicent omnes generatiónes.',
    'Et misericórdia ejus a progénie in progénies * timéntibus eum.',
    'Fecit poténtiam in bráchio suo: * dispérsit supérbos mente cordis sui.',
    'Depósuit poténtes de sede, * et exaltávit húmiles.',
  ].join('\n');

  const expected = [
    'Ma<strong>gní</strong>ficat * ánima <em>me</em><em>a</em> <strong>Dó</strong>minum.',
    'Et exsultávit <strong>spí</strong>ritus <strong>me</strong>us * in Deo salu<em>tá</em><em>ri</em> <strong>me</strong>o.',
    'Quia respéxit humilitátem an<strong>cíl</strong>læ <strong>su</strong>æ: * ecce enim ex hoc beátam me dicent omnes gene<em>ra</em><em>ti</em><strong>ó</strong>nes.',
    'Et misericórdia ejus a progénie <strong>in</strong> pro<strong>gé</strong>nies * timén<em>ti</em><em>bus</em> <strong>e</strong>um.',
    'Fecit poténtiam in <strong>brá</strong>chio <strong>su</strong>o: * dispérsit supérbos mente <em>cor</em><em>dis</em> <strong>su</strong>i.',
    'Depósuit po<strong>tén</strong>tes de <strong>se</strong>de, * et exal<em>tá</em><em>vit</em> <strong>hú</strong>miles.',
  ].join('\n');

  assert.equal(pointPsalm({ text, tone: '1.', variant: 'g', lang: 'la' }), expected);
});

test('the Latin syllables are the ones the score is engraved on', () => {
  // Hypher's Latin patterns, which psalmtone.js reached for in addBoldItalic,
  // do not break hiatus: "meus", "suæ" and "eum" come back whole, so the
  // final accent landed a syllable early. regexLatin — what applyPsalmTone
  // uses — splits them, and the pointing follows the notes.
  const out = pointPsalm({
    text: 'Suscépit Israël púerum suum, * recordátus misericórdiæ suæ.',
    tone: '1.', variant: 'g', lang: 'la',
  });
  assert.match(out, /<strong>pú<\/strong>erum <strong>su<\/strong>um/);
  assert.match(out, /misericór<em>di<\/em><em>æ<\/em> <strong>su<\/strong>æ\./);
});

test('English takes its accents from the text, not from counting', () => {
  // jgabc's stand-in rule — a syllable two back from the last accent counts
  // as accented — is for text that marks none. Ungated it outranked the
  // acutes that lypsautierant's psalms carry, and put the second accent of
  // the mediant on "of" rather than on "gréat".
  const out = pointPsalm({
    text: 'My sóul procláims the gréatness of the Lórd, * and my spírit rejóices in Gód my Sávior.',
    tone: '1.', variant: 'g', lang: 'en',
  });
  assert.equal(
    out,
    'My sóul procláims the <strong>gréat</strong>ness of the <strong>Lórd</strong>, '
    + '* and my spírit rejóices in <em>Gód</em> <em>my</em> <strong>Sá</strong>vior.',
  );

  const benedictus = pointPsalm({
    text: 'Bléssed be the Lórd, the Gód of Ísrael; * he has come to his péople and sét them frée.',
    tone: '1.', variant: 'g', lang: 'en',
  });
  assert.match(benedictus, /the <strong>Gód<\/strong> of <strong>Ís<\/strong>rael;/);
});

test('the English score is divided into the same syllables as the text', () => {
  // psalmtone.js used to divide English with TeX hyphenation patterns, which
  // mark where a LINE may break: "thirsting" came back as "thirst-ing" for
  // the notes while the pointing read "thir-sting", and "mercy", "glory",
  // "holy" and "blessed" were not divided at all. It is given this app's
  // syllabifier now (psalmtone-wrapper.ts).
  const score = applyPsalmTone({
    text: 'for you my soul is thirsting',
    gabc: PSALM_TONES['1.'].mediant,
    clef: PSALM_TONES['1.'].clef,
    useBoldItalic: false,
    lang: 'en',
    favor: 'intonation',
  });
  assert.match(score, /thir\([a-m]+\)sting/, `score divided "thirsting" as: ${score}`);
});
