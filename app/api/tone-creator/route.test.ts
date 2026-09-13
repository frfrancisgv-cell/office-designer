import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { POST } from './route';
import { DEFAULT_DISCERNED_RULE } from '@/lib/psalm-tones/creator';
const call = (body: object) => POST(new NextRequest('http://localhost/api/tone-creator', { method: 'POST', body: JSON.stringify(body) }));
test('prepare and preview a whole Latin psalm with either backend', async () => {
  const text = 'Laudáte Dóminum omnes gentes * laudáte eum omnes pópuli.\nQuóniam confirmáta est * super nos misericórdia eius.';
  const prepared = await (await call({ action: 'prepare', text, lang: 'la' })).json();
  for (const example of Object.values(prepared.examples) as { syllables: { role: string; mark: string; pitch: string }[] }[]) {
    example.syllables.at(-2)!.role = 'accent';
    example.syllables.at(-2)!.mark = '+';
    example.syllables.at(-2)!.pitch = 'i';
    example.syllables.at(-1)!.role = 'fixed';
  }
  for (const backend of ['lyps', 'jgabc']) {
    const response = await call({ action: 'preview', text, lang: 'la', tone: { version: 1, id: 'test', name: 'Test', backend, clef: 'c4', examples: prepared.examples } });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.ok(backend === 'lyps' ? result.html.includes('lyps-') : result.gabc.includes('(i)'));
    assert.match(result.html || result.gabc, /nos/);
    if (backend === 'jgabc') {
      const letters = (s: string) => s.replace(/\([^)]*\)/g, '').replace(/[^\p{L}]/gu, '');
      assert.equal(letters(result.gabc), letters(text), 'engraving must retain the entire psalm');
    }
  }
});
test('invalid requests return actionable errors', async () => {
  assert.equal((await call({ action: 'preview', text: '' })).status, 400);
  assert.equal((await call({ action: 'preview', text: 'Psalm text', tone: {} })).status, 400);
});

test('previews an editable conditional tone through the creator', async () => {
  const text = 'O God, you are my God, for you I long * for you my soul is thirsting.';
  const prepared = await (await call({ action: 'prepare', text, lang: 'en', backend: 'discerned' })).json();
  const tone = {
    version: 1, id: 'conditional', name: 'Conditional Tone 1', backend: 'discerned', clef: 'c4',
    examples: prepared.examples,
    discerned: { ...DEFAULT_DISCERNED_RULE, ending: { preparations: ['h', 'g'], final: 'f' } },
  };
  const response = await call({ action: 'preview', text, lang: 'en', tone });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.gabc, /sóul\(h\) is\(g\) thír\(f\)sting\.\(f\.\)/);
  assert.ok(result.warnings.some((warning: string) => warning.includes('inferred minor stresses')));
});

test('English and very short verses render without dropping text', async () => {
  for (const text of ['Praise the Lórd * all the éarth.\nSing to Gód * for éver.', 'Gód * Gód.']) {
    const prepared = await (await call({ action: 'prepare', text, lang: 'en' })).json();
    const response = await call({ action: 'preview', text, lang: 'en', tone: { version: 1, id: 'test', name: 'Test', backend: 'jgabc', clef: 'c4', examples: prepared.examples } });
    assert.equal(response.status, 200);
    const { gabc } = await response.json();
    const letters = (s: string) => s.replace(/\([^)]*\)/g, '').replace(/[^\p{L}]/gu, '');
    assert.equal(letters(gabc), letters(text));
  }
});
