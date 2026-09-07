'use client';

/**
 * PsalmSyllableEditor.tsx
 *
 * Interactive click-to-accent syllable editor for psalm text.
 * Depends on psalm-utils.ts for all pure parsing/serialisation logic.
 */

import React from 'react';
import {
  ParsedLine2,
  parsePsalmToLines,
  serializePsalmFromAccents,
  detectAccentsFromHtml,
} from './psalm-utils';

interface Props {
  content: string;
  finalePreps: 1 | 2 | 3;
  onChange: (html: string) => void;
  onClose: () => void;
}

export function PsalmSyllableEditor({ content, finalePreps, onChange, onClose }: Props) {
  const selfUpdatedRef = React.useRef(false);
  const linesRef = React.useRef<ParsedLine2[]>([]);
  const accentsRef = React.useRef<Map<string, number>>(new Map());

  const lines = React.useMemo(() => parsePsalmToLines(content), [content]);
  React.useEffect(() => { linesRef.current = lines; }, [lines]);

  const [accents, setAccents] = React.useState<Map<string, number>>(
    () => detectAccentsFromHtml(content, parsePsalmToLines(content)),
  );
  React.useEffect(() => { accentsRef.current = accents; }, [accents]);

  // Re-initialize when content changes from outside
  React.useEffect(() => {
    if (selfUpdatedRef.current) { selfUpdatedRef.current = false; return; }
    setAccents(detectAccentsFromHtml(content, lines));
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-serialize when finalePreps changes
  React.useEffect(() => {
    const html = serializePsalmFromAccents(linesRef.current, accentsRef.current, finalePreps);
    selfUpdatedRef.current = true;
    onChange(html);
  }, [finalePreps]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSyllClick(li: number, si: number, syllIdx: number) {
    const key = `${li}-${si}`;
    const next = new Map(accents);
    if (next.get(key) === syllIdx) next.delete(key); else next.set(key, syllIdx);
    setAccents(next);
    selfUpdatedRef.current = true;
    onChange(serializePsalmFromAccents(lines, next, finalePreps));
  }

  return (
    <aside className="no-print flex max-h-[60vh] w-full flex-col rounded border border-slate-200 bg-white font-serif text-sm leading-loose select-none print:hidden">
      <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 font-sans">
        <div><h2 className="text-sm font-semibold text-slate-900">Edit syllable pointing</h2><p className="mt-0.5 text-[10px] leading-snug text-slate-700">Click the stressed syllable. Preparatory syllables follow automatically.</p></div>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">Done</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
      <p className="mb-3 font-sans text-[10px] text-slate-500"><em>†</em> uses a flex cadence · <em>*</em> uses a mediant cadence · the final phrase uses the selected preparation count</p>
      {lines.map((line, li) => {
        if (line.isEmpty) return <div key={li} className="h-2" />;
        return (
          <div key={li} className="flex flex-wrap items-baseline mb-0.5">
            {line.segs.map((seg, si) => {
              const key = `${li}-${si}`;
              const accentIdx = accents.get(key) ?? -1;
              const numPreps = seg.marker === '†' ? 0 : seg.marker === '*' ? 1 : finalePreps;
              let syllCount = 0;
              return (
                <React.Fragment key={si}>
                  {seg.items.map((item, ii) => {
                    if (item.type === 'gap') return <span key={`g${ii}`} className="whitespace-pre">{item.text}</span>;
                    return (
                      <React.Fragment key={`w${ii}`}>
                        {item.sylls.map(syll => {
                          const idx = syllCount++;
                          const isAccent = idx === accentIdx;
                          const isPrep = accentIdx >= 0 && idx >= accentIdx - numPreps && idx < accentIdx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={e => { e.stopPropagation(); handleSyllClick(li, si, idx); }}
                              className={`rounded-sm px-px cursor-pointer transition-colors hover:bg-slate-200 ${
                                isAccent ? 'font-bold bg-slate-200 ring-1 ring-slate-400' :
                                isPrep   ? 'italic bg-slate-100' : ''
                              }`}
                            >
                              {syll}
                            </button>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  {seg.marker && <span className="mx-1 text-gray-300 font-sans text-[10px] not-italic">{seg.marker}</span>}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
      </div>
    </aside>
  );
}
