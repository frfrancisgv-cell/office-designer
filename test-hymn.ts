import { getHyms } from './app/api/ibreviary/gabc-loaders';

function officeFilters(hour: string, isFirstVespers: boolean = false): string[] {
  switch (hour.toLowerCase()) {
    case 'vespers':  return isFirstVespers ? ['1V', 'V', 'v'] : ['2V', 'V', 'v'];
    case 'lauds':    return ['L', 'l'];
    case 'matins': case 'office-of-readings': case 'office_of_readings': return ['N', 'Ol'];
    case 'terce': case 'sext': case 'none': return ['T', 'S', 'Hm'];
    case 'compline': return ['C', 'c'];
    default: return [];
  }
}

function officeMatches(officeStr: string, filters: string[]): boolean {
  if (filters.length === 0) return true;
  const tokens = officeStr.split(/[,/\s]+/).map(t => t.trim()).filter(Boolean);
  return filters.some(f => tokens.includes(f));
}

const getH = getHyms();
const seasonCode = "1.3H1";
const validFilters = officeFilters('vespers', false);

const results = getH.filter(e =>
      e.seasonCode.toLowerCase() === seasonCode.toLowerCase() &&
      officeMatches(e.officePart, validFilters)
);

console.log("Filters:", validFilters);
console.log("Results count:", results.length);
results.forEach(r => console.log(r.incipit, r.officePart));
