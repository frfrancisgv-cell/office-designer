/**
 * derive-context.ts
 *
 * Derives the OCO occasion code and related liturgical calendar context from
 * the iBreviary liturgical day name string + the request date.
 *
 * The main menu page is always fetched in English (see route.ts) so that the
 * regex patterns below can rely on fixed English phrase structure.
 */

const romcal = require('romcal');
import { FEAST_CALENDAR, ORDINALS, DAY_TO_FERIA, mapRomcalToOccasion } from './constants';

// ── Public types ───────────────────────────────────────────────────────────────

export interface AvailableOccasion {
  label: string;
  value: string;
}

export interface DerivedContext {
  occasionCode: string | null;
  ferialCode: string | null;
  availableOccasions: AvailableOccasion[];
  otWeekNum: number | null;
  liturgicalYear: 'a' | 'b' | 'c';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Derive OCO occasion code AND calendar context from the liturgical day name + date.
 *
 * @param liturgicalName - English liturgical name from the iBreviary main menu
 * @param hour           - Office hour (e.g. "vespers")
 * @param date           - Calendar date of the request
 */
export function deriveContext(liturgicalName: string, hour: string, date: Date): DerivedContext {
  const m = date.getMonth();
  const y = date.getFullYear();
  const liturgicalStartYear = m >= 11 ? y : y - 1;
  const yearCycle = (['a', 'b', 'c'] as const)[((liturgicalStartYear - 2022) % 3 + 3) % 3];

  const ferialData = _parseFerialContext(liturgicalName, date, yearCycle);
  let ferialCode = ferialData.occasionCode;
  let otWeekNum = ferialData.otWeekNum;

  const feastDay   = date.getUTCDate();
  const feastMonth = date.getUTCMonth() + 1;
  const feastDateCode = `${feastDay}/${feastMonth}`;
  let feastCode: string | null = null;
  if (FEAST_CALENDAR[feastDateCode]) {
    feastCode = feastDateCode;
  }

  const isSaturdayVespers = date.getUTCDay() === 6 && hour.toLowerCase() === 'vespers';

  // Saturday Evening First Vespers Anticipation: anticipate the coming Sunday.
  if (isSaturdayVespers && otWeekNum !== null) {
    otWeekNum += 1;
    const psalterWeek = ((otWeekNum - 1) % 4) + 1;
    ferialCode = `${psalterWeek}H1`;
  }

  const availableOccasions: AvailableOccasion[] = [];

  try {
    const cal = romcal.calendarFor({ year: date.getUTCFullYear(), country: 'unitedStates' });
    const dateStr = date.toISOString().split('T')[0];
    const todayEvents = cal.filter((d: any) => d.moment.startsWith(dateStr));

    if (ferialCode) {
      let shortName = liturgicalName.length > 40 ? liturgicalName.substring(0, 37) + '...' : liturgicalName;
      if (isSaturdayVespers && otWeekNum !== null) {
        shortName = `1st Vespers of the ${otWeekNum}th Sunday in Ordinary Time`;
      }
      availableOccasions.push({ label: `Ferial/Sunday (${shortName})`, value: ferialCode });
    }

    for (const event of todayEvents) {
      if (event.type === 'MEMORIAL' || event.type === 'OPT_MEMORIAL' || event.type === 'FEAST') {
        const ocoCode = mapRomcalToOccasion(event.name);
        availableOccasions.push({ label: `Memorial/Feast (${event.name})`, value: ocoCode });
      }
    }

    if (feastCode && !availableOccasions.find(o => o.label.includes('Feast') || o.label.includes('Memorial'))) {
      availableOccasions.push({ label: `Feast/Memorial (${FEAST_CALENDAR[feastCode]})`, value: feastCode });
    }
  } catch (err) {
    console.error('Romcal error:', err);
    if (feastCode) {
      availableOccasions.push({ label: `Feast/Memorial (${FEAST_CALENDAR[feastCode]})`, value: feastCode });
    }
    if (ferialCode) {
      let shortName = liturgicalName.length > 40 ? liturgicalName.substring(0, 37) + '...' : liturgicalName;
      if (isSaturdayVespers && otWeekNum !== null) {
        shortName = `1st Vespers of the ${otWeekNum}th Sunday in Ordinary Time`;
      }
      availableOccasions.push({ label: `Ferial/Sunday (${shortName})`, value: ferialCode });
    }
  }

  // Memorials do not have First Vespers and are superseded by Sunday.
  const defaultOccasion = isSaturdayVespers ? ferialCode : (feastCode || ferialCode);

  return {
    occasionCode: defaultOccasion,
    ferialCode,
    availableOccasions,
    otWeekNum,
    liturgicalYear: yearCycle,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _parseFerialContext(
  liturgicalName: string,
  date: Date,
  yearCycle: 'a' | 'b' | 'c',
): { occasionCode: string | null; otWeekNum: number | null; liturgicalYear: 'a' | 'b' | 'c' } {
  const lower = liturgicalName.toLowerCase();
  const monthNum  = date.getMonth();
  const dayOfMonth = date.getDate();

  // ── Ordinary Time ────────────────────────────────────────────────────────────

  const ferialMatch = lower.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday)\s+of\s+the\s+([\w-]+)\s+week\s+in\s+ordinary\s+time/,
  );
  if (ferialMatch) {
    const feriaNum = DAY_TO_FERIA[ferialMatch[1]];
    const weekNum  = ORDINALS[ferialMatch[2]];
    if (feriaNum && weekNum) {
      const psalterWeek = ((weekNum - 1) % 4) + 1;
      console.log(`[OCO] ${liturgicalName} → psalterWeek ${psalterWeek}, feria ${feriaNum}, year ${yearCycle.toUpperCase()}`);
      return { occasionCode: `${psalterWeek}H${feriaNum}`, otWeekNum: weekNum, liturgicalYear: yearCycle };
    }
  }

  const sundayMatch = lower.match(/^([\w-]+)\s+sunday\s+in\s+ordinary\s+time/);
  if (sundayMatch) {
    const weekNum = ORDINALS[sundayMatch[1]];
    if (weekNum) {
      const psalterWeek = ((weekNum - 1) % 4) + 1;
      return { occasionCode: `${psalterWeek}H1`, otWeekNum: weekNum, liturgicalYear: yearCycle };
    }
  }

  // ── Advent Season ────────────────────────────────────────────────────────────

  const advFerialMatch = lower.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday)\s+of\s+the\s+([\w-]+)\s+week\s+of\s+advent/,
  );
  if (advFerialMatch) {
    const feriaNum = DAY_TO_FERIA[advFerialMatch[1]];
    const weekNum  = ORDINALS[advFerialMatch[2]];
    if (feriaNum && weekNum) {
      if (monthNum === 11 && dayOfMonth >= 17 && dayOfMonth <= 24) {
        return { occasionCode: `A-${dayOfMonth}/12`, otWeekNum: null, liturgicalYear: yearCycle };
      }
      return { occasionCode: `${weekNum}A${feriaNum}`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  const advSundayMatch = lower.match(/^([\w-]+)\s+sunday\s+of\s+advent/);
  if (advSundayMatch) {
    const weekNum = ORDINALS[advSundayMatch[1]];
    if (weekNum) {
      return { occasionCode: `${weekNum}A1`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  // Special check for ferial late Advent by date (Dec 17-24)
  if (monthNum === 11 && dayOfMonth >= 17 && dayOfMonth <= 24 && date.getDay() !== 0) {
    return { occasionCode: `A-${dayOfMonth}/12`, otWeekNum: null, liturgicalYear: yearCycle };
  }

  // ── Lent Season ──────────────────────────────────────────────────────────────

  const lentFerialMatch = lower.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday)\s+of\s+the\s+([\w-]+)\s+week\s+(?:of|in)\s+(?:lent|passiontide)/,
  );
  if (lentFerialMatch) {
    const feriaNum = DAY_TO_FERIA[lentFerialMatch[1]];
    const weekNum  = ORDINALS[lentFerialMatch[2]];
    if (feriaNum && weekNum) {
      return { occasionCode: `${weekNum}Q${feriaNum}`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  const lentSundayMatch = lower.match(/^([\w-]+)\s+sunday\s+(?:of|in)\s+(?:lent|passiontide)/);
  if (lentSundayMatch) {
    const weekNum = ORDINALS[lentSundayMatch[1]];
    if (weekNum) {
      return { occasionCode: `${weekNum}Q1`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  // ── Easter Season ────────────────────────────────────────────────────────────

  const easterFerialMatch = lower.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday)\s+of\s+the\s+([\w-]+)\s+week\s+(?:of|in)\s+easter/,
  );
  if (easterFerialMatch) {
    const feriaNum = DAY_TO_FERIA[easterFerialMatch[1]];
    const weekNum  = ORDINALS[easterFerialMatch[2]];
    if (feriaNum && weekNum) {
      return { occasionCode: `${weekNum}P${feriaNum}`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  const easterSundayMatch = lower.match(/^([\w-]+)\s+sunday\s+(?:of|in)\s+easter/);
  if (easterSundayMatch) {
    const weekNum = ORDINALS[easterSundayMatch[1]];
    if (weekNum) {
      return { occasionCode: `${weekNum}P1`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  // Easter Octave ferial
  if (
    lower.includes('octave of easter') || lower.includes('easter monday') ||
    lower.includes('easter tuesday') || lower.includes('easter wednesday') ||
    lower.includes('easter thursday') || lower.includes('easter friday') ||
    lower.includes('easter saturday')
  ) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek > 0) {
      return { occasionCode: `1P${dayOfWeek + 1}`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  // ── Italian Name Fallbacks ───────────────────────────────────────────────────

  const IT_ORDINALS: Record<string, number> = {
    i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7,
    prima:1, seconda:2, terza:3, quarta:4, quinta:5, sesta:6, settima:7,
    primo:1, secondo:2, terzo:3, quarto:4, quinto:5, sesto:6, settimo:7,
  };
  const IT_DAYS: Record<string, number> = {
    lunedi:2, lunedì:2, martedi:3, martedì:3, mercoledi:4, mercoledì:4,
    giovedi:5, giovedì:5, venerdi:6, venerdì:6, sabato:7,
  };

  if (lower.includes('avvento')) {
    const itAdv = lower.match(/^(lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato)\s+(?:della|del)\s+([\w-]+)\s+settimana/);
    if (itAdv) {
      const feriaNum = IT_DAYS[itAdv[1]], weekNum = IT_ORDINALS[itAdv[2]];
      if (feriaNum && weekNum) {
        if (monthNum === 11 && dayOfMonth >= 17 && dayOfMonth <= 24) {
          return { occasionCode: `A-${dayOfMonth}/12`, otWeekNum: null, liturgicalYear: yearCycle };
        }
        return { occasionCode: `${weekNum}A${feriaNum}`, otWeekNum: null, liturgicalYear: yearCycle };
      }
    }
    const itAdvSun = lower.match(/^([\w-]+)\s+domenica/);
    if (itAdvSun) {
      const weekNum = IT_ORDINALS[itAdvSun[1]];
      if (weekNum) return { occasionCode: `${weekNum}A1`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  } else if (lower.includes('quaresima')) {
    const itLent = lower.match(/^(lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato)\s+(?:della|del)\s+([\w-]+)\s+settimana/);
    if (itLent) {
      const feriaNum = IT_DAYS[itLent[1]], weekNum = IT_ORDINALS[itLent[2]];
      if (feriaNum && weekNum) return { occasionCode: `${weekNum}Q${feriaNum}`, otWeekNum: null, liturgicalYear: yearCycle };
    }
    const itLentSun = lower.match(/^([\w-]+)\s+domenica/);
    if (itLentSun) {
      const weekNum = IT_ORDINALS[itLentSun[1]];
      if (weekNum) return { occasionCode: `${weekNum}Q1`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  } else if (lower.includes('pasqua')) {
    const itEaster = lower.match(/^(lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato)\s+(?:della|del)\s+([\w-]+)\s+settimana/);
    if (itEaster) {
      const feriaNum = IT_DAYS[itEaster[1]], weekNum = IT_ORDINALS[itEaster[2]];
      if (feriaNum && weekNum) return { occasionCode: `${weekNum}P${feriaNum}`, otWeekNum: null, liturgicalYear: yearCycle };
    }
    const itEasterSun = lower.match(/^([\w-]+)\s+domenica/);
    if (itEasterSun) {
      const weekNum = IT_ORDINALS[itEasterSun[1]];
      if (weekNum) return { occasionCode: `${weekNum}P1`, otWeekNum: null, liturgicalYear: yearCycle };
    }
    if (lower.includes('ottava')) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek > 0) return { occasionCode: `1P${dayOfWeek + 1}`, otWeekNum: null, liturgicalYear: yearCycle };
    }
  }

  return { occasionCode: null, otWeekNum: null, liturgicalYear: yearCycle };
}
