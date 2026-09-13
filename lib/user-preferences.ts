import type {
  Block, ChantedOrdinaryPreference, IbreviarySection, OfficeBlockVisibility, OfficeStructureTemplate,
  OverrideEngine, PointingFamily, PsalmToneOverride, UserPreferences,
} from './types';
import { PSALM_TONES, getVariants } from './psalm-tones/tone-data';

export const USER_PREFERENCES_KEY = 'office-designer:user-preferences:v1';

export const IBREVIARY_SECTION_LABELS: Record<IbreviarySection, string> = {
  introduction: 'Introduction',
  invitatory: 'Invitatory',
  hymn: 'Hymn',
  psalmody: 'Psalmody',
  reading: 'Readings',
  responsory: 'Responsories',
  'gospel-canticle': 'Gospel Canticle',
  intercessions: 'Intercessions',
  'lords-prayer': "Lord's Prayer",
  'concluding-prayer': 'Concluding Prayer',
  dismissal: 'Dismissal',
};

export const BLOCK_VISIBILITY_LABELS: Record<keyof OfficeBlockVisibility, string> = {
  metadata: 'Date and office labels',
  rubrics: 'Rubrics',
  psalmPrayers: 'Psalm prayers',
  repeatedAntiphons: 'Repeated antiphons',
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  version: 1,
  defaultLanguage: 'en',
  showTranslations: true,
  psalms: { language: 'office', engine: 'lypsautierant', family: 'english', simplePreparations: 2, solemnTone: false },
  gospelCanticles: { language: 'office', engine: 'gregorian', family: 'auto', simplePreparations: 2, solemnTone: false },
  selectProperGospelAntiphon: true,
  sundayCollectOnFerials: true,
  // The ferial settings, which is what an ordinary weekday asks for; each part
  // is turned off by clearing its select.
  chantedOrdinary: { introduction: '4121', lordsPrayer: '8161', dismissal: '15741' },
  ibreviarySections: Object.fromEntries(
    Object.keys(IBREVIARY_SECTION_LABELS).map(key => [key, true]),
  ) as Record<IbreviarySection, boolean>,
  blockVisibility: { metadata: true, rubrics: true, psalmPrayers: true, repeatedAntiphons: true },
  psalmToneOverrides: {},
  structureTemplates: {},
};

/** Merge stored data defensively so additions to the schema get defaults. */
export function normalizeUserPreferences(value: unknown): UserPreferences {
  if (!value || typeof value !== 'object') return DEFAULT_USER_PREFERENCES;
  const raw = value as Partial<UserPreferences>;
  return {
    ...DEFAULT_USER_PREFERENCES,
    ...raw,
    version: 1,
    psalms: { ...DEFAULT_USER_PREFERENCES.psalms, ...(raw.psalms || {}) },
    gospelCanticles: { ...DEFAULT_USER_PREFERENCES.gospelCanticles, ...(raw.gospelCanticles || {}) },
    ibreviarySections: { ...DEFAULT_USER_PREFERENCES.ibreviarySections, ...(raw.ibreviarySections || {}) },
    blockVisibility: { ...DEFAULT_USER_PREFERENCES.blockVisibility, ...(raw.blockVisibility || {}) },
    psalmToneOverrides: normalizePsalmToneOverrides(raw.psalmToneOverrides),
    chantedOrdinary: normalizeChantedOrdinary(raw.chantedOrdinary),
    structureTemplates: normalizeStructureTemplates(raw.structureTemplates),
  };
}

/**
 * Templates come back from localStorage, where a half-written or hand-edited
 * entry would otherwise reach `applyStructureTemplate` and drop every section
 * of an office. Each one is checked down to its section names, and its block
 * visibility — absent in templates saved before it was recorded — is filled
 * out against the defaults so a later addition to the switch set gets one.
 */
function normalizeStructureTemplates(raw: unknown): Record<string, OfficeStructureTemplate> {
  if (!raw || typeof raw !== 'object') return {};
  const templates: Record<string, OfficeStructureTemplate> = {};
  for (const [hour, value] of Object.entries(raw as Record<string, unknown>)) {
    const template = value as Partial<OfficeStructureTemplate> | null;
    if (!template || typeof template !== 'object' || !Array.isArray(template.sectionOrder)) continue;
    templates[hour] = {
      sectionOrder: template.sectionOrder.filter(
        (section): section is IbreviarySection => section in IBREVIARY_SECTION_LABELS,
      ),
      ...(template.blockVisibility && typeof template.blockVisibility === 'object'
        ? { blockVisibility: { ...DEFAULT_USER_PREFERENCES.blockVisibility, ...template.blockVisibility } }
        : {}),
    };
  }
  return templates;
}

/**
 * The chosen settings of the sung ordinary.
 *
 * Only the shape is checked here. Whether an id is still one the catalogue
 * offers is settled where the score is looked up — a part whose id finds no
 * score is simply not sung — and checking it here would make this file import
 * the catalogue, which imports this one for the office's headings.
 */
function normalizeChantedOrdinary(raw: unknown): ChantedOrdinaryPreference {
  const stored = (raw && typeof raw === 'object' ? raw : {}) as Partial<ChantedOrdinaryPreference>;
  const id = (value: unknown, fallback: string) => typeof value === 'string' ? value : fallback;
  const defaults = DEFAULT_USER_PREFERENCES.chantedOrdinary;
  return {
    introduction: id(stored.introduction, defaults.introduction),
    lordsPrayer: id(stored.lordsPrayer, defaults.lordsPrayer),
    dismissal: id(stored.dismissal, defaults.dismissal),
  };
}

/**
 * The key an override row is filed under: the Gregorian tone and termination
 * the antiphon called for, exactly as the psalm block carries them.
 *
 * Tone and termination are kept apart by a separator rather than run together
 * as `8.G`, because a tone name may end in a letter of its own ("2.
 * monasticus") and a termination may be more than one character (`D-`, `a2`).
 */
export function psalmToneOverrideKey(tone: string, variant: string): string {
  return `${tone}|${variant}`;
}

export function parsePsalmToneOverrideKey(key: string): { tone: string; variant: string } {
  const at = key.indexOf('|');
  return at < 0 ? { tone: key, variant: '' } : { tone: key.slice(0, at), variant: key.slice(at + 1) };
}

/** "Tone 8 · G", for a row heading. */
export function describePsalmToneKey(key: string): string {
  const { tone, variant } = parsePsalmToneOverrideKey(key);
  const name = tone.replace(/\.$/, '');
  return variant ? `${name} · ${variant}` : name;
}

const OVERRIDE_ENGINES: OverrideEngine[] = ['gregorian', 'lypsautierant', 'created'];
const OVERRIDE_FAMILIES: PointingFamily[] = ['english', 'gregorian', 'modes', 'french'];

/**
 * Read the override table back from localStorage, dropping any row that could
 * not be sung.
 *
 * A row whose target is unusable is worse than no row at all: it silently
 * bypasses the chosen engine and then falls back inside the engine it named,
 * so the psalm comes out pointed to a tone nobody asked for. A row is kept
 * only where the fields its own engine reads are all present and known — the
 * Gregorian tone is in `PSALM_TONES` and carries the termination named, and
 * the lypsautierant family is one of the four books. The lypsautierant mode
 * and variation are not checked here: which variations a family and mode
 * define lives in the generated engine, which this file does not import, and
 * `pointLypsautierant` already refuses an unknown one.
 */
function normalizePsalmToneOverrides(raw: unknown): Record<string, PsalmToneOverride> {
  if (!raw || typeof raw !== 'object') return {};
  const overrides: Record<string, PsalmToneOverride> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const row = value as Partial<PsalmToneOverride> | null;
    if (!row || typeof row !== 'object') continue;
    if (!row.engine || !OVERRIDE_ENGINES.includes(row.engine)) continue;
    if (row.engine === 'gregorian') {
      if (!row.tone || !PSALM_TONES[row.tone]) continue;
      if (!getVariants(row.tone).includes(row.variant ?? '')) continue;
    }
    if (row.engine === 'lypsautierant') {
      if (!row.family || !OVERRIDE_FAMILIES.includes(row.family)) continue;
      if (!row.mode || !row.variation) continue;
    }
    if (row.engine === 'created' && !row.createdToneId) continue;
    overrides[key] = {
      enabled: row.enabled !== false,
      engine: row.engine,
      ...(row.tone ? { tone: row.tone } : {}),
      ...(row.variant !== undefined ? { variant: row.variant } : {}),
      ...(row.family && OVERRIDE_FAMILIES.includes(row.family) ? { family: row.family } : {}),
      ...(row.mode ? { mode: row.mode } : {}),
      ...(row.variation ? { variation: row.variation } : {}),
      ...(row.createdToneId ? { createdToneId: row.createdToneId } : {}),
      ...(row.createdToneName ? { createdToneName: row.createdToneName } : {}),
    };
  }
  return overrides;
}

/**
 * The override in force for one psalm block, if any.
 *
 * The match is on tone *and* termination together, which is the level the
 * user names them at: mode 1 with a D termination and mode 1 with a g are two
 * different cadences, and an override for one says nothing about the other.
 */
export function psalmToneOverrideFor(
  preferences: UserPreferences, block: Block,
): PsalmToneOverride | undefined {
  if (!block.psalmTone) return undefined;
  const row = preferences.psalmToneOverrides[psalmToneOverrideKey(block.psalmTone, block.psalmVariant ?? '')];
  return row?.enabled ? row : undefined;
}

/**
 * The label a psalm prayer is printed under, on its own line above the prayer.
 *
 * iBreviary writes it as a rubric — "Psalm Prayer" in English, and nothing at
 * all in the other languages it publishes — so it is both what tells the
 * import that the paragraph beneath it is a prayer rather than another verse,
 * and what has to go with the prayer when psalm prayers are turned off.
 * Without the second half a hidden prayer leaves its heading standing over
 * the antiphon that follows.
 *
 * Matched whole, against the rubric's entire text: a rubric that merely
 * mentions the words is a rubric about psalm prayers, not the label of one.
 */
export function isPsalmPrayerLabel(content: string): boolean {
  const text = content.replace(/<[^>]*>/g, '').trim().replace(/[.:\u2014-]+$/, '').trim();
  return /^(psalm[\s-]?prayer|oratio\s+super\s+psalmum|orazione\s+salmica|oraci[o\u00f3]n\s+s[a\u00e1]lmica|oraison\s+psalmique)$/i.test(text);
}

export function isGospelCanticle(block: Block): boolean {
  return /^(magnificat|benedictus|nunc\s+dimittis)$/i.test(String(block.psalmNumber || '').trim());
}

/** Recognise headings in all languages currently offered by iBreviary. */
export function sectionForHeading(content: string): IbreviarySection | null {
  const text = content.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/INVITATORY|INVITATORIUM|INVITATORIO/.test(text)) return 'invitatory';
  if (/GOSPEL CANTICLE|MAGNIFICAT|BENEDICTUS|NUNC DIMITTIS|CANTIQUE EVANGELIQUE|CANTICO EVANGELICO/.test(text)) return 'gospel-canticle';
  if (/PSALMODY|SALMODIA|PSALMODIE/.test(text)) return 'psalmody';
  if (/RESPONSORY|RESPONSORIUM|RESPONSORIO|REPONS/.test(text)) return 'responsory';
  if (/READING|LECTIO|LETTURA|LECTURE|LECTURA/.test(text)) return 'reading';
  if (/INTERCESSION|PRECES|INTERCESIONES/.test(text)) return 'intercessions';
  if (/OUR FATHER|LORD.?S PRAYER|PATER NOSTER|PADRE NOSTRO|PADRE NUESTRO|NOTRE PERE/.test(text)) return 'lords-prayer';
  if (/CONCLUDING PRAYER|ORATIO CONCLUSIVA|ORAZIONE CONCLUSIVA|ORACION CONCLUSIVA|PRIERE FINALE/.test(text)) return 'concluding-prayer';
  if (/DISMISSAL|CONCLUSIO|CONGEDO|DESPEDIDA|RENVOI/.test(text)) return 'dismissal';
  if (/HYMN|HYMNUS|INNO|HIMNO|HYMNE/.test(text)) return 'hymn';
  if (/INTRODUCTION|INTRODUZIONE|INTRODUCCION|INTRODUCTIO/.test(text)) return 'introduction';
  return null;
}

/** Remove disabled iBreviary sections, including every block under the heading. */
export function filterIBreviarySections(blocks: Block[], enabled: Record<IbreviarySection, boolean>): Block[] {
  let include = true;
  return blocks.filter(block => {
    if (block.type === 'heading') {
      const section = sectionForHeading(block.content);
      include = section ? enabled[section] !== false : true;
    }
    return include;
  });
}

/** The text of an antiphon, stripped to what makes two of them the same one. */
function antiphonKey(content: string): string {
  return content.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '');
}

/**
 * Read the block-level shape of an office off the office itself.
 *
 * Deleting blocks is how the shape of an office gets said in this app, so a
 * saved structure has to be able to hear it: an office saved with no psalm
 * prayers left in it wanted no psalm prayers, and one whose antiphons are
 * never printed twice wanted them printed once. Each switch is only ever read
 * as "this office had none", which is exactly what the switch does to a later
 * office — hide the ones it has — so an hour that never carries psalm prayers
 * in the first place is unaffected by the reading either way.
 */
export function visibilityFromBlocks(blocks: Block[]): OfficeBlockVisibility {
  const seenAntiphons = new Set<string>();
  let antiphonRepeats = false;
  for (const block of blocks) {
    if (block.type !== 'antiphon' && block.type !== 'invitatory-antiphon') continue;
    const key = antiphonKey(block.content);
    if (!key) continue;
    if (seenAntiphons.has(key)) antiphonRepeats = true;
    seenAntiphons.add(key);
  }
  return {
    metadata: blocks.some(block => block.type === 'subheading'),
    rubrics: blocks.some(block => block.type === 'rubric'),
    psalmPrayers: blocks.some(block => block.type === 'psalm-prayer'),
    repeatedAntiphons: antiphonRepeats,
  };
}

export function structureFromBlocks(blocks: Block[]): OfficeStructureTemplate {
  const sectionOrder: IbreviarySection[] = [];
  for (const block of blocks) {
    if (block.type !== 'heading') continue;
    const section = sectionForHeading(block.content);
    if (section && !sectionOrder.includes(section)) sectionOrder.push(section);
  }
  return { sectionOrder, blockVisibility: visibilityFromBlocks(blocks) };
}

/** Apply a saved per-hour set and order of recognised sections. */
export function applyStructureTemplate(blocks: Block[], template?: OfficeStructureTemplate): Block[] {
  if (!template?.sectionOrder.length) return blocks;
  const prefix: Block[] = [];
  const sections = new Map<IbreviarySection, Block[]>();
  let current: IbreviarySection | null = null;
  for (const block of blocks) {
    if (block.type === 'heading') current = sectionForHeading(block.content) || current;
    if (current) {
      const group = sections.get(current) || [];
      group.push(block);
      sections.set(current, group);
    } else prefix.push(block);
  }
  return [...prefix, ...template.sectionOrder.flatMap(section => sections.get(section) || [])];
}

/**
 * What the block-level switches say for one office: the hour's own saved
 * structure first, since it was read off an office the user arranged by hand
 * for that hour, and the general defaults where no structure is saved.
 */
export function effectiveBlockVisibility(
  preferences: UserPreferences, template?: OfficeStructureTemplate,
): OfficeBlockVisibility {
  return template?.blockVisibility ?? preferences.blockVisibility;
}

export function filterOfficeBlocks(
  blocks: Block[], preferences: UserPreferences, template?: OfficeStructureTemplate,
): Block[] {
  const visibility = effectiveBlockVisibility(preferences, template);
  const seenAntiphons = new Set<string>();
  return blocks.filter(block => {
    if (!visibility.metadata && block.type === 'subheading') return false;
    if (!visibility.rubrics && block.type === 'rubric') return false;
    if (!visibility.psalmPrayers
        && (block.type === 'psalm-prayer'
            || (block.type === 'rubric' && isPsalmPrayerLabel(block.content)))) return false;
    if (!visibility.repeatedAntiphons && (block.type === 'antiphon' || block.type === 'invitatory-antiphon')) {
      const key = antiphonKey(block.content);
      if (key && seenAntiphons.has(key)) return false;
      if (key) seenAntiphons.add(key);
    }
    return true;
  });
}
