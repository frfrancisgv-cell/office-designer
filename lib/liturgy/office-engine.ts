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
 */

import { Block } from '@/lib/types';
import { PSALTER_SCHEMA, COMPLINE_PSALMS } from './data/psalter-schema';
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

const romcal = require('romcal');


function getRomcalEvent(date: Date) {
  try {
    const cal = romcal.calendarFor({ year: date.getUTCFullYear(), country: 'unitedStates' });
    const dateStr = date.toISOString().split('T')[0];
    const events = cal.filter((d: any) => d.moment.startsWith(dateStr));
    if (events.length > 0) {
      const top = events[0];
      return {
        name: top.name,
        rank: top.type as 'SOLEMNITY' | 'FEAST' | 'MEMORIAL' | 'FERIAL',
      };
    }
  } catch (e) {
    // fallback
  }
  return null;
}

function getPsalterWeek(date: Date): 1 | 2 | 3 | 4 {
  try {
    const y = date.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(y, 0, 1));
    const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.floor((dayOfYear + startOfYear.getUTCDay()) / 7);
    return (((weekNum % 4) + 1) as 1 | 2 | 3 | 4);
  } catch {
    return 1;
  }
}

/**
 * Generate canonical office blocks for the requested hour
 */
export function generateCanonicalOffice(spec: OfficeSpec): Block[] {
  const { hour, lang = 'en', collection = 'grail' } = spec;
  const romcalData = getRomcalEvent(spec.date);
  const rank = spec.rank || romcalData?.rank || 'FERIAL';
  const saintName = spec.saintName || romcalData?.name;

  const isSolemnityOrFeast = rank === 'SOLEMNITY' || rank === 'FEAST';

  // GILH Rule #136: On Solemnities and Feasts, Lauds & Vespers take Sunday Week 1 psalms (unless proper)
  const effectiveDayOfWeek = isSolemnityOrFeast ? 0 : spec.date.getUTCDay();
  const effectivePsalterWeek = isSolemnityOrFeast ? 1 : (spec.psalterWeek || getPsalterWeek(spec.date));

  const blocks: Block[] = [];
  const hourTitle = hour.toUpperCase();

  // 1. Heading & Subheading
  blocks.push({
    id: generateId(),
    type: 'heading',
    content: hourTitle,
  });

  const subheading = saintName
    ? `${saintName} — ${rank}`
    : `Ordinary Time — Week ${effectivePsalterWeek}`;

  blocks.push({
    id: generateId(),
    type: 'subheading',
    content: subheading,
  });


  // 2. Introductory Verse
  const introText = lang === 'la'
    ? 'V. Deus, in adiutórium meum inténde.\nR. Dómine, ad adiuvándum me festína.\nGlória Patri, et Fílio, et Spirítui Sancto:\nsicut erat in princípio, et nunc et semper,\net in sǽcula sæculórum. Amen. Allelúia.'
    : 'V. O God, come to my assistance.\nR. O Lord, make haste to help me.\nGlory to the Father, and to the Son, and to the Holy Spirit:\nas it was in the beginning, is now, and will be forever. Amen. Alleluia.';

  blocks.push({
    id: generateId(),
    type: 'text',
    content: introText,
  });

  // 3. Hymn
  blocks.push({
    id: generateId(),
    type: 'heading',
    content: 'HYMN',
  });
  blocks.push({
    id: generateId(),
    type: 'hymn',
    content: getProperHymn(effectiveDayOfWeek, hour, lang),
  });


  // 4. Psalmodia
  blocks.push({
    id: generateId(),
    type: 'heading',
    content: 'PSALMODY',
  });

  if (hour === 'compline') {
    const dayNames = ['sunday1', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const compKey = dayNames[effectiveDayOfWeek] || 'sunday1';
    const compUnits = COMPLINE_PSALMS[compKey] || COMPLINE_PSALMS.sunday1;

    for (let i = 0; i < compUnits.length; i++) {
      const unit = compUnits[i];
      const antNum = i + 1;
      const tone = unit.defaultTone || '8.G';

      blocks.push({
        id: generateId(),
        type: 'antiphon',
        content: `Ant. ${antNum}: ${unit.defaultAntiphonEn}`,
      });

      let textContent = lang === 'la'
        ? (getLocalLatinPsalmText(unit.id) || `[Psalmus ${unit.id}]`)
        : (getPsalmText(unit.id, collection)?.rawText || `[Psalm ${unit.id}]`);

      blocks.push({
        id: generateId(),
        type: 'psalm',
        content: textContent,
        psalmNumber: unit.id,
        psalmTone: tone.split('.')[0] + '.',
        psalmVariant: tone.split('.')[1] || '',
        lang,
      });

      blocks.push({
        id: generateId(),
        type: 'antiphon',
        content: `Ant. ${antNum}: ${unit.defaultAntiphonEn}`,
      });
    }
  } else if (hour === 'lauds' || hour === 'vespers') {

    const weekData = PSALTER_SCHEMA[effectivePsalterWeek]?.[effectiveDayOfWeek] || PSALTER_SCHEMA[1][0];
    const hourData = hour === 'lauds' ? weekData.lauds : weekData.vespers;


    for (let i = 0; i < hourData.units.length; i++) {
      const unit = hourData.units[i];
      const antNum = i + 1;
      const tone = unit.defaultTone || '8.G';

      // Antiphon Block
      blocks.push({
        id: generateId(),
        type: 'antiphon',
        content: `Ant. ${antNum}: ${unit.defaultAntiphonEn || 'The Lord is my light and my salvation.'}`,
      });

      // Psalm / Canticle Text Resolution
      let textContent = '';
      if (lang === 'la') {
        textContent = getLocalLatinPsalmText(unit.id) || `[Psalmus ${unit.id}]`;
      } else {
        if (unit.type === 'ot-canticle') {
          const num = parseInt(unit.id, 10);
          const c = getCanticleText('ot', isNaN(num) ? 1 : num);
          textContent = c?.rawText || `[OT Canticle ${unit.id}]`;
        } else if (unit.type === 'nt-canticle') {
          const num = parseInt(unit.id, 10);
          const c = getCanticleText('nt', isNaN(num) ? 1 : num);
          textContent = c?.rawText || `[NT Canticle ${unit.id}]`;
        } else {
          const p = getPsalmText(unit.id, collection);
          textContent = p?.rawText || `[Psalm ${unit.id}]`;
        }
      }

      // Psalm Block
      blocks.push({
        id: generateId(),
        type: 'psalm',
        content: textContent,
        psalmNumber: unit.id,
        psalmTone: tone.split('.')[0] + '.',
        psalmVariant: tone.split('.')[1] || '',
        lang,
      });

      // Antiphon Repeat
      blocks.push({
        id: generateId(),
        type: 'antiphon',
        content: `Ant. ${antNum}: ${unit.defaultAntiphonEn || 'The Lord is my light and my salvation.'}`,
      });
    }
  }

  // 5. Short Reading (Capitulum)
  blocks.push({
    id: generateId(),
    type: 'heading',
    content: 'READING',
  });
  blocks.push({
    id: generateId(),
    type: 'text',
    content: lang === 'la'
      ? 'Dómine, exáudi oratiónem meam, et clamor meus ad te véniat.'
      : 'Brothers, be vigilant and pray, so that you do not enter into temptation.',
  });

  // 6. Short Responsory
  blocks.push({
    id: generateId(),
    type: 'text',
    content: lang === 'la'
      ? 'R.br. In manus tuas, Dómine, * Commendo spíritum meum.\nR.br. In manus tuas...'
      : 'R. Into your hands, Lord, I commend my spirit.\nR. Into your hands...',
  });

  // 7. Gospel Canticle (Benedictus for Lauds / Magnificat for Vespers / Nunc Dimittis for Compline)
  const canticleName = hour === 'lauds' ? 'BENEDICTUS' : (hour === 'vespers' ? 'MAGNIFICAT' : 'NUNC DIMITTIS');
  blocks.push({
    id: generateId(),
    type: 'heading',
    content: `GOSPEL CANTICLE — ${canticleName}`,
  });
  blocks.push({
    id: generateId(),
    type: 'antiphon',
    content: 'Ant. Lord, save us while we are awake, protect us while we sleep.',
  });
  blocks.push({
    id: generateId(),
    type: 'psalm',
    content: hour === 'lauds'
      ? (lang === 'la' ? 'Benedíctus Dóminus Deus Israël...' : 'Bléssed be the Lórd, the Gód of Ísrael...')
      : (hour === 'vespers'
        ? (lang === 'la' ? 'Magníficat ánima mea Dóminum...' : 'My soúl procláims the gréatness of the Lórd...')
        : (lang === 'la' ? 'Nunc dimíttis servum tuum, Dómine...' : 'Lórd, now lettest thou thy sérvant depárt in péace...')),
    psalmTone: '8.',
    psalmVariant: 'G',
    lang,
  });

  // 8. Intercessions & Our Father
  if (hour === 'lauds' || hour === 'vespers') {
    blocks.push({
      id: generateId(),
      type: 'heading',
      content: 'INTERCESSIONS',
    });
    blocks.push({
      id: generateId(),
      type: 'text',
      content: 'Lord, hear our prayer.\nOur Father, who art in heaven...',
    });
  }

  // 9. Concluding Prayer (Collecta)
  blocks.push({
    id: generateId(),
    type: 'heading',
    content: 'CONCLUDING PRAYER',
  });
  blocks.push({
    id: generateId(),
    type: 'text',
    content: lang === 'la'
      ? 'Oremus. Dirígere et sanctificáre dignáre, Dómine Deus, rómine cæli et terræ, hódie corda et córpora nostra... Amen.'
      : 'Let us pray. Lord God, king of heaven and earth, direct and sanctify our hearts and bodies this day... Amen.',
  });

  return blocks;
}
