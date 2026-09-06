'use client';

/**
 * GabcRenderer.tsx
 *
 * Renders a GABC notation string as an SVG score using the Exsurge library
 * (loaded via a global script tag in the page layout).
 */

import React from 'react';

export function GabcRenderer({ gabc, baseFontSize = 12 }: { gabc: string; baseFontSize?: number }) {
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
      .replace(/<v>\\GreDagger<\/v>/g, ' \u2020')
      .replace(/<v>[^<]*<\/v>/g, '')
      .replace(/<sp>V\/<\/sp>/g, '\u2123')
      .replace(/<sp>R\/<\/sp>/g, '\u211F')
      .replace(/<sp>[^<]*<\/sp>/g, '')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    if (safeGabc.includes('%%')) {
      safeGabc = safeGabc.slice(safeGabc.indexOf('%%') + 2).trim();
    }

    let timeoutId: any;
    let fallbackTimer: any;

    const renderScore = () => {
      if (!container) return;
      if (!(window as any).exsurge) {
        fallbackTimer = setTimeout(renderScore, 500);
        return;
      }
      try {
        const ctxt = new (window as any).exsurge.ChantContext();
        ctxt.lyricTextFont = "'EB Garamond', 'Garamond', 'Cormorant Garamond', serif";
        // Match the booklet's font-size selector. Exsurge's default 16-unit
        // lyric size corresponds visually to the editor's default 12pt text.
        ctxt.lyricTextSize = 16 * (baseFontSize / 12);
        // Condense the notation itself without shrinking the lyrics. Scaling
        // the completed SVG made both too small; these are the geometry values
        // Exsurge uses for glyph width, staff height, and inter-neume spacing.
        const chantScale = 0.88;
        ctxt.glyphScaling *= chantScale;
        ctxt.staffInterval *= chantScale;
        ctxt.intraNeumeSpacing *= chantScale;

        let width = container.clientWidth || 600;
        if (width < 200) width = 600;
        const layoutWidth = width;

        const mappings = (window as any).exsurge.Gabc.createMappingsFromSource(ctxt, safeGabc);
        const score = new (window as any).exsurge.ChantScore(ctxt, mappings, true);

        // Set annotation on the score object (not ctxt) — this is the correct exsurge API.
        // The annotation (e.g. "8." or "Ant. 1") renders above the first staff line.
        if (annotation) {
          score.annotation = new (window as any).exsurge.Annotation(ctxt, annotation);
        }

        score.performLayoutAsync(ctxt, function () {
          score.layoutChantLines(ctxt, layoutWidth, function () {
            // Exsurge places the annotation only three staff intervals above
            // the staff, which can make it collide with a tall drop cap.
            // layoutChantLines sets this position, so apply the extra clearance
            // afterwards and before generating the SVG.
            if (score.annotation) {
              score.annotation.bounds.y -= ctxt.staffInterval;
            }
            container.innerHTML = score.createSvg(ctxt);
            const svg = container.querySelector('svg');
            if (svg) {
              // Exsurge emits no viewBox and, worse, uses the final (usually
              // shortest) staff's width for the SVG viewport. Earlier staffs
              // can therefore be clipped when we lay out wider than the DOM.
              // Preserve the full virtual layout width as the scalable view.
              const height = Number(svg.getAttribute('height')) || score.bounds.height;
              svg.setAttribute('viewBox', `0 0 ${layoutWidth} ${height}`);
              svg.style.width = '100%';
              svg.style.height = 'auto';
              svg.style.display = 'block';
            }
          });
        });
      } catch (e) {
        console.warn('Could not render GABC:', e);
        if (container) {
          container.innerHTML =
            '<div class="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">Could not render GABC score. Check syntax.</div>';
        }
      }
    };

    renderScore();

    let lastWidth = 0;
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0) return;
      const currentWidth = entries[0].contentRect.width;
      if (currentWidth && Math.abs(currentWidth - lastWidth) > 2) {
        lastWidth = currentWidth;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(renderScore, 100);
      }
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimer);
      resizeObserver.disconnect();
    };
  }, [gabc, baseFontSize]);

  return <div ref={containerRef} className="gabc-container w-full" />;
}
