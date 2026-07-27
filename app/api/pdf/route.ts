import { NextRequest, NextResponse } from 'next/server';
import { Block, OfficeSettings } from '@/lib/types';
import { buildLatexDocument } from '@/lib/latex/renderer';
import { renderPdf, checkLatexInstall } from '@/lib/latex/process';

// ---------------------------------------------------------------------------
// POST /api/pdf
// ---------------------------------------------------------------------------
// Body: { blocks: Block[], settings: OfficeSettings }
// Returns: application/pdf binary, or JSON error

export async function POST(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const format = url.searchParams.get('format'); // 'pdf' (default) or 'tex'
  const filenameParam = url.searchParams.get('filename') || 'divine-office';
  const safeFilename = filenameParam.replace(/[^a-zA-Z0-9_-]/g, '') || 'divine-office';

  let body: { blocks: Block[]; settings: OfficeSettings };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { blocks, settings } = body;

  if (!Array.isArray(blocks) || !settings) {
    return NextResponse.json(
      { error: 'Request must include blocks (array) and settings (object)' },
      { status: 400 },
    );
  }

  // Build LaTeX source
  const { texContent, gabcFiles } = buildLatexDocument(blocks, settings);

  // Return raw .tex + .gabc files as a zip-like text bundle when format=tex
  if (format === 'tex') {
    const gabcSection = Object.entries(gabcFiles)
      .map(([name, content]) => `\n%% === ${name} ===\n${content}`)
      .join('\n');
    const bundle = `%% === office.tex ===\n${texContent}${gabcSection ? '\n' + gabcSection : ''}`;
    return new NextResponse(bundle, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}.tex"`,
      },
    });
  }

  // Run lualatex
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderPdf({ texContent, auxFiles: gabcFiles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/pdf] lualatex error:', message);
    return NextResponse.json(
      { error: 'PDF rendering failed', detail: message },
      { status: 500 },
    );
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/pdf  — health / dependency check
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const info = await checkLatexInstall();
  const ok = Boolean(info.lualatex);
  return NextResponse.json(info, { status: ok ? 200 : 503 });
}
