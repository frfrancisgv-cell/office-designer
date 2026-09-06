'use client';

import React, { useEffect, useState } from 'react';
import { Block, OfficeSettings } from '@/lib/types';
import { isPsalmRubric } from '@/lib/blocks';

interface SharePayload {
  blocks: Block[];
  settings: OfficeSettings;
  title?: string;
  createdAt?: number;
}

// Minimal GABC renderer for share view (same logic as office-editor.tsx)
function GabcViewRenderer({ gabc, baseFontSize = 12 }: { gabc: string; baseFontSize?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !gabc) return;
    const container = ref.current;

    let annotation = '';
    const sep = gabc.indexOf('%%');
    if (sep !== -1) {
      const annLines: string[] = [];
      for (const m of gabc.slice(0, sep).matchAll(/annotation:\s*([^;\n]+);/g)) {
        annLines.push(m[1].trim());
      }
      annotation = annLines.join('\n');
    }

    let safeGabc = gabc
      .replace(/<v>\\greheightstar<\/v>/g, ' *')
      .replace(/<v>\\GreDagger<\/v>/g, ' †')
      .replace(/<v>[^<]*<\/v>/g, '')
      .replace(/<sp>V\/<\/sp>/g, '℣')
      .replace(/<sp>R\/<\/sp>/g, '℟')
      .replace(/<sp>[^<]*<\/sp>/g, '')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    if (safeGabc.includes('%%')) safeGabc = safeGabc.slice(safeGabc.indexOf('%%') + 2).trim();

    const tryRender = () => {
      const ex = (window as any).exsurge;
      if (!ex) { setTimeout(tryRender, 400); return; }
      try {
        const ctxt = new ex.ChantContext();
        ctxt.lyricTextFont = "'EB Garamond', Georgia, serif";
        ctxt.lyricTextSize = 16 * (baseFontSize / 12);
        const chantScale = 0.88;
        ctxt.glyphScaling *= chantScale;
        ctxt.staffInterval *= chantScale;
        ctxt.intraNeumeSpacing *= chantScale;
        const width = container.clientWidth || 600;
        const layoutWidth = width;
        const mappings = ex.Gabc.createMappingsFromSource(ctxt, safeGabc);
        const score = new ex.ChantScore(ctxt, mappings, true);
        // Set annotation on score (not ctxt) — correct exsurge API
        if (annotation) score.annotation = new ex.Annotation(ctxt, annotation);
        score.performLayoutAsync(ctxt, () => {
          score.layoutChantLines(ctxt, layoutWidth, () => {
            // Keep the annotation clear of the large initial. Exsurge assigns
            // its default position during layoutChantLines, so adjust it here.
            if (score.annotation) {
              score.annotation.bounds.y -= ctxt.staffInterval;
            }
            container.innerHTML = score.createSvg(ctxt);
            const svg = container.querySelector('svg');
            if (svg) {
              const height = Number(svg.getAttribute('height')) || score.bounds.height;
              svg.setAttribute('viewBox', `0 0 ${layoutWidth} ${height}`);
              svg.style.width = '100%';
              svg.style.height = 'auto';
              svg.style.display = 'block';
            }
          });
        });
      } catch { container.innerHTML = `<pre class="text-xs text-gray-400">${safeGabc.slice(0, 100)}</pre>`; }
    };
    tryRender();
  }, [gabc, baseFontSize]);

  return <div ref={ref} className="w-full my-1" />;
}

function BlockView({
  block, rubricColor, baseFontSize, centerRubric = false,
}: {
  block: Block;
  rubricColor: string;
  baseFontSize: number;
  centerRubric?: boolean;
}) {
  const isRubric = block.type === 'rubric' || block.type === 'subheading';
  const style = isRubric || block.type === 'heading' ? { color: rubricColor } : {};

  switch (block.type) {
    case 'heading':
      return <h2 className="text-center text-lg font-serif font-normal uppercase tracking-wide mt-6 mb-1" style={style}>{block.content}</h2>;
    case 'subheading':
      return <h3 className="text-center text-base italic mb-1" style={style}>{block.content}</h3>;
    case 'rubric':
      return <p className={`text-[0.9em] italic mb-1 ${centerRubric ? 'text-center' : ''}`} style={style}>{block.content}</p>;
    case 'antiphon':
    case 'hymn':
      return (
        <div className="mb-2">
          {block.gabcScore
            ? <>
                <GabcViewRenderer gabc={block.gabcScore} baseFontSize={baseFontSize} />
                {block.content && <p className="text-[0.82em] italic text-center text-gray-600 mt-0.5">{block.content}</p>}
              </>
            : <p className="italic text-justify">{block.content}</p>
          }
        </div>
      );
    case 'psalm':
      return block.gabcScore
        ? <div className="mb-2"><GabcViewRenderer gabc={block.gabcScore} baseFontSize={baseFontSize} /></div>
        : (
            <div className="mb-2 text-justify whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: block.content }} />
          );
    case 'psalm-prayer':
      return <p className="italic my-2 text-justify">{block.content}</p>;
    case 'text':
      return <p className="mb-1 text-justify whitespace-pre-wrap">{block.content}</p>;
    case 'page-break':
      return <hr className="my-4 border-dashed border-gray-300 print:break-after-page" />;
    default:
      return <p className="mb-1">{block.content}</p>;
  }
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/share?id=${id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setPayload)
      .catch(() => setError('This shared office booklet was not found or has expired.'));
  }, [id]);

  if (error) return (
    <main className="min-h-screen flex items-center justify-center text-gray-500">
      <p>{error}</p>
    </main>
  );
  if (!payload) return (
    <main className="min-h-screen flex items-center justify-center text-gray-400">
      <p>Loading…</p>
    </main>
  );

  const { blocks, settings, title, createdAt } = payload;
  const paperWidths: Record<string, string> = {
    Letter: '8.5in', HalfLetter: '5.5in', A4: '210mm', A5: '148mm',
  };
  const pageWidth = paperWidths[settings.paperSize] ?? '5.5in';
  const rubricColor = settings.rubricColor || '#C00000';
  const fontFamily = settings.fontFamily === 'sans' ? 'sans-serif' : 'Georgia, serif';
  const fontSize = `${settings.baseFontSize ?? 12}pt`;

  return (
    <>
      {/* Load exsurge for GABC rendering */}
      <script src="/exsurge.js" async />

      <div className="min-h-screen bg-gray-200 py-8 print:bg-white print:py-0">
        {/* View-only banner */}
        <div className="no-print text-center mb-4 text-xs text-gray-500 flex items-center justify-center gap-4">
          <span>View-only shared booklet{title ? `: ${title}` : ''}</span>
          {createdAt && <span>· Created {new Date(createdAt).toLocaleDateString()}</span>}
          <button
            onClick={() => window.print()}
            className="px-3 py-1 bg-gray-800 text-white rounded text-xs hover:bg-black"
          >Print / Save PDF</button>
        </div>

        <div
          className="mx-auto bg-white shadow-xl px-10 py-10 print:shadow-none print:px-0 print:py-0"
          style={{ maxWidth: pageWidth, fontFamily, fontSize, lineHeight: '1.3' }}
        >
          {blocks.map((block, idx) => (
            <React.Fragment key={block.id}>
              <BlockView
                block={block}
                rubricColor={rubricColor}
                baseFontSize={settings.baseFontSize ?? 12}
                centerRubric={isPsalmRubric(blocks, idx)}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 15mm; }
        }
      `}</style>
    </>
  );
}
