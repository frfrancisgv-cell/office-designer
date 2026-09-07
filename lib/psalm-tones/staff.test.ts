import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COL, FLOOR, STEP, columnWidths, glyphPositions, noteMarks, neumeWidth, pitchY, runningOffsets, yToPitch } from './staff';
import { pitchGlyphs, type ToneSyllable } from './creator';

const syllable = (text: string, pitch: string): ToneSyllable => ({ text, join: false, mark: '', pitch, role: 'fixed' });

test('a syllable is as wide as the neume it carries', () => {
  const syllables = [syllable('for', 'h'), syllable('sting.', "hiHGhih.ghGFE'fggf")];
  const widths = columnWidths(syllables, true);
  assert.equal(widths[0], COL, 'one note keeps the plain column');
  assert.ok(widths[1] > COL * 3, `a sixteen-note neume needs the room: ${widths[1]}`);
  assert.ok(widths[1] >= neumeWidth(syllables[1].pitch));
  // The syllables under the staff are laid out from the same widths, so the
  // marks backend, which draws no staff, keeps its even columns.
  assert.deepEqual(columnWidths(syllables, false), [COL, COL]);
  assert.deepEqual(runningOffsets([46, 60, 46]), [0, 46, 106, 152]);
});

test('the notes of a neume are laid out in order, with the breaks spaced', () => {
  const spots = glyphPositions('h/hf', 0, 100);
  assert.deepEqual(spots.map(s => s.glyph.pitch), ['h', 'h', 'f']);
  assert.ok(spots[1].x - spots[0].x > spots[2].x - spots[1].x, 'the break after the first note is wider');
  // Height is the pitch: a step is a step, and higher is further up the page.
  assert.equal(spots[0].y, pitchY('h'));
  assert.equal(spots[2].y - spots[0].y, 2 * STEP);
  assert.equal(yToPitch(pitchY('h')), 'h');
});

test('each note is drawn in the shape GABC gives it', () => {
  const [punctum] = pitchGlyphs('h');
  assert.deepEqual(noteMarks(punctum, 0, 0).map(m => m.kind), ['rect']);
  const [virga] = pitchGlyphs('hv');
  assert.deepEqual(noteMarks(virga, 0, 0).map(m => m.kind), ['rect', 'rect'], 'the note and its stem');
  const [inclinatum] = pitchGlyphs('H');
  assert.deepEqual(noteMarks(inclinatum, 0, 0).map(m => m.kind), ['path'], 'a diamond');
  // A liquescent is the same shape, smaller.
  const [small] = pitchGlyphs('h~');
  const [full] = pitchGlyphs('h');
  assert.ok((noteMarks(small, 0, 0)[0] as { width: number }).width < (noteMarks(full, 0, 0)[0] as { width: number }).width);
  // The flat is drawn rather than set in a typeface, so it cannot fall back
  // to nothing and leave the note looking a step higher than it is sung.
  assert.deepEqual(noteMarks(pitchGlyphs('ixi')[0], 0, 0).map(m => m.kind), ['rect', 'path']);
});

test('a mora goes in the space beside its note', () => {
  const line = pitchY('h');      // steps 3, 5, 7 and 9 are the staff's lines
  const space = pitchY('i');
  const dotOn = (glyphY: number) => noteMarks(pitchGlyphs('h.')[0], 0, glyphY).find(m => m.kind === 'circle') as { cy: number };
  assert.equal(dotOn(line).cy, line - STEP / 2, 'a note on a line takes the space above');
  assert.equal(dotOn(space).cy, space, 'a note in a space keeps its own');
  assert.equal((FLOOR - line) / STEP % 2, 1);
});
