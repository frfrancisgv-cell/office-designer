import type {
  Block, OverrideEngine, PointingEngine, PsalmPointingPreference, PsalmToneOverride, UserPreferences,
} from './types';
import type { CreatedTone } from './psalm-tones/creator';
import { autoPointPsalm } from '@/components/psalm-utils';
import { getVariants } from './psalm-tones/tone-data';
import {
  applyStructureTemplate, filterIBreviarySections, filterOfficeBlocks, isGospelCanticle,
  psalmToneOverrideFor, sectionForHeading,
} from './user-preferences';
import { applyChantedOrdinary, ORDINARY_PART_LABELS } from './chanted-ordinary';
import { stripPointing } from './psalm-tones/strip';
import { firstVerseRange } from './psalm-tones/first-verse';
import { propagateTones } from './psalm-tones/propagate';
import { accentuateEnglish } from './psalm-tones/english-phonetic';
import {
  EMPTY_CORRECTIONS,
  findSavedAccents,
  parseCorrections,
  wordAccentMap,
  type AccentCorrections,
} from './psalm-tones/accent-corrections';

type LoadSource = 'ibreviary' | 'generated';

const MODE_NAMES: Record<string, string> = {
  '1.': 'one', '2.': 'two', '2. monasticus': 'two', '3.': 'three', '3. antiquo': 'three',
  '4.': 'four', '4. antiquo': 'four', '4. alt': 'four', '4. antiquo alt': 'four',
  '5.': 'five', '6.': 'six', '6. alt': 'six', '7.': 'seven', '8.': 'eight',
  'per.': 'peregrinus', 'per.-alt': 'peregrinus',
};

async function responseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body?.error) return String(body.error);
  } catch { /* use the status below */ }
  return `HTTP ${response.status} ${response.statusText}`;
}

/**
 * The first verse as an engraved score of its own — what applying a Gregorian
 * tone in the editor does, done for a tone chosen in the preferences.
 *
 * `/api/psalm-tone` has always returned a `gabcScore` for the first verse
 * alongside the pointed text, and `useBlockPointing` has always split the
 * block on it: the first verse becomes a chant block carrying the score, with
 * its pointed text under it, and the rest of the psalm follows in a block of
 * its own. This path ignored the score, so a Gregorian tone set as a default —
 * the Magnificat's, most visibly — printed the whole psalm as pointed text
 * with no notation anywhere.
 *
 * The first block is typed `antiphon` because that is the only psalm-side
 * block type `BlockEditor` renders as score *and* text; a `psalm` block
 * carrying a `gabcScore` renders the score alone and the verse's words would
 * be lost. `printTranslation` is deliberately left unset: the text under this
 * score is the verse itself, not a translation, and must print whatever the
 * translation switch says.
 */
function splitFirstVerse(block: Block, pointed: string, gabcScore: string, baseText: string): Block[] {
  const lines = pointed.split('\n');
  const verse = firstVerseRange(pointed);
  if (!gabcScore || !verse) return [{ ...block, content: pointed }];

  // The verse is found again in the unpointed words rather than assumed to
  // sit on the same lines: the two agree today, and this costs nothing if
  // one of them ever stops agreeing.
  const baseLines = baseText.split('\n');
  const baseVerse = firstVerseRange(baseText);
  const outside = (range: { start: number; end: number }) =>
    (_: string, index: number) => index < range.start || index >= range.end;

  const first: Block = {
    ...block,
    type: 'antiphon',
    content: lines.slice(verse.start, verse.end).join('\n'),
    originalContent: baseVerse ? baseLines.slice(baseVerse.start, baseVerse.end).join('\n') : baseText,
    gabcScore,
  };

  const rest = lines.filter(outside(verse)).join('\n');
  if (!rest.trim()) return [first];
  return [first, {
    ...block,
    id: `${block.id}-rest`,
    content: rest,
    originalContent: baseVerse ? baseLines.filter(outside(baseVerse)).join('\n') : baseText,
    gabcScore: undefined,
  }];
}

/**
 * `solemn` comes from the profile the block was pointed under — the Gospel
 * canticles' or the psalms' — rather than from the block itself. It used to
 * be `isGospelCanticle(block)`, which is the same answer with the settings as
 * they ship and no answer at all to a house that sings the Benedictus to the
 * simple mediant.
 */
async function pointGregorian(
  block: Block, profile: PsalmPointingPreference, override?: PsalmToneOverride,
): Promise<Block[]> {
  const tone = override?.tone || block.psalmTone || '8.';
  const validVariants = getVariants(tone);
  const requestedVariant = (override ? override.variant : block.psalmVariant) || '';
  const variant = validVariants.includes(requestedVariant) ? requestedVariant : (validVariants[0] ?? '');
  const solemn = profile.solemnTone;
  const originalContent = block.originalContent || stripPointing(block.content);
  const response = await fetch('/api/psalm-tone', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'point', text: originalContent, tone, variant, solemn, lang: block.lang || 'en' }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json();
  if (!data.result) throw new Error('The Gregorian pointing service returned no text.');
  const pointed = { ...block, originalContent, psalmTone: tone, psalmVariant: variant, solemnTone: solemn };
  return splitFirstVerse(pointed, data.result, String(data.gabcScore || ''), originalContent);
}

async function pointLypsautierant(
  block: Block,
  profile: PsalmPointingPreference,
  corrections: AccentCorrections,
  override?: PsalmToneOverride,
): Promise<Block> {
  const tone = block.psalmTone || '8.';
  const family = override?.family
    ?? (profile.family === 'auto' ? (block.lypsautierantFamily || 'english') : profile.family);
  const mode = override?.mode || block.lypsautierantMode || MODE_NAMES[tone] || 'eight';
  let variation = override?.variation || block.lypsautierantVariation || '';
  const variationsResponse = await fetch('/api/lypsautierant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'variations', family, mode }),
  });
  if (!variationsResponse.ok) throw new Error(await responseError(variationsResponse));
  const variations = (await variationsResponse.json()).variations as string[];
  if (!variations.includes(variation)) variation = variations[0] || '';
  if (!variation) throw new Error(`${family}/${mode} has no available ending.`);

  const originalContent = block.originalContent || stripPointing(block.content);
  const readsAccents = family === 'english' || family === 'gregorian';
  const saved = readsAccents ? findSavedAccents(corrections, originalContent) : null;
  const alreadyAccented = /[áéíóúýÁÉÍÓÚÝ]/.test(originalContent);
  const pointingText = !readsAccents || block.lang === 'la'
    ? originalContent
    : block.lypsautierantAccents
      || saved?.accents
      || (alreadyAccented ? originalContent : accentuateEnglish(originalContent, wordAccentMap(corrections)));
  const accentsDerived = readsAccents && block.lang !== 'la' && !block.lypsautierantAccents && !saved && !alreadyAccented;
  const response = await fetch('/api/lypsautierant', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'point', text: pointingText, family, mode, variation, lang: block.lang || 'en' }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json();
  if (!data.html) throw new Error('The stress-aware pointing service returned no text.');
  return {
    ...block, content: data.html, originalContent, gabcScore: undefined,
    lypsautierantFamily: family, lypsautierantMode: mode, lypsautierantVariation: variation,
    ...(readsAccents && block.lang !== 'la' ? {
      lypsautierantAccents: pointingText,
      lypsautierantAccentsDerived: accentsDerived,
    } : {}),
  };
}

/**
 * Point a psalm with a tone designed in the Psalm Tone Creator.
 *
 * The same round-trip `BlockEditor`'s "Apply" makes, including reading the
 * accent-corrected text first: the lyps-backed tones find their cadences by
 * the acutes, exactly as the creator's own preview does. A `lyps` tone answers
 * with pointed HTML and no score, a `jgabc` one with a score for the whole
 * psalm and no HTML — which is why the score is taken as it comes rather than
 * split like the Gregorian one.
 */
async function pointCreatedTone(block: Block, tone: CreatedTone): Promise<Block> {
  const text = stripPointing(block.lypsautierantAccents || block.originalContent || block.content);
  const response = await fetch('/api/tone-creator', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'preview', tone, text, lang: block.lang || 'en' }),
  });
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json();
  return {
    ...block,
    createdTone: tone,
    originalContent: text,
    content: data.html || text,
    gabcScore: data.gabc || undefined,
  };
}

/**
 * Which engine actually points one psalm: the override for its tone where
 * there is one, and otherwise the engine chosen for psalms or for the Gospel
 * canticles. An override names the tone as well, so it bypasses the choice
 * entirely rather than merely re-pointing it.
 */
function effectiveEngine(
  preferences: UserPreferences, block: Block,
): { engine: PointingEngine | OverrideEngine; override?: PsalmToneOverride } {
  const override = psalmToneOverrideFor(preferences, block);
  if (override) return { engine: override.engine, override };
  return { engine: isGospelCanticle(block) ? preferences.gospelCanticles.engine : preferences.psalms.engine };
}

/** The saved tone library, read once for whichever overrides need it. */
async function loadCreatedTones(): Promise<Map<string, CreatedTone>> {
  const response = await fetch('/api/tone-creator');
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json();
  const tones = (data.tones ?? []) as CreatedTone[];
  return new Map(tones.map(tone => [tone.id, tone]));
}

function preferredLanguage(profile: PsalmPointingPreference, officeLanguage: UserPreferences['defaultLanguage']): 'en' | 'la' | null {
  if (profile.language === 'en' || profile.language === 'la') return profile.language;
  return officeLanguage === 'en' || officeLanguage === 'la' ? officeLanguage : null;
}

async function loadPreferredText(block: Block, profile: PsalmPointingPreference, officeLanguage: UserPreferences['defaultLanguage']): Promise<Block> {
  const lang = preferredLanguage(profile, officeLanguage);
  if (!lang) throw new Error('Choose English or Latin for automatic pointing when the office language is not English or Latin.');
  const needsReplacement = profile.language !== 'office' && lang !== officeLanguage;
  if (!needsReplacement && (!block.lang || block.lang === lang)) return { ...block, lang };
  if (!block.psalmNumber) throw new Error('This block has no psalm or canticle reference for loading its preferred language.');
  const query = new URLSearchParams({ psalm: String(block.psalmNumber) });
  if (lang === 'la') query.set('collection', 'jgabc');
  const response = await fetch(`/api/psalm-text?${query.toString()}`);
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json();
  if (!data.rawText) throw new Error(`No ${lang === 'la' ? 'Latin' : 'English'} text was returned.`);
  return {
    ...block,
    content: data.rawText,
    originalContent: data.rawText,
    ibreviaryContent: block.ibreviaryContent || stripPointing(block.content),
    lang,
    lypsautierantAccents: undefined,
    lypsautierantAccentsDerived: undefined,
  };
}

/**
 * Sing the Gospel-canticle antiphon the day appoints, rather than leaving the
 * choice standing.
 *
 * The first candidate is the one taken, because that is the order the lookup
 * puts them in: the day's own section first, and within the Sunday's, the
 * proper for this year's cycle ahead of the generic and the *ad libitum*. It
 * used to hunt instead for the label "Proper for Year", which read as though
 * it meant "the proper one" and did not: that label is only ever on a
 * *Sunday's* antiphon, so on a feast inside the week — the Nativity of the
 * Blessed Virgin Mary, whose Magnificat antiphon is its own — it reached past
 * the day's antiphon to take the previous Sunday's.
 */
function selectProperGospelAntiphons(blocks: Block[]): Block[] {
  let inGospelCanticle = false;
  return blocks.map(block => {
    if (block.type === 'heading') inGospelCanticle = /GOSPEL CANTICLE|MAGNIFICAT|BENEDICTUS|NUNC DIMITTIS/i.test(block.content);
    if (!inGospelCanticle || block.type !== 'antiphon' || !block.gabcCandidates?.length || block.gabcScore) return block;
    const appointed = block.gabcCandidates[0];
    return appointed?.gabc ? { ...block, gabcScore: appointed.gabc } : block;
  });
}

/**
 * Say the week's Sunday collect in place of the prayer the office came with.
 *
 * The block is the office's own — only its words change — so a collect that
 * arrived from iBreviary's page and one the offline engine read out of the
 * psalter are replaced the same way. `originalContent` is left alone: it is
 * the pointing baseline for psalms and means nothing on a prayer.
 */
function withSundayCollect(blocks: Block[], prayer: string): { blocks: Block[]; replaced: boolean } {
  let inSection = false;
  let replaced = false;
  const out = blocks.map(block => {
    if (block.type === 'heading') {
      inSection = sectionForHeading(block.content) === 'concluding-prayer';
      return block;
    }
    if (!inSection || replaced || block.type !== 'text' || !block.content.trim()) return block;
    replaced = true;
    return { ...block, content: prayer };
  });
  return { blocks: out, replaced };
}

/** The Sunday collect for this day and hour, or null where none is called for. */
async function loadSundayCollect(date: string, hour: string): Promise<string | null> {
  const query = new URLSearchParams({ date, hour });
  const response = await fetch(`/api/sunday-collect?${query.toString()}`);
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json();
  return typeof data.prayer === 'string' && data.prayer ? data.prayer : null;
}

/** The GABC of every setting in the sung-ordinary catalogue, keyed by its id. */
async function loadOrdinaryChants(): Promise<Record<string, string>> {
  const response = await fetch('/api/chanted-ordinary');
  if (!response.ok) throw new Error(await responseError(response));
  const data = await response.json();
  return (data.gabc ?? {}) as Record<string, string>;
}

export interface AppliedPreferences {
  blocks: Block[];
  errors: string[];
}

/** Apply browser preferences after either office source has produced blocks. */
export async function applyUserPreferences(
  input: Block[], preferences: UserPreferences, _source: LoadSource, hour?: string,
  officeLanguage: UserPreferences['defaultLanguage'] = preferences.defaultLanguage,
  date?: string,
): Promise<AppliedPreferences> {
  const template = hour ? preferences.structureTemplates[hour] : undefined;
  const included = filterIBreviarySections(input, preferences.ibreviarySections);
  const structured = applyStructureTemplate(included, template);
  // The hour's saved structure carries its own block-level switches, read off
  // the office the user arranged; where it has none the general ones stand.
  const filtered = filterOfficeBlocks(structured, preferences, template);
  let prepared = filtered.map(block => ({
    ...block,
    ...(['antiphon', 'invitatory-antiphon', 'hymn'].includes(block.type)
      ? { printTranslation: preferences.showTranslations } : {}),
  }));
  if (preferences.selectProperGospelAntiphon) prepared = propagateTones(selectProperGospelAntiphons(prepared));

  const errors: string[] = [];

  // ── The ordinary: the day's collect and the three sung parts ──────────────
  // Both read from the server and neither depends on the other, so they go out
  // together; each failure is reported and leaves that part of the office as
  // it was rather than stopping the load.
  const wantsChant = Object.values(preferences.chantedOrdinary).some(Boolean);
  const [collect, chants] = await Promise.all([
    preferences.sundayCollectOnFerials && date && hour
      ? loadSundayCollect(date, hour).catch(error => {
        errors.push(`The Sunday collect could not be read: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      })
      : Promise.resolve(null),
    wantsChant
      ? loadOrdinaryChants().catch(error => {
        errors.push(`The sung ordinary could not be read: ${error instanceof Error ? error.message : String(error)}`);
        return {} as Record<string, string>;
      })
      : Promise.resolve({} as Record<string, string>),
  ]);

  if (collect) {
    const applied = withSundayCollect(prepared, collect);
    if (applied.replaced) prepared = applied.blocks;
    else errors.push('This office has no concluding prayer for the Sunday collect to replace.');
  }
  if (Object.keys(chants).length && hour !== 'compline') {
    const result = applyChantedOrdinary(
      prepared, preferences.chantedOrdinary, chants, officeLanguage, preferences.showTranslations, hour,
    );
    prepared = result.blocks;
    // Only the total miss is worth saying. An hour without one of the three is
    // the ordinary's own shape — Lauds opens with the invitatory rather than
    // *Deus in adiutórium*, and only Lauds and Vespers say the Lord's Prayer —
    // and reporting each of those turned every Terce into a page of errors.
    if (!result.sung.length) {
      errors.push('None of this office\u2019s introduction, Lord\u2019s Prayer or dismissal could be found, so none of them is sung.');
    }
  }

  // What each psalm will be pointed by, decided once: the accent corrections
  // and the created-tone library are each fetched only if something needs
  // them, and an override can put a tone in play that the general defaults
  // never named.
  const engines = new Map(prepared.map(block => [block.id, effectiveEngine(preferences, block)]));
  const pointable = prepared.filter(block => block.type === 'psalm' && !block.gabcScore);

  let corrections = EMPTY_CORRECTIONS;
  if (pointable.some(block => engines.get(block.id)?.engine === 'lypsautierant')) {
    try {
      const response = await fetch('/api/accents');
      if (!response.ok) throw new Error(await responseError(response));
      corrections = parseCorrections(await response.json());
    } catch (error) {
      errors.push(`Saved word stresses could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let createdTones = new Map<string, CreatedTone>();
  if (pointable.some(block => engines.get(block.id)?.engine === 'created')) {
    try {
      createdTones = await loadCreatedTones();
    } catch (error) {
      errors.push(`The saved tone library could not be read: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const pointed = await Promise.all(prepared.map(async (block): Promise<Block[]> => {
    if (block.type !== 'psalm' || block.gabcScore) return [block];
    const profile = isGospelCanticle(block) ? preferences.gospelCanticles : preferences.psalms;
    const { engine, override } = engines.get(block.id) ?? { engine: profile.engine };
    try {
      // The language stays the profile's: an override names a tone, not a
      // psalter, and the psalm is still sung in the office's own language.
      const localized = await loadPreferredText(block, profile, officeLanguage);
      if (engine === 'none') return [localized];
      if (engine === 'gregorian') return await pointGregorian(localized, profile, override);
      if (engine === 'lypsautierant') return [await pointLypsautierant(localized, profile, corrections, override)];
      if (engine === 'created') {
        const tone = override?.createdToneId ? createdTones.get(override.createdToneId) : undefined;
        if (!tone) {
          // Deliberately not "was deleted": the library may simply have
          // failed to load, and that failure is already reported above.
          const name = override?.createdToneName ? `"${override.createdToneName}"` : 'the tone it names';
          throw new Error(`the override for this tone could not be sung — ${name} is not in the saved tone library.`);
        }
        return [await pointCreatedTone(localized, tone)];
      }
      const originalContent = localized.originalContent || stripPointing(localized.content);
      return [{ ...localized, originalContent, content: autoPointPsalm(originalContent, profile.simplePreparations), gabcScore: undefined }];
    } catch (error) {
      errors.push(`${block.psalmNumber || 'Psalm'}: ${error instanceof Error ? error.message : String(error)}`);
      return [block];
    }
  }));
  return { blocks: pointed.flat(), errors };
}
