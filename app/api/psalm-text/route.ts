import { NextRequest, NextResponse } from 'next/server';
import { getEntryByKey, getPsalmText, getCanticleText, listAllKeys, PsalmCollection } from '@/lib/psalm-tones/psalm-index';
import { hebrewToVulgate } from '@/lib/liturgy/psalm-numbering';
import { getLatinPsalmText, getLatinCanticleText, getLatinGospelCanticleText } from '@/lib/liturgy/latin-texts';
import { getEnglishGospelCanticleText } from '@/lib/liturgy/english-canticles';
import type { GospelCanticle } from '@/lib/liturgy/english-canticles';

/**
 * GET /api/psalm-text
 *
 * Query params:
 *   psalm=N          — psalm number (e.g. 117, 119.1-8)
 *   ot=N / nt=N      — OT or NT canticle number
 *   key=xxx          — raw normalised key (e.g. "psalm-117", "ot-3")
 *   collection=grail|abbey  — preferred collection (default: grail)
 *   list=true        — list all available keys
 *
 * Returns: { key, title, rawText, verses, source } or { error }
 */
/** Strip leading title lines like "Psalm 1", "OT 3" from rawText */
function cleanEntry(entry: any) {
  if (!entry || !entry.rawText) return entry;
  const rawText = entry.rawText.replace(/^(?:Psalm|Canticle|OT|NT)\s+[\d.A-Za-z-]+\s*\n+/i, '').trim();
  return { ...entry, rawText };
}



function getLocalLatinPsalm(hebrewNumStr: string) {
  const rawText = getLatinPsalmText(hebrewNumStr);
  if (!rawText) return null;
  return {
    key: `jgabc-psalm-${hebrewNumStr}`,
    title: `Psalmus ${hebrewToVulgate(hebrewNumStr)}`,
    rawText,
    lang: 'la',
    source: 'jgabc-local',
  };
}

async function fetchJgabcLatinPsalm(hebrewNumStr: string) {
  const local = getLocalLatinPsalm(hebrewNumStr);
  if (local) return local;

  const vulgateNum = hebrewToVulgate(hebrewNumStr);
  const padded = String(vulgateNum).padStart(3, '0') + '.txt';
  const url = `https://raw.githubusercontent.com/bbloomf/jgabc/master/psalms/${padded}`;
  
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const text = await res.text();
    const cleanText = text
      .replace(/^\uFEFF/, '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');
      
    const doxology = "\n\nGlória Patri, et Fílio, * et Spirítui Sancto.\nSicut erat in princípio, et nunc, et semper, * et in sǽcula sæculórum. Amen.";

    return {
      key: `jgabc-psalm-${hebrewNumStr}`,
      title: `Psalmus ${vulgateNum}`,
      rawText: cleanText + doxology,
      lang: 'la',
      source: 'jgabc-remote',
    };
  } catch (err) {
    console.error('[fetchJgabcLatinPsalm] error:', err);
    return null;
  }
}


export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('list') === 'true') {
    return NextResponse.json({ keys: listAllKeys() });
  }

  const collection = searchParams.get('collection');
  // `collection` may legitimately be 'jgabc', which is a *source* of Latin
  // text and not one of the indexed English collections. Narrowing it here
  // keeps that value from being cast straight into getPsalmText, where it
  // matched nothing and the caller saw a bare 404.
  const englishCollection: PsalmCollection = collection === 'abbey' ? 'abbey' : 'grail';
  const lang = searchParams.get('lang');

  if (searchParams.has('psalm')) {
    const psalmNum = searchParams.get('psalm')!;
    
    const canticleMatch = psalmNum.match(/^(OT|NT)\s+(\d+)$/i);
    if (canticleMatch) {
      if (collection === 'jgabc' || lang === 'la') {
        const type = canticleMatch[1].toLowerCase() as 'ot' | 'nt';
        const num = parseInt(canticleMatch[2], 10);
        const rawText = getLatinCanticleText(type, num);
        if (!rawText) {
          return NextResponse.json({ error: `Canticle ${psalmNum} has no Latin text mapped yet` }, { status: 404 });
        }
        return NextResponse.json({
          key: `jgabc-${type}-${num}`,
          title: `Canticum ${type.toUpperCase()} ${num}`,
          rawText,
          lang: 'la',
          source: 'jgabc-local',
        });
      }
      const type = canticleMatch[1].toLowerCase() as 'ot' | 'nt';
      const num = parseInt(canticleMatch[2], 10);
      const entry = getCanticleText(type, num);
      if (!entry) return NextResponse.json({ error: `No text for canticle ${type.toUpperCase()} ${num}` }, { status: 404 });
      return NextResponse.json(cleanEntry(entry));
    }

    // Check if it's a Gospel canticle
    const gospelMatch = psalmNum.match(/^(Magnificat|Benedictus|Nunc dimittis)$/i);
    if (gospelMatch) {
      if (collection === 'jgabc' || lang === 'la') {
        const canticleName = gospelMatch[1];
        const rawText = getLatinGospelCanticleText(canticleName);
        if (!rawText) {
          return NextResponse.json({ error: `No Latin text on file for ${canticleName}` }, { status: 404 });
        }
        return NextResponse.json({
          key: `jgabc-canticle-${canticleName.toLowerCase().replace(' ', '-')}`,
          title: canticleName,
          rawText,
          lang: 'la',
          source: 'jgabc-local',
        });
      } else {
        const mappings: Record<string, string> = {
          'benedictus': 'benedictus',
          'magnificat': 'magnificat',
          'nunc dimittis': 'nunc-dimittis',
        };
        const grailKey = mappings[gospelMatch[1].toLowerCase()];
        if (grailKey) {
          const entry = getPsalmText(grailKey, englishCollection);
          if (entry) return NextResponse.json(cleanEntry(entry));
          
          // English Fallback if not found in indexed collection
          // The Abbey Psalms and Canticles carry all three in full; the
          // two-verse tables below are the last resort, not the source.
          const abbeyText = getEnglishGospelCanticleText(
            (gospelMatch[1].toLowerCase() === 'nunc dimittis' ? 'Nunc dimittis'
              : gospelMatch[1].charAt(0).toUpperCase() + gospelMatch[1].slice(1).toLowerCase()) as GospelCanticle,
          );
          if (abbeyText) {
            return NextResponse.json({
              key: `canticle-${grailKey}`,
              title: gospelMatch[1],
              rawText: abbeyText,
              lang: 'en',
              source: 'abbey-psalms-and-canticles',
            });
          }

          const englishFallbacks: Record<string, string> = {
            'benedictus': 'Bléssed be the Lórd, the Gód of Ísrael;\nhe has cóme to his péople and sét them frée.',
            'magnificat': 'My sóul glorífies the Lórd,\nmy spírit rejóices in Gód, my Sávior.',
            'nunc dimittis': 'Lórd, now you lét your sérvant gó in péace;\nyour wórd has béen fulfílled.'
          };
          const fallbackText = englishFallbacks[gospelMatch[1].toLowerCase()];
          
          if (fallbackText) {
            return NextResponse.json({
              key: `canticle-${grailKey}`,
              title: gospelMatch[1],
              rawText: fallbackText,
              lang: 'en',
              source: 'fallback'
            });
          }
        }
        return NextResponse.json({ error: `No English text for ${gospelMatch[1]}` }, { status: 404 });
      }
    }

    // Standard psalm fallback
    if (collection === 'jgabc' || lang === 'la') {
      const latinEntry = await fetchJgabcLatinPsalm(psalmNum);
      if (latinEntry) return NextResponse.json(latinEntry);
      // Do not fall through to the English index. The caller asked for Latin
      // and marks the block lang='la' on any 200, so an English psalm handed
      // back here was pointed and typeset as though it were Latin.
      return NextResponse.json({ error: `No Latin text on file for Psalm ${psalmNum}` }, { status: 404 });
    }
    const entry = getPsalmText(psalmNum, englishCollection);
    if (!entry) return NextResponse.json({ error: `No ${englishCollection} text for Psalm ${psalmNum}` }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  if (searchParams.has('key')) {
    const entry = getEntryByKey(searchParams.get('key')!);
    if (!entry) return NextResponse.json({ error: `No entry for key "${searchParams.get('key')}"` }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  if (searchParams.has('ot')) {
    const entry = getCanticleText('ot', parseInt(searchParams.get('ot')!, 10));
    if (!entry) return NextResponse.json({ error: `No text for canticle OT ${searchParams.get('ot')}` }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  if (searchParams.has('nt')) {
    const entry = getCanticleText('nt', parseInt(searchParams.get('nt')!, 10));
    if (!entry) return NextResponse.json({ error: `No text for canticle NT ${searchParams.get('nt')}` }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  return NextResponse.json({ error: 'Provide psalm=N, ot=N, nt=N, key=xxx, or list=true' }, { status: 400 });
}


