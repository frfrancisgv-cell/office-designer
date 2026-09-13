/**
 * pray-view.ts
 *
 * The sizing arithmetic behind /share/<id>, the read-only prayer view.
 *
 * A booklet is designed against a sheet of paper: a point size and a paper
 * size together decide how much text sits on a line. A phone has neither, so
 * a shared link cannot simply reproduce the page. 12pt on a 5.5in sheet is
 * about fifty characters to the line; the same 12pt on a 390px phone is a
 * different measure again, with the chant squeezed to match and no way for the
 * reader to do anything about it. So this view keeps the design's proportions
 * and lets the device supply the size:
 *
 *   - the type is the author's own point size, read against the reader's root
 *     font size — a phone or browser set to large text is honoured — times
 *     whatever the reader picks with A− / A+. A screen is not given type the
 *     author did not ask for merely because it is a large screen;
 *   - the sheet is the page: at the default size it is exactly as wide on
 *     screen as the paper it was designed for. It is also stated a second time
 *     in em of that type, and the wider of the two wins, so enlarging the type
 *     widens the page with it rather than squeezing the same words into a
 *     narrower and narrower column. Shrinking the type never pulls the page in
 *     below the paper.
 *
 * None of it touches print: paper keeps the author's point size and the real
 * page box, which is why the geometry below is stated once and read three ways.
 */

import type { OfficeSettings, PaperSize } from './types';

const CSS_PX_PER_IN = 96;
const MM_PER_IN = 25.4;
const PT_PER_IN = 72;

/**
 * Physical page boxes: how wide each one is, how it is written as a CSS width,
 * and the `@page size` it prints as.
 */
export const PAPER_GEOMETRY: Record<PaperSize, { widthIn: number; widthCss: string; printSize: string }> = {
  Letter: { widthIn: 8.5, widthCss: '8.5in', printSize: '8.5in 11in' },
  HalfLetter: { widthIn: 5.5, widthCss: '5.5in', printSize: '5.5in 8.5in' },
  A4: { widthIn: 210 / MM_PER_IN, widthCss: '210mm', printSize: 'A4' },
  A5: { widthIn: 148 / MM_PER_IN, widthCss: '148mm', printSize: 'A5' },
};

/** What a booklet with no stated paper is: the half-letter hand missal. */
export const DEFAULT_PAPER_SIZE: PaperSize = 'HalfLetter';
export const DEFAULT_BASE_FONT_PT = 12;

/**
 * The steps A− / A+ walk through, as multiples of the design's size. The top
 * of the range is deliberately far past what a page of paper would bear: a
 * phone propped on a stand across a choir stall is read from further away
 * than a book held open, and the top step should be large-print, not merely
 * comfortable.
 */
export const PRAY_SCALE_STEPS = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3] as const;
export const DEFAULT_PRAY_SCALE = 1;

/** Where a reader's chosen size is kept, on that reader's own device. */
export const PRAY_SCALE_KEY = 'office-designer:pray-scale:v1';

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Round to a tenth of a pixel: enough for layout, stable across re-renders. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function paperSizeOf(settings: Pick<OfficeSettings, 'paperSize'> | undefined): PaperSize {
  const named = settings?.paperSize as PaperSize | undefined;
  return named && named in PAPER_GEOMETRY ? named : DEFAULT_PAPER_SIZE;
}

export function basePointSizeOf(settings: Pick<OfficeSettings, 'baseFontSize'> | undefined): number {
  const pt = settings?.baseFontSize;
  return typeof pt === 'number' && pt > 0 ? pt : DEFAULT_BASE_FONT_PT;
}

/** The `@page size` for the paper the booklet was designed against. */
export function printPageSize(settings: Pick<OfficeSettings, 'paperSize'> | undefined): string {
  return PAPER_GEOMETRY[paperSizeOf(settings)].printSize;
}

/** The paper's width as a CSS length, which is how wide its page reads on a
 *  screen at the size the author designed it. */
export function readingPageWidthCss(settings: Pick<OfficeSettings, 'paperSize'> | undefined): string {
  return PAPER_GEOMETRY[paperSizeOf(settings)].widthCss;
}

/**
 * The same page, stated in em of the author's type: the width the sheet needs
 * for its words to sit as they sit on paper. Held against the fixed width
 * above, this is what lets A+ widen the page instead of narrowing it — but
 * only ever upward, so a reader who shrinks the type still sees a whole page
 * and not a strip of it.
 *
 * It is the *page* width and not the text column, because the sheet carries
 * its own padding inside this measure the way paper carries its margins.
 */
export function readingMeasureEm(settings: Pick<OfficeSettings, 'paperSize' | 'baseFontSize'> | undefined): number {
  const pagePx = PAPER_GEOMETRY[paperSizeOf(settings)].widthIn * CSS_PX_PER_IN;
  const fontPx = (basePointSizeOf(settings) / PT_PER_IN) * CSS_PX_PER_IN;
  return round(pagePx / fontPx);
}

/**
 * A stored or hand-edited scale, snapped to the nearest step actually offered.
 *
 * Anything that is not a positive number is the design's own size: `Number`
 * turns `null` and `''` into 0, which would otherwise snap to the smallest
 * step and hand a reader with empty storage the smallest type in the set.
 */
export function clampPrayScale(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') return DEFAULT_PRAY_SCALE;
  const wanted = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(wanted) || wanted <= 0) return DEFAULT_PRAY_SCALE;
  return PRAY_SCALE_STEPS.reduce(
    (best, step) => (Math.abs(step - wanted) < Math.abs(best - wanted) ? step : best),
    PRAY_SCALE_STEPS[0] as number,
  );
}

/** One press of A− (-1) or A+ (+1); at either end the size stays put. */
export function stepPrayScale(current: unknown, direction: 1 | -1): number {
  const snapped = clampPrayScale(current);
  const index = PRAY_SCALE_STEPS.indexOf(snapped as typeof PRAY_SCALE_STEPS[number]);
  return PRAY_SCALE_STEPS[clamp(index + direction, 0, PRAY_SCALE_STEPS.length - 1)];
}

export function canStepPrayScale(current: unknown, direction: 1 | -1): boolean {
  return stepPrayScale(current, direction) !== clampPrayScale(current);
}

/**
 * The body size the prayer view renders at, in CSS pixels.
 *
 * `rootFontPx` is the reader's own root font size, so the whole booklet
 * inherits a device or browser set to large text before anything here is
 * applied.
 */
export function readingFontPx({
  rootFontPx = 16,
  scale = DEFAULT_PRAY_SCALE,
  settings,
}: {
  rootFontPx?: number;
  scale?: number;
  settings?: Pick<OfficeSettings, 'baseFontSize'>;
}): number {
  const root = Number.isFinite(rootFontPx) && rootFontPx > 0 ? rootFontPx : 16;
  const designRatio = basePointSizeOf(settings) / DEFAULT_BASE_FONT_PT;
  return round(root * designRatio * clampPrayScale(scale));
}

/**
 * GabcRenderer sizes chant lyrics as `16px * (pt / 12)`, because Exsurge's
 * 16-unit default matches the editor's 12pt default. This hands it the point
 * size whose lyrics come out at exactly `px`, so the chant is set in the same
 * type as the words around it however the reader has sized them.
 */
export function gabcPointSizeForPx(px: number): number {
  return (px * DEFAULT_BASE_FONT_PT) / 16;
}
