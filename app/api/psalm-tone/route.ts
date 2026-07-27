import { NextRequest, NextResponse } from 'next/server';
import { getToneNames, getVariants, PSALM_TONES } from '@/lib/psalm-tones/tone-data';
import { parseToneFromAnnotation } from '@/lib/psalm-tones/parse-annotation';
import { pointPsalm } from '@/lib/psalm-tones/psalm-tone-engine';

/**
 * POST /api/psalm-tone
 *
 * Body (JSON):
 *   { action: 'list' }
 *     → returns all tone names and their variants
 *
 *   { action: 'parse', annotation: string }
 *     → parse tone + variant from annotation string
 *
 *   { action: 'variants', tone: string }
 *     → return variant codes for a specific tone
 *
 *   { action: 'spec', tone: string }
 *     → return full tone spec (GABC strings)
 *
 *   { action: 'point', text: string, tone: string, variant: string, lang?: 'en'|'la', solemn?: boolean }
 *     → point psalm text using the tone engine; returns { result: string } (HTML)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Record<string, string | boolean>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = body;

  if (action === 'list') {
    const names = getToneNames();
    const result = names.map(name => ({
      tone: name,
      variants: getVariants(name),
      clef: PSALM_TONES[name]?.clef ?? 'c4',
    }));
    return NextResponse.json({ tones: result });
  }

  if (action === 'parse') {
    const { annotation } = body as Record<string, string>;
    if (!annotation) return NextResponse.json({ error: 'annotation required' }, { status: 400 });
    const parsed = parseToneFromAnnotation(annotation);
    return NextResponse.json({ result: parsed });
  }

  if (action === 'variants') {
    const { tone } = body as Record<string, string>;
    if (!tone) return NextResponse.json({ error: 'tone required' }, { status: 400 });
    const variants = getVariants(tone);
    return NextResponse.json({ tone, variants });
  }

  if (action === 'spec') {
    const { tone } = body as Record<string, string>;
    if (!tone) return NextResponse.json({ error: 'tone required' }, { status: 400 });
    const spec = PSALM_TONES[tone];
    if (!spec) return NextResponse.json({ error: `Unknown tone: ${tone}` }, { status: 404 });
    return NextResponse.json({ tone, spec });
  }

  if (action === 'point') {
    const { text, tone, variant = '', customMediant, customTermination, lang = 'en', solemn } = body as Record<string, string | boolean>;
    if (!text || (!tone && !customMediant && !customTermination)) {
      return NextResponse.json({ error: 'text and either tone or custom GABC formulas are required' }, { status: 400 });
    }
    try {
      const pointed = pointPsalm({
        text: String(text),
        tone: tone ? String(tone) : undefined,
        variant: String(variant),
        customMediant: customMediant ? String(customMediant) : undefined,
        customTermination: customTermination ? String(customTermination) : undefined,
        lang: (lang === 'la' ? 'la' : 'en'),
        solemn: Boolean(solemn),
      });
      return NextResponse.json({ result: pointed });
    } catch (e) {
      console.error('[psalm-tone] pointPsalm error:', e);
      return NextResponse.json({ error: 'Pointing failed: ' + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
