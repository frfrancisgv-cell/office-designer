/**
 * stripPointing — recovering plain psalm text from pointed HTML.
 *
 * The bug this guards: lypsautierant sets its mark glyphs as real text nodes
 * so CSS can place them under each syllable, so a naive tag strip turns a
 * pointed "of" into the literal word "of+". Re-pointing that compounds the
 * damage every time the user changes tone. The UI used to import a
 * stripPointing without the guard.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { stripPointing, hasPointingMarkup } from './strip';
import { pointPsalmText } from './lypsautierant-engine';

const PSALM_1 = `Blessed indeed is the man *
who follows not the counsel of the wicked,
nor stands in the path with sinners, *
nor abides in the company of scorners,`;

// ── The Gregorian tone engine's dialect: <strong>/<em> ────────────────────

test('strips the tone engine markup', () => {
  assert.equal(stripPointing('<strong>Bles</strong>sed <em>in</em>deed'), 'Blessed indeed');
  assert.equal(stripPointing('<b>a</b><i>b</i>'), 'ab');
});

test('<br> becomes a newline, other tags vanish', () => {
  assert.equal(stripPointing('one<br>two'), 'one\ntwo');
  assert.equal(stripPointing('one<br />two'), 'one\ntwo');
  assert.equal(stripPointing('one<br/>two'), 'one\ntwo');
  assert.equal(stripPointing('<span class="x">plain</span>'), 'plain');
});

test('the <b> rule does not swallow <br>', () => {
  // /<\/?(strong|em|b|i)[^>]*>/ lets the 'b' alternative match <br>, because
  // [^>]* happily eats the 'r'. The line breaks were then gone before the
  // <br> rule ran, and a pointed psalm came back as one run-together line
  // that the engine re-pointed as a single verse.
  const pointed = '<strong>Bles</strong>sed is the <em>man</em><br>who follows <b>not</b><br>the counsel';
  assert.equal(stripPointing(pointed), 'Blessed is the man\nwho follows not\nthe counsel');

  // Attributes on the real tags must still be stripped.
  assert.equal(stripPointing('<b class="x">a</b><br><i data-y="1">b</i>'), 'a\nb');
});

test('decodes the entities the engines emit', () => {
  assert.equal(stripPointing('a &amp; b'), 'a & b');
  assert.equal(stripPointing('&lt;tag&gt;'), '<tag>');
  assert.equal(stripPointing('a&nbsp;b'), 'a b');
});

test('empty input gives empty output', () => {
  assert.equal(stripPointing(''), '');
});

// ── The lypsautierant dialect: mark glyphs are text ───────────────────────

test('lypsautierant HTML round-trips back to exactly the text it came from', () => {
  const { html } = pointPsalmText(PSALM_1, 'modes', 'eight', 'a');
  assert.notEqual(html, PSALM_1, 'the engine should have marked something');
  assert.equal(stripPointing(html), PSALM_1);
});

test('the mark glyphs do not survive as letters', () => {
  const { html } = pointPsalmText(PSALM_1, 'modes', 'eight', 'a');
  const plain = stripPointing(html);

  // What a naive strip produces, and must not: the marks are real text nodes.
  const naive = html.replace(/<[^>]+>/g, '');
  assert.match(naive, /of\+/, 'the fixture should exercise the mark-as-text case');
  assert.doesNotMatch(plain, /of\+/);

  for (const glyph of ['+', '−', '=']) {
    assert.ok(!plain.includes(glyph), `mark glyph "${glyph}" leaked into the text`);
  }
});

test('re-pointing stripped text reproduces the same HTML', () => {
  // The property that matters to the UI: applying a tone, changing it, and
  // changing back must not compound. Verse structure has to survive the
  // round trip for this to hold, which is why the '*' is kept.
  const first = pointPsalmText(PSALM_1, 'modes', 'eight', 'a').html;
  const second = pointPsalmText(stripPointing(first), 'modes', 'eight', 'a').html;
  assert.equal(second, first);

  // And across three strip/point cycles, not just one.
  let text = PSALM_1;
  for (let i = 0; i < 3; i++) {
    text = stripPointing(pointPsalmText(text, 'modes', 'eight', 'a').html);
  }
  assert.equal(text, PSALM_1);
});

test('a different tone strips back to the same baseline', () => {
  const a = pointPsalmText(PSALM_1, 'modes', 'eight', 'a').html;
  const b = pointPsalmText(PSALM_1, 'modes', 'two', 'a').html;
  assert.notEqual(a, b, 'the two tones should point differently');
  assert.equal(stripPointing(a), stripPointing(b));
});

test('verse numbers, asterisks and flex daggers are kept', () => {
  // These are what let re-pointing reproduce the same verse structure rather
  // than re-inferring it, so they must survive the strip. The one thing that
  // does not survive verbatim is the space before a flex dagger: the engine
  // renders the dagger tight to its word, so the round trip normalises
  // "man †" to "man†". Harmless, and stable from the first pass on.
  const withVerse = `1 Blessed indeed is the man †
who follows not the counsel of the wicked, *
nor stands in the path with sinners,`;

  const once = stripPointing(pointPsalmText(withVerse, 'modes', 'eight', 'a').html);
  assert.match(once, /^1 Blessed/, 'the verse number was dropped');
  assert.ok(once.includes('†'), 'the flex dagger was dropped');
  assert.ok(once.includes('*'), 'the mediant asterisk was dropped');
  assert.equal(once.split('\n').length, 3, 'the line structure changed');

  const twice = stripPointing(pointPsalmText(once, 'modes', 'eight', 'a').html);
  assert.equal(twice, once, 'the round trip is not stable');
});

// ── hasPointingMarkup ─────────────────────────────────────────────────────

test('hasPointingMarkup recognises both dialects and nothing else', () => {
  assert.equal(hasPointingMarkup(''), false);
  assert.equal(hasPointingMarkup('plain text'), false);
  assert.equal(hasPointingMarkup('<span class="other">x</span>'), false);
  assert.equal(hasPointingMarkup('<strong>x</strong>'), true);
  assert.equal(hasPointingMarkup('<em>x</em>'), true);
  assert.equal(hasPointingMarkup(pointPsalmText(PSALM_1, 'modes', 'eight', 'a').html), true);
});
