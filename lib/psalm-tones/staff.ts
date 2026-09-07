/**
 * The editor's staff: where a note sits, how wide a syllable is, and the shape
 * each note is drawn in.
 *
 * The shapes are the chant's own and follow the GABC, not the part a syllable
 * plays in the cadence — a punctum is a square, a capital is that note lying
 * over as a diamond, v hangs a virga's stem on it, w serrates it into a
 * quilisma, _ sets an episema above, . a mora beside, ' an ictus below. The
 * geometry lives here rather than in the component so that what is drawn can
 * be rendered and looked at on its own.
 */
import { pitchGlyphs, type PitchGlyph, type ToneSyllable } from './creator';

/** In px: the SVG is drawn at its natural size, so one unit is one pixel. */
export const COL = 46;
export const STEP = 8;
export const FLOOR = 116;
export const STAFF_HEIGHT = 132;
/** One note's width, and the breath at a break in the neume. */
export const GLYPH = 13;
export const GAP = 7;
/** The four lines of a chant staff, as steps above the floor. */
export const STAFF_LINES = [3, 5, 7, 9];

export const pitchY = (pitch: string) => FLOOR - (pitch.charCodeAt(0) - 97) * STEP;
export const yToPitch = (y: number) => String.fromCharCode(97 + Math.max(0, Math.min(12, Math.round((FLOOR - y) / STEP))));

/**
 * A syllable is as wide as the neume it carries. Most take one note and the
 * plain column, but a tone's solemn mediant can put a dozen on one syllable.
 * The staff and the syllables under it are laid out from these same widths, so
 * the two cannot fall out of step.
 */
export function columnWidths(syllables: ToneSyllable[], staff: boolean): number[] {
  return syllables.map(s => staff ? Math.max(COL, neumeWidth(s.pitch) + 14) : COL);
}
export function neumeWidth(pitch: string): number {
  const glyphs = pitchGlyphs(pitch);
  return glyphs.length * GLYPH + glyphs.filter(g => g.gap).length * GAP;
}
/** Where each column starts, and at the end, how wide the staff is. */
export function runningOffsets(widths: number[]): number[] {
  return widths.reduce<number[]>((at, w) => [...at, at[at.length - 1] + w], [0]);
}
/** Where each glyph of one syllable's neume is drawn, centred in its column. */
export function glyphPositions(pitch: string, offset: number, width: number): { glyph: PitchGlyph; x: number; y: number }[] {
  const glyphs = pitchGlyphs(pitch);
  let x = offset + (width - neumeWidth(pitch)) / 2 + GLYPH / 2;
  return glyphs.map(glyph => {
    const at = x;
    x += GLYPH + (glyph.gap ? GAP : 0);
    return { glyph, x: at, y: pitchY(glyph.pitch) };
  });
}

export type NoteMark =
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { kind: 'path'; d: string }
  | { kind: 'stroke'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number };

/**
 * The accidentals, drawn rather than set as ♭ ♮ ♯ in a typeface: the sign has
 * to be there whatever font the page falls back to, and a flat that failed to
 * render left a note looking like the one above the one that is sung.
 */
function accidentalMarks(sign: string, x: number, y: number): NoteMark[] {
  if (sign === 'x') return [
    { kind: 'rect', x: x - 2.6, y: y - 10, width: 1.5, height: 14 },
    { kind: 'path', d: `M ${x - 1.1} ${y - 2.5} L ${x + 3.5} ${y + 0.5} L ${x - 1.1} ${y + 4} Z` },
  ];
  if (sign === '#') return [
    { kind: 'rect', x: x - 3, y: y - 8, width: 1.4, height: 14 },
    { kind: 'rect', x: x + 1.4, y: y - 9, width: 1.4, height: 14 },
    { kind: 'rect', x: x - 5, y: y - 3, width: 10, height: 1.4 },
    { kind: 'rect', x: x - 5, y: y + 2, width: 10, height: 1.4 },
  ];
  return [
    { kind: 'rect', x: x - 2.6, y: y - 9, width: 1.4, height: 12 },
    { kind: 'rect', x: x + 1.6, y: y - 3, width: 1.4, height: 12 },
    { kind: 'rect', x: x - 2.6, y: y - 3, width: 5.6, height: 1.4 },
    { kind: 'rect', x: x - 2.6, y: y + 1.6, width: 5.6, height: 1.4 },
  ];
}
/** Whether a pitch stands on a line: the mora beside it goes in a space. */
const onLine = (y: number) => Math.round((FLOOR - y) / STEP) % 2 === 1;

/** One note, in the marks that draw it. A liquescent is the same shape, smaller. */
export function noteMarks(glyph: PitchGlyph, x: number, y: number): NoteMark[] {
  if (glyph.accidental) return accidentalMarks(glyph.accidental, x, y);
  const size = glyph.liquescent ? 0.72 : 1;
  const w = 5 * size;
  const h = 4.2 * size;
  const marks: NoteMark[] = [
    glyph.shape === 'inclinatum'
      ? { kind: 'path', d: `M ${x} ${y - w} L ${x + w} ${y} L ${x} ${y + w} L ${x - w} ${y} Z` }
      : glyph.shape === 'quilisma'
        ? { kind: 'path', d: `M ${x - 6} ${y + h} L ${x - 3.5} ${y - h} L ${x - 1} ${y + h * 0.6} L ${x + 1.5} ${y - h} L ${x + 4} ${y + h * 0.6} L ${x + 6} ${y - h * 0.4} L ${x + 6} ${y + h} Z` }
        : glyph.shape === 'stropha'
          ? { kind: 'circle', cx: x, cy: y, r: w * 0.8 }
          : glyph.shape === 'oriscus'
            ? { kind: 'stroke', d: `M ${x - 5} ${y + 3} q 3 -9 5 -1 q 2 6 5 -4` }
            : { kind: 'rect', x: x - w, y: y - h, width: w * 2, height: h * 2, rx: 0.6 },
  ];
  // The virga's stem hangs from the right of the note it belongs to.
  if (glyph.shape === 'virga') marks.push({ kind: 'rect', x: x + w - 1.4, y, width: 1.4, height: 17 });
  if (glyph.episema) marks.push({ kind: 'rect', x: x - 7, y: y - 9.5, width: 14, height: 1.5 });
  if (glyph.ictus) marks.push({ kind: 'rect', x: x - 0.7, y: y + 6, width: 1.4, height: 6 });
  // The mora sits beside the note, in the space: a note on a line takes the
  // space above it, one already in a space keeps its own.
  for (let dot = 0; dot < glyph.dots; dot++) marks.push({ kind: 'circle', cx: x + 8.5 + dot * 4, cy: onLine(y) ? y - STEP / 2 : y, r: 1.5 });
  return marks;
}
