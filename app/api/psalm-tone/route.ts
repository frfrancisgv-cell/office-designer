import { NextRequest, NextResponse } from 'next/server';
import { PSALM_TONES } from '@/lib/psalm-tones/tone-data';
import { pointPsalm, NO_FORMULA_PREFIX } from '@/lib/psalm-tones/psalm-tone-engine';
import { applyPsalmTone } from '@/lib/psalm-tones/psalmtone-wrapper';

/**
 * POST /api/psalm-tone
 *
 * The tone catalogue itself is not served here: the client imports
 * getToneNames/getVariants/getPresetGabc straight from lib/psalm-tones/tone-data.
 *
 * Body (JSON):
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

  if (action === 'point') {
    const { text, tone, variant = '', customMediant, customTermination, lang = 'en', solemn, intonationEveryVerse } = body as Record<string, string | boolean>;
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
        intonationEveryVerse: Boolean(intonationEveryVerse),
      });

      // Generate GABC for the first verse (first non-empty line)
      let gabcScore = '';
      const lines = String(text).split('\n');
      const firstVerseLine = lines.find(line => line.trim().length > 0) || '';
      
      if (firstVerseLine) {
        try {
          const spec = tone ? PSALM_TONES[String(tone)] : undefined;
          let med = customMediant ? String(customMediant) : '';
          let term = customTermination ? String(customTermination) : '';
          
          if (!med && !term && spec) {
            med = (Boolean(solemn) && spec.solemn) ? spec.solemn : spec.mediant;
            term = spec.terminations ? (spec.terminations[String(variant)] || Object.values(spec.terminations)[0] || spec.mediant) : (spec.termination || spec.mediant);
          }
          
          const clef = spec?.clef || 'c4';
          const textLanguage = lang === 'la' ? 'la' : 'en';

          // Only the first verse is engraved, and the first verse always
          // carries the intonation. When the first half is too short to hold
          // the whole formula, psalmtone.js drops the intonation unless it is
          // told to keep it (`favor.intonation`, psalmtone.js:1006) — so
          // "Magníficat", four syllables, came out as Ma(h)gní(g)fi(h)cat(h.)
          // starting flat on the tenor instead of Ma(f)gní(gh)fi(h)cat(h.).
          const favor = 'intonation';

          // Split the text into mediant and termination halves based on `*`
          const parts = firstVerseLine.split('*');
          
          if (parts.length > 1) {
            // It has an asterisk
            const p1 = parts[0].trim();
            const p2 = parts[1].trim();
            
            const gabc1 = applyPsalmTone({ text: p1, gabc: med, clef, useBoldItalic: false, lang: textLanguage, favor });
            const gabc2 = applyPsalmTone({ text: p2, gabc: term, clef, useBoldItalic: false, lang: textLanguage });
            
            if (gabc1 && gabc2) {
              gabcScore = `(${clef}) ${gabc1} *(:) ${gabc2}`;
            }
          } else {
            // No asterisk, just apply mediant
            const gabc1 = applyPsalmTone({ text: firstVerseLine.trim(), gabc: med, clef, useBoldItalic: false, lang: textLanguage, favor });
            if (gabc1) {
              gabcScore = `(${clef}) ${gabc1}`;
            }
          }
        } catch (err) {
          console.warn('[psalm-tone] Failed to generate first verse GABC:', err);
        }
      }

      return NextResponse.json({ result: pointed, gabcScore });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // A tone with no formula is a bad request, not a server fault.
      if (message.startsWith(NO_FORMULA_PREFIX)) {
        console.warn('[psalm-tone]', message);
        return NextResponse.json({ error: message }, { status: 400 });
      }
      console.error('[psalm-tone] pointPsalm error:', e);
      return NextResponse.json({ error: 'Pointing failed: ' + message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
