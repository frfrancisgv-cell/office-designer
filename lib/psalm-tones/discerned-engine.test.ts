import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDiscernedLine, applyDiscernedTone1, pointDiscernedTone1 } from './discerned-engine';

test('discerns pronouns as minor stresses in long gaps without changing major stresses', () => {
  const syllables = analyzeDiscernedLine('O Gód, you are my Gód, for you I lóng');
  assert.deepEqual(
    syllables.filter(s => s.stress !== 'none').map(s => [s.text.replace(/[^\p{L}\p{M}]/gu, ''), s.stress]),
    [['Gód', 'major'], ['you', 'minor'], ['Gód', 'major'], ['you', 'minor'], ['lóng', 'major']],
  );
});

test('Tone 1 mediation handles one and two intervening syllables', () => {
  assert.deepEqual(
    applyDiscernedTone1('the Lórd our Gód', 'mediation').syllables.map(s => s.notes),
    ['h', 'ixih', 'g', 'h'],
  );
  assert.deepEqual(
    applyDiscernedTone1('the Lórd is our Gód', 'mediation').syllables.map(s => s.notes),
    ['h', 'ixi', 'h', 'g', 'h'],
  );
});

test('Tone 1 ending puts G F before the last stress and D from it onward', () => {
  assert.deepEqual(
    applyDiscernedTone1('for you I lóng today', 'ending').syllables.map(s => s.notes),
    ['h', 'g', 'f', 'd', 'd', 'd'],
  );
});

test('Tone 1 mediation follows both long-gap branches when no minor stress is suitable', () => {
  assert.deepEqual(
    applyDiscernedTone1('Lórd of the and Gód', 'mediation').syllables.map(s => s.notes),
    ['ixi', 'h', 'g', 'h', 'h'],
  );
  assert.deepEqual(
    applyDiscernedTone1('Lórd of the and Gód today', 'mediation').syllables.map(s => s.notes),
    ['ixi', 'h', 'h', 'g', 'h', 'h', 'h'],
  );
});

test('short and unaccented lines degrade visibly instead of inventing notes', () => {
  const short = applyDiscernedTone1('Gód', 'ending');
  assert.deepEqual(short.syllables.map(s => s.notes), ['d']);
  assert.match(short.warnings[0], /fewer than two syllables/);
  const unaccented = applyDiscernedTone1('the and of', 'mediation');
  assert.deepEqual(unaccented.syllables.map(s => s.notes), ['h', 'h', 'h']);
  assert.match(unaccented.warnings[0], /none was found/);
});

test('an unspecified flex stays on A and is reported', () => {
  const flex = applyDiscernedTone1('O Gód, you are my Gód', 'flex');
  assert.ok(flex.syllables.every(s => s.notes === 'h'));
  assert.match(flex.warnings[0], /flex was not supplied/);
});

test('complete result is direct GABC rather than a fixed tone formula', () => {
  const result = pointDiscernedTone1('1 The Lórd is our Gód * for you I lóng.');
  assert.match(result.gabc, /^\(c4\) /);
  assert.match(result.gabc, /Lórd\(ixi\).*our\(g\).*Gód\(h\.\) \*\(:\)/);
  assert.match(result.gabc, /you\(g\) I\(f\) lóng\.\(d\.\)/);
  assert.equal(result.accentsDerived, false);
  assert.deepEqual(result.inferences, []);
});

test('complete result reports inferred minor stresses separately from warnings', () => {
  const result = pointDiscernedTone1('O God, you are my God, for you I long * for you my soul is thirsting.');
  assert.equal(result.accentsDerived, true);
  assert.ok(result.inferences.some(message => message.includes('“you”')));
  assert.deepEqual(result.warnings, []);
});
