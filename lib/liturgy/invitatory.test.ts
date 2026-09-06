/**
 * The invitatory antiphon and the psalm tone that goes with it.
 *
 * `IDX_INV.csv` does not use the occasion codes the rest of the app computes.
 * The route asks OCO for a ferial `1H4`, a dated `15/8` or a common `Doct`;
 * the invitatory index writes the ferial cycle as `1-4H4` — one set of seven
 * shared by all four psalter weeks — Lent as `Q`, Advent as
 * `Adv ante 17/12 H2-7`, Easter as `TP ante Asc`. So the old
 * `find(e => e.occasion === occasionCode)` matched on a handful of commons and
 * dated feasts and on no ferial, Advent, Lent, Christmas or Easter day at all,
 * which is most of the year.
 *
 * The measure of this file is the first test: every day of a year resolves an
 * antiphon, with real text and a tone to sing the psalm to.
 *
 * Run with: npm run test:unit
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getLiturgicalContext, invitatoryOccasionCodes } from './calendar-context';
import {
  invByOccasion, invitatoryToneByMode, invitatoryToneLabel, resolveInvitatory,
} from '@/app/api/ibreviary/gabc-lookup';
import { getInvs } from '@/app/api/ibreviary/gabc-loaders';
import { generateCanonicalOffice } from './office-engine';
import { getLatinPsalmText } from './latin-texts';
import {
  INVITATORY_LATIN_NOTE, buildInvitatoryBlocks, placeGregorianInvitatory,
  splitInvitatoryTone,
} from './invitatory';
import { gabcText } from './gabc-text';
import { parseBlocks } from '@/app/api/ibreviary/parse-blocks';
import * as cheerio from 'cheerio';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** The eleven modes `IDX_INV.csv` records, and no more. */
const MODES = ['2', '3', '4', '4*', '4**', '5', '6', '6*', '7', 'D', 'E'];

/** An ordinary Tuesday in Ordinary Time, with nothing proper about it. */
const A_DAY = new Date(Date.UTC(2026, 8, 8));

/** Lauds as the route builds it: the engine, with the invitatory resolved. */
async function lauds(lang: 'en' | 'la') {
  const context = await getLiturgicalContext(A_DAY, 'lauds');
  return generateCanonicalOffice({
    date: A_DAY,
    hour: 'lauds',
    lang,
    invitatory: resolveInvitatory(invitatoryOccasionCodes(context)),
  });
}

/** Every day of 2026, resolved as Lauds. */
async function everyDay() {
  const days = [];
  for (let i = 0; i < 365; i++) {
    const date = new Date(Date.UTC(2026, 0, 1 + i));
    const context = await getLiturgicalContext(date, 'lauds');
    const codes = invitatoryOccasionCodes(context);
    days.push({ date, context, codes, candidates: invByOccasion(codes) });
  }
  return days;
}

test('every day of the year resolves an invitatory antiphon', async () => {
  const days = await everyDay();

  const unresolved = days
    .filter(d => !d.candidates.length)
    .map(d => `${d.date.toISOString().slice(0, 10)} tried ${d.codes.join(' → ')}`);
  assert.deepEqual(unresolved, []);

  // Not a label, and not upstream's "- cum alleluia" ditto mark, which is what
  // reading the `Title` column instead of `Text` used to print.
  const empty = days
    .filter(d => !d.candidates[0].incipit.trim() || d.candidates[0].incipit.startsWith('-'))
    .map(d => `${d.date.toISOString().slice(0, 10)}: ${JSON.stringify(d.candidates[0].incipit)}`);
  assert.deepEqual(empty, []);

  // Most of the year should be getting its own antiphon rather than the
  // weekday one: 210 of 365 in 2026, which is every Sunday, every day of
  // Advent, Lent and Easter, and every celebration with a common.
  const proper = days.filter(d => !/^1-4H\d$/.test(d.candidates[0].occasion ?? ''));
  assert.ok(proper.length > 200, `only ${proper.length} days get a proper or seasonal antiphon`);
});

test('the day that is asked for is the day that answers', async () => {
  const expected: Record<string, string> = {
    '2026-01-01': 'N-1/1',                 // Mary, Mother of God
    '2026-01-04': 'Ep',                    // Epiphany, transferred to the Sunday
    '2026-01-08': 'N post Ep',
    '2026-01-11': 'Bapt',
    '2026-02-02': '2/2',                   // the Presentation
    '2026-03-19': '19/3',                  // Saint Joseph
    '2026-04-03': '6Q6',                   // Good Friday has its own, not the general "Q"
    '2026-04-04': '6Q7',                   // Holy Saturday likewise
    '2026-04-25': '25/4',                  // Saint Mark — see the Easter test below
    '2026-05-03': 'TP ante Asc',
    '2026-05-17': 'Asc',
    '2026-05-24': 'Pent',
    '2026-05-31': 'Trn',                   // movable: no date code can reach it
    '2026-06-07': 'Corp',
    '2026-06-12': 'Cord',
    '2026-08-15': '15/8',                  // the Assumption
    '2026-09-29': '29/9 2/10',             // one row, two dates
    '2026-11-02': 'Def',
    '2026-11-22': 'Reg',
    '2026-12-20': 'Adv post 17/12 H1',     // the Sunday after 17 December
    '2026-12-21': 'Adv post 17/12 H2-7',   // and its weekdays
    '2026-12-06': 'Adv ante 17/12 H1',
    '2026-12-25': 'N-25/12',
    '2026-12-27': 'Fam',
  };

  for (const [iso, code] of Object.entries(expected)) {
    const context = await getLiturgicalContext(new Date(`${iso}T00:00:00Z`), 'lauds');
    const candidates = invByOccasion(invitatoryOccasionCodes(context));
    assert.ok(candidates.length, `${iso}: nothing resolved`);
    assert.equal(candidates[0].occasion, code, `${iso} (${context.key})`);
  }
});

test('Easter prefers the alleluia variant, but not over a more proper one', async () => {
  // Saint Mark is the case that decides where the preference belongs. 25 April
  // always falls in Easter, so his own dated row is already the alleluia form;
  // preferring "Ap TP" — the apostles' Easter invitatory — over it would be
  // reaching for a *less* proper antiphon because it happens to say alleluia.
  const mark = await getLiturgicalContext(new Date('2026-04-25T00:00:00Z'), 'lauds');
  const markAnt = invByOccasion(invitatoryOccasionCodes(mark))[0];
  assert.equal(markAnt.occasion, '25/4');
  assert.match(markAnt.incipit, /alleluia/);

  // A doctor in Easter, where there is no dated row, does take "Doct TP".
  const doctor = await getLiturgicalContext(new Date('2026-04-29T00:00:00Z'), 'lauds');
  assert.equal(doctor.key, 'catherine_of_siena_virgin');
  const codes = invitatoryOccasionCodes(doctor);
  assert.ok(codes.indexOf('Doct TP') < codes.indexOf('Doct'), codes.join(' → '));

  // Upstream spaces the Easter codes inconsistently, so both spellings are
  // offered and whichever the index has is the one that matches.
  assert.ok(codes.includes('DoctTP'), codes.join(' → '));
});

test('Ascension opens the seventh week of Easter in this calendar', async () => {
  // The "ante Asc" / "post Asc" split is made on the season week, which is
  // right only because the configured calendar transfers Ascension to the
  // Sunday. A calendar keeping it on the Thursday would move the boundary into
  // the sixth week, and `invitatorySeasonCodes` would have to follow.
  const ascension = await getLiturgicalContext(new Date('2026-05-17T00:00:00Z'), 'lauds');
  assert.equal(ascension.key, 'ascension_of_the_lord');
  assert.equal(ascension.seasonWeek, 7);
  assert.equal(ascension.celebrationDate.getUTCDay(), 0);
});

test('an ad libitum choice is offered, not silently taken', async () => {
  // `Ded`, `BMV`, `Q` and `Ap` each have two rows in the index — real options.
  // `find` returned the first and discarded the rest.
  const lent = invByOccasion(['Q']);
  assert.equal(lent.length, 2);
  assert.deepEqual(lent.map(c => c.mode), ['4*', 'E']);

  const dedication = invByOccasion(['Ded']);
  assert.equal(dedication.length, 2);
  assert.match(dedication[0].incipit, /Christum Dominum qui dilexit Ecclesiam/);
  assert.match(dedication[1].incipit, /Domum Dei decet sanctitudo/);
});

// ── The psalm tone ───────────────────────────────────────────────────────────

test('every mode the index uses has a Venite exsultemus in Gregobase', () => {
  const modes = [...new Set(getInvs().map(e => e.mode))].sort();
  assert.deepEqual(modes, ['2', '3', '4', '4*', '4**', '5', '6', '6*', '7', 'D', 'E']);

  for (const mode of modes) {
    const tone = invitatoryToneByMode(mode);
    assert.ok(tone, `mode ${mode} has no invitatory psalm`);
    // Not a tone formula: the whole of Psalm 94 written out with its melody.
    assert.ok(tone.gabc.length > 2000, `mode ${mode}: ${tone.gabc.length} characters is too short`);
    assert.equal(splitInvitatoryTone(tone.gabc).length, 6,
      `mode ${mode} did not select a complete Venite`);
  }
});

test('the tone label is built, not guessed', () => {
  assert.equal(invitatoryToneLabel('2'), 'Venite exsultemus II');
  assert.equal(invitatoryToneLabel('4*'), 'Venite exsultemus IV*');
  assert.equal(invitatoryToneLabel('4**'), 'Venite exsultemus IV**');
  assert.equal(invitatoryToneLabel('E'), 'Venite exsultemus E');
  assert.equal(invitatoryToneLabel('D'), 'Venite exsultemus D');
  assert.equal(invitatoryToneLabel('7a'), null, 'a termination is not part of this label');
  assert.equal(invitatoryToneLabel(''), null);

  // Gregobase carries a second, parallel naming scheme for the same tones —
  // "(mode 7a simplex)", "(mode 4g festivus)" — and an "IV* (ad lib)". The
  // label must match exactly so the two schemes are never mixed.
  assert.equal(invitatoryToneByMode('4*')!.gbId, 7669);
  // Where a label has more than one entry, the newest dated Solesmes edition
  // wins. Mode 4 must use Gregobase's complete 2019 invitatory rather than the
  // older record that happened to have the lower database id.
  assert.equal(invitatoryToneByMode('7')!.gbId, 16799);
  assert.equal(invitatoryToneByMode('4')!.gbId, 17784);
});

test('Lauds mode IV uses the complete 2019 Psalm 95 score', () => {
  const tone = invitatoryToneByMode('4');
  assert.ok(tone);
  assert.equal(tone.gbId, 17784);

  const strophes = splitInvitatoryTone(tone.gabc);
  assert.equal(strophes.length, 6);
  assert.match(gabcText(strophes[0]), /^Veníte, exsultémus/);
  assert.match(gabcText(strophes[4]), /Quadragínta annis/);
  assert.match(gabcText(strophes[5]), /^Glória Patri/);
});

test('the antiphon ends on the intonation of the tone chosen for it', () => {
  // Each ferial antiphon's score closes with the psalm's opening words and
  // their melody — "(::) Ve(g/goh)ní(fg)te,(ffe) (::)" — which is where the
  // tone the mode selects begins. Antiphon and tone are therefore a free
  // check on each other: if the mode → label table ever pointed at the wrong
  // Venite exsultemus, the two would stop lining up.

  /** GABC → [syllable, notes] pairs, spelling and note grouping normalised. */
  const score = (gabc: string) => [...gabc.matchAll(/([^()]*)\(([^)]*)\)/g)]
    .map(m => [
      m[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z]/g, '').replace(/j/g, 'i').replace(/v/g, 'u'),
      // "ffe" and "f/fe" are the same three notes differently grouped, and
      // "(::)" and "(,)" are bars, not notes.
      m[2].replace(/\//g, ''),
    ] as [string, string])
    .filter(([syllable, notes]) => syllable && !/^[a-z]\d$/.test(notes));

  for (let day = 1; day <= 7; day++) {
    const [antiphon] = invByOccasion([`1-4H${day}`]);
    assert.ok(antiphon, `no ferial antiphon for day ${day}`);
    const tone = invitatoryToneByMode(antiphon.mode);
    assert.ok(tone, `day ${day}: mode ${antiphon.mode} has no tone`);

    // Everything after the antiphon's last-but-one double bar is the psalm's
    // opening, quoted. On day 1 that is "Iubilemus" rather than "Venite",
    // because the antiphon's own words are "Venite exsultemus Domino" and the
    // psalm goes on from there.
    const lastBar = antiphon.gabc.lastIndexOf('(::)');
    const quoted = score(antiphon.gabc.slice(antiphon.gabc.lastIndexOf('(::)', lastBar - 1)));
    assert.ok(quoted.length >= 3, `day ${day}: the antiphon quotes no psalm opening`);

    const psalm = score(tone.gabc);
    const at = psalm.findIndex((_, i) =>
      quoted.every(([syllable], k) => psalm[i + k]?.[0] === syllable));
    assert.ok(at >= 0,
      `day ${day}: the tone never sings "${quoted.map(q => q[0]).join('')}"`);
    assert.deepEqual(
      psalm.slice(at, at + quoted.length),
      quoted,
      `day ${day} (mode ${antiphon.mode}): the antiphon's quotation and the tone differ`,
    );
  }
});

// ── The Invitatory in the offline office ────────────────────────────────────
//
// Before this, `generateCanonicalOffice` went from the headings straight to
// "Deus, in adiutórium meum inténde" and then the hymn: no INVITATORY section,
// no versicle, no Psalm 94, in either language. The Invitatory does not
// *precede* that opening, it replaces it.

test('every mode of the Venite exsultemus divides into five strophes and the doxology', () => {
  for (const mode of MODES) {
    const tone = invitatoryToneByMode(mode);
    assert.ok(tone, `mode ${mode} has no tone`);

    const strophes = splitInvitatoryTone(tone.gabc);
    assert.equal(strophes.length, 6, `mode ${mode} divides into ${strophes.length}`);

    // The last is the Gloria Patri, and the first opens the psalm. Mode 4*
    // hides its double bar inside the last neume of each strophe and mode 4**
    // writes six strophes in four paragraphs, so neither the bar as its own
    // group nor the blank line would have found these.
    const words = strophes.map(s => gabcText(s).replace(/\s+/g, ' '));
    assert.match(words[0], /^Ve[nN]íte, exsultémus Dómino/, `mode ${mode} strophe 1`);
    assert.match(words[5], /^Glória Patri/, `mode ${mode} doxology`);
  }
});

test('a Latin Lauds opens with the Invitatory, not with the Deus in adiutorium', async () => {
  const blocks = await lauds('la');
  const at = (content: string) => blocks.findIndex(b => b.content === content);

  assert.ok(at('INVITATORY') >= 0, 'no INVITATORY heading');
  assert.ok(at('INVITATORY') < at('HYMN'), 'the Invitatory follows the hymn');
  assert.ok(blocks.some(b => b.content.includes('Dómine, lábia mea apéries')),
    'no "Lord, open my lips"');

  // Replaced, not preceded.
  assert.equal(at('INTRODUCTION'), -1, 'Lauds still prints an INTRODUCTION heading');
  assert.ok(!blocks.some(b => b.content.includes('in adiutórium')),
    'Lauds still prints the Deus in adiutorium');
});

test('an English Lauds gets the same Latin chant, and says so', async () => {
  const blocks = await lauds('en');

  assert.ok(blocks.some(b => b.content === 'INVITATORY'), 'no INVITATORY heading');
  assert.ok(blocks.some(b => b.content.includes('open my lips')), 'no versicle');
  assert.ok(!blocks.some(b => b.content.includes('come to my assistance')),
    'Lauds still prints the Deus in adiutorium');

  // The user's ruling is that the whole invitatory is Latin Gregorian chant,
  // which makes it the one part of an English Lauds printed in Latin. That is
  // stated in the booklet rather than mended.
  assert.ok(blocks.some(b => b.type === 'rubric' && b.content === INVITATORY_LATIN_NOTE),
    'the English office does not say the Invitatory is in Latin');
  assert.ok(blocks.some(b => b.content.includes('exsultémus Dómino')),
    'no Latin Psalm 94');
});

test('scraped English Lauds automatically places the OCO antiphon and matching Venite', async () => {
  const html = fs.readFileSync(path.join(
    process.cwd(), 'app/api/ibreviary/__fixtures__/lauds-2026-09-05-en.html'), 'utf8');
  const imported = parseBlocks(cheerio.load(html), '', '', '');
  const context = await getLiturgicalContext(new Date('2026-09-05T00:00:00Z'), 'lauds');
  const chant = resolveInvitatory(invitatoryOccasionCodes(context));
  assert.ok(chant);

  const blocks = placeGregorianInvitatory(imported, chant, 'en');
  const start = blocks.findIndex(b => b.content === 'INVITATORY');
  const end = blocks.findIndex((b, i) => i > start && b.content === 'HYMN');
  const invitatory = blocks.slice(start, end);
  const psalms = invitatory.filter(b => b.type === 'psalm');
  const antiphons = invitatory.filter(b => b.type === 'invitatory-antiphon');

  assert.equal(psalms.length, 6);
  assert.equal(antiphons.length, 2);
  assert.ok(psalms.every(b => b.psalmNumber === '95' && b.lang === 'la' && b.gabcScore));
  assert.ok(antiphons.every(b => b.content === chant.antiphon));
  assert.ok(antiphons.some(b => b.gabcScore || b.gabcCandidates));
  assert.match(psalms.map(b => b.content).join('\n'), /Quadragínta annis/);
  assert.match(psalms[5].content, /^Glória Patri/);
});

test('a remembered general ferial override falls through to the invitatory code', async () => {
  const context = await getLiturgicalContext(new Date('2026-09-05T00:00:00Z'), 'lauds');
  assert.equal(context.ferialOccasionCode, '2H7');
  const calendarCodes = invitatoryOccasionCodes(context);
  assert.deepEqual(calendarCodes, ['1-4H7']);

  // This is the exact chain the scraped route builds when the editor sends
  // back the occasionCode returned by its first request.
  const chant = resolveInvitatory([context.ferialOccasionCode, ...calendarCodes]);
  assert.ok(chant, 'the remembered 2H7 override hid the 1-4H7 invitatory');
  assert.match(chant.antiphon, /^Populus Domini et oves pascuæ eius/);
  assert.equal(chant.mode, 'D');
  assert.equal(splitInvitatoryTone(chant.toneGabc || '').length, 6);
});

test('no other hour grew an Invitatory', async () => {
  for (const hour of ['vespers', 'compline', 'terce', 'readings'] as const) {
    const blocks = await generateCanonicalOffice({ date: A_DAY, hour, lang: 'la' });
    assert.ok(!blocks.some(b => b.content === 'INVITATORY'), `${hour} has an Invitatory`);
    assert.ok(blocks.some(b => b.content === 'INTRODUCTION'), `${hour} lost its opening`);
  }
});

test('the psalm is sung from its own score, and its words are the score’s', async () => {
  const blocks = await lauds('la');
  const psalms = blocks.filter(b => b.type === 'psalm' && b.psalmNumber === '95');
  assert.equal(psalms.length, 6, 'Psalm 94 is not in five strophes and a doxology');

  for (const psalm of psalms) {
    assert.ok(psalm.gabcScore, 'a strophe with no score');
    assert.ok(psalm.content.trim(), 'a strophe with no words');
    // The score is the psalm, not a formula to point the psalm with, so
    // nothing here may carry a tone for the pointing engine to act on.
    assert.equal(psalm.psalmTone, undefined);
  }

  // Gregobase sings the Roman Psalter, not the Nova Vulgata — "Quóniam non
  // repéllet Dóminus plebem suam" is in the score and in no verse of the Nova
  // Vulgata. Setting the psalter's text under this score would print words
  // its own music contradicts.
  const sung = psalms.map(p => p.content).join('\n');
  assert.match(sung, /non rep[eé]llet/i);
  assert.ok(!getLatinPsalmText('95')!.includes('repéllet'),
    'the Nova Vulgata has grown the verse this test rests on');
});

test('the antiphon is sung only before the psalm and after the doxology', async () => {
  const blocks = await lauds('la');
  const invitatory = blocks.slice(blocks.findIndex(b => b.content === 'INVITATORY'),
                                  blocks.findIndex(b => b.content === 'HYMN'));

  const kinds = invitatory.filter(b => b.type === 'invitatory-antiphon' || b.type === 'psalm')
    .map(b => b.type === 'psalm' ? 'ps' : 'ant');
  assert.deepEqual(kinds, [
    'ant', 'ps', 'ps', 'ps', 'ps', 'ps', 'ps', 'ant',
  ]);

  const texts = new Set(invitatory
    .filter(b => b.type === 'invitatory-antiphon').map(b => b.content));
  assert.equal(texts.size, 1, 'the repeats are not the same antiphon');
  assert.ok([...texts][0].trim(), 'the antiphon has no text');
});

test('every day of the year builds a complete Invitatory', async () => {
  const broken: string[] = [];
  for (let i = 0; i < 365; i++) {
    const date = new Date(Date.UTC(2026, 0, 1 + i));
    const context = await getLiturgicalContext(date, 'lauds');
    const chant = resolveInvitatory(invitatoryOccasionCodes(context));
    const blocks = buildInvitatoryBlocks('la', chant, () => 'x');

    const psalms = blocks.filter(b => b.type === 'psalm');
    const ants = blocks.filter(b => b.type === 'invitatory-antiphon');
    if (psalms.length !== 6 || ants.length !== 2 || psalms.some(p => !p.gabcScore)) {
      broken.push(`${date.toISOString().slice(0, 10)}: ${ants.length} antiphons, `
        + `${psalms.length} strophes, mode ${chant?.mode}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('a day with no antiphon prints the gap, not a psalm', () => {
  const blocks = buildInvitatoryBlocks('la', null, () => 'x');
  assert.ok(!blocks.some(b => b.type === 'psalm'), 'a psalm with no antiphon to sing it under');
  assert.ok(blocks.some(b => b.type === 'rubric' && b.content.startsWith('[No invitatory')),
    'the gap is silent');

  // An antiphon in a mode Gregobase has no Venite exsultemus for keeps the
  // antiphon and says what is missing.
  const toneless = buildInvitatoryBlocks('la',
    { antiphon: 'Christus natus est nobis', mode: 'Zz' }, () => 'x');
  assert.ok(!toneless.some(b => b.type === 'psalm'));
  assert.equal(toneless.filter(b => b.type === 'invitatory-antiphon').length, 2);
  assert.ok(toneless.some(b => b.type === 'rubric' && b.content.includes('Venite exsultemus')));
});

test('a proper antiphon is printed, not offered against the ferial one', async () => {
  // 8 September resolves `8/9` then `1-4H3` — the Nativity of Our Lady and the
  // Tuesday ferial. Those are ranked, not alternative: asking the index for
  // both at once and then treating two answers as a choice left the feast's
  // own antiphon unengraved on every proper day of the year.
  const context = await getLiturgicalContext(A_DAY, 'lauds');
  assert.deepEqual(invitatoryOccasionCodes(context), ['8/9', '1-4H3']);

  const chant = resolveInvitatory(invitatoryOccasionCodes(context));
  assert.match(chant!.antiphon, /^Nativitatem Virginis Mariæ/);
  assert.ok(chant!.antiphonGabc, 'the feast’s antiphon has no score');
  assert.equal(chant!.antiphonCandidates, undefined, 'the ferial is offered against the feast');

  // Two rows under one code is the real choice, and is still left open.
  const lent = resolveInvitatory(['Q']);
  assert.equal(lent!.antiphonCandidates?.length, 2);
});
