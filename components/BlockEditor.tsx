'use client';

import React, { useState } from 'react';
import { Block, GabcCandidate } from '@/lib/types';
import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react';
import { PsalmSyllableEditor } from './PsalmSyllableEditor';
import { GabcRenderer } from './GabcRenderer';
import { GabcSearchPanel } from './GabcSearchPanel';
import { EditableText } from './EditableText';
import { InsertPageBreak } from './InsertPageBreak';
import { useBlockPointing } from '@/hooks/useBlockPointing';

// Re-export for convenience since other files import it from here
export { InsertPageBreak };

interface BlockEditorProps {
  block: Block;
  index: number;
  total: number;
  rubricColor: string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (index: number, direction: 'up' | 'down') => void;
  reorderBlock: (sourceIndex: number, destIndex: number) => void;
  uploadMusicScore: (id: string, file: File) => void;
  finalePreps: 1 | 2 | 3;
  setFinalePreps: (n: 1 | 2 | 3) => void;
  isActive: boolean;
  onClick: () => void;
}

export function BlockEditor({
  block,
  index,
  total,
  rubricColor,
  updateBlock,
  removeBlock,
  moveBlock,
  reorderBlock,
  uploadMusicScore,
  finalePreps,
  setFinalePreps,
  isActive,
  onClick,
}: BlockEditorProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    showPointEditor,
    setShowPointEditor,
    toneNames,
    selectedTone,
    selectedVariant,
    variantOptions,
    customMediant,
    setCustomMediant,
    customTermination,
    setCustomTermination,
    showCustomTonePanel,
    setShowCustomTonePanel,
    isApplyingTone,
    isLoadingStress,
    isLoadingLatin,
    handleToneChange,
    handleVariantChange,
    handleApplyTone,
    handleLoadStressedText,
    handleLoadLatinText,
    handleRestoreIbreviaryText,
    handleAutoPoint,
  } = useBlockPointing(block, updateBlock, finalePreps);

  return (
    <div
      data-block-id={block.id}
      className={`group relative w-full mb-1 p-2 print:p-0 print:mb-0 rounded transition-colors border-2 hover:border-gray-200 ${
        block.gabcCandidates && block.gabcCandidates.length > 0 && !block.gabcScore
          ? 'border-indigo-400 bg-indigo-50/30'
          : 'border-transparent hover:bg-gray-50'
      } ${
        block.type === 'heading' || block.type === 'subheading' || block.type === 'rubric' ||
        block.type === 'antiphon' || block.type === 'page-break'
          ? 'break-inside-avoid'
          : ''
      } ${
        block.type === 'heading' ? 'break-after-avoid' :
        block.type === 'subheading' ? 'break-after-avoid' :
        block.type === 'rubric' ? 'break-after-avoid' : ''
      } ${isDragOver ? 'border-t-blue-500 border-t-4' : ''}`}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setIsDragOver(false);
        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
        if (!isNaN(sourceIdx) && sourceIdx !== index && reorderBlock) {
          reorderBlock(sourceIdx, index);
        }
      }}
      onClick={() => { if (onClick) onClick(); }}
    >
      {/* Floating toolbar */}
      <div className={`absolute right-2 -top-4 opacity-0 ${isActive ? 'opacity-100 block' : 'group-hover:opacity-100'} transition-opacity flex flex-row gap-1 items-center bg-white shadow border border-gray-200 rounded p-1 no-print z-10`}>
        <div
          draggable
          className="cursor-move p-1 text-gray-400 hover:text-gray-900"
          onDragStart={e => { e.dataTransfer.setData('text/plain', index.toString()); }}
          title="Drag to Move"
        >
          <GripVertical size={14} />
        </div>
        <div className="w-px h-4 bg-gray-200 mx-0.5" />
        <button onClick={e => { e.stopPropagation(); moveBlock(index, 'up'); }} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent" title="Move Up"><ChevronUp size={14} /></button>
        <button onClick={e => { e.stopPropagation(); moveBlock(index, 'down'); }} disabled={index === total - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent" title="Move Down"><ChevronDown size={14} /></button>
        <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 hover:bg-red-50 text-red-600 rounded" title="Delete Block"><Trash2 size={14} /></button>
      </div>

      {block.type === 'page-break' ? (
        <div className="text-center w-full border-t border-dashed border-[#ccc] pt-2 relative print:block print:break-after-page print:border-none print:pt-0 print:h-0 print:overflow-hidden">
          <span className="no-print text-[10px] text-[#999] uppercase tracking-widest bg-[#dcdcdc] px-2 absolute -top-2.5 left-1/2 -translate-x-1/2">Page Break</span>
        </div>
      ) : (
        <>
          {/* Editable Content */}
          <EditableText
            value={block.content}
            onChange={(val: string) => updateBlock(block.id, { content: val, originalContent: val })}
            className={`
              w-full bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-[#e0e0e0] rounded
              ${(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) ? 'text-[0.82em] italic text-center text-[#555] mt-0.5' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'heading' ? 'text-2xl font-serif text-center mt-3 mb-1 print:mt-1 print:mb-0 font-normal' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'subheading' ? 'text-lg font-bold text-center mb-1' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'rubric' ? 'text-[0.9em] italic mb-1' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'psalm' ? 'pl-4 -indent-4 mb-2' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'psalm-prayer' ? 'mt-4 mb-2 text-justify' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && (block.type === 'text' || block.type === 'antiphon') ? 'mb-1 text-justify' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'hymn' ? 'pl-8 -indent-8 text-left mb-2' : ''}
            `}
            style={{
              color: (block.type === 'rubric' || block.type === 'heading') ? rubricColor : 'inherit',
              minHeight: '1.5em',
            }}
            placeholder={`Enter ${block.type} text...`}
          />

          {/* Psalm Pointing Toolbar */}
          {block.type === 'psalm' && (
            <div className="no-print mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100 flex-wrap">

              {/* ── Tone selector row ── */}
              <div className="flex items-center gap-1 flex-wrap">
                {block.psalmTone && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-semibold"
                    title="Tone detected from preceding antiphon"
                  >
                    ♪ {block.psalmTone}{block.psalmVariant ? ` ${block.psalmVariant}` : ''}
                  </span>
                )}
                <select
                  value={selectedTone}
                  onChange={e => handleToneChange(e.target.value)}
                  className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white max-w-[90px]"
                  title="Gregorian psalm tone"
                >
                  {toneNames.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {variantOptions.length > 1 && (
                  <select
                    value={selectedVariant}
                    onChange={e => handleVariantChange(e.target.value)}
                    className="text-[10px] border border-gray-300 rounded px-1 py-0.5 bg-white max-w-[60px]"
                    title="Termination variant"
                  >
                    {variantOptions.map(v => (
                      <option key={v} value={v}>{v || '—'}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setShowCustomTonePanel(v => !v)}
                  className={`text-[10px] px-1.5 py-0.5 border rounded transition-colors ${
                    showCustomTonePanel ? 'bg-purple-600 text-white border-purple-600 font-semibold' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                  }`}
                  title="Toggle custom GABC tone formula editor"
                >
                  {showCustomTonePanel ? 'Hide Tone GABC' : '⚙ Custom GABC'}
                </button>
                <button
                  onClick={handleApplyTone}
                  disabled={isApplyingTone}
                  className="text-[10px] px-2 py-0.5 bg-indigo-600 border border-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 disabled:opacity-50"
                  title={`Point psalm to tone ${selectedTone}${selectedVariant ? ' ' + selectedVariant : ''}`}
                >
                  {isApplyingTone ? '…' : 'Apply Tone'}
                </button>
                {block.psalmNumber && (
                  <>
                    <button
                      onClick={handleLoadStressedText}
                      disabled={isLoadingStress}
                      className="text-[10px] px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-700 rounded hover:bg-amber-100 disabled:opacity-50"
                      title={`Load stressed English text for ${typeof block.psalmNumber === 'number' ? 'Psalm ' : ''}${block.psalmNumber}`}
                    >
                      {isLoadingStress ? '…' : `Lypsautierant (EN)`}
                    </button>
                    <button
                      onClick={handleLoadLatinText}
                      disabled={isLoadingLatin}
                      className="text-[10px] px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-700 font-medium rounded hover:bg-emerald-100 disabled:opacity-50"
                      title={`Load Latin text for ${typeof block.psalmNumber === 'number' ? 'Psalm ' : ''}${block.psalmNumber} (jgabc)`}
                    >
                      {isLoadingLatin ? '…' : `✝ Latin (jgabc)`}
                    </button>
                  </>
                )}
                {block.ibreviaryContent && (
                  <button
                    onClick={handleRestoreIbreviaryText}
                    className="text-[10px] px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-700 rounded hover:bg-blue-100"
                    title="Switch back to original iBreviary psalm text"
                  >
                    ↺ iBreviary
                  </button>
                )}

              </div>

              {/* ── Custom Tone GABC formulas panel ── */}
              {showCustomTonePanel && (
                <div className="w-full mt-1.5 p-2 bg-purple-50/80 border border-purple-200 rounded flex flex-col gap-1.5 text-[11px] no-print">
                  <div className="flex items-center gap-2">
                    <label className="w-28 text-[10px] font-semibold text-purple-900 shrink-0">Mediant GABC:</label>
                    <input
                      type="text"
                      value={customMediant}
                      onChange={e => {
                        setCustomMediant(e.target.value);
                        updateBlock(block.id, { customMediant: e.target.value });
                      }}
                      placeholder="e.g. g h jr 'k jr j."
                      className="flex-1 font-mono text-[10px] px-2 py-0.5 border border-purple-300 rounded bg-white text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-28 text-[10px] font-semibold text-purple-900 shrink-0">Termination GABC:</label>
                    <input
                      type="text"
                      value={customTermination}
                      onChange={e => {
                        setCustomTermination(e.target.value);
                        updateBlock(block.id, { customTermination: e.target.value });
                      }}
                      placeholder="e.g. jr i j 'h gr g."
                      className="flex-1 font-mono text-[10px] px-2 py-0.5 border border-purple-300 rounded bg-white text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* ── Legacy pointing row ── */}
              <div className="flex items-center gap-1.5 border-l border-gray-200 pl-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-400">Finale:</span>
                <div className="flex gap-0.5">
                  {([1, 2, 3] as const).map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        setFinalePreps(n);
                        if (!showPointEditor) {
                          handleAutoPoint(n);
                        }
                      }}
                      className={`text-[10px] w-5 h-5 rounded font-mono ${finalePreps === n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      title={`Finale: ${n} italic prep syllable${n > 1 ? 's' : ''}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowPointEditor(v => !v)}
                  className={`text-[10px] px-2 py-0.5 border rounded ${showPointEditor ? 'bg-sky-500 text-white border-sky-500' : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'}`}
                >
                  {showPointEditor ? 'Close Editor' : 'Point…'}
                </button>
                <button
                  onClick={() => {
                    const baseText = block.originalContent || block.content;
                    updateBlock(block.id, { content: baseText });
                    setShowPointEditor(false);
                  }}
                  className="text-[10px] px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-500 rounded hover:bg-gray-100"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {block.type === 'psalm' && showPointEditor && (
            <PsalmSyllableEditor
              content={block.content}
              finalePreps={finalePreps}
              onChange={(html: string) => updateBlock(block.id, { content: html })}
            />
          )}

          {/* GABC score panel */}
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon') && (
            <div className={`no-print mt-2 p-2 bg-gray-50 border border-gray-100 rounded transition-all ${isActive ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">GABC Score</label>

              {/* OCO candidate picker */}
              {block.gabcCandidates && block.gabcCandidates.length > 0 && !block.gabcScore && (
                <div className="mb-2">
                  <label className="text-[10px] text-indigo-700 font-semibold mb-1 block">
                    OCO candidates — select the correct one:
                  </label>
                  <select
                    className="w-full text-xs border border-indigo-300 rounded p-1 bg-white"
                    defaultValue=""
                    onChange={e => {
                      const idx = parseInt(e.target.value, 10);
                      if (!isNaN(idx)) {
                        const c = block.gabcCandidates![idx];
                        updateBlock(block.id, { gabcScore: c.gabc });
                      }
                    }}
                  >
                    <option value="" disabled>Choose…</option>
                    {(block.gabcCandidates as GabcCandidate[]).map((c, i) => (
                      <option key={i} value={i}>
                        {c.incipit}{c.mode ? ` [${c.mode}]` : ''}{c.office ? ` · ${c.office}` : ''}{c.occasion ? ` · ${c.occasion}` : ''} ({c.source})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <textarea
                value={block.gabcScore || ''}
                onChange={e => updateBlock(block.id, { gabcScore: e.target.value || undefined })}
                className="w-full text-xs font-mono p-1 border rounded"
                rows={3}
                placeholder="(c3)Can(h)tá(h)bi(h)mus(g)..."
              />

              <GabcSearchPanel block={block} onSelect={gabc => updateBlock(block.id, { gabcScore: gabc })} />

              {!block.gabcScore && block.gabcCandidates && block.gabcCandidates.length > 0 && (
                <button
                  className="mt-1 w-full text-[10px] py-1 bg-indigo-50 border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-100"
                  onClick={() => updateBlock(block.id, { gabcScore: block.gabcCandidates![0].gabc })}
                >
                  ↩ Restore GABC ({block.gabcCandidates[0].incipit.slice(0, 30)}…)
                </button>
              )}

              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-gray-400">or upload fallback image:</span>
                <input
                  type="file"
                  accept="image/*"
                  className="text-[10px]"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => { updateBlock(block.id, { musicDataUri: ev.target?.result as string }); };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* GABC SVG render */}
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon') &&
            block.gabcScore && !block.musicDataUri && (
              <GabcRenderer gabc={block.gabcScore} />
            )}

          {/* Uploaded image score */}
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon') &&
            block.musicDataUri && (
              <div className="relative group/img text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.musicDataUri}
                  alt="Gregorio Chant Score"
                  className="w-full max-w-full print:w-full object-contain mb-1 relative pt-2"
                  style={{ filter: 'grayscale(100%) brightness(0.9) contrast(1.2)' }}
                />
                <button
                  onClick={() => updateBlock(block.id, { musicDataUri: undefined })}
                  className="absolute top-2 right-2 bg-white/80 p-1 rounded shadow text-red-500 opacity-0 group-hover/img:opacity-100 transition-opacity no-print text-xs"
                >
                  Remove Image
                </button>
              </div>
            )}
        </>
      )}
    </div>
  );
}
