import { NextRequest, NextResponse } from 'next/server';
import { syllabifyWord } from '@/lib/psalm-tones/psalm-tone-engine';

/**
 * POST /api/hyphenate
 * Body: { words: string[], lang: 'en' | 'la' }
 * Returns: { results: string[][] } — array of syllable arrays, one per word
 *
 * Uses English Phonetic Syllabifier (with Dictionary & Vowel Nucleus Rules) for English,
 * and Hypher TeX Liang for Latin.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { words: string[]; lang?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { words, lang = 'en' } = body;
  if (!Array.isArray(words)) {
    return NextResponse.json({ error: 'words must be an array' }, { status: 400 });
  }

  const results = words.map(word => {
    if (!word || typeof word !== 'string') return [word];
    // Strip leading/trailing non-alpha before hyphenating
    const leading = word.match(/^[^a-zA-ZÀ-ÖØ-öø-ÿ]*/)?.[0] ?? '';
    const trailing = word.match(/[^a-zA-ZÀ-ÖØ-öø-ÿ]*$/)?.[0] ?? '';
    const core = word.slice(leading.length, word.length - trailing.length);
    if (!core) return [word];

    const parts = syllabifyWord(core, (lang === 'la' ? 'la' : 'en') as 'en' | 'la');

    if (parts.length === 0) return [word];
    parts[0] = leading + parts[0];
    parts[parts.length - 1] = parts[parts.length - 1] + trailing;
    return parts;
  });

  return NextResponse.json({ results });
}

