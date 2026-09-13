import { NextRequest, NextResponse } from 'next/server';
import { getLiturgicalContext } from '@/lib/liturgy/calendar-context';
import type { OfficeHour } from '@/lib/liturgy/calendar-context';
import { sundayCollectFor } from '@/lib/liturgy/offline-propers';

const HOURS = ['lauds', 'vespers', 'compline', 'terce', 'sext', 'none', 'readings'];

/**
 * GET /api/sunday-collect?date=YYYY-MM-DD&hour=vespers
 *
 * The collect of the week's Sunday for a weekday of Ordinary Time, which is
 * what such a day says in place of the psalter's own prayer:
 * `{ prayer, week }`, or `{ prayer: null }` on any day that does not take one.
 *
 * It is read out of the same book, and by the same reading, that the offline
 * engine uses when a day has no collect at all — `vendor/psautier/seasons/Psalter`,
 * the 34 Sundays of Ordinary Time. It is served on its own because an office
 * scraped from iBreviary never passes through that engine, and the preference
 * is about the office rather than about where it was loaded from.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const hour = (searchParams.get('hour') || 'vespers').toLowerCase() as OfficeHour;

  try {
    const date = new Date(dateParam + 'T00:00:00.000Z');
    if (Number.isNaN(date.getTime())) throw new Error('date must be YYYY-MM-DD');
    if (!HOURS.includes(hour)) throw new Error(`unsupported hour: ${hour}`);
    const context = await getLiturgicalContext(date, hour);
    const collect = sundayCollectFor(context, hour);
    return NextResponse.json({
      prayer: collect?.prayer ?? null,
      week: collect?.week ?? null,
      rank: context.rank,
      season: context.season,
    });
  } catch (error) {
    console.error('[sunday-collect]', error);
    return NextResponse.json(
      { error: 'Could not read the Sunday collect: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    );
  }
}
