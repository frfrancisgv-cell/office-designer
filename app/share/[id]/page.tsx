'use client';

/**
 * /share/<id> — the office as prayed, on whatever device opened the link.
 *
 * This route intentionally contains no route back into the editor and no block
 * controls. What it does contain is a booklet that fits the device it is read
 * on: the sizing is worked out in lib/pray-view.ts, which explains why a paper
 * design cannot simply be reproduced on a phone. Everything here is measured
 * in em of the sheet's own type, so one reading size governs the words, the
 * chant, and the space between them together, and the whole booklet reflows
 * when the reader turns the phone or presses A+.
 *
 * Print is unaffected: the author's point size and real page box are restored
 * for paper.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Block, OfficeSettings } from '@/lib/types';
import { isPsalmRubric, isSuppressedAttribution } from '@/lib/blocks';
import { GabcRenderer, prepareGabcForPrint } from '@/components/GabcRenderer';
import {
  DEFAULT_PRAY_SCALE, PRAY_SCALE_KEY, basePointSizeOf, canStepPrayScale, clampPrayScale,
  gabcPointSizeForPx, printPageSize, readingFontPx, readingMeasureEm, readingPageWidthCss,
  stepPrayScale,
} from '@/lib/pray-view';

interface SharePayload {
  blocks: Block[];
  settings: OfficeSettings;
  title?: string;
  createdAt?: number;
}

function BlockView({
  block, rubricColor, baseFontSize, printBaseFontSize, centerRubric = false,
}: {
  block: Block;
  rubricColor: string;
  baseFontSize: number;
  printBaseFontSize: number;
  centerRubric?: boolean;
}) {
  const isRubric = block.type === 'rubric' || block.type === 'subheading';
  const style = isRubric || block.type === 'heading' ? { color: rubricColor } : {};

  switch (block.type) {
    case 'heading':
      return <h2 className="text-center text-[1.15em] font-serif font-normal uppercase tracking-wide mt-[1.5em] mb-[0.25em]" style={style}>{block.content}</h2>;
    case 'subheading':
      return <h3 className="text-center text-[1em] italic mb-[0.25em]" style={style}>{block.content}</h3>;
    case 'rubric':
      return <p className={`text-[0.9em] italic mb-[0.25em] ${centerRubric ? 'text-center' : ''}`} style={style}>{block.content}</p>;
    case 'antiphon':
    case 'invitatory-antiphon':
    case 'hymn':
      return (
        <div className="mb-[0.5em]">
          {block.gabcScore
            ? <>
                <GabcRenderer gabc={block.gabcScore} baseFontSize={baseFontSize} printBaseFontSize={printBaseFontSize} />
                {block.content && block.printTranslation !== false && <p className="text-[0.82em] italic text-center text-gray-600 mt-[0.125em]">{block.content}</p>}
              </>
            : <p className="italic text-justify">{block.content}</p>
          }
        </div>
      );
    case 'psalm':
      return block.gabcScore
        ? <div className="mb-[0.5em]"><GabcRenderer gabc={block.gabcScore} baseFontSize={baseFontSize} printBaseFontSize={printBaseFontSize} /></div>
        : (
            <div className="mb-[0.5em] text-justify whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: block.content }} />
          );
    case 'psalm-prayer':
      return <p className="italic my-[0.5em] text-justify">{block.content}</p>;
    case 'text':
      return <p className="mb-[0.25em] text-justify whitespace-pre-wrap">{block.content}</p>;
    case 'page-break':
      return <hr className="my-[1em] border-dashed border-gray-300 print:break-after-page" />;
    default:
      return <p className="mb-[0.25em]">{block.content}</p>;
  }
}

function readRootFontPx(): number {
  if (typeof window === 'undefined') return 16;
  return parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
}

/**
 * The reader's own root font size, which is the one thing about the device the
 * type is measured against — a phone or browser set to large text should give
 * a large booklet. The viewport is not consulted: how wide the sheet may be is
 * settled in CSS, and the width a device happens to have is no reason to set
 * the office in type its author did not ask for.
 *
 * Watched, because a browser's text size and page zoom can both change under
 * a reader who is already praying.
 */
function useRootFontPx(): number {
  const [rootFontPx, setRootFontPx] = useState<number>(readRootFontPx);

  useEffect(() => {
    // Rotation on iOS fires more than once as the viewport settles; only a
    // real change should relay out every chant score on the page.
    const measure = () => setRootFontPx(previous => {
      const next = readRootFontPx();
      return next === previous ? previous : next;
    });

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  return rootFontPx;
}

/**
 * The reading size the person holding the device chose, remembered on that
 * device. It is deliberately not part of the shared booklet: the author's
 * point size travels in the link, and this is the reader's own eyes.
 */
function usePrayScale() {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRAY_SCALE;
    try { return clampPrayScale(window.localStorage.getItem(PRAY_SCALE_KEY)); }
    catch (error) {
      console.warn('Could not read the saved reading size:', error);
      return DEFAULT_PRAY_SCALE;
    }
  });

  const step = useCallback((direction: 1 | -1) => {
    setScale(current => {
      const next = stepPrayScale(current, direction);
      try { window.localStorage.setItem(PRAY_SCALE_KEY, String(next)); }
      catch (error) { console.warn('Could not save the reading size:', error); }
      return next;
    });
  }, []);

  return { scale, step };
}

export default function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState('');
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const rootFontPx = useRootFontPx();
  const { scale, step } = usePrayScale();

  useEffect(() => {
    fetch(`/api/share?id=${id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setPayload)
      .catch(() => setError('This shared office booklet was not found or has expired.'));
  }, [id]);

  const handlePrint = async () => {
    setIsPreparingPrint(true);
    try {
      await prepareGabcForPrint();
      window.print();
    } finally {
      setIsPreparingPrint(false);
    }
  };

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
  const rubricColor = settings.rubricColor || '#C00000';
  const fontFamily = settings.fontFamily === 'sans' ? 'sans-serif' : 'Georgia, serif';
  const lineHeight = settings.lineSpacing === 'tight' ? '1.2' : settings.lineSpacing === 'relaxed' ? '1.6' : '1.35';

  // The size this device reads at, and the size its paper prints at.
  const readingPx = readingFontPx({ rootFontPx, scale, settings });
  const printPt = basePointSizeOf(settings);

  return (
    <>
      {/* Load exsurge for GABC rendering */}
      <script src="/exsurge.js" async />

      <div className="pray-view min-h-dvh overflow-x-hidden bg-[#f4f1ec] print:bg-white">
        <header className="no-print sticky top-0 z-10 flex min-h-12 items-center gap-2 border-b border-stone-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:gap-3 sm:px-4">
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-stone-900">{title || 'Pray this office'}</strong>
            <span className="block truncate text-[10px] uppercase tracking-wider text-stone-400">Read-only prayer view{createdAt ? ` · Shared ${new Date(createdAt).toLocaleDateString()}` : ''}</span>
          </div>
          <div className="flex shrink-0 items-center gap-px rounded-md border border-stone-300" role="group" aria-label="Reading size">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={!canStepPrayScale(scale, -1)}
              title="Smaller text"
              aria-label="Smaller text"
              className="rounded-l-md px-2 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-35 disabled:hover:bg-transparent"
            >A−</button>
            <span className="hidden w-10 text-center text-[10px] tabular-nums text-stone-400 sm:inline">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={!canStepPrayScale(scale, 1)}
              title="Larger text"
              aria-label="Larger text"
              className="rounded-r-md px-2 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-35 disabled:hover:bg-transparent"
            >A+</button>
          </div>
          <button
            onClick={() => void handlePrint()}
            disabled={isPreparingPrint}
            className="shrink-0 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >{isPreparingPrint ? 'Preparing…' : 'Print'}</button>
        </header>

        <article
          className="pray-sheet mx-auto min-h-[calc(100dvh-3rem)] w-full bg-white px-[clamp(0.85rem,4vw,2.5rem)] py-[clamp(1.5rem,6vw,2.5rem)] shadow-lg print:min-h-0 print:shadow-none print:px-0 print:py-0"
          style={{
            fontFamily,
            lineHeight,
            '--pray-font': `${readingPx}px`,
            '--pray-page': readingPageWidthCss(settings),
            '--pray-measure': `${readingMeasureEm(settings)}em`,
            '--pray-print-font': `${printPt}pt`,
          } as React.CSSProperties}
        >
          {blocks.map((block, idx) => {
            // A scored hymn's credits are already printed under its staff, so
            // the editor and the PDF both drop the rubrics that repeat them.
            // The reader gets the same office, not a doubled attribution.
            if (isSuppressedAttribution(blocks, idx)) return null;
            return (
              <React.Fragment key={block.id}>
                <BlockView
                  block={block}
                  rubricColor={rubricColor}
                  baseFontSize={gabcPointSizeForPx(readingPx)}
                  printBaseFontSize={printPt}
                  centerRubric={isPsalmRubric(blocks, idx)}
                />
              </React.Fragment>
            );
          })}
        </article>
      </div>

      <style>{`
        .pray-sheet { overflow-wrap: anywhere; }
        .pray-sheet img, .pray-sheet svg { max-width: 100%; }
        @media screen {
          .pray-sheet {
            font-size: var(--pray-font);
            /* The page at its own width, or the same page measured in the
               reader's type, whichever is wider — so A+ widens the sheet and
               A− never narrows it below the paper — and never wider than the
               device. An em here is the sheet's own type. */
            max-width: min(100%, max(var(--pray-page), var(--pray-measure)));
          }
        }
        @media screen and (max-width: 640px) {
          /* A phone has no margins to spare: the sheet goes edge to edge and
             takes whatever measure that width allows, rather than leaving
             cream gutters when the reader chooses smaller type. */
          .pray-sheet { max-width: 100%; box-shadow: none; }
        }
        @media print {
          .no-print { display: none !important; }
          .pray-sheet { font-size: var(--pray-print-font); max-width: none; }
          @page { size: ${printPageSize(settings)}; margin: 15mm; }
        }
      `}</style>
    </>
  );
}
