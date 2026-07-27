import { NextRequest, NextResponse } from 'next/server';
import { getAnts, getHyms, getInvs, getGrego } from '../gabc-loaders';
import { resolveGabc, withAnnotation } from '../gabc-lookup';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const type = searchParams.get('type') || 'antiphon';

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const results = [];
  let limit = 20;

  if (type === 'antiphon' || type === 'invitatory') {
    const ants = type === 'invitatory' ? getInvs() : getAnts();
    for (const ant of ants) {
      if (ant.incipit.toLowerCase().includes(q)) {
        const rawGabc = resolveGabc(ant.gbId, ant.gabc);
        if (rawGabc) {
          results.push({
            incipit: ant.incipit,
            gabc: withAnnotation(rawGabc, ant.incipit, ant.mode),
            mode: ant.mode,
            office: 'office' in ant ? ant.office : 'INV',
            occasion: ant.occasion
          });
        }
        if (results.length >= limit) break;
      }
    }
  } else if (type === 'hymn') {
    const hyms = getHyms();
    for (const hym of hyms) {
      if (hym.incipit.toLowerCase().includes(q)) {
        const rawGabc = resolveGabc(hym.gregobaseId, "");
        if (rawGabc) {
          results.push({
            incipit: hym.incipit,
            gabc: withAnnotation(rawGabc, hym.incipit, 'Hymn.'),
            mode: "",
            office: hym.officePart,
            occasion: hym.seasonCode
          });
        }
        if (results.length >= limit) break;
      }
    }
  } else if (type === 'all') {
    const grego = getGrego();
    for (const key of Object.keys(grego)) {
      const g = grego[parseInt(key)];
      if (g && g.incipit.toLowerCase().includes(q)) {
        if (g.gabc) {
          results.push({
            incipit: g.incipit,
            gabc: withAnnotation(g.gabc, g.incipit, ''),
            mode: "",
            office: g.officePart || 'Misc',
            occasion: 'Gregobase'
          });
        }
        if (results.length >= limit) break;
      }
    }
  }

  return NextResponse.json({ results });
}
