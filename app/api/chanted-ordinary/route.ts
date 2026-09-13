import { NextResponse } from 'next/server';
import { getGrego } from '@/app/api/ibreviary/gabc-loaders';
import { ORDINARY_CHANTS } from '@/lib/chanted-ordinary';

/**
 * GET /api/chanted-ordinary
 *
 * The GABC for every setting in the sung-ordinary catalogue, keyed by its
 * gregobase id: `{ gabc: { "4121": "(c3)De(h)us…" }, missing: [] }`.
 *
 * The whole catalogue goes at once — seventeen scores, a few kilobytes — rather
 * than the two or three an office happens to want. The client fetches it once
 * per office and the alternative is a request per part, for data that never
 * changes between them.
 *
 * `missing` names any catalogue row `gregobase-cache.json` has no score for.
 * That would be a fault in the catalogue rather than in the office, and saying
 * so beats an office quietly reverting one part of its ordinary to plain text.
 */
export async function GET() {
  try {
    const cache = getGrego();
    const gabc: Record<string, string> = {};
    const missing: string[] = [];
    for (const chant of ORDINARY_CHANTS) {
      const entry = cache[chant.id];
      if (entry?.gabc) gabc[chant.id] = entry.gabc;
      else missing.push(chant.id);
    }
    if (missing.length) console.warn(`[ordinary] no score in gregobase for ${missing.join(', ')}`);
    return NextResponse.json({ gabc, missing });
  } catch (error) {
    console.error('[ordinary] could not read the chant cache:', error);
    return NextResponse.json({ error: 'Could not read the Gregorian chant cache.' }, { status: 500 });
  }
}
