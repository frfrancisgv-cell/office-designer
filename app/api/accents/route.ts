/**
 * GET  /api/accents
 *   → the whole saved-corrections store: `{ version, words, texts }`.
 *     Small enough to send at once (a few hundred psalms of text), and sending
 *     it whole is what lets the accent editor match a text and accentuate a
 *     new one without a round trip per block.
 *
 * POST /api/accents  { action: 'save', accents, label? }
 *   → `{ store, learned }`. Keeps the corrected text whole, and learns the
 *     words whose accent was moved off the dictionary's syllable. `learned`
 *     names the words the word layer took from this text, for telling the user
 *     what the save will fix elsewhere.
 *
 * POST /api/accents  { action: 'forget', text }
 *   → `{ store }`. Drops the saved copy of that text. The word layer stays:
 *     a wrongly-stressed word is wrong independently of the psalm it was
 *     noticed in.
 *
 * The store is `data/accent-corrections.json`, in the repository — it is the
 * user's own editorial work, and belongs where it can be read, diffed and
 * carried to another machine with the app. All the deciding is in
 * lib/psalm-tones/accent-corrections.ts; this route only reads and writes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  EMPTY_CORRECTIONS,
  forgetTextAccents,
  learnWordAccents,
  mergeWordAccents,
  parseCorrections,
  saveTextAccents,
  type AccentCorrections,
} from '@/lib/psalm-tones/accent-corrections';

const DIR = join(process.cwd(), 'data');
const FILE = join(DIR, 'accent-corrections.json');

function read(): AccentCorrections {
  try {
    return parseCorrections(JSON.parse(readFileSync(FILE, 'utf8')));
  } catch {
    // Missing on a fresh checkout, or hand-edited into something unreadable.
    // Either way an empty store is the right answer: the editor still works,
    // and the next save writes a good file.
    return EMPTY_CORRECTIONS;
  }
}

function write(store: AccentCorrections): void {
  mkdirSync(DIR, { recursive: true });
  // Two spaces and a trailing newline: this file is read by people in a diff.
  const json = JSON.stringify(store, null, 2) + '\n';
  // Through a temporary name, so an interrupted write cannot leave the store
  // truncated — losing every correction ever made to save one.
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, json, 'utf8');
  renameSync(tmp, FILE);
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(read());
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { action, accents, text, label } = (body ?? {}) as {
    action?: string; accents?: string; text?: string; label?: string;
  };

  try {
    if (action === 'save') {
      if (typeof accents !== 'string' || !accents.trim()) {
        return NextResponse.json({ error: 'Missing required field: accents' }, { status: 400 });
      }
      const taught = learnWordAccents(accents);
      const store = mergeWordAccents(
        saveTextAccents(read(), accents, typeof label === 'string' ? label : undefined),
        taught,
      );
      write(store);
      const learned = [...taught].filter(([, at]) => at !== null).map(([word]) => word);
      return NextResponse.json({ store, learned });
    }

    if (action === 'forget') {
      if (typeof text !== 'string' || !text.trim()) {
        return NextResponse.json({ error: 'Missing required field: text' }, { status: 400 });
      }
      const store = forgetTextAccents(read(), text);
      write(store);
      return NextResponse.json({ store });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('accents API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
