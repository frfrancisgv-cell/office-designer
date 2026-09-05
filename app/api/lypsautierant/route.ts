import { NextRequest, NextResponse } from 'next/server';
import {
  pointPsalmText,
  getVariations,
  hasVariation,
  ModeFamily,
  ModeName,
} from '@/lib/psalm-tones/lypsautierant-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'point') {
      const { text, family, mode, variation, lang } = body as {
        text: string;
        family: ModeFamily;
        mode: ModeName;
        variation: string;
        lang?: 'en' | 'la';
      };

      if (!text || !family || !mode || !variation) {
        return NextResponse.json({ error: 'Missing required fields: text, family, mode, variation' }, { status: 400 });
      }

      // The variations differ per mode — gregorian/two has only 'd', for
      // instance — so reject an unknown one with the list rather than
      // pointing the psalm with a silently wrong rule.
      if (!hasVariation(family, mode, variation)) {
        return NextResponse.json({
          error: `${family}/${mode} has no termination "${variation}"`,
          variations: getVariations(family, mode),
        }, { status: 400 });
      }

      // Default 'en': that is what upstream assumes, and it is what every
      // caller got before the Latin syllabifier existed.
      const result = pointPsalmText(text, family, mode, variation, lang === 'la' ? 'la' : 'en');
      return NextResponse.json(result);
    }

    if (action === 'variations') {
      const { family, mode } = body as { family: ModeFamily; mode: ModeName };
      if (!family || !mode) {
        return NextResponse.json({ error: 'Missing required fields: family, mode' }, { status: 400 });
      }
      return NextResponse.json({ variations: getVariations(family, mode) });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('lypsautierant API error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
