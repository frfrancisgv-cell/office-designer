import { NextRequest, NextResponse } from 'next/server';
import { generateCanonicalOffice } from '@/lib/liturgy/office-engine';

/**
 * GET /api/liturgy
 *
 * Offline Liturgical Office Generator API
 * Query params:
 *   date        — ISO date string (YYYY-MM-DD)
 *   hour        — lauds | vespers | compline | terce | sext | none | readings
 *   lang        — en | la (default: en)
 *   collection  — grail | abbey (default: grail)
 *   psalterWeek — 1 | 2 | 3 | 4 (default: 1)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const hour = (searchParams.get('hour') || 'vespers').toLowerCase() as any;
  const lang = (searchParams.get('lang') || 'en') as 'en' | 'la';
  const collection = (searchParams.get('collection') || 'grail') as 'grail' | 'abbey';
  const psalterWeek = parseInt(searchParams.get('psalterWeek') || '1', 10) as 1 | 2 | 3 | 4;

  try {
    const blocks = generateCanonicalOffice({
      date: new Date(dateParam),
      hour,
      lang,
      collection,
      psalterWeek,
    });

    return NextResponse.json({
      blocks,
      source: 'offline-engine',
      psalterWeek,
      hour,
      lang,
    });
  } catch (error) {
    console.error('Error generating office:', error);
    return NextResponse.json(
      { error: 'Failed to generate offline office: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
