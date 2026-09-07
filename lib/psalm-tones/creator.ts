/** Serializable visual examples. Formulas are always derived, never trusted from storage. */
export const CADENCES = ['first', 'termination', 'flex'] as const;
export type Cadence = typeof CADENCES[number];
export const MARKS = ['', '+', '-', '=', '++', '+-', '-+', '--'] as const;
export type Mark = typeof MARKS[number];
/**
 * `repeat` is the lypsautierant counterpart of the jgabc reciting note: this
 * syllable's mark stretches to cover however many syllables the real line has
 * between the fixed notes at its start and the cadence at its end. Without it
 * every mark was measured from the anchor alone, so a model line could only
 * describe lines of its own length and anything standing before the elastic
 * part of the verse could not be expressed at all.
 */
export interface ToneSyllable { text: string; join: boolean; mark: Mark; pitch: string; role: 'fixed' | 'recite' | 'accent'; repeat?: boolean }
export interface ToneExample { syllables: ToneSyllable[]; anchor: 'end' | 'accent' }
export interface CreatedTone {
  version: 1; id: string; name: string; backend: 'lyps' | 'jgabc'; clef: string;
  examples: Record<Cadence, ToneExample>;
}
/** Index of the syllable the cadence is measured from, or -1. */
export function anchorIndex(example: ToneExample): number {
  return example.anchor === 'end' ? example.syllables.length - 1 : example.syllables.findLastIndex(s => s.role === 'accent');
}
/** Index of the elastic (repeating) syllable, or -1 if the tone has none. */
export function repeatIndex(example: ToneExample): number {
  return example.syllables.findIndex(s => s.repeat);
}
export function validateTone(value: unknown): CreatedTone {
  const t = value as CreatedTone;
  if (!t || t.version !== 1 || typeof t.id !== 'string' || t.id.length > 100 ||
    typeof t.name !== 'string' || !t.name.trim() || t.name.length > 100 ||
    !['lyps', 'jgabc'].includes(t.backend) || !/^[cf][1-4]$/.test(t.clef)) throw new Error('Invalid tone details.');
  for (const key of CADENCES) {
    const e = t.examples?.[key];
    if (!e || !['end', 'accent'].includes(e.anchor) || !Array.isArray(e.syllables) || !e.syllables.length || e.syllables.length > 150) throw new Error(`Add a ${key} example (up to 150 syllables).`);
    for (const s of e.syllables) {
      if (!s || typeof s.text !== 'string' || s.text.length > 100 || /[<>{}\\]/.test(s.text) || typeof s.join !== 'boolean' || !MARKS.includes(s.mark) || !validPitch(s.pitch) || !['fixed', 'recite', 'accent'].includes(s.role) || (s.repeat !== undefined && typeof s.repeat !== 'boolean')) throw new Error('Invalid syllable.');
    }
    if (e.syllables.filter(s => s.repeat).length > 1) throw new Error(`Only one syllable in ${key} may repeat.`);
    if (t.backend === 'jgabc' && !e.syllables.some(s => s.role === 'recite')) throw new Error(`Choose a reciting note for ${key}.`);
    if (t.backend === 'jgabc') {
      const reciting = e.syllables.findIndex(s => s.role === 'recite');
      const accent = e.syllables.findIndex(s => s.role === 'accent');
      if (accent >= 0 && accent < reciting) throw new Error(`Place the reciting note before the first accent in ${key}.`);
      if (e.syllables.some(s => s.role === 'recite' && noteCount(s.pitch) !== 1)) throw new Error('A reciting syllable needs a single pitch.');
    }
    if (t.backend === 'lyps' && e.anchor === 'accent' && !e.syllables.some(s => s.role === 'accent')) throw new Error(`Choose an accent anchor for ${key}.`);
    if (t.backend === 'lyps') {
      const elastic = repeatIndex(e);
      const anchor = anchorIndex(e);
      // Everything after the elastic syllable is measured back from the
      // anchor, so an anchor inside or before it has nothing to measure.
      if (elastic >= 0 && anchor >= 0 && elastic >= anchor) throw new Error(`The repeating syllable in ${key} must come before the anchor.`);
    }
  }
  return t;
}
/**
 * The single note an open note stands on: the first note of a neume, with the
 * accidental that governs it, and none of the shape written around it.
 */
function openNote(pitch: string): string {
  let open = '';
  for (const glyph of pitchGlyphs(pitch)) {
    open += glyph.accidental ? `${glyph.pitch}${glyph.accidental}` : glyph.pitch;
    if (!glyph.accidental) break;
  }
  return open || pitch;
}
export function gabcFormula(example: ToneExample): string {
  const tokens: string[] = [];
  for (const [index, s] of example.syllables.entries()) {
    const token = `${s.role === 'accent' ? "'" : ''}${s.pitch}${s.role === 'recite' ? 'r' : ''}`;
    if (s.role !== 'recite' || tokens.at(-1) !== token) tokens.push(token);
    // jgabc needs an open note after an accent to absorb variable unstressed
    // syllables. Without it the preceding tenor is consumed as part of the
    // accent and the beginning of a longer hemistich can disappear. It is one
    // note, not the neume it stands before: writing the whole of a climacus
    // there sang its diamonds twice.
    if (s.role === 'accent' && example.syllables[index + 1]?.role !== 'recite') {
      tokens.push(`${openNote(example.syllables[index + 1]?.pitch || s.pitch)}r`);
      if (index === example.syllables.length - 1) tokens.push(s.pitch);
    }
  }
  // A final open note must close on a separate dotted note.
  const last = example.syllables.at(-1);
  if (last?.role === 'recite') tokens.push(last.pitch);
  return tokens.join(' ') + '.';
}
/**
 * Where one mark of the model belongs on a line of any length.
 *
 * Syllables standing before the elastic one keep their distance from the
 * beginning of the hemistich; the rest keep their distance from the anchor at
 * its end. A tone with no elastic syllable is measured wholly from the anchor,
 * as it always was.
 */
export interface MarkPlacement { mark: Mark; from: 'start' | 'anchor'; offset: number }
/**
 * jgabc puts at most two syllables between two accent notes: past that the
 * engine gives up on the text's own accents and counts the cadence back from
 * the end of the line instead (psalmtone.js:805, `countToNext > 3`). A staff
 * drawn with the accents further apart than that cannot be sung as drawn, so
 * it is worth saying so while it is being drawn.
 */
export function accentSpacing(example: ToneExample): string | null {
  const accents = example.syllables.flatMap((s, i) => s.role === 'accent' ? [i] : []);
  for (let i = 1; i < accents.length; i++) {
    if (accents[i] - accents[i - 1] > 3) {
      const [before, after] = [example.syllables[accents[i - 1]].text, example.syllables[accents[i]].text];
      return `Only two syllables may stand between two accent notes, and “${before}” and “${after}” have ${accents[i] - accents[i - 1] - 1}. jgabc will move the first accent to fit.`;
    }
  }
  return null;
}
const MACROS: Record<Mark, string> = { '': '', '+': 'pl', '-': 'mi', '=': 'dmi', '++': 'pp', '+-': 'plmi', '-+': 'mipl', '--': 'mimi' };
const MARK_OF_MACRO: Record<string, Mark> = Object.fromEntries(MARKS.filter(m => m).map(m => [MACROS[m], m]));
/**
 * The syllables the editor draws on, from a syllabified hemistich. The opening
 * syllable is the reciting note and repeats: it carries no mark to begin with,
 * so this changes nothing until one is given, and it puts the elastic part of
 * the verse where it belongs.
 */
export function exampleSyllables(syllabified: string): ToneSyllable[] {
  const syllables: ToneSyllable[] = [];
  let join = false;
  for (const text of syllabified.trim().split(/\s+/)) {
    if (text === '--') { join = true; continue; }
    syllables.push({ text, join, mark: '', pitch: 'h', role: 'recite', repeat: syllables.length === 0 });
    join = false;
  }
  return syllables;
}
/**
 * The inverse of applyMarkExample, for reading an existing pointing rule back
 * onto the staff. The upstream rules return the hemistich with its intra-word
 * breaks closed up, so the marked line is walked letter by letter against the
 * syllables the editor shows and each syllable takes the mark of the run its
 * first letter falls in. A line that does not match letter for letter is
 * returned unmarked rather than marked in the wrong places.
 */
export function markedSyllables(syllabified: string, pointed: string): ToneSyllable[] {
  const syllables = exampleSyllables(syllabified);
  const marks: Mark[] = [];
  let letters = '';
  // Upstream sometimes nests two rules on one syllable (\mi{\pl{wá}}), which
  // is the pair mark written the long way round.
  const both = (outer: Mark, inner: Mark): Mark => {
    if (!outer || !inner) return outer || inner;
    const pair = (outer + inner) as Mark;
    return MARKS.includes(pair) ? pair : inner;
  };
  const read = (text: string, mark: Mark) => {
    for (let at = 0; at < text.length;) {
      if (text[at] !== '\\') {
        if (!/\s/.test(text[at])) { letters += text[at]; marks.push(mark); }
        at++;
        continue;
      }
      const macro = /^\\([a-z]+)/.exec(text.slice(at));
      at += macro ? macro[0].length : 1;
      if (text[at] !== '{') continue;
      let depth = 1;
      let close = at + 1;
      for (; close < text.length && depth; close++) depth += text[close] === '{' ? 1 : text[close] === '}' ? -1 : 0;
      // \flagflex is the dagger in the margin, not a mark on a syllable, and
      // its argument is not part of the text.
      if (macro && macro[1] !== 'flagflex') read(text.slice(at + 1, close - 1), both(mark, MARK_OF_MACRO[macro[1]] ?? ''));
      at = close;
    }
  };
  read(pointed, '');
  let at = 0;
  for (const syllable of syllables) {
    if (!letters.startsWith(syllable.text, at)) return exampleSyllables(syllabified);
    syllable.mark = marks[at];
    at += syllable.text.length;
  }
  return at === letters.length ? syllables : exampleSyllables(syllabified);
}
const ACUTE = /[\u00e1\u00e9\u00ed\u00f3\u00fa\u00fd\u00c1\u00c9\u00cd\u00d3\u00da\u00dd]/;
/**
 * The glyphs of a pitch, as GABC writes them.
 *
 * A pitch is not a row of noteheads: a letter is a note, a capital is that
 * note as a punctum inclinatum, and the characters after a letter say what
 * shape it takes and what is set over or beside it — v a virga, w a quilisma,
 * _ an episema, . a mora dot, ' an ictus, ~ a liquescent. A letter followed
 * by x, y or # is not a note at all but an accidental standing on that line.
 * All of it is kept: dropping it drew the wrong notes, since a flat became a
 * second note and a climacus lost its diamonds.
 */
export type NoteShape = 'punctum' | 'inclinatum' | 'virga' | 'quilisma' | 'oriscus' | 'stropha';
export interface PitchGlyph {
  pitch: string;
  accidental?: string;
  shape: NoteShape;
  liquescent?: boolean;
  episema?: boolean;
  ictus?: boolean;
  dots: number;
  /** A break in the neume after this note: GABC's !, / and , spacings. */
  gap?: boolean;
}
const SHAPE_OF: Record<string, NoteShape> = { v: 'virga', w: 'quilisma', o: 'oriscus', s: 'stropha' };
/**
 * Angle brackets are GABC's other two liquescents, and are left out on
 * purpose: nothing in the tones on file uses them, and no field the user can
 * write into carries < or > anywhere else in this app either.
 */
const PITCH_CHARS = /^[a-mA-M][a-mA-MvVwWoOsSxy#~_.'!/,]*$/;
export function pitchGlyphs(pitch: string): PitchGlyph[] {
  const glyphs: PitchGlyph[] = [];
  for (const [, letter, marks] of pitch.matchAll(/([a-mA-M])([^a-mA-M]*)/g)) {
    if (/^[xy#]/.test(marks)) { glyphs.push({ pitch: letter.toLowerCase(), accidental: marks[0], shape: 'punctum', dots: 0 }); continue; }
    glyphs.push({
      pitch: letter.toLowerCase(),
      shape: SHAPE_OF[marks[0]?.toLowerCase()] ?? (letter === letter.toUpperCase() ? 'inclinatum' : 'punctum'),
      ...(marks.includes('~') ? { liquescent: true } : {}),
      ...(marks.includes('_') ? { episema: true } : {}),
      ...(marks.includes("'") ? { ictus: true } : {}),
      ...(/[!/,]/.test(marks) ? { gap: true } : {}),
      dots: (marks.match(/\./g) ?? []).length,
    });
  }
  return glyphs;
}
/** The notes of a pitch, without the accidentals standing before them. */
export function noteCount(pitch: string): number {
  return pitchGlyphs(pitch).filter(g => !g.accidental).length;
}
/** A pitch the staff can draw: GABC's own notes, and nothing else. */
export function validPitch(pitch: string): boolean {
  if (pitch.length > 64 || !PITCH_CHARS.test(pitch)) return false;
  const notes = noteCount(pitch);
  return notes >= 1 && notes <= 20;
}
/**
 * A pitch as the staff can draw it. The shapes and the accidentals are kept —
 * they are the notation — and only what the editor has no reading for at all
 * comes off, leaving the notes it was written on.
 */
function drawable(notes: string): string {
  const kept = (notes.match(/[a-m][xy#]|[a-mA-M][vVwWoOsS]?~?_?\.{0,2}'?[!/,]{0,2}/g) ?? []).join('').replace(/\.+$/, '');
  return validPitch(kept) ? kept : (kept.match(/[a-m][xy#]|[a-mA-M]/g) ?? []).slice(0, 20).join('');
}
/** One note of a formula, read back the way gabcFormula writes them. */
interface FormulaNote { pitch: string; accent: boolean; open: boolean }
function formulaNotes(formula: string): FormulaNote[] {
  return formula.trim().split(/\s+/).filter(Boolean).map(token => ({
    pitch: drawable(token),
    accent: token.startsWith("'"),
    open: /r\.?$/.test(token),
  }));
}
/**
 * The inverse of gabcFormula, for reading an existing psalm tone onto the
 * staff: the notes the engine sang onto the model line, with the formula
 * saying what each of them is. The sung pitches are the formula's own in
 * order, the open notes stretched over however many syllables the line had,
 * so the two are walked back from the end together — every note that must be
 * sung takes one syllable, and an open note takes the syllables that carry
 * its pitch. What is left at the front is the tenor and the intonation.
 *
 * A line the engine divides differently from the editor cannot be read at all,
 * and says so by coming back null; ornaments it sings but the staff cannot
 * draw come back as plain pitches, and are named in `simplified`.
 */
export function scoredSyllables(applied: string, formula: string): { syllables: ToneSyllable[]; simplified: string[] } | null {
  const sung = scoreSyllables(applied);
  if (!sung.length) return null;
  const simplified: string[] = [];
  // The engine divides a line to suit the formula it is singing, so the
  // syllables are its own rather than the syllabifier's: what is drawn is
  // then the very thing that was sung.
  const syllables: ToneSyllable[] = sung.map((s, i) => {
    const pitch = drawable(s.notes);
    if (pitch !== s.notes && s.notes) simplified.push(`“${s.text}” is sung on ${s.notes}, drawn here as ${pitch}`);
    return { text: s.text, join: s.join, mark: '', pitch: pitch || 'h', role: 'fixed', repeat: i === 0 };
  });
  const notes = formulaNotes(formula);
  const tenor = notes.find(n => n.open)?.pitch || syllables[0].pitch;
  let at = syllables.length - 1;
  for (let n = notes.length - 1; n >= 0 && at >= 0; n--) {
    if (!notes[n].open) {
      // A note the engine sang somewhere else is a note it could not fit: the
      // line was shorter than the cadence, and what stands before this point
      // was recited rather than sung as written. Reading on from here would
      // put an accent on a syllable held on the tenor.
      if (syllables[at].pitch !== notes[n].pitch) break;
      syllables[at].role = notes[n].accent ? 'accent' : 'fixed';
      at--;
      continue;
    }
    // An open note may cover nothing, and never eats the notes before it. Nor
    // does it eat a stressed syllable while an accent note is still waiting
    // for one: an accent and the open note beside it are often the same pitch,
    // and the stress is the only thing that tells them apart.
    const waiting = notes.slice(0, n).some(note => note.accent);
    while (at >= n && syllables[at].pitch === notes[n].pitch && !(waiting && ACUTE.test(syllables[at].text))) {
      syllables[at].role = 'recite';
      at--;
    }
  }
  for (; at >= 0; at--) syllables[at].role = syllables[at].pitch === tenor ? 'recite' : 'fixed';
  // The staff has rules of its own: something has to recite, and the accents
  // follow it. A line too short for the formula can end up with neither.
  const first = syllables.findIndex(s => s.role === 'recite');
  if (first < 0) { syllables[0].role = 'recite'; syllables[0].pitch = drawable(syllables[0].pitch).slice(-1); }
  else syllables.forEach((s, i) => { if (i < first && s.role === 'accent') s.role = 'fixed'; });
  syllables.forEach(s => { if (s.role === 'recite' && noteCount(s.pitch) > 1) s.pitch = drawable(s.pitch).slice(-1); });
  return { syllables, simplified };
}
/**
 * The syllables of an applied score, with the notes each was given. Syllables
 * of one word stand against each other with no space between them, which is
 * how the score says where a word is broken.
 */
export function scoreSyllables(applied: string): { text: string; notes: string; join: boolean }[] {
  return [...applied.matchAll(/([^\s()]*)\(([^()]*)\)/g)].map(m => ({
    text: m[1],
    // A dot inside a neume is a mora and is part of the notation; the one that
    // closes a cadence is how GABC ends it, and the editor writes that itself.
    notes: m[2].replace(/r/g, '').replace(/\.+$/, ''),
    join: m.index > 0 && !/\s/.test(applied[m.index - 1]),
  }));
}
/**
 * What the staff asks for against what the engine actually sang. jgabc lays a
 * formula out by its own rules — the accent spacing above, the reciting note,
 * the syllables it counts back from the end — so a drawn cadence is not a
 * promise, and the difference has to be visible rather than silent.
 */
export function scoreMismatches(example: ToneExample, applied: string): string[] {
  const sung = scoreSyllables(applied);
  if (sung.length !== example.syllables.length) {
    return [`The engine divides this cadence into ${sung.length} syllables, not the ${example.syllables.length} on the staff, so the notes cannot be compared: ${sung.map(s => s.text).join(' ')}`];
  }
  const wrong = example.syllables.flatMap((s, i) => sung[i].notes && sung[i].notes !== s.pitch
    ? [`“${s.text}” is drawn on ${s.pitch} but sung on ${sung[i].notes}`] : []);
  if (!wrong.length) return [];
  return [`${wrong.slice(0, 4).join('; ')}${wrong.length > 4 ? `; and ${wrong.length - 4} more` : ''}.`];
}
export function markRules(example: ToneExample): MarkPlacement[] {
  const anchor = anchorIndex(example);
  const elastic = repeatIndex(example);
  return example.syllables.flatMap((s, i) => {
    // The elastic syllable's own mark is laid down by the fill, not as a rule.
    if (!s.mark || i === elastic) return [];
    return [elastic >= 0 && i < elastic
      ? { mark: s.mark, from: 'start' as const, offset: i }
      : { mark: s.mark, from: 'anchor' as const, offset: i - anchor }];
  });
}
export function formulaPreview(tone: CreatedTone): string {
  return CADENCES.map(key => {
    const example = tone.examples[key];
    if (tone.backend === 'jgabc') return `${key}: ${gabcFormula(example)}`;
    const elastic = repeatIndex(example);
    const repeats = elastic >= 0 ? { repeats: example.syllables[elastic].mark || 'none', at: elastic } : undefined;
    return `${key}: ${JSON.stringify({ anchor: example.anchor, marks: markRules(example), ...repeats })}`;
  }).join('\n');
}
/** Runs on the same syllabified hemistich used by the upstream mode functions. */
export function applyMarkExample(line: string, example: ToneExample): string {
  const tokens = line.trim().split(/\s+/);
  const indices = tokens.flatMap((s, i) => s !== '--' ? [i] : []);
  const anchor = example.anchor === 'end' ? indices.length - 1 : indices.findLastIndex(i => /[áéíóúýÁÉÍÓÚÝ]/.test(tokens[i]));
  if (anchor >= 0) {
    // A line shorter than the model can bring two rules onto one syllable;
    // whichever lands first keeps it, rather than nesting the two macros.
    const marked = new Set<number>();
    const wrap = (position: number, mark: Mark) => {
      const index = indices[position];
      if (index === undefined || position < 0 || !mark || marked.has(position)) return;
      marked.add(position);
      tokens[index] = `\\${MACROS[mark]}{${tokens[index]}}`;
    };
    const rules = markRules(example);
    // The cadence is laid down first: on a short line it is what must survive.
    for (const rule of rules) if (rule.from === 'anchor') wrap(anchor + rule.offset, rule.mark);
    for (const rule of rules) if (rule.from === 'start') wrap(rule.offset, rule.mark);
    const elastic = repeatIndex(example);
    if (elastic >= 0) {
      // Everything between the fixed opening and the cadence, however many
      // syllables that turns out to be on this line.
      const last = anchor + elastic - anchorIndex(example);
      for (let position = elastic; position <= last; position++) wrap(position, example.syllables[elastic].mark);
    }
  }
  return tokens.join(' ').split(' -- ').join('');
}
