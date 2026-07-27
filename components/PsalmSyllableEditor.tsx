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
}

export function PsalmSyllableEditor({ content, finalePreps, onChange }: Props) {
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
    <div className="no-print mt-2 p-2 bg-sky-50 border border-sky-200 rounded font-serif text-sm leading-loose select-none print:hidden">
      <div className="text-[10px] uppercase tracking-wider text-sky-500 mb-1 font-sans">
        Click a syllable to set the accent (bold) — italics auto-follow &nbsp;·&nbsp; <em>† flex</em> &nbsp;·&nbsp; * mediant &nbsp;·&nbsp; end finale
      </div>
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
                              className={`rounded-sm px-px cursor-pointer transition-colors hover:bg-sky-200 ${
                                isAccent ? 'font-bold bg-sky-200 ring-1 ring-sky-400' :
                                isPrep   ? 'italic bg-sky-100' : ''
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
  );
}
