/**
 * POST /api/share
 * Body: { blocks: Block[], settings: OfficeSettings, title?: string }
 * Returns: { id: string, url: string }
 *
 * GET /api/share?id=xxx
 * Returns: the stored JSON payload
 *
 * Files are stored in /tmp/office-shares/<id>.json
 * Cleanup of files older than ~30 days is done opportunistically on each POST.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const SHARE_DIR = '/tmp/office-shares';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function ensureDir() {
  try { mkdirSync(SHARE_DIR, { recursive: true }); } catch { /* exists */ }
}

function cleanup() {
  try {
    const files = readdirSync(SHARE_DIR);
    const cutoff = Date.now() - MAX_AGE_MS;
    for (const f of files) {
      try {
        const st = statSync(join(SHARE_DIR, f));
        if (st.mtimeMs < cutoff) unlinkSync(join(SHARE_DIR, f));
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  ensureDir();
  cleanup(); // opportunistic cleanup on every write

  const id = randomBytes(8).toString('hex'); // 16-char hex ID
  const payload = JSON.stringify({ ...body as object, createdAt: Date.now() });
  writeFileSync(join(SHARE_DIR, `${id}.json`), payload, 'utf8');

  const origin = request.headers.get('origin') || request.headers.get('x-forwarded-proto')
    ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
    : '';
  const url = `${origin}/share/${id}`;

  return NextResponse.json({ id, url });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^[0-9a-f]{16}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    const data = readFileSync(join(SHARE_DIR, `${id}.json`), 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
