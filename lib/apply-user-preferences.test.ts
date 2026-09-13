import test from 'node:test';
import assert from 'node:assert/strict';
import type { Block } from './types';
import { applyUserPreferences } from './apply-user-preferences';
import { DEFAULT_USER_PREFERENCES } from './user-preferences';

/**
 * The defaults with the Gregorian engine put back under Psalm defaults. The
 * shipped default points the psalmody stress-aware, so every test below that
 * is about the Gregorian path — or about anything other than which engine the
 * psalms go to — names the engine it means rather than leaning on the default.
 */
const gregorianDefaults = {
  ...DEFAULT_USER_PREFERENCES,
  psalms: { ...DEFAULT_USER_PREFERENCES.psalms, engine: 'gregorian' as const },
};

test('loaded offices receive translation and simple-pointing defaults', async () => {
  const blocks: Block[] = [
    { id: 'chant', type: 'antiphon', content: 'Antiphon', gabcScore: '(c4) A(f)' },
    { id: 'psalm', type: 'psalm', content: 'The Lord is my shepherd * I shall not want.', psalmNumber: 23 },
  ];
  // This runs with no fetch at all, so the sung ordinary — on by default, and
  // read from the server — is turned off here.
  const preferences = {
    ...DEFAULT_USER_PREFERENCES,
    showTranslations: false,
    chantedOrdinary: { introduction: '', lordsPrayer: '', dismissal: '' },
    psalms: { ...DEFAULT_USER_PREFERENCES.psalms, engine: 'simple' as const },
  };
  const result = await applyUserPreferences(blocks, preferences, 'generated');
  assert.equal(result.blocks[0].printTranslation, false);
  assert.equal(result.blocks[1].lang, 'en');
  assert.match(result.blocks[1].content, /<(?:strong|em)>/);
  assert.equal(result.errors.length, 0);
});

test('unsupported office languages load without applying an English pointing algorithm', async () => {
  const blocks: Block[] = [{ id: 'p', type: 'psalm', content: 'Señor, escucha mi voz.', psalmNumber: 5 }];
  const preferences = {
    ...gregorianDefaults, defaultLanguage: 'es' as const,
    chantedOrdinary: { introduction: '', lordsPrayer: '', dismissal: '' },
  };
  const result = await applyUserPreferences(blocks, preferences, 'generated');
  assert.equal(result.blocks[0].content, blocks[0].content);
  assert.equal(result.blocks[0].lang, undefined);
  assert.equal(result.errors.length, 1);
});

test('Gospel Canticles can use a different language from the office', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ rawText: 'Magníficat ánima mea Dóminum.' }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
  try {
    const preferences = {
      ...DEFAULT_USER_PREFERENCES,
      gospelCanticles: { ...DEFAULT_USER_PREFERENCES.gospelCanticles, language: 'la' as const, engine: 'none' as const },
    };
    const blocks: Block[] = [{ id: 'm', type: 'psalm', content: 'My soul proclaims the Lord.', psalmNumber: 'Magnificat', lang: 'en' }];
    const result = await applyUserPreferences(blocks, preferences, 'generated', 'vespers', 'en');
    assert.equal(result.blocks[0].lang, 'la');
    assert.match(result.blocks[0].content, /Magníficat/);
  } finally { globalThis.fetch = originalFetch; }
});

/**
 * The candidates arrive from `populateGabc` in the order the book prefers —
 * the day's own section first — so the antiphon sung is the first of them.
 * The feast below is the Nativity of the Blessed Virgin Mary, which falls
 * inside the twenty-third week of Ordinary Time: the selection used to hunt
 * for the label "Proper for Year", which only a *Sunday's* antiphon ever
 * carries, and so sang the previous Sunday's in place of the feast's own.
 */
test('the Gospel antiphon of the day is selected, not the week’s', async () => {
  const preferences = {
    ...DEFAULT_USER_PREFERENCES,
    gospelCanticles: { ...DEFAULT_USER_PREFERENCES.gospelCanticles, engine: 'none' as const },
  };
  const blocks: Block[] = [
    { id: 'h', type: 'heading', content: 'GOSPEL CANTICLE — MAGNIFICAT' },
    {
      id: 'a', type: 'antiphon', content: 'Antiphon',
      gabcCandidates: [
        { incipit: 'Gloriosæ Virginis Mariæ', gabc: 'feast', office: 'V', occasion: '8/9', source: 'OCO' },
        { incipit: 'Si duo ex vobis', gabc: 'sunday', office: 'V (Proper for Year A)', occasion: '23D', source: 'OCO' },
      ],
    },
  ];
  const result = await applyUserPreferences(blocks, preferences, 'generated', 'vespers', 'en');
  assert.equal(result.blocks[1].gabcScore, 'feast');
});

test('automatic stress-aware pointing applies saved full-text accent corrections', async () => {
  const originalFetch = globalThis.fetch;
  const plain = 'Our sóul has escaped like a bird. * The snare has been broken.';
  const corrected = 'Our sóul has escáped like a bírd. * The snáre has been bróken.';
  let pointedInput = '';
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url === '/api/accents') return new Response(JSON.stringify({
      version: 1, words: {}, texts: [{ accents: corrected, label: 'Psalm 124', updated: '2026-09-07' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const body = JSON.parse(String(init?.body || '{}'));
    if (body.action === 'variations') return new Response(JSON.stringify({ variations: ['a'] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    pointedInput = body.text;
    return new Response(JSON.stringify({ html: '<span>pointed</span>', warnings: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    const preferences = {
      ...DEFAULT_USER_PREFERENCES,
      psalms: { ...DEFAULT_USER_PREFERENCES.psalms, engine: 'lypsautierant' as const, family: 'english' as const },
    };
    const blocks: Block[] = [{
      id: 'p124', type: 'psalm', content: plain, originalContent: plain,
      psalmNumber: 124, lang: 'en', lypsautierantMode: 'eight', lypsautierantVariation: 'a',
    }];
    const result = await applyUserPreferences(blocks, preferences, 'generated', 'vespers', 'en');
    assert.equal(pointedInput, corrected);
    assert.equal(result.blocks[0].lypsautierantAccents, corrected);
    assert.equal(result.blocks[0].lypsautierantAccentsDerived, false);
  } finally { globalThis.fetch = originalFetch; }
});

/** A stub of the two pointing routes, recording what each was asked for. */
function stubPointing(extra: (url: string, body: Record<string, unknown>) => Response | null = () => null) {
  const calls: Record<string, unknown>[] = [];
  const json = (value: unknown) => new Response(JSON.stringify(value), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
  const original = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, ...body });
    const override = extra(url, body);
    if (override) return override;
    if (url === '/api/accents') return json({ version: 1, words: {}, texts: [] });
    // The two ordinary routes answer with nothing by default: a test about
    // pointing should not have to say that its office wants no chant.
    if (url === '/api/chanted-ordinary') return json({ gabc: {}, missing: [] });
    if (url.startsWith('/api/sunday-collect')) return json({ prayer: null, week: null });
    if (url === '/api/tone-creator' && !init) return json({ tones: [{ version: 1, id: 'mine', name: 'My tone', backend: 'lyps', clef: 'c4', examples: {} }] });
    if (url === '/api/tone-creator') return json({ html: '<span>created</span>', gabc: '' });
    if (body.action === 'variations') return json({ variations: ['a', 'b', 'b_prime'] });
    if (url === '/api/lypsautierant') return json({ html: '<span>stressed</span>', warnings: [] });
    if (url === '/api/psalm-tone') return json({ result: 'Verse óne * pointed.\nVerse twó * pointed.', gabcScore: '(c4) Verse(f) one(g)' });
    throw new Error(`unexpected request: ${url}`);
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const gregorianPsalm = (over: Partial<Block> = {}): Block => ({
  id: 'p', type: 'psalm', content: 'Verse one * unpointed.\nVerse two * unpointed.',
  originalContent: 'Verse one * unpointed.\nVerse two * unpointed.',
  psalmNumber: 23, lang: 'en', psalmTone: '8.', psalmVariant: 'G', ...over,
});

test('a Gregorian default engraves the first verse instead of only pointing it', async () => {
  const stub = stubPointing();
  try {
    const result = await applyUserPreferences([gregorianPsalm()], gregorianDefaults, 'generated', 'vespers', 'en');
    assert.equal(result.errors.length, 0);
    // The first verse becomes a chant block carrying the score, exactly as
    // applying the tone in the editor does, and the rest of the psalm follows.
    assert.equal(result.blocks.length, 2);
    assert.equal(result.blocks[0].type, 'antiphon');
    assert.equal(result.blocks[0].gabcScore, '(c4) Verse(f) one(g)');
    assert.equal(result.blocks[0].content, 'Verse óne * pointed.');
    assert.equal(result.blocks[1].type, 'psalm');
    assert.equal(result.blocks[1].gabcScore, undefined);
    assert.equal(result.blocks[1].content, 'Verse twó * pointed.');
    assert.notEqual(result.blocks[1].id, result.blocks[0].id);
  } finally { stub.restore(); }
});

test('a Gospel canticle set to a Gregorian tone is engraved too', async () => {
  const stub = stubPointing();
  try {
    const blocks = [gregorianPsalm({ id: 'm', psalmNumber: 'Magnificat', content: 'My sóul * proclaims.\nFor hé * has looked.' })];
    const result = await applyUserPreferences(blocks, DEFAULT_USER_PREFERENCES, 'generated', 'vespers', 'en');
    assert.equal(result.blocks[0].gabcScore, '(c4) Verse(f) one(g)');
  } finally { stub.restore(); }
});

test('the Gospel canticles keep the simple mediant unless it is asked for', async () => {
  const stub = stubPointing();
  try {
    const blocks = [gregorianPsalm({ id: 'm', psalmNumber: 'Magnificat' })];
    const result = await applyUserPreferences(blocks, DEFAULT_USER_PREFERENCES, 'generated', 'vespers', 'en');
    assert.equal(result.blocks[0].solemnTone, false);
    assert.equal(stub.calls.find(call => call.url === '/api/psalm-tone')?.solemn, false);

    const solemn = {
      ...DEFAULT_USER_PREFERENCES,
      gospelCanticles: { ...DEFAULT_USER_PREFERENCES.gospelCanticles, solemnTone: true },
    };
    const sung = await applyUserPreferences(blocks, solemn, 'generated', 'vespers', 'en');
    assert.equal(sung.blocks[0].solemnTone, true);
    assert.equal(stub.calls.filter(call => call.url === '/api/psalm-tone').at(-1)?.solemn, true);
  } finally { stub.restore(); }
});

test('the psalms keep the simple mediant unless it is asked for', async () => {
  const stub = stubPointing();
  try {
    const result = await applyUserPreferences([gregorianPsalm()], gregorianDefaults, 'generated', 'vespers', 'en');
    assert.equal(result.blocks[0].solemnTone, false);

    const solemn = { ...gregorianDefaults, psalms: { ...gregorianDefaults.psalms, solemnTone: true } };
    const sung = await applyUserPreferences([gregorianPsalm()], solemn, 'generated', 'vespers', 'en');
    assert.equal(sung.blocks[0].solemnTone, true);
  } finally { stub.restore(); }
});

test('a one-verse psalm is engraved without an empty block after it', async () => {
  const stub = stubPointing((url) => url === '/api/psalm-tone'
    ? new Response(JSON.stringify({ result: 'Only vérse * pointed.', gabcScore: '(c4) Only(f)' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    : null);
  try {
    const result = await applyUserPreferences([gregorianPsalm({ content: 'Only verse * unpointed.', originalContent: 'Only verse * unpointed.' })], gregorianDefaults, 'generated', 'vespers', 'en');
    assert.equal(result.blocks.length, 1);
    assert.equal(result.blocks[0].gabcScore, '(c4) Only(f)');
  } finally { stub.restore(); }
});

test('a verse iBreviary broke after its asterisk is engraved whole', async () => {
  // The office was imported in Latin, so the canticle keeps iBreviary's own
  // words and iBreviary's own line breaks: verse one runs to two lines. All
  // of it belongs under the score, and the rest of the canticle must start
  // at verse two rather than at the orphaned second half of verse one.
  const stub = stubPointing((url) => url === '/api/psalm-tone'
    ? new Response(JSON.stringify({
      result: '<strong>Magní</strong>ficat *\n   ánima mea <strong>Dó</strong>minum,\net exsultávit *\n   in Deo salvatóre meo,',
      gabcScore: '(c4) Ma(g)gní(hg)fi(gj)cat(j.)',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    : null);
  try {
    const content = 'Magníficat*\n   ánima mea Dóminum,\net exsultávit*\n   in Deo salvatóre meo,';
    const blocks = [gregorianPsalm({ id: 'm', psalmNumber: 'Magnificat', lang: 'la', content, originalContent: content })];
    const result = await applyUserPreferences(blocks, DEFAULT_USER_PREFERENCES, 'generated', 'vespers', 'la');
    assert.equal(result.errors.length, 0);
    assert.equal(result.blocks.length, 2);
    assert.equal(result.blocks[0].content, '<strong>Magní</strong>ficat *\n   ánima mea <strong>Dó</strong>minum,');
    assert.equal(result.blocks[0].originalContent, 'Magníficat*\n   ánima mea Dóminum,');
    assert.equal(result.blocks[1].content, 'et exsultávit *\n   in Deo salvatóre meo,');
    assert.equal(result.blocks[1].originalContent, 'et exsultávit*\n   in Deo salvatóre meo,');
  } finally { stub.restore(); }
});

test('an override sends one tone to the stress-aware engine and leaves the rest alone', async () => {
  const stub = stubPointing();
  try {
    const preferences = {
      ...gregorianDefaults,
      psalmToneOverrides: {
        '8.|G': { enabled: true, engine: 'lypsautierant' as const, family: 'english' as const, mode: 'eight', variation: 'b' },
      },
    };
    const blocks = [gregorianPsalm({ id: 'over' }), gregorianPsalm({ id: 'plain', psalmVariant: 'c' })];
    const result = await applyUserPreferences(blocks, preferences, 'generated', 'vespers', 'en');
    assert.equal(result.errors.length, 0);
    // 8G was overridden; 8c still went to the Gregorian default and split.
    assert.equal(result.blocks[0].content, '<span>stressed</span>');
    assert.equal(result.blocks[0].lypsautierantMode, 'eight');
    assert.equal(result.blocks[1].gabcScore, '(c4) Verse(f) one(g)');
    const pointed = stub.calls.filter(call => call.action === 'point' && call.url === '/api/lypsautierant');
    assert.equal(pointed.length, 1);
    assert.equal(pointed[0].variation, 'b');
  } finally { stub.restore(); }
});

test('an override to a Gregorian tone bypasses the engine and the antiphon’s own tone', async () => {
  const stub = stubPointing();
  try {
    const preferences = {
      ...DEFAULT_USER_PREFERENCES,
      psalms: { ...DEFAULT_USER_PREFERENCES.psalms, engine: 'simple' as const },
      psalmToneOverrides: {
        '8.|G': { enabled: true, engine: 'gregorian' as const, tone: '1.', variant: 'D' },
      },
    };
    const result = await applyUserPreferences([gregorianPsalm()], preferences, 'generated', 'vespers', 'en');
    const call = stub.calls.find(item => item.url === '/api/psalm-tone');
    assert.equal(call?.tone, '1.');
    assert.equal(call?.variant, 'D');
    assert.equal(result.blocks[0].psalmTone, '1.');
    assert.equal(result.blocks[0].psalmVariant, 'D');
  } finally { stub.restore(); }
});

test('an override can put a designed tone in place of what the family sings', async () => {
  const stub = stubPointing();
  try {
    const preferences = {
      ...DEFAULT_USER_PREFERENCES,
      psalmToneOverrides: {
        '8.|G': { enabled: true, engine: 'created' as const, createdToneId: 'mine', createdToneName: 'My tone' },
      },
    };
    const result = await applyUserPreferences([gregorianPsalm()], preferences, 'generated', 'vespers', 'en');
    assert.equal(result.errors.length, 0);
    assert.equal(result.blocks[0].content, '<span>created</span>');
    assert.equal(result.blocks[0].createdTone?.id, 'mine');
  } finally { stub.restore(); }
});

test('an override naming a deleted tone is reported rather than silently re-pointed', async () => {
  const stub = stubPointing();
  try {
    const preferences = {
      ...DEFAULT_USER_PREFERENCES,
      psalmToneOverrides: {
        '8.|G': { enabled: true, engine: 'created' as const, createdToneId: 'gone', createdToneName: 'Old tone' },
      },
    };
    const result = await applyUserPreferences([gregorianPsalm()], preferences, 'generated', 'vespers', 'en');
    assert.equal(result.blocks.length, 1);
    assert.match(result.errors[0], /Old tone/);
    assert.equal(result.blocks[0].gabcScore, undefined);
  } finally { stub.restore(); }
});

test('a disabled override leaves the chosen engine in force', async () => {
  const stub = stubPointing();
  try {
    const preferences = {
      ...gregorianDefaults,
      psalmToneOverrides: {
        '8.|G': { enabled: false, engine: 'created' as const, createdToneId: 'mine' },
      },
    };
    const result = await applyUserPreferences([gregorianPsalm()], preferences, 'generated', 'vespers', 'en');
    assert.equal(result.blocks[0].gabcScore, '(c4) Verse(f) one(g)');
    assert.equal(stub.calls.some(call => call.url === '/api/tone-creator'), false);
  } finally { stub.restore(); }
});

test('a ferial weekday says the Sunday collect in place of the psalter’s prayer', async () => {
  const stub = stubPointing((url) => url.startsWith('/api/sunday-collect')
    ? new Response(JSON.stringify({ prayer: 'Father, may everything we do…', week: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    : null);
  try {
    const blocks: Block[] = [
      { id: 'h', type: 'heading', content: 'CONCLUDING PRAYER' },
      { id: 'p', type: 'text', content: 'God our Father, hear our morning prayer…' },
    ];
    const result = await applyUserPreferences(blocks, DEFAULT_USER_PREFERENCES, 'ibreviary', 'lauds', 'en', '2026-01-21');
    assert.equal(result.blocks[1].content, 'Father, may everything we do…');
    assert.equal(result.errors.length, 0);
    // The day and the hour decide it, so both are asked for.
    const asked = stub.calls.find(call => String(call.url).startsWith('/api/sunday-collect'));
    assert.match(String(asked?.url), /date=2026-01-21/);
    assert.match(String(asked?.url), /hour=lauds/);
  } finally { stub.restore(); }
});

test('a day with no Sunday collect to say keeps the prayer it came with', async () => {
  const stub = stubPointing((url) => url.startsWith('/api/sunday-collect')
    ? new Response(JSON.stringify({ prayer: null, week: null }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    : null);
  try {
    const blocks: Block[] = [
      { id: 'h', type: 'heading', content: 'CONCLUDING PRAYER' },
      { id: 'p', type: 'text', content: 'The proper collect of this feast.' },
    ];
    const result = await applyUserPreferences(blocks, DEFAULT_USER_PREFERENCES, 'ibreviary', 'lauds', 'en', '2026-01-25');
    assert.equal(result.blocks[1].content, 'The proper collect of this feast.');
    assert.equal(result.errors.length, 0);
  } finally { stub.restore(); }
});

test('the sung ordinary reaches the office, and its failure is reported not swallowed', async () => {
  const score = '(c3)De(h)us(h) (::)';
  const ok = stubPointing((url) => {
    if (url === '/api/chanted-ordinary') return new Response(JSON.stringify({ gabc: { [DEFAULT_USER_PREFERENCES.chantedOrdinary.introduction]: score }, missing: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (url.startsWith('/api/sunday-collect')) return new Response(JSON.stringify({ prayer: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return null;
  });
  const blocks: Block[] = [
    { id: 'h', type: 'heading', content: 'INTRODUCTION' },
    { id: 'i', type: 'text', content: 'God, come to my assistance.' },
  ];
  try {
    const result = await applyUserPreferences(blocks, DEFAULT_USER_PREFERENCES, 'generated', 'vespers', 'en', '2026-01-21');
    assert.equal(result.blocks[1].type, 'antiphon');
    assert.equal(result.blocks[1].gabcScore, score);
    assert.equal(result.errors.length, 0);
  } finally { ok.restore(); }

  const broken = stubPointing((url) => {
    if (url === '/api/chanted-ordinary') return new Response(JSON.stringify({ error: 'no cache' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    if (url.startsWith('/api/sunday-collect')) return new Response(JSON.stringify({ prayer: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    return null;
  });
  try {
    const result = await applyUserPreferences(blocks, DEFAULT_USER_PREFERENCES, 'generated', 'vespers', 'en', '2026-01-21');
    assert.equal(result.blocks[1].type, 'text');
    assert.match(result.errors[0], /sung ordinary/);
  } finally { broken.restore(); }
});
