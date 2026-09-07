import { NextRequest, NextResponse } from 'next/server.js';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { CADENCES, validateTone, exampleSyllables, gabcFormula, applyMarkExample, repeatIndex, scoreMismatches, type Cadence, type CreatedTone, type ToneExample } from '@/lib/psalm-tones/creator';
import { copySystemTone, listSystemTones } from '@/lib/psalm-tones/system-tones';
import { describeStructure, pointPsalmText } from '@/lib/psalm-tones/lypsautierant-engine';
import { syllabifyLine } from '@/lib/psalm-tones/lypsautierant-syllabify';
import { syllabifyLatinLine } from '@/lib/psalm-tones/latin-syllabify';
import { accentuateEnglish } from '@/lib/psalm-tones/english-phonetic';
import { applyPsalmTone, markEnglishAccents, syllabifyLineForScore } from '@/lib/psalm-tones/psalmtone-wrapper';
import { stripPointing } from '@/lib/psalm-tones/strip';

const file = join(process.cwd(), 'data', 'created-tones.json');
function read(): CreatedTone[] {
  try { return JSON.parse(readFileSync(file, 'utf8')).map(validateTone); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
}
/** A name of its own, so a save never quietly replaces another tone's. */
function freeName(name: string, taken: string[]): string {
  const lower = taken.map(t => t.toLowerCase());
  if (!lower.includes(name.toLowerCase())) return name;
  const base = name.replace(/ \(\d+\)$/, '');
  for (let n = 2; ; n++) {
    const next = `${base.slice(0, 94)} (${n})`;
    if (!lower.includes(next.toLowerCase())) return next;
  }
}
export async function GET() {
  try { return NextResponse.json({ tones: read(), system: listSystemTones() }); }
  catch { return NextResponse.json({ error: 'Could not read the saved tone library.' }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'save') {
      const tone = validateTone(body.tone);
      // The tones the app ships with are never written over. A copy of one
      // arrives here with an id of its own already, and this is the guard
      // behind that: whatever the client sends, a built-in id is spent and a
      // name that is already taken is given a number of its own.
      if (tone.id.startsWith('system:')) tone.id = randomUUID();
      const tones = read().filter(t => t.id !== tone.id);
      tone.name = freeName(tone.name, tones.map(t => t.name));
      tones.push(tone);
      mkdirSync(join(process.cwd(), 'data'), { recursive: true });
      writeFileSync(file + '.tmp', JSON.stringify(tones, null, 2) + '\n');
      renameSync(file + '.tmp', file);
      return NextResponse.json({ tones, tone });
    }
    if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 50000) throw new Error('Provide psalm text (up to 50,000 characters).');
    const lang = body.lang === 'la' ? 'la' : 'en';
    // Never pass user HTML or TeX/GABC delimiters into renderers.
    const plain = stripPointing(body.text).replace(/[<>{}\\()]/g, '');
    const source = lang === 'en' && !/[áéíóúý]/i.test(plain) ? accentuateEnglish(plain) : plain;
    const stanzas = describeStructure(source);
    // Each cadence is modelled on the first half-line of the text that is sung
    // to it, and falls back to the opening line when the text has none.
    const halves = stanzas.flat().filter(h => h.role !== 'divider');
    const sampleFor = (key: Cadence) => halves.find(h => h.role === key)?.text || halves[0]?.text || source;
    if (body.action === 'import') {
      const { tone, warnings } = copySystemTone(String(body.id), Object.fromEntries(CADENCES.map(key => [key, sampleFor(key)])) as Record<Cadence, string>, lang);
      return NextResponse.json({ tone: validateTone(tone), warnings });
    }
    if (body.action === 'prepare') {
      // The two backends do not divide English alike: psalmtone.js is given
      // this app's phonetic syllabifier and the lypsautierant tones use the
      // sed-parity one, and they disagree ("Bléssed" against "Blés-sed").
      // A staff has to be drawn on the divisions the engine will sing.
      const syllabify = lang === 'la' ? syllabifyLatinLine
        : body.backend === 'jgabc' ? syllabifyLineForScore : syllabifyLine;
      const examples = Object.fromEntries(CADENCES.map(key =>
        [key, { syllables: exampleSyllables(syllabify(sampleFor(key))), anchor: 'end' }]));
      return NextResponse.json({ examples });
    }
    if (body.action !== 'preview') throw new Error('Unknown action.');
    const tone = validateTone(body.tone);
    if (tone.backend === 'lyps') {
      const rules = Object.fromEntries(CADENCES.map(key => [key, (line: string) => applyMarkExample(line, tone.examples[key])])) as Record<typeof CADENCES[number], (line: string) => string>;
      const result = pointPsalmText(source, 'english', 'eight', 'a', lang, rules);
      const elastic = CADENCES.some(key => repeatIndex(tone.examples[key]) >= 0);
      return NextResponse.json({ html: result.html, gabc: '', warnings: [elastic
        ? 'Marks before the repeating syllable are counted from the start of each verse; the rest are counted back from the anchor.'
        : 'Every mark is counted back from the anchor. Set a syllable to repeat to describe the elastic part of a verse.'] });
    }
    // psalmtone.js reads English accents only when they are marked its own
    // way; see markEnglishAccents.
    const sing = (line: string, example: ToneExample) => applyPsalmTone({
      text: lang === 'en' ? markEnglishAccents(line) : line,
      gabc: gabcFormula(example), clef: tone.clef, lang, useBoldItalic: false,
    });
    const scores = stanzas.map(stanza => stanza.map(h => {
      if (h.role === 'divider') return '';
      return sing(h.text, tone.examples[h.role]) + (h.role === 'first' ? ' *(:)' : h.role === 'flex' ? ' †(;)' : ' (::)');
    }).join(' '));
    // Sing each cadence's own model line back and say where the engine's
    // reading of the formula parts company with the staff.
    const warnings = CADENCES.flatMap(key => {
      const example = tone.examples[key];
      const model = example.syllables.map(s => (s.join ? '' : ' ') + s.text).join('').trim();
      return scoreMismatches(example, sing(model, example)).map(w => `${key}: ${w}`);
    });
    return NextResponse.json({ html: '', gabc: `(${tone.clef}) ${scores.join(' ')}`, warnings });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
