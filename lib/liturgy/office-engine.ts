/**
 * Standalone Canonical Liturgical Office Structural Engine (GILH)
 *
 * Constructs the canonical sequence of Block objects for any Liturgical Hour:
 * - Lauds (Morning Prayer)
 * - Vespers (Evening Prayer)
 * - Compline (Night Prayer)
 * - Ora Media (Terce / Sext / None)
 * - Office of Readings
 *
 * Runs 100% offline using local data sources (psalter-schema, local psalms, GABC data).
 *
 * OCO (Ordo Cantus Officii) is the ground truth for psalm/canticle assignments.
 * GILH provides the structural rubrics.
 */

import { Block } from '@/lib/types';
import { PSALTER_SCHEMA, COMPLINE_PSALMS, MINOR_HOUR_PSALMS } from './data/psalter-schema';
import { getPsalmText, getCanticleText } from '@/lib/psalm-tones/psalm-index';
import { getProperHymn } from './data/hymns';
import fs from 'fs';
import path from 'path';

export interface OfficeSpec {
  date: Date;
  hour: 'lauds' | 'vespers' | 'compline' | 'terce' | 'sext' | 'none' | 'readings';
  lang?: 'en' | 'la';
  collection?: 'grail' | 'abbey';
  psalterWeek?: 1 | 2 | 3 | 4;
  rank?: 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'FERIAL';
  saintName?: string;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

// ── Local Latin Psalm Loader ──────────────────────────────────────────────────

function hebrewToVulgate(psalm: number | string): number {
  const n = parseInt(String(psalm).replace(/\D/g, ''), 10);
  if (isNaN(n)) return 1;
  if (n <= 8) return n;
  if (n >= 10 && n <= 113) return n - 1;
  if (n === 114 || n === 115) return 113;
  if (n === 116) return 114;
  if (n >= 117 && n <= 146) return n - 1;
  if (n === 147) return 146;
  if (n >= 148) return n;
  return n;
}

function getLocalLatinPsalmText(id: string): string | null {
  const vNum = hebrewToVulgate(id);
  const padded = String(vNum).padStart(3, '0') + '.txt';
  const filePath = path.join(process.cwd(), 'jgabc-psalms', padded);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  }
  return null;
}

function getLocalLatinCanticleText(id: string): string | null {
  // Check jgabc-psalms for named canticles
  const nameMappings: Record<string, string> = {
    'benedictus': 'Benedictus.txt',
    'magnificat': 'Magnificat.txt',
    'nunc-dimittis': 'Nunc dimittis.txt',
  };
  const lower = id.toLowerCase();
  const filename = nameMappings[lower];
  if (filename) {
    const p = path.join(process.cwd(), 'jgabc-psalms', filename);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').trim();
  }
  return null;
}

// ── Romcal Integration (with API-version resilience) ──────────────────────────

interface RomcalEvent {
  name: string;
  rank: 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'FERIAL';
  weekOfPsalter?: number;
}

function getRomcalEvent(date: Date): RomcalEvent | null {
  try {
    const romcal = require('romcal');
    const dateStr = date.toISOString().split('T')[0];

    // Try modern romcal API (v1.3+): romcal.calendarFor returns an array
    let events: any[] = [];

    if (typeof romcal.calendarFor === 'function') {
      const cal = romcal.calendarFor({ year: date.getUTCFullYear(), country: 'unitedStates' });
      if (Array.isArray(cal)) {
        events = cal.filter((d: any) => {
          // Support both .moment (old) and .date (new) fields
          const ds = d.moment || d.date || '';
          return String(ds).startsWith(dateStr);
        });
      }
    }

    if (events.length > 0) {
      const top = events[0];
      return {
        name: top.name || top.title || '',
        rank: (top.type || top.rank || 'FERIAL') as RomcalEvent['rank'],
        weekOfPsalter: top.weekOfPsalter ?? undefined,
      };
    }
  } catch {
    // romcal unavailable or API changed — fall through to manual calculation
  }
  return null;
}

// ── Liturgical Day Name ───────────────────────────────────────────────────────

const ORDINAL_NAMES = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh',
  'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth',
  'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth',
  'Twentieth', 'Twenty-first', 'Twenty-second', 'Twenty-third', 'Twenty-fourth',
  'Twenty-fifth', 'Twenty-sixth', 'Twenty-seventh', 'Twenty-eighth', 'Twenty-ninth',
  'Thirtieth', 'Thirty-first', 'Thirty-second', 'Thirty-third', 'Thirty-fourth',
];

const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Return a proper liturgical day name string like:
 *   "Monday of the Seventeenth Week in Ordinary Time"
 *   "Easter Sunday"
 *   "Third Sunday of Advent"
 * Falls back to a generic string when the season is uncertain.
 */
function getLiturgicalDayName(date: Date): string {
  const y = date.getUTCFullYear();
  const dayOfWeek = date.getUTCDay();
  const dayName = DAY_NAMES_EN[dayOfWeek];

  const easter = getEasterDate(y);
  const ashWednesday = new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);
  const pentecost = new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000);
  const advent1 = getAdvent1(y);

  // Jan 6 anchor
  const jan6 = new Date(Date.UTC(y, 0, 6));
  const dayOfWeekJan6 = jan6.getUTCDay();
  const baptismSunday = new Date(Date.UTC(y, 0, 6 + (7 - dayOfWeekJan6) % 7));
  const otStart = new Date(Date.UTC(baptismSunday.getUTCFullYear(), baptismSunday.getUTCMonth(), baptismSunday.getUTCDate() + 1));
  const trinityWeekStart = new Date(pentecost.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Advent
  if (date >= advent1) {
    const advWeek = Math.floor((date.getTime() - advent1.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const weekOrd = ORDINAL_NAMES[Math.min(advWeek, 4)] || `Week ${advWeek}`;
    if (dayOfWeek === 0) return `${weekOrd} Sunday of Advent`;
    return `${dayName} of the ${weekOrd} Week of Advent`;
  }

  // Christmas Season — Dec 25 to Jan 5 (approx)
  const dec25 = new Date(Date.UTC(y, 11, 25));
  const jan5 = new Date(Date.UTC(y + 1, 0, 6));
  if ((date >= dec25) || (date < otStart && date >= new Date(Date.UTC(y, 0, 1)) && date < jan5)) {
    return 'Christmas Season';
  }

  // Ash Wednesday / Lent
  const ashWedStr = ashWednesday.toISOString().split('T')[0];
  const dateStr = date.toISOString().split('T')[0];
  if (dateStr === ashWedStr) return 'Ash Wednesday';

  if (date >= ashWednesday && date < easter) {
    const lentWeeks = Math.floor((date.getTime() - ashWednesday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    // Palm Sunday is day before Holy Week
    const palmSunday = new Date(easter.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (date >= palmSunday) return 'Holy Week';
    const weekNum = lentWeeks + 1;
    const weekOrd = ORDINAL_NAMES[Math.min(weekNum, 6)] || `Week ${weekNum}`;
    if (dayOfWeek === 0) return `${weekOrd} Sunday of Lent`;
    return `${dayName} of the ${weekOrd} Week of Lent`;
  }

  // Easter
  const easterStr = easter.toISOString().split('T')[0];
  if (dateStr === easterStr) return 'Easter Sunday';
  if (date > easter && date < pentecost) {
    const easterWeek = Math.floor((date.getTime() - easter.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const weekOrd = ORDINAL_NAMES[Math.min(easterWeek, 7)] || `Week ${easterWeek}`;
    if (dayOfWeek === 0) return `${weekOrd} Sunday of Easter`;
    return `${dayName} of the ${weekOrd} Week of Easter`;
  }

  // Pentecost
  const pentStr = pentecost.toISOString().split('T')[0];
  if (dateStr === pentStr) return 'Pentecost Sunday';

  // Ordinary Time — early (before Ash Wednesday)
  if (date >= otStart && date < ashWednesday) {
    const weekCount = Math.floor((date.getTime() - otStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const weekOrd = ORDINAL_NAMES[weekCount] || `${weekCount}th`;
    if (dayOfWeek === 0) return `${weekOrd} Sunday in Ordinary Time`;
    return `${dayName} of the ${weekOrd} Week in Ordinary Time`;
  }

  // Ordinary Time — later (after Pentecost)
  if (date >= trinityWeekStart && date < advent1) {
    // Count from the week where OT Week 10 began (roughly Trinity Sunday week + 1)
    const weeksFromTrinity = Math.floor((date.getTime() - trinityWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    // OT weeks resume at ~Week 10 after Pentecost
    // Compute how many OT weeks elapsed total in OT1 before Ash Wed
    const otWeek1Count = Math.floor((ashWednesday.getTime() - otStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const weekCount = otWeek1Count + weeksFromTrinity + 1;
    const weekOrd = ORDINAL_NAMES[weekCount] || `${weekCount}th`;
    if (dayOfWeek === 0) return `${weekOrd} Sunday in Ordinary Time`;
    return `${dayName} of the ${weekOrd} Week in Ordinary Time`;
  }

  return `${dayName} in Ordinary Time`;
}


// ── Psalter Week Calculation ──────────────────────────────────────────────────

/**
 * Compute the 4-week psalter week from a calendar date.
 *
 * The psalter cycle runs from the Sunday after Epiphany in Ordinary Time
 * and from the First Sunday of Advent. Each liturgical "Ordinary Time"
 * week number corresponds to psalter week = ((otWeek - 1) % 4) + 1.
 *
 * For simplicity, we count weeks from the nearest Sunday before
 * the beginning of Ordinary Time (Feb 3 typically for Year A/B/C).
 * romcal provides the week-of-psalter directly; we use it when available.
 */
function getPsalterWeek(date: Date): 1 | 2 | 3 | 4 {
  try {
    const romcalEvent = getRomcalEvent(date);
    if (romcalEvent?.weekOfPsalter) {
      return (((romcalEvent.weekOfPsalter - 1) % 4) + 1) as 1 | 2 | 3 | 4;
    }
  } catch {
    // fall through
  }

  // Fallback: Count from fixed anchor point
  // Epiphany is Jan 6; Ordinary Time starts the day after the Baptism of the Lord
  // which is the Sunday after Jan 6 (or Jan 13 at latest).
  // We approximate: OT Week 1 starts on the Monday of the week containing Jan 7.
  const y = date.getUTCFullYear();

  // Find the Sunday of Baptism of the Lord (Sunday after Jan 6)
  const jan6 = new Date(Date.UTC(y, 0, 6));
  const dayOfWeekJan6 = jan6.getUTCDay(); // 0=Sun
  const baptismSunday = new Date(Date.UTC(y, 0, 6 + (7 - dayOfWeekJan6) % 7));
  // OT Week 1 starts the Monday after Baptism Sunday
  const otStart = new Date(Date.UTC(baptismSunday.getUTCFullYear(), baptismSunday.getUTCMonth(), baptismSunday.getUTCDate() + 1));

  // Lent starts on Ash Wednesday: Easter - 46 days
  // Easter date (Gregorian algorithm)
  const easter = getEasterDate(y);
  const ashWednesday = new Date(easter.getTime() - 46 * 24 * 60 * 60 * 1000);

  // If date is in Lent/Easter/Advent, fall back to week 1
  const advent1 = getAdvent1(y);
  if (date >= ashWednesday && date < easter) return 1;
  if (date >= easter && date < new Date(Date.UTC(y, 5, 15))) {
    // Easter season: count from Easter Sunday
    const weeks = Math.floor((date.getTime() - easter.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return (((weeks) % 4) + 1) as 1 | 2 | 3 | 4;
  }

  let weekCount = 0;
  if (date >= otStart && date < ashWednesday) {
    weekCount = Math.floor((date.getTime() - otStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  } else if (date >= new Date(Date.UTC(y, 5, 15)) && date < advent1) {
    // Later OT: count from Pentecost + 1 week
    const pentecost = new Date(easter.getTime() + 49 * 24 * 60 * 60 * 1000);
    const trinityWeekStart = new Date(pentecost.getTime() + 7 * 24 * 60 * 60 * 1000);
    weekCount = Math.floor((date.getTime() - trinityWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 10;
  }

  if (weekCount <= 0) return 1;
  return (((weekCount - 1) % 4) + 1) as 1 | 2 | 3 | 4;
}

function getEasterDate(year: number): Date {
  // Computus (Gregorian)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getAdvent1(year: number): Date {
  // First Sunday of Advent = 4 Sundays before Christmas (Dec 25)
  const christmas = new Date(Date.UTC(year, 11, 25));
  const dow = christmas.getUTCDay(); // 0=Sun
  const daysBack = dow === 0 ? 22 : dow + 21;
  return new Date(Date.UTC(year, 11, 25 - daysBack));
}

// ── Gospel Canticle Loader ────────────────────────────────────────────────────

function getGospelCanticleText(canticleName: 'Benedictus' | 'Magnificat' | 'Nunc dimittis', lang: 'en' | 'la'): string {
  if (lang === 'la') {
    const laText = getLocalLatinCanticleText(canticleName.toLowerCase().replace(' ', '-'));
    if (laText) return laText;
  }

  // English fallback — try lypsautierant abbey collection
  // These are in theAbbeyPsalmsAndCanticles as "NT 7", "NT 8" etc.
  // Benedictus = Luke 1:68-79, Magnificat = Luke 1:46-55, Nunc Dimittis = Luke 2:29-32
  const mappings: Record<string, { grailKey: string; fallback: string }> = {
    'Benedictus': {
      grailKey: 'benedictus',
      fallback: lang === 'la'
        ? 'Benedíctus Dóminus Deus Israël,\nquia visitávit et fecit redemptiónem plebis suæ.'
        : '1 Bléssed be the Lórd, the Gód of Ísrael;\nhe has cóme to his péople and sét them frée.',
    },
    'Magnificat': {
      grailKey: 'magnificat',
      fallback: lang === 'la'
        ? 'Magníficat ánima mea Dóminum,\net exsultávit spíritus meus in Deo, salutári meo.'
        : '1 My sóul glorífies the Lórd,\n2 my spírit rejóices in Gód, my Sávior.',
    },
    'Nunc dimittis': {
      grailKey: 'nunc-dimittis',
      fallback: lang === 'la'
        ? 'Nunc dimíttis servum tuum, Dómine,\nsecúndum verbum tuum in pace.'
        : '1 Lórd, now you lét your sérvant gó in péace;\n2 your wórd has béen fulfílled.',
    },
  };

  const mapping = mappings[canticleName];
  if (!mapping) return `[${canticleName}]`;

  // Try loading from local Grail psalter (some editions include these)
  const filePath = path.join(
    process.cwd(),
    'lypsautierant', 'psautier', 'revisedGrailPsalter',
    canticleName
  );
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
  }

  // Try jgabc-psalms directory
  const jgabcPath = path.join(process.cwd(), 'jgabc-psalms', `${canticleName}.txt`);
  if (fs.existsSync(jgabcPath)) {
    return fs.readFileSync(jgabcPath, 'utf8').replace(/^\uFEFF/, '').trim();
  }

  return mapping.fallback;
}

// ── Short Reading texts (varied by hour) ─────────────────────────────────────

const SHORT_READINGS: Record<string, { en: string; la: string }> = {
  lauds: {
    en: 'Is it not to share your bread with the hungry, and bring the homeless poor into your house? Then your light shall break forth like the dawn, and your healing shall spring up speedily. (Is 58:7-8)',
    la: 'Frange esurienti panem tuum, et egenos vagosque induc in domum tuam; et tunc erumpet quasi aurora lux tua, et sanitas tua cito orietur. (Is 58,7-8)',
  },
  vespers: {
    en: 'Bless the Lord, O my soul, and do not forget all his benefits. He forgives all your iniquity, he heals all your diseases, he redeems your life from the Pit. (Ps 103:2-4)',
    la: 'Bénedic, ánima mea, Dóminum, et noli oblivísci omnes retributiónes eius; qui propítius fit ómnibus iniquitátibus tuis, qui sanat omnes infirmitátes tuas. (Ps 102,2-3)',
  },
  terce: {
    en: 'I will pour water on the thirsty land, and streams on the dry ground; I will pour my Spirit upon your descendants, and my blessing on your offspring. (Is 44:3)',
    la: 'Effúndam aquas super sitientem et fluénta super áridam; effúndam Spíritum meum super semen tuum. (Is 44,3)',
  },
  sext: {
    en: 'The Lord is faithful in all his words, and gracious in all his deeds. The Lord upholds all who are falling, and raises up all who are bowed down. (Ps 145:13-14)',
    la: 'Fidélis Dóminus in ómnibus verbis suis et sanctus in ómnibus opéribus suis. Erigit Dóminus omnes qui cádunt. (Ps 144,13-14)',
  },
  none: {
    en: 'The Lord, the God of Israel, says: Return to me with all your heart. Rend your hearts and not your clothing. Return to the Lord your God, for he is gracious and merciful, slow to anger, and abounding in steadfast love. (Joel 2:12-13)',
    la: 'Convertímini ad me in toto corde vestro; scíndite corda vestra et convertímini ad Dóminum Deum vestrum, quia benígnus et miséricors est. (Ioel 2,12-13)',
  },
  compline: {
    en: 'You, O Lord, are in the midst of us, and we are called by your name; do not forsake us! (Jer 14:9)',
    la: 'Tu autem in nobis es, Dómine, et nomen sanctum tuum invocátum est super nos; ne derelínquas nos, Dómine Deus noster. (Ier 14,9)',
  },
  readings: {
    en: 'Happy are those whose way is blameless, who walk in the law of the Lord. Happy are those who keep his decrees, who seek him with their whole heart. (Ps 119:1-2)',
    la: 'Beáti immaculáti in via, qui ámbulant in lege Dómini. Beáti qui scrutántur testimónia eius, in toto corde exquírunt eum. (Ps 118,1-2)',
  },
};

// ── Main Generator ────────────────────────────────────────────────────────────

/**
 * Generate canonical office blocks for the requested hour.
 */
export function generateCanonicalOffice(spec: OfficeSpec): Block[] {
  const { hour, lang = 'en', collection = 'grail' } = spec;

  // Get liturgical calendar data
  const romcalData = getRomcalEvent(spec.date);
  const rank = spec.rank || romcalData?.rank || 'FERIAL';
  const saintName = spec.saintName || romcalData?.name;
  const isSolemnityOrFeast = rank === 'SOLEMNITY' || rank === 'FEAST';

  // GILH Rule #136: On Solemnities and Feasts, Lauds & Vespers use Sunday Week 1 psalms
  const effectiveDayOfWeek = isSolemnityOrFeast ? 0 : spec.date.getUTCDay();
  const effectivePsalterWeek: 1 | 2 | 3 | 4 = isSolemnityOrFeast
    ? 1
    : (spec.psalterWeek || getPsalterWeek(spec.date));

  const blocks: Block[] = [];

  // ── 1. Heading & Subheading ────────────────────────────────────────────────────────
  const hourLabels: Record<string, string> = {
    lauds: 'LAUDS — Morning Prayer',
    vespers: 'VESPERS — Evening Prayer',
    compline: 'COMPLINE — Night Prayer',
    terce: 'TERCE — Midmorning Prayer',
    sext: 'SEXT — Midday Prayer',
    none: 'NONE — Midafternoon Prayer',
    readings: 'OFFICE OF READINGS',
  };
  blocks.push({ id: generateId(), type: 'heading', content: hourLabels[hour] || hour.toUpperCase() });

  // Calendar date display (e.g. "Monday, July 27, 2026")
  const dateDisplayOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
  const dateDisplay = spec.date.toLocaleDateString('en-US', dateDisplayOptions);
  blocks.push({ id: generateId(), type: 'subheading', content: dateDisplay });

  // Liturgical day name (e.g. "Monday of the Seventeenth Week in Ordinary Time")
  const liturgicalDayName = saintName || getLiturgicalDayName(spec.date);
  blocks.push({ id: generateId(), type: 'subheading', content: liturgicalDayName });

  // Service name (e.g. "Evening Prayer")
  const serviceNames: Record<string, string> = {
    lauds: 'Morning Prayer',
    vespers: 'Evening Prayer',
    compline: 'Night Prayer',
    terce: 'Midmorning Prayer',
    sext: 'Midday Prayer',
    none: 'Midafternoon Prayer',
    readings: 'Office of Readings',
  };
  blocks.push({ id: generateId(), type: 'subheading', content: serviceNames[hour] || hour });

  // ── 2. Opening Verse ─────────────────────────────────────────────────────
  blocks.push({ id: generateId(), type: 'heading', content: 'INTRODUCTION' });
  // Compline uses a different opening
  if (hour === 'compline') {
    blocks.push({
      id: generateId(), type: 'rubric',
      content: lang === 'la'
        ? 'V. Convérte nos, Deus, salutáris noster.\nR. Et avérte iram tuam a nobis.'
        : 'V. Convert us, O God our savior.\nR. And let your anger cease from us.',
    });
  } else {
    const introText = lang === 'la'
      ? 'V. Deus, in adiutórium meum inténde.\nR. Dómine, ad adiuvándum me festína.\nGlória Patri, et Fílio, et Spirítui Sancto: sicut erat in princípio, et nunc et semper, et in sǽcula sæculórum. Amen. Allelúia.'
      : 'God, + come to my assistance. — Lord, make haste to help me. Glory to the Father, and to the Son, and to the Holy Spirit: as it was in the beginning, is now, and will be for ever. Amen. Alleluia.';
    blocks.push({ id: generateId(), type: 'text', content: introText });
  }

  // ── 3. Hymn ──────────────────────────────────────────────────────────────
  blocks.push({ id: generateId(), type: 'heading', content: 'HYMN' });
  blocks.push({
    id: generateId(), type: 'hymn',
    content: getProperHymn(effectiveDayOfWeek, hour, lang),
  });

  // ── 4. Psalmody ──────────────────────────────────────────────────────────
  blocks.push({ id: generateId(), type: 'heading', content: 'PSALMODY' });

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[effectiveDayOfWeek] || 'sunday';

  if (hour === 'compline') {
    // Compline: fixed psalms by day
    const compUnits = COMPLINE_PSALMS[dayName] || COMPLINE_PSALMS.sunday;
    for (let i = 0; i < compUnits.length; i++) {
      const unit = compUnits[i];
      const antNum = i + 1;
      const tone = unit.defaultTone || '8.G';
      const antText = lang === 'la'
        ? `Ant. ${antNum}: Salva nos, Dómine, vigilántes, custódi nos dormiéntes.`
        : `Ant. ${antNum}: Save us, Lord, while we are awake; protect us while we sleep.`;

      blocks.push({ id: generateId(), type: 'antiphon', content: antText });

      const textContent = lang === 'la'
        ? (getLocalLatinPsalmText(unit.id) || `[Psalmus ${unit.id}]`)
        : (getPsalmText(unit.id, collection)?.rawText || `[Psalm ${unit.id}]`);

      blocks.push({
        id: generateId(), type: 'psalm',
        content: textContent,
        psalmNumber: unit.id,
        psalmTone: tone.split('.')[0] + '.',
        psalmVariant: tone.split('.')[1] || '',
        lang,
      });

      blocks.push({ id: generateId(), type: 'antiphon', content: antText });
    }

  } else if (hour === 'lauds' || hour === 'vespers') {
    // Major Hours: 4-week psalter assignments
    const weekData = PSALTER_SCHEMA[effectivePsalterWeek]?.[effectiveDayOfWeek]
                  || PSALTER_SCHEMA[1][0];
    const hourData = hour === 'lauds' ? weekData.lauds : weekData.vespers;

    for (let i = 0; i < hourData.units.length; i++) {
      const unit = hourData.units[i];
      const antNum = i + 1;
      const tone = unit.defaultTone || '8.G';
      const antLabel = lang === 'la' ? `Ant. ${antNum}.` : `Ant. ${antNum}:`;

      blocks.push({
        id: generateId(), type: 'antiphon',
        content: `${antLabel} ${unit.title}`,
        place: String(antNum),
      });

      // Psalm/canticle title rubric (e.g. "Psalm 11 God is the unfailing support")
      blocks.push({
        id: generateId(), type: 'rubric',
        content: unit.title,
      });

      let textContent = '';
      if (lang === 'la') {
        textContent = getLocalLatinPsalmText(unit.id) || `[Psalmus ${unit.id}]`;
      } else if (unit.type === 'ot-canticle') {
        const num = parseInt(unit.id, 10);
        const c = getCanticleText('ot', isNaN(num) ? 1 : num);
        textContent = c?.rawText || `[OT Canticle ${unit.id} — ${unit.title}]`;
      } else if (unit.type === 'nt-canticle') {
        const num = parseInt(unit.id, 10);
        const c = getCanticleText('nt', isNaN(num) ? 1 : num);
        textContent = c?.rawText || `[NT Canticle ${unit.id} — ${unit.title}]`;
      } else {
        const p = getPsalmText(unit.id, collection, unit.verses);
        textContent = p?.rawText || `[Psalm ${unit.id}]`;
      }

      blocks.push({
        id: generateId(), type: 'psalm',
        content: textContent,
        psalmNumber: unit.id,
        psalmTone: tone.split('.')[0] + '.',
        psalmVariant: tone.split('.')[1] || '',
        lang,
      });

      // Psalm Prayer placeholder (user can fill in)
      blocks.push({ id: generateId(), type: 'rubric', content: 'Psalm Prayer' });
      blocks.push({
        id: generateId(), type: 'psalm-prayer',
        content: lang === 'la' ? '[Oratio psalmi]' : '[Psalm prayer]',
      });

      blocks.push({
        id: generateId(), type: 'antiphon',
        content: `${antLabel} ${unit.title}`,
        place: String(antNum),
      });
    }

  } else if (hour === 'terce' || hour === 'sext' || hour === 'none') {
    // Minor Hours (Horae Mediae): Ps 119 strophes
    const minorPsalms = MINOR_HOUR_PSALMS[dayName]?.[hour] || [
      { type: 'psalm' as const, id: '119.1-8', title: 'Psalm 119 (I)', defaultTone: '8.G' }
    ];

    for (let i = 0; i < minorPsalms.length; i++) {
      const unit = minorPsalms[i];
      const tone = unit.defaultTone || '8.G';

      blocks.push({
        id: generateId(), type: 'antiphon',
        content: lang === 'la' ? 'Ant. Allelúia.' : 'Ant. Alleluia.',
      });

      const textContent = lang === 'la'
        ? (getLocalLatinPsalmText(unit.id) || `[Psalmus ${unit.id}]`)
        : (getPsalmText(unit.id, collection)?.rawText || `[Psalm ${unit.id} — ${unit.title}]`);

      blocks.push({
        id: generateId(), type: 'psalm',
        content: textContent,
        psalmNumber: unit.id,
        psalmTone: tone.split('.')[0] + '.',
        psalmVariant: tone.split('.')[1] || '',
        lang,
      });

      blocks.push({
        id: generateId(), type: 'antiphon',
        content: lang === 'la' ? 'Ant. Allelúia.' : 'Ant. Alleluia.',
      });
    }

  } else if (hour === 'readings') {
    // Office of Readings: 3 psalms from OCO schema (Ol = Office Lectionis)
    // The actual readings vary by day and season — emit structural placeholder blocks
    // Psalms for Office of Readings rotate through the psalter week 1H1,Ol etc.
    // For now we emit the Week 1 OL psalms (Pss 1, 2, 3 for Sunday etc.)
    const olPsalms: Array<{ id: string; title: string }> = [
      { id: '1',   title: 'Psalm 1'   },
      { id: '2',   title: 'Psalm 2'   },
      { id: '3',   title: 'Psalm 3'   },
    ];

    // Try to get the proper psalms based on week/day
    // Week 1: Sun: 1,2,3 | Mon: 6,9a,9a | Tue: 9b,11,12 | ...
    const olSchemata: Record<string, Record<number, Array<{id:string;title:string}>>> = {
      '1': {
        0: [{id:'1',title:'Psalm 1'},{id:'2',title:'Psalm 2'},{id:'3',title:'Psalm 3'}],
        1: [{id:'6',title:'Psalm 6'},{id:'9',title:'Psalm 9'},{id:'9',title:'Psalm 9 (cont.)'}],
        2: [{id:'9',title:'Psalm 9'},{id:'11',title:'Psalm 11'},{id:'12',title:'Psalm 12'}],
        3: [{id:'17',title:'Psalm 17'},{id:'30',title:'Psalm 30'},{id:'17',title:'Psalm 17 (cont.)'}],
        4: [{id:'17',title:'Psalm 17'},{id:'17',title:'Psalm 17 (cont.)'},{id:'17',title:'Psalm 17 (III)'}],
        5: [{id:'35',title:'Psalm 35'},{id:'35',title:'Psalm 35 (cont.)'},{id:'51',title:'Psalm 51'}],
        6: [{id:'104',title:'Psalm 104'},{id:'104',title:'Psalm 104 (cont.)'},{id:'104',title:'Psalm 104 (III)'}],
      },
    };
    const weekKey = String(effectivePsalterWeek);
    const dayOlPsalms = olSchemata[weekKey]?.[effectiveDayOfWeek] || olPsalms;

    for (let i = 0; i < dayOlPsalms.length; i++) {
      const p = dayOlPsalms[i];
      const tone = '8.G';
      const antNum = i + 1;

      blocks.push({
        id: generateId(), type: 'antiphon',
        content: lang === 'la' ? `Ant. ${antNum}.` : `Ant. ${antNum}:`,
      });

      const textContent = lang === 'la'
        ? (getLocalLatinPsalmText(p.id) || `[Psalmus ${p.id}]`)
        : (getPsalmText(p.id, collection)?.rawText || `[Psalm ${p.id}]`);

      blocks.push({
        id: generateId(), type: 'psalm',
        content: textContent,
        psalmNumber: p.id,
        psalmTone: tone.split('.')[0] + '.',
        psalmVariant: tone.split('.')[1] || '',
        lang,
      });

      blocks.push({
        id: generateId(), type: 'antiphon',
        content: lang === 'la' ? `Ant. ${antNum}.` : `Ant. ${antNum}:`,
      });
    }
  }

  // ── 5. Short Reading (Capitulum) ─────────────────────────────────────────
  if (hour !== 'readings') {
    blocks.push({ id: generateId(), type: 'heading', content: 'READING' });
    const reading = SHORT_READINGS[hour] || SHORT_READINGS.vespers;
    blocks.push({
      id: generateId(), type: 'text',
      content: lang === 'la' ? reading.la : reading.en,
    });

    if (hour === 'compline') {
      // Short Responsory for Compline
      blocks.push({
        id: generateId(), type: 'text',
        content: lang === 'la'
          ? '℟. br. In manus tuas, Dómine, * Comméndo spíritum meum.\n℣. Redemísti nos, Dómine, Deus veritátis.\n℟. Comméndo spíritum meum.'
          : '℟. br. Into your hands, Lord, * I commend my spirit.\n℣. You have redeemed us, Lord God of truth.\n℟. I commend my spirit.',
      });
    } else {
      // Responsory placeholder for Lauds/Vespers
      blocks.push({ id: generateId(), type: 'heading', content: 'RESPONSORY' });
      blocks.push({ id: generateId(), type: 'text', content: '[Responsory text placeholder]' });
    }
  } else {
    // Office of Readings: add Reading I and Reading II placeholders
    blocks.push({ id: generateId(), type: 'heading', content: 'READING I' });
    blocks.push({
      id: generateId(), type: 'rubric',
      content: lang === 'la'
        ? '(Lectio prima e Scriptura Sacra)'
        : '(First Reading from Sacred Scripture)',
    });
    blocks.push({ id: generateId(), type: 'text', content: '[Scripture reading for the day]' });

    blocks.push({ id: generateId(), type: 'heading', content: 'RESPONSORY I' });
    blocks.push({ id: generateId(), type: 'text', content: '[Responsory]' });

    blocks.push({ id: generateId(), type: 'heading', content: 'READING II' });
    blocks.push({
      id: generateId(), type: 'rubric',
      content: lang === 'la'
        ? '(Lectio altera e scriptis Patrum aut Doctorum Ecclesiæ)'
        : '(Second Reading from the Fathers or Doctors of the Church)',
    });
    blocks.push({ id: generateId(), type: 'text', content: '[Patristic reading for the day]' });

    blocks.push({ id: generateId(), type: 'heading', content: 'RESPONSORY II' });
    blocks.push({ id: generateId(), type: 'text', content: '[Responsory]' });

    // Te Deum (on ferias and memorials)
    if (rank !== 'FERIAL') {
      blocks.push({ id: generateId(), type: 'heading', content: 'TE DEUM' });
      blocks.push({
        id: generateId(), type: 'text',
        content: lang === 'la'
          ? 'Te Deum laudámus: * te Dóminum confitémur.\nTe ætérnum Patrem, * omnis terra venerátur.'
          : 'You are God: we praise you;\nYou are the Lord: we acclaim you;',
      });
    }
  }

  // ── 6. Gospel Canticle ───────────────────────────────────────────────────
  if (hour === 'lauds' || hour === 'vespers' || hour === 'compline') {
    const canticleName =
      hour === 'lauds' ? 'Benedictus'
      : hour === 'vespers' ? 'Magnificat'
      : 'Nunc dimittis';

    blocks.push({
      id: generateId(), type: 'heading',
      content: `GOSPEL CANTICLE — ${canticleName.toUpperCase()}`,
    });

    const canticlePlace = hour === 'lauds' ? 'B' : hour === 'vespers' ? 'M' : 'Nunc';

    // Antiphon for the canticle
    blocks.push({
      id: generateId(), type: 'antiphon',
      content: lang === 'la'
        ? (hour === 'lauds' ? 'Ant. Benedíctus Dóminus Deus Israël.'
            : hour === 'vespers' ? 'Ant. Magníficat ánima mea Dóminum.'
            : 'Ant. Salva nos, Dómine, vigilántes.')
        : (hour === 'lauds' ? 'Ant. Blessed be the Lord, the God of Israel.'
            : hour === 'vespers' ? 'Ant. My soul proclaims the greatness of the Lord.'
            : 'Ant. Save us, Lord, while we are awake.'),
      place: canticlePlace,
    });

    const canticleText = getGospelCanticleText(canticleName as 'Benedictus' | 'Magnificat' | 'Nunc dimittis', lang);
    blocks.push({
      id: generateId(), type: 'psalm',
      content: canticleText,
      psalmNumber: canticleName,
      psalmTone: '8.',
      psalmVariant: 'G',
      lang,
    });

    blocks.push({
      id: generateId(), type: 'antiphon',
      content: lang === 'la'
        ? (hour === 'lauds' ? 'Ant. Benedíctus Dóminus Deus Israël.'
            : hour === 'vespers' ? 'Ant. Magníficat ánima mea Dóminum.'
            : 'Ant. Salva nos, Dómine, vigilántes.')
        : (hour === 'lauds' ? 'Ant. Blessed be the Lord, the God of Israel.'
            : hour === 'vespers' ? 'Ant. My soul proclaims the greatness of the Lord.'
            : 'Ant. Save us, Lord, while we are awake.'),
      place: canticlePlace,
    });
  }

  // ── 7. Intercessions (Lauds and Vespers only) ────────────────────────────
  if (hour === 'lauds' || hour === 'vespers') {
    blocks.push({ id: generateId(), type: 'heading', content: 'INTERCESSIONS' });
    blocks.push({
      id: generateId(), type: 'text',
      content: lang === 'la'
        ? 'Pray for the holy Church of God;\nfor its members spread throughout the world;\nfor our Bishop and all those in holy orders.\n\n℟. Exáudi nos, Dómine.'
        : 'Pray for the holy Church of God;\nfor its members spread throughout the world;\nfor our Bishop and all those in holy orders.\n\n℟. Lord, hear our prayer.',
    });

    // Our Father
    blocks.push({ id: generateId(), type: 'heading', content: 'OUR FATHER' });
    blocks.push({
      id: generateId(), type: 'text',
      content: lang === 'la'
        ? 'Pater noster, qui es in cælis,\nsanctificétur nomen tuum;\nadvéniat regnum tuum;\nfiat volúntas tua, sicut in cælo, et in terra.\nPanem nostrum cotidiánum da nobis hódie;\net dimítte nobis débita nostra,\nsicut et nos dimíttimus debitóribus nostris;\net ne nos indúcas in tentatiónem;\nsed líbera nos a malo.'
        : 'Our Father, who art in heaven,\nhallowed be thy name;\nthy kingdom come,\nthy will be done on earth as it is in heaven.\nGive us this day our daily bread,\nand forgive us our trespasses,\nas we forgive those who trespass against us;\nand lead us not into temptation,\nbut deliver us from evil.',
    });
  }

  // ── 8. Concluding Prayer (Collecta) ─────────────────────────────────────
  blocks.push({ id: generateId(), type: 'heading', content: 'CONCLUDING PRAYER' });
  blocks.push({
    id: generateId(), type: 'text',
    content: lang === 'la'
      ? 'Oremus.\nDómine Deus omnípotens, qui ad princípium huius diéi nos perveníre fecísti: tua nos hódie salva virtúte; ut in hac die ad nullum declinémus peccátum, sed semper ad tuam iustítiam faciéndam nostra procédant eloquía, dirigántur cogitatiónes et opera. Per Dóminum nostrum Iesum Christum, Fílium tuum, qui tecum vivit et regnat in unitáte Spíritus Sancti, Deus, per ómnia sǽcula sæculórum. Amen.'
      : 'Let us pray.\nLord God almighty, you have brought us safely to the beginning of this day. May the power of your grace be with us throughout this day, so that we may never fall into sin but always speak and act according to your will. Through our Lord Jesus Christ, your Son, who lives and reigns with you in the unity of the Holy Spirit, God, for ever and ever. Amen.',
  });

  // ── 9. Dismissal ─────────────────────────────────────────────────────────
  if (hour === 'compline') {
    blocks.push({
      id: generateId(), type: 'text',
      content: lang === 'la'
        ? 'V. Benedicámus Dómino.\n℟. Deo grátias.\n\nAntiphona: Salva nos, Dómine, vigilántes, custódi nos dormiéntes, ut vigilémus cum Christo et requiescámus in pace.'
        : 'V. Let us bless the Lord.\n℟. Thanks be to God.\n\nAntiphon: Save us, Lord, while we are awake; protect us while we sleep; that we may keep watch with Christ and rest with him in peace.',
    });
  } else {
    blocks.push({ id: generateId(), type: 'heading', content: 'DISMISSAL' });
    blocks.push({
      id: generateId(), type: 'text',
      content: lang === 'la'
        ? 'V. Benedicámus Dómino.\n℟. Deo grátias.'
        : 'If a priest or deacon presides, he dismisses the people:\nThe Lord be with you. — And with your spirit.\nMay almighty God bless you, the Father, and the Son, ✠ and the Holy Spirit. — Amen.\n\nGo in peace. — Thanks be to God.\n\nOtherwise:\nMay the Lord bless us, protect us from all evil and bring us to everlasting life. — Amen.',
    });
  }

  return blocks;
}
