import { NextRequest, NextResponse } from 'next/server';
import { getEntryByKey, getPsalmText, getCanticleText, listAllKeys, PsalmCollection } from '@/lib/psalm-tones/psalm-index';

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

function hebrewToVulgate(psalm: number | string): number {
  const n = parseInt(String(psalm).replace(/\D/g, ''), 10);
  if (isNaN(n)) return 1;
  if (n <= 8) return n;
  if (n >= 10 && n <= 113) return n - 1;
  if (n === 114 || n === 115) return 113;
  if (n === 116) return 114;
  if (n >= 117 && n <= 146) return n - 1;
  if (n === 147) return 146;
  if (n >= 148) return n;
  return n;
}

import fs from 'fs';
import path from 'path';

function getLocalLatinPsalm(hebrewNumStr: string) {
  const vulgateNum = hebrewToVulgate(hebrewNumStr);
  const padded = String(vulgateNum).padStart(3, '0') + '.txt';
  const filePath = path.join(process.cwd(), 'jgabc-psalms', padded);
  
  try {
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf8');
      const cleanText = text
        .replace(/^\uFEFF/, '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');

      return {
        key: `jgabc-psalm-${hebrewNumStr}`,
        title: `Psalmus ${vulgateNum}`,
        rawText: cleanText,
        lang: 'la',
        source: 'jgabc-local',
      };
    }
  } catch (err) {
    console.error('[getLocalLatinPsalm] error:', err);
  }
  return null;
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
      
    return {
      key: `jgabc-psalm-${hebrewNumStr}`,
      title: `Psalmus ${vulgateNum}`,
      rawText: cleanText,
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
  const lang = searchParams.get('lang');

  if (searchParams.has('psalm')) {
    const psalmNum = searchParams.get('psalm')!;
    if (collection === 'jgabc' || lang === 'la') {
      const latinEntry = await fetchJgabcLatinPsalm(psalmNum);
      if (latinEntry) return NextResponse.json(latinEntry);
    }
    const entry = getPsalmText(psalmNum, (collection ?? 'grail') as PsalmCollection);
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  if (searchParams.has('key')) {
    const entry = getEntryByKey(searchParams.get('key')!);
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  if (searchParams.has('ot')) {
    const entry = getCanticleText('ot', parseInt(searchParams.get('ot')!, 10));
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  if (searchParams.has('nt')) {
    const entry = getCanticleText('nt', parseInt(searchParams.get('nt')!, 10));
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(cleanEntry(entry));
  }

  return NextResponse.json({ error: 'Provide psalm=N, ot=N, nt=N, key=xxx, or list=true' }, { status: 400 });
}


