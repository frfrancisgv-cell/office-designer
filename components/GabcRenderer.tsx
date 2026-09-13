'use client';

/**
 * GabcRenderer.tsx
 *
 * Renders a GABC notation string as an SVG score using the Exsurge library
 * (loaded via a global script tag in the page layout).
 */

import React from 'react';
import { positionGabcAnnotation } from '@/lib/gabc-layout';

/**
 * Exsurge's drop cap leaves a stray hyphen under one-letter words.
 *
 * When the drop cap takes the whole of a one-character syllable, exsurge puts
 * a hyphen in the lyric's place (exsurge.js:3312) so a divided word like
 * "A-men" still reads as one word. But it decides that from the length of the
 * syllable alone, so a psalm opening on a one-letter *word* — "O God, you are
 * my God" — got a hyphen joining the initial to the next word, which is not a
 * thing the chant books print. The syllable's own lyricType already says which
 * case this is, so the hyphen is kept for a word that really is continued and
 * dropped for one that is not.
 */
function patchExsurgeDropCap(exsurge: any) {
  if (exsurge.Lyric.prototype.dropCapKeepsWholeWords) return;
  const generateDropCap = exsurge.Lyric.prototype.generateDropCap;
  exsurge.Lyric.prototype.generateDropCap = function (ctxt: any) {
    if (this.originalText.length === 1 && this.lyricType === exsurge.LyricType.SingleSyllable) {
      const dropCap = new exsurge.DropCap(ctxt, this.originalText);
      this.generateSpansFromText(ctxt, '');
      this.centerStartIndex = -1;
      return dropCap;
    }
    return generateDropCap.call(this, ctxt);
  };
  exsurge.Lyric.prototype.dropCapKeepsWholeWords = true;
}

const PREPARE_PRINT_EVENT = 'office:prepare-gabc-print';
interface PrintPreparation { tasks: Promise<void>[] }

/** Wait until every mounted score has a complete, synchronous layout before
 * opening the browser's print dialog. The beforeprint listener below repeats
 * that layout after print media has supplied the final printable width. */
export async function prepareGabcForPrint() {
  if (typeof window === 'undefined') return;
  const detail: PrintPreparation = { tasks: [] };
  window.dispatchEvent(new CustomEvent<PrintPreparation>(PREPARE_PRINT_EVENT, { detail }));
  await Promise.all(detail.tasks);
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * `printBaseFontSize` is for a view whose screen type is not its paper type —
 * the prayer view at /share/<id> sizes itself to the device and lets the
 * reader enlarge it, but its printout is still the author's booklet. Left
 * unset, print is set in the same size as the screen.
 */
export function GabcRenderer({ gabc, baseFontSize = 12, printBaseFontSize }: {
  gabc: string;
  baseFontSize?: number;
  printBaseFontSize?: number;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined' || !gabc) return;

    const container = containerRef.current;

    // Extract annotation(s) from GABC headers (before %%) for Exsurge.
    // GABC files may contain multiple annotation: lines for two-line annotations
    // (e.g. "annotation: Ant;" + "annotation: 8." → "Ant.\n8.")
    let annotation = '';
    const headerSep = gabc.indexOf('%%');
    if (headerSep !== -1) {
      const headers = gabc.slice(0, headerSep);
      const annLines: string[] = [];
      for (const m of headers.matchAll(/annotation:\s*([^;\n]+);/g)) {
        annLines.push(m[1].trim());
      }
      annotation = annLines.join('\n');
    }

    let safeGabc = gabc
      .replace(/<v>\\greheightstar<\/v>/g, ' *')
      .replace(/\\greheightstar/g, '*')
      .replace(/<v>\\GreDagger<\/v>/g, ' \u2020')
      .replace(/<v>[^<]*<\/v>/g, '')
      .replace(/<sp>V\/<\/sp>/g, '\u2123')
      .replace(/<sp>R\/<\/sp>/g, '\u211F')
      .replace(/<sp>[^<]*<\/sp>/g, '')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    if (safeGabc.includes('%%')) {
      safeGabc = safeGabc.slice(safeGabc.indexOf('%%') + 2).trim();
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let renderVersion = 0;
    let active = true;
    // Which layout the container currently holds. Print media changes the
    // printable width, which the ResizeObserver below would otherwise answer
    // with a screen layout — landing on the very page the browser is about to
    // snapshot, in the reader's type rather than the author's.
    let mode: 'screen' | 'print' = 'screen';

    // Print lays out synchronously, in the author's point size: the browser
    // takes its snapshot without waiting, and the paper is the paper.
    const renderScore = (forMode: 'screen' | 'print' = 'screen'): Promise<void> => new Promise(resolve => {
      mode = forMode;
      const synchronous = forMode === 'print';
      const lyricPointSize = forMode === 'print' ? printBaseFontSize ?? baseFontSize : baseFontSize;
      const attempt = () => {
        if (!active) { resolve(); return; }
        const exsurge = (window as any).exsurge;
        if (!exsurge) {
          fallbackTimer = setTimeout(attempt, 200);
          return;
        }
        const version = ++renderVersion;
        try {
          patchExsurgeDropCap(exsurge);
          const ctxt = new exsurge.ChantContext();
          ctxt.lyricTextFont = "'EB Garamond', 'Garamond', 'Cormorant Garamond', serif";

          // Every size in a ChantContext is independent of every other: the
          // lyric size carries neither the staff, nor the neumes, nor the drop
          // cap, nor the annotation with it. Setting only lyricTextSize grew
          // the words and left the chant they belong to at Exsurge's default,
          // so the whole context is scaled by one ratio — the size asked for
          // over Exsurge's own 16-unit default, which corresponds visually to
          // the editor's default 12pt text.
          const sizeRatio = lyricPointSize / 12;
          ctxt.lyricTextSize *= sizeRatio;
          ctxt.dropCapTextSize *= sizeRatio;
          ctxt.annotationTextSize *= sizeRatio;
          // The hyphen and the word spacing derived from it were measured in
          // the constructor, at the size we have just left behind. Text width
          // is linear in font size, so the same ratio corrects them.
          ctxt.hyphenWidth *= sizeRatio;
          ctxt.minLyricWordSpacing *= sizeRatio;

          // Condense the notation itself without shrinking the lyrics. Scaling
          // the completed SVG made both too small; these are the geometry values
          // Exsurge uses for glyph width, staff height, and inter-neume spacing,
          // and the line weights that must stay in proportion to them.
          const chantScale = 0.88 * sizeRatio;
          ctxt.glyphScaling *= chantScale;
          ctxt.staffInterval *= chantScale;
          ctxt.intraNeumeSpacing *= chantScale;
          ctxt.staffLineWeight *= chantScale;
          ctxt.neumeLineWeight *= chantScale;
          ctxt.dividerLineWeight *= chantScale;
          ctxt.episemaLineWeight *= chantScale;

          let width = container.clientWidth || 600;
          if (width < 200) width = 600;
          const layoutWidth = width;

          const mappings = exsurge.Gabc.createMappingsFromSource(ctxt, safeGabc);
          const score = new exsurge.ChantScore(ctxt, mappings, true);

          // Set annotation on the score object (not ctxt) — this is the correct exsurge API.
          // The annotation (e.g. "8." or "Ant. 1") renders above the first staff line.
          if (annotation) score.annotation = new exsurge.Annotation(ctxt, annotation);

          const finish = () => {
            score.layoutChantLines(ctxt, layoutWidth, function () {
              if (!active || version !== renderVersion) { resolve(); return; }
              positionGabcAnnotation(score, ctxt);
              const defs = Object.keys(ctxt.defs).map(key => ctxt.defs[key]).join('');
              const gap = ctxt.staffInterval * 1.5;
              let top = 0;
              // An SVG is atomic to the browser paginator. One SVG per staff
              // line gives it real break opportunities without ever cutting
              // through notes, lyrics, a custos, or a clef.
              container.innerHTML = score.lines.map((line: any) => {
                const height = line.bounds.height + gap;
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" class="ChantScore gabc-line" width="${layoutWidth}" height="${height}" viewBox="0 ${top} ${layoutWidth} ${height}"><defs>${defs}</defs>${line.createSvgFragment(ctxt)}</svg>`;
                top += height;
                return svg;
              }).join('');
              container.dataset.gabcReady = 'true';
              resolve();
            });
          };

          container.dataset.gabcReady = 'false';
          if (synchronous) {
            score.performLayout(ctxt);
            finish();
          } else {
            score.performLayoutAsync(ctxt, finish);
          }
        } catch (e) {
          console.warn('Could not render GABC:', e);
          container.innerHTML =
            '<div class="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">Could not render GABC score. Check syntax.</div>';
          container.dataset.gabcReady = 'error';
          resolve();
        }
      };
      attempt();
    });

    void renderScore();

    let lastWidth = 0;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0) return;
      if (mode === 'print') return;
      const currentWidth = entries[0].contentRect.width;
      if (currentWidth && Math.abs(currentWidth - lastWidth) > 2) {
        lastWidth = currentWidth;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => void renderScore(), 100);
      }
    });
    resizeObserver.observe(container);

    const preparePrint = (event: Event) => {
      clearTimeout(timeoutId);
      (event as CustomEvent<PrintPreparation>).detail.tasks.push(renderScore('print'));
    };
    // beforeprint runs after print styles establish the printable width in the
    // browsers we support. Synchronous Exsurge layout finishes before the
    // browser takes its print snapshot.
    const beforePrint = () => { clearTimeout(timeoutId); void renderScore('print'); };
    const afterPrint = () => { lastWidth = 0; void renderScore(); };
    window.addEventListener(PREPARE_PRINT_EVENT, preparePrint);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);

    return () => {
      active = false;
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimer);
      resizeObserver.disconnect();
      window.removeEventListener(PREPARE_PRINT_EVENT, preparePrint);
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [gabc, baseFontSize, printBaseFontSize]);

  return <div ref={containerRef} className="gabc-container w-full" />;
}
