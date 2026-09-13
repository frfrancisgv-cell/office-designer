/** Serializable visual examples. Formulas are always derived, never trusted from storage. */
export const CADENCES = ['first', 'termination', 'flex'] as const;
export type Cadence = typeof CADENCES[number];
export const MARKS = ['', '+', '-', '=', '++', '+-', '-+', '--'] as const;
export type Mark = typeof MARKS[number];
/**
 * What a figure does on a line with no room for it where it belongs.
 *
 * A cadence is drawn on one model line, but the verses it has to point are
 * every length, and a short one can leave a figure nowhere to go. Its accent
 * can stand so near the end that the figure runs off it — the model's last
 * accent had a syllable after it and this line's has none — or the figure
 * nearer the end can already have taken the syllables it needs.
 *
 * 'step' hangs it on the accent before instead, and keeps stepping back until
 * it fits. 'slide' keeps the figure whole and moves it towards the start of
 * the line until every mark has a syllable of its own. 'pass' keeps the marks
 * that fit, from the accent onwards, and gives the rest back to the figure
 * before it: that is the mediant of English and Gregorian 1, 6 and 7, whose
 * "− +" on a last accent that is also the last syllable sings only its "+"
 * there and hands the "−" back, so that "+ −" on the accent before becomes
 * "+ − −". 'fold' writes a mark with no spare syllable onto the syllable the
 * figure last wrote on, where the two are written as the pair mark:
 * gregorian/one/a sets "++" on a last accent that is also the last syllable
 * and carries the two plusses on two syllables everywhere else, and a "+ −"
 * squeezed against the figure after it is written "+−" on its accent alone.
 * A mark only ever joins one its own figure wrote — a pair mark says what one
 * figure sings — so a mark with nothing yet written is not sung at all.
 * 'trim' writes only the marks that
 * fit and lets the rest fall off, which is what a cadence measured from the
 * end of the line does. 'drop' leaves the figure off that line altogether.
 *
 * A passed mark rides at the end of the run that took it in and counts as
 * that figure's own from then on, but only while the run stays where it is:
 * a figure that steps back, slides, or is left off the line leaves the mark
 * behind on the accent it vacated. That is english/one/first exactly — a bare
 * "−" on the second-to-last accent, and its own "+ −" back on the third.
 */
export const CROWDING = ['step', 'slide', 'pass', 'fold', 'trim', 'drop'] as const;
export type Crowding = typeof CROWDING[number];
/**
 * A pointing mark is not a note: it is a sign set under a syllable telling the
 * singer to leave the reciting note there. The elastic part of a hemistich is
 * therefore the part that carries no mark at all, and it needs no expression
 * of its own — every rule in psautier/{english,gregorian} is a short window of
 * marks pinned to the end of the line, with the whole opening left bare.
 *
 * `atStart` is the one exception the corpus does have: english/two/a', five/a'
 * and eight/a'' each set a mark on the *first* syllable of the hemistich, no
 * matter how long it is. That mark is measured from the opening rather than
 * from the anchor, and only the first syllable may carry it.
 *
 * `accent` says which accent a mark hangs on, numbered back from the end of
 * the line: 1 is the last accent, 2 the one before it. It is normally derived
 * (see markGroups) and only stored when the derived reading is overruled.
 *
 * `crowded` is the figure's short-line rule; see Crowding. Like `accent` it
 * belongs to the whole figure rather than to one syllable, and is stored on
 * the syllables of the run it governs.
 *
 * `hold` is the jgabc side's counterpart: the note the syllables between this
 * accent and the next written note are held on. See holdNote — the model line
 * usually has no syllable of its own to draw that note on, so it cannot be
 * drawn and has to be said.
 */
export interface ToneSyllable { text: string; join: boolean; mark: Mark; pitch: string; role: 'fixed' | 'recite' | 'accent'; atStart?: boolean; accent?: number; crowded?: Crowding; hold?: string }
export interface ToneExample { syllables: ToneSyllable[]; anchor: 'end' | 'accent' }
/**
 * Editable pitches for the conditional stress-and-distance rule described
 * for Tone 1.  Each value is GABC notation for exactly one sounding note;
 * `mediation.previous + mediation.return` becomes the two-note neume used
 * when only one syllable lies between the final stresses.
 */
export interface DiscernedToneRule {
  kind: 'tone-1';
  reciting: string;
  mediation: { previous: string; return: string; passing: string };
  ending: { preparations: [string, string]; final: string };
}
export const DEFAULT_DISCERNED_RULE: DiscernedToneRule = {
  kind: 'tone-1',
  reciting: 'h',
  mediation: { previous: 'ixi', return: 'h', passing: 'g' },
  ending: { preparations: ['g', 'f'], final: 'd' },
};
export interface CreatedTone {
  version: 1; id: string; name: string; backend: 'lyps' | 'jgabc' | 'discerned'; clef: string;
  examples: Record<Cadence, ToneExample>;
  /** Present when `backend` is `discerned`; ignored by the other backends. */
  discerned?: DiscernedToneRule;
}
/**
 * Index of the syllable the cadence is measured from, or -1 when the model has
 * none. The accent anchor is the line's *last acute*, which is what the mode
 * functions look for and what applyMarkExample counts from; reading it off the
 * text rather than off a role chosen by hand is what keeps the marks drawn in
 * the editor and the marks the engine lays down in the same places.
 */
export function anchorIndex(example: ToneExample): number {
  return example.anchor === 'end' ? example.syllables.length - 1 : example.syllables.findLastIndex(s => ACUTE.test(s.text));
}
/**
 * The first syllable the cadence claims. Everything before it is recited: it
 * carries no mark, and it is the part that stretches to whatever length the
 * real verse turns out to be. A mark pinned to the opening syllable stands
 * outside the cadence and does not open it.
 */
export function cadenceStart(example: ToneExample): number {
  const claimed = example.syllables.findIndex((s, i) => s.mark && !(i === 0 && s.atStart));
  return claimed < 0 ? example.syllables.length : claimed;
}
/** The accented syllables of the model line, in order. */
export function accentIndices(example: ToneExample): number[] {
  return example.syllables.flatMap((s, i) => ACUTE.test(s.text) ? [i] : []);
}
/**
 * One figure of the tone: a run of marked syllables and the accent it hangs
 * on, numbered back from the end of the line.
 *
 * A cadence is not always one figure counted from one place. english/one,
 * six, seven and gregorian/one, three, seven all point their mediant on *two*
 * accents — "+ −" on the second-to-last and "− +" on the last — with however
 * many unaccented syllables the line happens to have lying between them. Read
 * as offsets from a single anchor, that middle stretch was counted, so a
 * verse with one syllable more or fewer there had the opening figure dragged
 * off its accent. Grouping the marks and hanging each group on its own accent
 * is what lets the gap between them stretch, exactly as the engine's own
 * accent counting does.
 *
 * Adjacent marks are one figure; a bare syllable ends it. The accent a figure
 * hangs on is the one inside it — the last, if it holds more than one — or,
 * for a figure with no accent of its own, the accent nearest to it.
 */
export interface MarkGroup { indices: number[]; ordinal: number; accent: number; crowded: Crowding }
export function markGroups(example: ToneExample): MarkGroup[] {
  const accents = accentIndices(example);
  if (!accents.length) return [];
  const pinned = !!example.syllables[0]?.atStart && !!example.syllables[0]?.mark;
  const runs: number[][] = [];
  for (let i = pinned ? 1 : 0; i < example.syllables.length; i++) {
    if (!example.syllables[i].mark) continue;
    if (runs.at(-1)?.at(-1) === i - 1) runs.at(-1)!.push(i);
    else runs.push([i]);
  }
  return runs.map(indices => {
    const chosen = indices.map(i => example.syllables[i].accent).find(n => n !== undefined);
    const inside = accents.filter(a => indices.includes(a));
    const middle = (indices[0] + indices[indices.length - 1]) / 2;
    const accent = chosen !== undefined && accents[accents.length - chosen] !== undefined
      ? accents[accents.length - chosen]
      : inside.length ? inside[inside.length - 1]
        // A figure lying between two accents belongs to the later of them:
        // these are cadences, and they are built towards the end of the line.
        : accents.reduce((a, b) => Math.abs(middle - b) <= Math.abs(middle - a) ? b : a);
    const crowded = indices.map(i => example.syllables[i].crowded).find(c => c !== undefined) ?? 'step';
    return { indices, accent, crowded, ordinal: accents.length - accents.indexOf(accent) };
  });
}
export function validateTone(value: unknown): CreatedTone {
  const t = value as CreatedTone;
  if (!t || t.version !== 1 || typeof t.id !== 'string' || t.id.length > 100 ||
    typeof t.name !== 'string' || !t.name.trim() || t.name.length > 100 ||
    !['lyps', 'jgabc', 'discerned'].includes(t.backend) || !/^[cf][1-4]$/.test(t.clef)) throw new Error('Invalid tone details.');
  if (t.backend === 'discerned') {
    const rule = t.discerned;
    const pitches = rule && [rule.reciting, rule.mediation?.previous, rule.mediation?.return,
      rule.mediation?.passing, ...(rule.ending?.preparations ?? []), rule.ending?.final];
    if (!rule || rule.kind !== 'tone-1' || !pitches || pitches.length !== 7 ||
      pitches.some(pitch => typeof pitch !== 'string' || !validPitch(pitch) || noteCount(pitch) !== 1)) {
      throw new Error('The conditional tone needs one valid GABC note in every rule field.');
    }
  }
  for (const key of CADENCES) {
    const e = t.examples?.[key];
    if (!e || !['end', 'accent'].includes(e.anchor) || !Array.isArray(e.syllables) || !e.syllables.length || e.syllables.length > 150) throw new Error(`Add a ${key} example (up to 150 syllables).`);
    for (const s of e.syllables) {
      if (!s || typeof s.text !== 'string' || s.text.length > 100 || /[<>{}\\]/.test(s.text) || typeof s.join !== 'boolean' || !MARKS.includes(s.mark) || !validPitch(s.pitch) || !['fixed', 'recite', 'accent'].includes(s.role) || (s.atStart !== undefined && typeof s.atStart !== 'boolean')
        || (s.accent !== undefined && (!Number.isInteger(s.accent) || s.accent < 1 || s.accent > 20))
        || (s.crowded !== undefined && !CROWDING.includes(s.crowded))
        || (s.hold !== undefined && (!validPitch(s.hold) || noteCount(s.hold) !== 1))) throw new Error('Invalid syllable.');
    }
    if (e.syllables.some((s, i) => s.atStart && i > 0)) throw new Error(`Only the opening syllable of ${key} may be pinned to the start of the verse.`);
    // A figure can only hang on an accent the model line actually has.
    const accents = accentIndices(e).length;
    if (e.syllables.some(s => s.accent !== undefined && s.accent > accents)) throw new Error(`A figure in ${key} is counted from an accent this model line does not have.`);
    if (t.backend === 'jgabc' && !e.syllables.some(s => s.role === 'recite')) throw new Error(`Choose a reciting note for ${key}.`);
    if (t.backend === 'jgabc') {
      const reciting = e.syllables.findIndex(s => s.role === 'recite');
      const accent = e.syllables.findIndex(s => s.role === 'accent');
      if (accent >= 0 && accent < reciting) throw new Error(`Place the reciting note before the first accent in ${key}.`);
      if (e.syllables.some(s => s.role === 'recite' && noteCount(s.pitch) !== 1)) throw new Error('A reciting syllable needs a single pitch.');
      // Only an accent has syllables held after it; see holdNote.
      if (e.syllables.some(s => s.hold && s.role !== 'accent')) throw new Error(`Only an accent note holds the syllables after it, and one in ${key} does not.`);
    }
    // The accent anchor is the model line's own last acute. A line with none
    // gives the cadence nothing to hang on, and every mark drawn on it would
    // be measured from a place the engine cannot find.
    if (t.backend === 'lyps' && e.anchor === 'accent' && anchorIndex(e) < 0) throw new Error(`The ${key} model line has no accented syllable, so a cadence cannot be measured from its last accent.`);
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
/**
 * The note the syllables after an accent are held on, or null when the accent
 * needs no note of its own.
 *
 * jgabc needs an open note after an accent to absorb variable unstressed
 * syllables. Without it the preceding tenor is consumed as part of the accent
 * and the beginning of a longer hemistich disappears — the whole opening of
 * "to behold your strength and your glory" is sung on the accent's own note.
 * It is one note, not the neume it stands before: writing the whole of a
 * climacus there sang its diamonds twice.
 *
 * Which note it is, though, is a choice the tone makes and not something that
 * can be read off the model line. The default here is the note the accent
 * moves on to, which is what the line itself shows; a tone that instead holds
 * those syllables on the accent's own note — or on any other — says so in
 * `hold`, because the model line has no syllable there to draw it on. Where a
 * reciting syllable already stands after the accent, that syllable *is* the
 * open note and is drawn on the staff, so none is added.
 */
export function holdNote(example: ToneExample, index: number): string | null {
  const s = example.syllables[index];
  if (s?.role !== 'accent' || example.syllables[index + 1]?.role === 'recite') return null;
  return openNote(s.hold || example.syllables[index + 1]?.pitch || s.pitch);
}
export function gabcFormula(example: ToneExample): string {
  const tokens: string[] = [];
  for (const [index, s] of example.syllables.entries()) {
    const token = `${s.role === 'accent' ? "'" : ''}${s.pitch}${s.role === 'recite' ? 'r' : ''}`;
    if (s.role !== 'recite' || tokens.at(-1) !== token) tokens.push(token);
    const held = holdNote(example, index);
    if (held) {
      tokens.push(`${held}r`);
      if (index === example.syllables.length - 1) tokens.push(s.pitch);
    }
  }
  // A final open note must close on a separate dotted note.
  const last = example.syllables.at(-1);
  if (last?.role === 'recite') tokens.push(last.pitch);
  return tokens.join(' ') + '.';
}
/**
 * Where one mark of the model belongs on a line of any length. Every mark
 * keeps its distance from the anchor at the end of the hemistich, except a
 * mark pinned to the opening syllable, which keeps its distance from the
 * beginning. Nothing is measured from anywhere else, and nothing is spread
 * over a run of syllables: the unmarked opening is the elastic part.
 */
export interface MarkPlacement { mark: Mark; from: 'start' | 'end' | 'accent'; offset: number; ordinal?: number; crowded?: Crowding }
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
 * The syllables the editor draws on, from a syllabified hemistich. Every one
 * of them starts on the reciting note and unmarked; what the tone does is
 * whatever is then drawn onto the end of the line.
 */
export function exampleSyllables(syllabified: string): ToneSyllable[] {
  const syllables: ToneSyllable[] = [];
  let join = false;
  for (const text of syllabified.trim().split(/\s+/)) {
    if (text === '--') { join = true; continue; }
    syllables.push({ text, join, mark: '', pitch: 'h', role: 'recite' });
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
  const syllables: ToneSyllable[] = sung.map(s => {
    const pitch = drawable(s.notes);
    if (pitch !== s.notes && s.notes) simplified.push(`“${s.text}” is sung on ${s.notes}, drawn here as ${pitch}`);
    return { text: s.text, join: s.join, mark: '', pitch: pitch || 'h', role: 'fixed' };
  });
  const notes = formulaNotes(formula);
  const tenor = notes.find(n => n.open)?.pitch || syllables[0].pitch;
  let at = syllables.length - 1;
  /**
   * An open note the model line gave no syllable to. It is still part of the
   * tone — it is where a longer line's extra syllables go — and the accent it
   * stands after is the only place left to record it, since there is nothing
   * on the staff to draw it on. Without this a copied tone silently moved
   * those syllables onto the note the model happens to show next.
   */
  let held: string | null = null;
  for (let n = notes.length - 1; n >= 0 && at >= 0; n--) {
    if (!notes[n].open) {
      // A note the engine sang somewhere else is a note it could not fit: the
      // line was shorter than the cadence, and what stands before this point
      // was recited rather than sung as written. Reading on from here would
      // put an accent on a syllable held on the tenor.
      if (syllables[at].pitch !== notes[n].pitch) break;
      syllables[at].role = notes[n].accent ? 'accent' : 'fixed';
      // Only when it is not already where the drawing would put it: the
      // default is the open note of whatever stands next, so a held g before
      // a climacus on gvFED is the default and needs no field of its own.
      if (held && notes[n].accent && held !== openNote(syllables[at + 1]?.pitch || syllables[at].pitch)) syllables[at].hold = held;
      held = null;
      at--;
      continue;
    }
    // An open note may cover nothing, and never eats the notes before it. Nor
    // does it eat a stressed syllable while an accent note is still waiting
    // for one: an accent and the open note beside it are often the same pitch,
    // and the stress is the only thing that tells them apart.
    const waiting = notes.slice(0, n).some(note => note.accent);
    const before = at;
    while (at >= n && syllables[at].pitch === notes[n].pitch && !(waiting && ACUTE.test(syllables[at].text))) {
      syllables[at].role = 'recite';
      at--;
    }
    held = before === at ? notes[n].pitch : null;
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
  const rules: MarkPlacement[] = [];
  const first = example.syllables[0];
  const pinned = !!first?.atStart && !!first?.mark;
  if (pinned) rules.push({ mark: first.mark, from: 'start', offset: 0 });
  if (example.anchor === 'end') {
    const last = example.syllables.length - 1;
    for (const [i, s] of example.syllables.entries()) {
      if (s.mark && !(i === 0 && pinned)) rules.push({ mark: s.mark, from: 'end', offset: i - last });
    }
    return rules;
  }
  // An accent anchor the model line does not have leaves every mark measured
  // from nowhere. applyMarkExample marks nothing on a line with no accent, so
  // there is no rule to state either.
  for (const group of markGroups(example)) {
    for (const i of group.indices) {
      rules.push({ mark: example.syllables[i].mark, from: 'accent', ordinal: group.ordinal, offset: i - group.accent, crowded: group.crowded });
    }
  }
  return rules;
}
export function formulaPreview(tone: CreatedTone): string {
  if (tone.backend === 'discerned') {
    const r = tone.discerned ?? DEFAULT_DISCERNED_RULE;
    return [
      `reciting: ${r.reciting}`,
      `mediation: previous stress ${r.mediation.previous}; return ${r.mediation.return}; passing ${r.mediation.passing}`,
      `ending: preparations ${r.ending.preparations.join(' ')}; final stress ${r.ending.final}`,
    ].join('\n');
  }
  return CADENCES.map(key => {
    const example = tone.examples[key];
    if (tone.backend === 'jgabc') return `${key}: ${gabcFormula(example)}`;
    return `${key}: ${JSON.stringify({ anchor: example.anchor, marks: markRules(example) })}`;
  }).join('\n');
}
/** Runs on the same syllabified hemistich used by the upstream mode functions. */
export function applyMarkExample(line: string, example: ToneExample): string {
  const tokens = line.trim().split(/\s+/);
  const indices = tokens.flatMap((s, i) => s !== '--' ? [i] : []);
  const accents = indices.flatMap((i, at) => ACUTE.test(tokens[i]) ? [at] : []);
  /**
   * The marks the line has been given, by position. Nothing is written onto
   * the tokens until every figure has had its turn: a mark can still be joined
   * by another of its own figure, and two marks on one syllable are the pair
   * mark that writes both, not one macro nested inside the other.
   */
  const placed = new Map<number, Mark>();
  const taken = (position: number) => placed.has(position);
  const put = (position: number, mark: Mark, join = false) => {
    if (indices[position] === undefined || position < 0 || !mark) return;
    const before = placed.get(position);
    if (!before) { placed.set(position, mark); return; }
    // A figure folding onto its own syllable writes the pair mark, and the two
    // read in the order the figure sings them.
    const pair = (before + mark) as Mark;
    if (join && MARKS.includes(pair)) placed.set(position, pair);
  };
  const first = example.syllables[0];
  const pinned = first?.atStart && first.mark ? first.mark : '';
  if (example.anchor === 'end') {
    // Every mark keeps its distance from the last syllable, and a line too
    // short for the cadence simply loses the marks that fall off its opening.
    const last = example.syllables.length - 1;
    for (const [i, s] of example.syllables.entries()) {
      if (s.mark && !(i === 0 && pinned)) put(indices.length - 1 + i - last, s.mark);
    }
  } else {
    /**
     * The figures go down from the end of the line inwards, each one taking
     * the syllables it needs, so that on a line with no room for all of them
     * it is the end of the cadence that survives. A figure whose accent the
     * line does not have at all — a line with one accent where the model had
     * two — is dropped whole rather than slid onto a neighbouring accent,
     * which would point the line with a figure the tone never puts there.
     *
     * Everything else is the figure's own short-line rule; see Crowding.
     */
    const free = (positions: number[]) =>
      positions[0] >= 0 && positions[positions.length - 1] < indices.length && !positions.some(taken);
    /** Marks a figure could not write, waiting for the figure before it. */
    let handed: Mark[] = [];
    for (const group of [...markGroups(example)].sort((a, b) => a.ordinal - b.ordinal || b.indices[0] - a.indices[0])) {
      const marks = group.indices.map(i => example.syllables[i].mark);
      const offsets = group.indices.map(i => i - group.accent);
      const carried = handed;
      handed = [];
      const at = accents[accents.length - group.ordinal];
      if (at === undefined) continue;
      /**
       * A passed mark continues this figure's run to the right: it is the note
       * the figure after this one had nowhere to sing. It rides along only so
       * long as the figure stays where it is — a figure that steps back,
       * slides, or is left off the line leaves the mark behind on the accent
       * it vacated. That is english/one/first exactly: a bare "−" on the
       * second-to-last accent, and its own "+ −" back on the third.
       */
      const full = [...marks, ...carried];
      const spread = [...offsets];
      while (spread.length < full.length) spread.push(spread[spread.length - 1] + 1);
      if (free(spread.map(offset => at + offset))) {
        spread.forEach((offset, k) => put(at + offset, full[k]));
        continue;
      }
      const moves = group.crowded === 'step' || group.crowded === 'slide' || group.crowded === 'drop';
      if (moves) carried.forEach((mark, k) => put(at + k, mark));
      const run = moves ? marks : full;
      const from = (accent: number) => (moves ? offsets : spread).map(offset => accent + offset);
      const lay = (positions: number[]) => positions.forEach((position, k) => put(position, run[k]));
      if (group.crowded === 'step') {
        for (let ordinal = group.ordinal; ordinal <= accents.length; ordinal++) {
          const accent = accents[accents.length - ordinal];
          if (accent === undefined) break;
          if (free(from(accent))) { lay(from(accent)); break; }
        }
      } else if (group.crowded === 'slide') {
        for (let shift = 0; shift <= from(at)[0]; shift++) {
          const positions = from(at).map(position => position - shift);
          if (free(positions)) { lay(positions); break; }
        }
      } else if (group.crowded === 'pass') {
        // The figure keeps the syllables it has, from its accent to whatever
        // stops it, and the marks left over go back to the figure before it.
        let room = 0;
        for (let position = from(at)[0]; position >= 0 && position < indices.length && !taken(position); position++) room++;
        handed = run.slice(0, Math.max(0, run.length - room));
        run.slice(handed.length).forEach((mark, k) => put(from(at)[0] + k, mark));
      } else if (group.crowded === 'fold') {
        // Each mark goes on its own syllable where the line has one to spare,
        // and otherwise onto the syllable this figure last wrote on, where the
        // two are written as the pair mark. A figure with nothing written yet
        // has nothing to join, and that mark is not sung.
        let last = -1;
        for (const [k, position] of from(at).entries()) {
          const spare = position >= 0 && position < indices.length && !taken(position);
          const onto = spare ? position : last;
          if (onto < 0) continue;
          put(onto, run[k], !spare);
          last = onto;
        }
      } else if (group.crowded === 'trim') {
        lay(from(at));
      }
    }
  }
  // The mark pinned to the opening goes down last: the cadence is what must
  // survive on a line short enough to bring the two onto one syllable.
  if (pinned) put(0, pinned);
  for (const [position, mark] of placed) tokens[indices[position]] = `\\${MACROS[mark]}{${tokens[indices[position]]}}`;
  return tokens.join(' ').split(' -- ').join('');
}
