'use client';

import React, { useState, useEffect } from 'react';
import { Block, GabcCandidate } from '@/lib/types';
import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react';
import { PsalmSyllableEditor } from './PsalmSyllableEditor';
import { GabcRenderer } from './GabcRenderer';
import { GabcSearchPanel } from './GabcSearchPanel';
import { EditableText } from './EditableText';
import { InsertPageBreak } from './InsertPageBreak';
import { useBlockPointing } from '@/hooks/useBlockPointing';
import { stripLypsautierantHtml } from '@/lib/psalm-tones/lypsautierant-strip';
import { hasPointingMarkup } from '@/lib/psalm-tones/strip';

// Re-export for convenience since other files import it from here
export { InsertPageBreak };

interface BlockEditorProps {
  block: Block;
  index: number;
  total: number;
  rubricColor: string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  insertBlock?: (index: number, newBlockData: Omit<Block, 'id'>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (index: number, direction: 'up' | 'down') => void;
  reorderBlock: (sourceIndex: number, destIndex: number) => void;
  finalePreps: 1 | 2 | 3;
  setFinalePreps: (n: 1 | 2 | 3) => void;
  centerRubric?: boolean;
  isActive: boolean;
  onClick: () => void;
}

export function BlockEditor({
  block,
  index,
  total,
  rubricColor,
  updateBlock,
  insertBlock,
  removeBlock,
  moveBlock,
  reorderBlock,
  finalePreps,
  setFinalePreps,
  centerRubric = false,
  isActive,
  onClick,
}: BlockEditorProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Lypsautierant panel state ──
  const [showLypsPanel, setShowLypsPanel] = useState(false);
  const [lypsFamily, setLypsFamily] = useState<string>(block.lypsautierantFamily ?? 'english');
  const [lypsMode, setLypsMode] = useState<string>(block.lypsautierantMode ?? 'eight');
  const [lypsVariation, setLypsVariation] = useState<string>(block.lypsautierantVariation ?? 'a');
  const [lypsVariations, setLypsVariations] = useState<string[]>([]);
  const [isApplyingLyps, setIsApplyingLyps] = useState(false);
  const [lypsWarnings, setLypsWarnings] = useState<string[]>([]);
  const [lypsError, setLypsError] = useState<string | null>(null);

  // Fetch available variations when family/mode changes
  useEffect(() => {
    if (!showLypsPanel) return;
    fetch('/api/lypsautierant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'variations', family: lypsFamily, mode: lypsMode }),
    })
      .then(r => r.json())
      .then(data => {
        const vars: string[] = data.variations ?? [];
        setLypsVariations(vars);
        if (!vars.includes(lypsVariation)) setLypsVariation(vars[0] ?? '');
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lypsFamily, lypsMode, showLypsPanel]);

  async function handleApplyLypsautierant() {
    setIsApplyingLyps(true);
    setLypsError(null);
    setLypsWarnings([]);
    try {
      // Point the text the block started with, not the pointed HTML: the
      // mark glyphs are real text nodes, so plain tag-stripping would feed
      // "of+" back in and compound the damage on every re-point.
      // stripLypsautierantHtml keeps the verse numbers and the '*' and
      // dagger markers, so re-pointing preserves the verse structure —
      // including any of it the user fixed by hand.
      const source = block.originalContent ?? block.content;
      const plainText = stripLypsautierantHtml(source);

      const res = await fetch('/api/lypsautierant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'point',
          text: plainText,
          family: lypsFamily,
          mode: lypsMode,
          variation: lypsVariation,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.html) {
        setLypsError(data.error ?? 'Pointing failed');
        if (Array.isArray(data.variations)) setLypsVariations(data.variations);
        return;
      }

      setLypsWarnings(data.warnings ?? []);
      updateBlock(block.id, {
        content: data.html,
        // Keep the unpointed text so a later change of mode starts clean.
        originalContent: block.originalContent ?? block.content,
        lypsautierantFamily: lypsFamily,
        lypsautierantMode: lypsMode,
        lypsautierantVariation: lypsVariation,
      });
    } catch (err) {
      console.error('Lypsautierant apply error:', err);
      setLypsError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsApplyingLyps(false);
    }
  }

  const {
    showPointEditor,
    setShowPointEditor,
    toneNames,
    selectedTone,
    selectedVariant,
    useSolemn,
    setUseSolemn,
    solemnAvailable,
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
    pointingError,
    clearPointingError,
    handleToneChange,
    handleVariantChange,
    handleApplyTone,
    handleLoadStressedText,
    handleLoadLatinText,
    handleRestoreIbreviaryText,
    handleAutoPoint,
  } = useBlockPointing(block, updateBlock, insertBlock, index);

  return (
    <div
      data-block-id={block.id}
      className={`group relative w-full ${isActive ? 'mb-1 p-2' : 'mb-0 px-1 py-0'} print:p-0 print:mb-0 rounded transition-[padding,margin,background-color,border-color] border-2 hover:border-gray-200 ${
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
      <div className={`${isActive ? 'flex' : 'hidden'} absolute right-2 -top-4 flex-row gap-1 items-center bg-white shadow border border-gray-200 rounded p-1 no-print z-10`}>
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
            onChange={(val: string) => {
              // originalContent is the clean baseline both pointing paths
              // re-point from, so it may only track the text while the text
              // is unpointed. Syncing it on every keystroke overwrote the
              // baseline with pointed HTML, and each later re-point then
              // compounded on marked-up text. (Stripping on every keystroke
              // is not the alternative: <div> boundaries strip without a
              // newline and would collapse the psalm's line structure.)
              updateBlock(
                block.id,
                hasPointingMarkup(val)
                  ? { content: val }
                  : { content: val, originalContent: val }
              );
            }}
            className={`
              w-full bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-[#e0e0e0] rounded
              ${(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) ? 'text-[0.82em] italic text-center text-[#555] mt-0.5' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'heading' ? 'text-2xl leading-tight font-serif text-center mt-2 mb-0 font-normal' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'subheading' ? 'text-lg leading-tight font-bold text-center mb-0' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'rubric' ? `text-[0.9em] italic mb-0 ${centerRubric ? 'text-center' : ''}` : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'psalm' ? 'mb-1' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'psalm-prayer' ? 'mt-2 mb-1 text-justify' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && (block.type === 'text' || block.type === 'antiphon') ? 'mb-0 text-justify' : ''}
              ${!(block.gabcScore && (block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon')) && block.type === 'hymn' ? 'text-left mb-1' : ''}
            `}
            style={{
              color: (block.type === 'rubric' || block.type === 'heading') ? rubricColor : 'inherit',
              minHeight: block.content ? undefined : '1.25em',
            }}
            placeholder={`Enter ${block.type} text...`}
          />

          {/* Psalm Pointing Toolbar */}
          {block.type === 'psalm' && (
            <div className={`${isActive ? 'flex' : 'hidden'} no-print mt-1 items-center gap-2 flex-wrap`}>

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
                {solemnAvailable && (
                  <label
                    className="flex items-center gap-1 text-[10px] text-gray-600 select-none cursor-pointer"
                    title="Sing the solemn mediant instead of the simple one. Traditional for the Gospel canticles."
                  >
                    <input
                      type="checkbox"
                      checked={useSolemn}
                      onChange={e => setUseSolemn(e.target.checked)}
                      className="w-3 h-3 accent-indigo-600"
                    />
                    solemn
                  </label>
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
                  title={`Point psalm to tone ${selectedTone}${selectedVariant ? ' ' + selectedVariant : ''}${solemnAvailable && useSolemn ? ' (solemn)' : ''}`}
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

              {pointingError && (
                <div className="w-full flex items-start gap-2 px-2 py-1 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                  <span className="flex-1 font-semibold">{pointingError}</span>
                  <button
                    onClick={clearPointingError}
                    className="text-red-500 hover:text-red-800 leading-none px-1"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* ── Lypsautierant toggle button ── */}
              <button
                onClick={() => setShowLypsPanel(v => !v)}
                className={`text-[10px] px-1.5 py-0.5 border rounded transition-colors ${
                  showLypsPanel ? 'bg-orange-600 text-white border-orange-600 font-semibold' : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                }`}
                title="Toggle Lypsautierant mode pointing panel"
              >
                {showLypsPanel ? 'Hide Lyps' : '♩ Lypsautierant'}
              </button>

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

              {/* ── Lypsautierant mode panel ── */}
              {showLypsPanel && (
                <div className="w-full mt-1.5 p-2 bg-orange-50/80 border border-orange-200 rounded flex flex-col gap-2 text-[11px] no-print">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Family */}
                    <label className="text-[10px] font-semibold text-orange-900 shrink-0">Family:</label>
                    <select
                      value={lypsFamily}
                      onChange={e => setLypsFamily(e.target.value)}
                      className="text-[10px] px-1.5 py-0.5 border border-orange-300 rounded bg-white text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="english">english</option>
                      <option value="gregorian">gregorian</option>
                      <option value="modes">modes</option>
                      <option value="french">french</option>
                    </select>

                    {/* Mode */}
                    <label className="text-[10px] font-semibold text-orange-900 shrink-0">Mode:</label>
                    <select
                      value={lypsMode}
                      onChange={e => setLypsMode(e.target.value)}
                      className="text-[10px] px-1.5 py-0.5 border border-orange-300 rounded bg-white text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {['one','two','three','four','five','six','seven','eight','peregrinus'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    {/* Termination. The list comes from the API because it
                        differs per mode: gregorian/two has only 'd',
                        gregorian/four 'a' and 'e', gregorian/six 'f' and 'd'. */}
                    <label className="text-[10px] font-semibold text-orange-900 shrink-0">Termination:</label>
                    <select
                      value={lypsVariation}
                      onChange={e => setLypsVariation(e.target.value)}
                      disabled={lypsVariations.length === 0}
                      className="text-[10px] px-1.5 py-0.5 border border-orange-300 rounded bg-white text-orange-950 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                    >
                      {lypsVariations.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>

                    <button
                      onClick={handleApplyLypsautierant}
                      disabled={isApplyingLyps || !lypsVariation}
                      className="text-[10px] px-2 py-0.5 bg-orange-600 border border-orange-600 text-white font-semibold rounded hover:bg-orange-700 disabled:opacity-50"
                      title={`Apply ${lypsFamily}/${lypsMode}/${lypsVariation} pointing`}
                    >
                      {isApplyingLyps ? '…' : 'Apply Lypsautierant'}
                    </button>
                  </div>
                  {(lypsFamily === 'english' || lypsFamily === 'gregorian') && !block.ibreviaryContent && (
                    <p className="text-[9px] text-orange-600 italic">
                      ⓘ The english and gregorian tones read acute accents to find the stresses. Load accented text via the &ldquo;Lypsautierant (EN)&rdquo; button above.
                    </p>
                  )}
                  <p className="text-[9px] text-orange-700 italic">
                    ⓘ The selected termination applies to the second half of each verse. Mediant lines (*) and flex lines (†) use their own cadences; accent-aware families may also combine cadence notes (= or −−) when the final syllable is stressed.
                  </p>
                  {lypsError && (
                    <p className="text-[10px] text-red-700 font-semibold">{lypsError}</p>
                  )}
                  {lypsWarnings.map((w, i) => (
                    <p key={i} className="text-[10px] text-amber-800">⚠ {w}</p>
                  ))}
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

          {block.type === 'psalm' && showPointEditor && block.lang !== 'la' && (
            <PsalmSyllableEditor
              content={block.content}
              finalePreps={finalePreps}
              onChange={(html: string) => updateBlock(block.id, { content: html })}
            />
          )}

          {/* GABC Text Editor */}
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon' || ((block.type === 'psalm' || block.type === 'psalm-prayer') && (showPointEditor || block.gabcScore))) && (
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
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon' || block.type === 'psalm' || block.type === 'psalm-prayer') &&
            block.gabcScore && !block.musicDataUri && (
              <GabcRenderer gabc={block.gabcScore} />
            )}

          {/* Uploaded image score */}
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon' || block.type === 'psalm' || block.type === 'psalm-prayer') &&
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
