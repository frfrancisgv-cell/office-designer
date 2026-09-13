import test from 'node:test';
import assert from 'node:assert/strict';
import type { OfficeSettings } from './types';
import {
  DEFAULT_PRAY_SCALE,
  PRAY_SCALE_STEPS,
  canStepPrayScale,
  clampPrayScale,
  gabcPointSizeForPx,
  printPageSize,
  readingFontPx,
  readingMeasureEm,
  readingPageWidthCss,
  stepPrayScale,
} from './pray-view';

const settings = (over: Partial<OfficeSettings> = {}): OfficeSettings => ({
  paperSize: 'HalfLetter',
  baseFontSize: 12,
  fontFamily: 'serif',
  rubricColor: '#C00000',
  lineSpacing: 'normal',
  ...over,
});

/** What the sheet actually comes out at: the wider of its two stated widths,
 *  which is the `max()` the stylesheet resolves. */
const sheetPx = (over: Partial<OfficeSettings> = {}, scale = DEFAULT_PRAY_SCALE) => {
  const of = settings(over);
  const pageIn = parseFloat(readingPageWidthCss(of));
  const pagePx = readingPageWidthCss(of).endsWith('mm') ? (pageIn / 25.4) * 96 : pageIn * 96;
  return Math.max(pagePx, readingMeasureEm(of) * readingFontPx({ scale, settings: of }));
};

test('at the reading size it was designed for, the sheet is the page', () => {
  assert.equal(readingPageWidthCss(settings()), '5.5in');
  assert.equal(Math.round(sheetPx()), 5.5 * 96);
  assert.equal(Math.round(sheetPx({ paperSize: 'Letter' })), 8.5 * 96);
  assert.equal(Math.round(sheetPx({ paperSize: 'A4' })), Math.round((210 / 25.4) * 96));
  // Also true of a booklet set in something other than 12pt.
  assert.equal(Math.round(sheetPx({ baseFontSize: 16 })), 5.5 * 96);
});

test('the page is stated a second time in em of its own type', () => {
  assert.equal(readingMeasureEm(settings()), 33);
  assert.equal(readingMeasureEm(settings({ paperSize: 'Letter' })), 51);
  assert.equal(readingMeasureEm(settings({ paperSize: 'A5' })), 35);
  // Larger type is fewer em to the same sheet of paper.
  assert.ok(readingMeasureEm(settings({ baseFontSize: 16 }))
    < readingMeasureEm(settings({ baseFontSize: 10 })));
});

test('A+ widens the sheet and A− never narrows it below the paper', () => {
  const paper = 5.5 * 96;
  assert.ok(sheetPx({}, 1.3) > paper, 'enlarged type should widen the page');
  assert.equal(Math.round(sheetPx({}, 1.3)), Math.round(paper * 1.3));
  assert.equal(Math.round(sheetPx({}, 0.8)), paper);
  assert.equal(Math.round(sheetPx({}, PRAY_SCALE_STEPS[0])), paper);
});

test('a booklet with unusable settings falls back to the hand missal', () => {
  assert.equal(readingMeasureEm(undefined), readingMeasureEm(settings()));
  assert.equal(readingPageWidthCss(undefined), '5.5in');
  assert.equal(printPageSize(undefined), '5.5in 8.5in');
  assert.equal(printPageSize({ paperSize: 'nonsense' as OfficeSettings['paperSize'] }), '5.5in 8.5in');
  assert.equal(printPageSize({ paperSize: 'A5' }), 'A5');
});

test('the type is the author’s point size, whatever the screen', () => {
  // No viewport is consulted at all: 12pt is 16px on a phone and on a desk.
  assert.equal(readingFontPx({ settings: settings() }), 16);
  assert.equal(readingFontPx({ settings: settings({ baseFontSize: 14 }) }), 18.7);
  assert.equal(readingFontPx({ settings: settings({ baseFontSize: 9 }) }), 12);
});

test('the reading size follows the reader’s own root font size', () => {
  assert.equal(readingFontPx({ rootFontPx: 20, settings: settings() }), 20);
  assert.equal(readingFontPx({ rootFontPx: 20, scale: 1.5, settings: settings() }), 30);
  // A browser that reports nothing usable must not collapse the booklet.
  assert.equal(readingFontPx({ rootFontPx: 0, settings: settings() }), 16);
  assert.equal(readingFontPx({ rootFontPx: Number.NaN, settings: settings() }), 16);
});

test('the top step is large print, not merely comfortable', () => {
  const largest = PRAY_SCALE_STEPS[PRAY_SCALE_STEPS.length - 1];
  assert.ok(largest >= 2.5, `${largest} is not large print`);
  assert.equal(readingFontPx({ scale: largest, settings: settings() }), 48);
});

test('A+ and A− walk the offered steps and stop at the ends', () => {
  const largest = PRAY_SCALE_STEPS[PRAY_SCALE_STEPS.length - 1];
  assert.equal(stepPrayScale(1, 1), 1.15);
  assert.equal(stepPrayScale(1, -1), 0.9);
  assert.equal(stepPrayScale(PRAY_SCALE_STEPS[0], -1), PRAY_SCALE_STEPS[0]);
  assert.equal(stepPrayScale(largest, 1), largest);
  assert.equal(canStepPrayScale(1, 1), true);
  assert.equal(canStepPrayScale(PRAY_SCALE_STEPS[0], -1), false);
  assert.equal(canStepPrayScale(largest, 1), false);
});

test('a stored size that is not one of the steps is snapped to one', () => {
  assert.equal(clampPrayScale(1.2), 1.15);
  assert.equal(clampPrayScale('1.3'), 1.3);
  assert.equal(clampPrayScale(99), PRAY_SCALE_STEPS[PRAY_SCALE_STEPS.length - 1]);
  assert.equal(clampPrayScale(undefined), DEFAULT_PRAY_SCALE);
  assert.equal(clampPrayScale('large'), DEFAULT_PRAY_SCALE);
  // `Number` reads these as 0, which must not become the smallest step.
  assert.equal(clampPrayScale(null), DEFAULT_PRAY_SCALE);
  assert.equal(clampPrayScale(''), DEFAULT_PRAY_SCALE);
  assert.equal(clampPrayScale(-4), DEFAULT_PRAY_SCALE);
});

test('the reader’s chosen size reaches the chant as well as the words', () => {
  // Exsurge lyrics come out at 16px * (pt / 12), so a 24px booklet must hand
  // the renderer 18pt for its chant to be set in the same type as the text.
  assert.equal(gabcPointSizeForPx(16), 12);
  assert.equal(gabcPointSizeForPx(24), 18);
  const enlarged = readingFontPx({ scale: 1.5, settings: settings() });
  assert.equal(enlarged, 24);
  assert.equal(gabcPointSizeForPx(enlarged), 18);
});
