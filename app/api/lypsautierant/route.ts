import { NextRequest, NextResponse } from 'next/server';
import { pointPsalmText, getModeNames, getVariations, ModeFamily, ModeName } from '@/lib/psalm-tones/lypsautierant-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'point') {
      const { text, family, mode, variation } = body as {
        text: string;
        family: ModeFamily;
        mode: ModeName;
        variation: string;
      };

      if (!text || !family || !mode || !variation) {
        return NextResponse.json({ error: 'Missing required fields: text, family, mode, variation' }, { status: 400 });
      }

      const result = pointPsalmText(text, family, mode, variation);
      return NextResponse.json(result);
    }

    if (action === 'variations') {
      const { family, mode } = body as { family: ModeFamily; mode: ModeName };
      if (!family || !mode) {
        return NextResponse.json({ error: 'Missing required fields: family, mode' }, { status: 400 });
      }
      const variations = getVariations(family, mode);
      return NextResponse.json({ variations });
    }

    if (action === 'modes') {
      return NextResponse.json({ modes: getModeNames() });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('lypsautierant API error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
