'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Block, GabcCandidate } from '@/lib/types';
import { PsalmSyllableEditor } from './PsalmSyllableEditor';
import { GabcRenderer } from './GabcRenderer';
import { GabcSearchPanel } from './GabcSearchPanel';
import { EditableText } from './EditableText';
import { InsertPageBreak } from './InsertPageBreak';
import { useBlockPointing } from '@/hooks/useBlockPointing';
import { stripLypsautierantHtml } from '@/lib/psalm-tones/lypsautierant-strip';
import { accentuateEnglish } from '@/lib/psalm-tones/english-phonetic';
import { findSavedAccents } from '@/lib/psalm-tones/accent-corrections';
import { useAccentCorrections } from '@/hooks/useAccentCorrections';
import { LypsautierantAccentEditor } from './LypsautierantAccentEditor';
import { hasPointingMarkup, stripPointing } from '@/lib/psalm-tones/strip';
import type { CreatedTone } from '@/lib/psalm-tones/creator';

// Re-export for convenience since other files import it from here
export { InsertPageBreak };

interface BlockEditorProps {
  block: Block;
  index: number;
  rubricColor: string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  insertBlock?: (index: number, newBlockData: Omit<Block, 'id'>) => void;
  reorderBlock: (sourceIndex: number, destIndex: number) => void;
  finalePreps: 1 | 2 | 3;
  setFinalePreps: (n: 1 | 2 | 3) => void;
  centerRubric?: boolean;
  baseFontSize?: number;
  isActive: boolean;
  toolsTarget: HTMLDivElement | null;
  onClick: () => void;
}

export function BlockEditor({
  block,
  index,
  rubricColor,
  updateBlock,
  insertBlock,
  reorderBlock,
  finalePreps,
  setFinalePreps,
  centerRubric = false,
  baseFontSize = 12,
  isActive,
  toolsTarget,
  onClick,
}: BlockEditorProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const hasTranslation = !!(block.gabcScore || block.musicDataUri) && ['antiphon', 'invitatory-antiphon', 'hymn'].includes(block.type);

  // ── Lypsautierant panel state ──
  const [pointingMethod, setPointingMethod] = useState<'gregorian' | 'stress' | 'simple' | 'created'>(block.createdTone ? 'created' : block.lypsautierantFamily ? 'stress' : 'gregorian');
  const [textChoice, setTextChoice] = useState<'current' | 'english' | 'latin' | 'imported'>('current');
  const [showLypsPanel, setShowLypsPanel] = useState(!!block.lypsautierantFamily);
  const [lypsFamily, setLypsFamily] = useState<string>(block.lypsautierantFamily ?? 'english');
  const [lypsMode, setLypsMode] = useState<string>(block.lypsautierantMode ?? 'eight');
  const [lypsVariation, setLypsVariation] = useState<string>(block.lypsautierantVariation ?? 'a');
  const [lypsVariations, setLypsVariations] = useState<string[]>([]);
  const [isApplyingLyps, setIsApplyingLyps] = useState(false);
  const [lypsWarnings, setLypsWarnings] = useState<string[]>([]);
  const [lypsError, setLypsError] = useState<string | null>(null);
  /** Guards against an earlier re-point landing after a later one. */
  const lypsSeqRef = React.useRef(0);

  // ── Saved accent corrections ──
  // Shared across every block: one fetch, and a save made here is seen by the
  // other psalms in the office immediately.
  const {
    corrections,
    words: savedWords,
    save: saveAccentCorrections,
    forget: forgetAccentCorrections,
  } = useAccentCorrections();
  const [isSavingAccents, setIsSavingAccents] = useState(false);
  const [accentSaveNote, setAccentSaveNote] = useState<string | null>(null);
  const [accentSaveError, setAccentSaveError] = useState<string | null>(null);

  // ── Tones designed in the Psalm Tone Creator ──
  // The creator itself is a page of its own (the button beside Print); what
  // the block needs is only the library it saves and a way to apply one.
  const [createdTones, setCreatedTones] = useState<CreatedTone[]>([]);
  const [createdToneId, setCreatedToneId] = useState<string>(block.createdTone?.id ?? '');
  const [isApplyingCreated, setIsApplyingCreated] = useState(false);
  const [createdToneError, setCreatedToneError] = useState<string | null>(null);

  // Fetch the saved library the first time the method is chosen, and again on
  // every visit, so a tone just saved in the other tab shows up here.
  useEffect(() => {
    if (pointingMethod !== 'created') return;
    const controller = new AbortController();
    fetch('/api/tone-creator', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const tones: CreatedTone[] = data.tones ?? [];
        setCreatedTones(tones);
        // A shared document can carry a tone the library does not have;
        // leaving that id selected would show a select with no match.
        setCreatedToneId(id => tones.some(t => t.id === id) ? id : tones[0]?.id ?? '');
      })
      .catch(() => { if (!controller.signal.aborted) setCreatedToneError('Could not read the saved tone library.'); });
    return () => controller.abort();
  }, [pointingMethod]);

  const handleApplyCreatedTone = async () => {
    const tone = createdTones.find(t => t.id === createdToneId);
    if (!tone) return;
    setIsApplyingCreated(true);
    setCreatedToneError(null);
    // The accent-corrected text comes first: the lyps tones read those acutes
    // to find each cadence, exactly as the creator's own preview does.
    const text = stripPointing(block.lypsautierantAccents || block.originalContent || block.content);
    try {
      const res = await fetch('/api/tone-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', tone, text, lang: block.lang || 'en' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not apply this tone.');
      updateBlock(block.id, {
        createdTone: tone,
        originalContent: text,
        content: data.html || text,
        gabcScore: data.gabc || undefined,
      });
    } catch (e) {
      setCreatedToneError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsApplyingCreated(false);
    }
  };

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

  /** The english and gregorian tones read accents; the others count syllables. */
  const lypsReadsAccents = lypsFamily === 'english' || lypsFamily === 'gregorian';

  /**
   * The block's own text, unpointed.
   *
   * The mark glyphs are real text nodes, so stripLypsautierantHtml is what
   * takes them off — plain tag stripping would feed "of+" back in and
   * compound the damage on every re-point. `originalContent` is preferred
   * because it may only ever hold unpointed text.
   */
  const lypsPlainText = stripLypsautierantHtml(block.originalContent ?? block.content);

  /**
   * The accents the accent-aware tones will be pointed from, and whether they
   * were supplied rather than found in the text.
   *
   * A correction made in this session is the only copy of itself in the
   * document — `content` is pointed HTML and `originalContent` may only hold
   * unpointed text — so it is kept on the block and comes first here.
   *
   * Failing that, a correction saved to disk for this very text is used: that
   * is what brings the accents back when the same psalm comes round again on
   * the four-week cycle. Then text that carries its own acutes (psautier's
   * psalter, loaded with "Lypsautierant (EN)") as it stands, and text with
   * none (an iBreviary psalm) accented from the stress dictionary — with the
   * saved word corrections read ahead of it, so a psalm nobody has opened
   * gets the benefit of the ones that have been — so the editor can show what
   * the tones would do before anything is applied.
   */
  const savedAccents = React.useMemo(
    () => findSavedAccents(corrections, lypsPlainText),
    [corrections, lypsPlainText],
  );

  const lypsAccents = React.useMemo(() => {
    if (block.lypsautierantAccents) {
      return {
        text: block.lypsautierantAccents,
        derived: block.lypsautierantAccentsDerived ?? false,
      };
    }
    if (savedAccents) return { text: savedAccents.accents, derived: false };
    if (/[áéíóúýÁÉÍÓÚÝ]/.test(lypsPlainText)) return { text: lypsPlainText, derived: false };
    return { text: accentuateEnglish(lypsPlainText, savedWords), derived: true };
  }, [
    block.lypsautierantAccents,
    block.lypsautierantAccentsDerived,
    lypsPlainText,
    savedAccents,
    savedWords,
  ]);

  /** True while what the editor shows is exactly what is on disk for it. */
  const accentsAreSaved = savedAccents?.accents === lypsAccents.text;

  /**
   * Keep these accents: the text whole, so this psalm comes back corrected,
   * and the words whose accent was moved, so every other psalm containing them
   * is accented right the first time.
   */
  async function handleSaveAccents() {
    setIsSavingAccents(true);
    setAccentSaveError(null);
    setAccentSaveNote(null);
    try {
      const learned = await saveAccentCorrections(
        lypsAccents.text,
        block.psalmNumber ? `Psalm ${block.psalmNumber}` : undefined,
      );
      const shown = learned.slice(0, 6).join(', ') + (learned.length > 6 ? '…' : '');
      setAccentSaveNote(
        learned.length
          ? `Saved. This text will come back accented as it is now, and ${learned.length} word ${learned.length === 1 ? 'stress' : 'stresses'} will be used in every psalm: ${shown}`
          : 'Saved. This text will come back accented as it is now.',
      );
    } catch (err) {
      setAccentSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingAccents(false);
    }
  }

  /** Drop the saved copy of this text. The learned word stresses stay. */
  async function handleForgetAccents() {
    setIsSavingAccents(true);
    setAccentSaveError(null);
    setAccentSaveNote(null);
    try {
      await forgetAccentCorrections(lypsPlainText);
      setAccentSaveNote('Forgotten. This text will be accented from the dictionary again.');
    } catch (err) {
      setAccentSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingAccents(false);
    }
  }

  /** Re-point with the accents just edited, so the marks follow the click. */
  async function handleAccentsChange(accented: string) {
    // Edited by hand, so no longer the dictionary's guess.
    await applyLypsautierant(accented, false);
  }

  async function handleApplyLypsautierant() {
    // The positional families never look at accents, so they get the text as
    // it stands rather than one with acutes added for a tone that ignores them.
    if (!lypsReadsAccents) return applyLypsautierant(lypsPlainText, null);
    return applyLypsautierant(lypsAccents.text, lypsAccents.derived);
  }

  /**
   * Point `text` and take the result.
   *
   * `derived` says what to record about the accents in it: true while they are
   * the stress dictionary's guess, false once they have been read off the text
   * or corrected by hand, and null for the positional families, which do not
   * read accents and must not touch what is held for the others.
   *
   * The server reports whether it had to supply the accents itself, but that
   * is not the answer here: the accent editor needs them before anything is
   * pointed, so they are supplied on this side and the server only ever sees
   * text that already has them.
   */
  async function applyLypsautierant(text: string, derived: boolean | null) {
    // Every click in the accent editor points again, so a slow response must
    // not be allowed to land on top of a later one.
    const seq = ++lypsSeqRef.current;
    setIsApplyingLyps(true);
    setLypsError(null);
    setLypsWarnings([]);
    try {
      const res = await fetch('/api/lypsautierant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'point',
          text,
          family: lypsFamily,
          mode: lypsMode,
          variation: lypsVariation,
          // Without this a Latin psalm is cut up by the English syllabifier.
          lang: block.lang ?? 'en',
        }),
      });
      const data = await res.json();
      if (seq !== lypsSeqRef.current) return;

      if (!res.ok || !data.html) {
        setLypsError(data.error ?? 'Pointing failed');
        if (Array.isArray(data.variations)) setLypsVariations(data.variations);
        return;
      }

      setLypsWarnings(data.warnings ?? []);
      updateBlock(block.id, {
        content: data.html,
        gabcScore: undefined,
        // Keep the unpointed text so a later change of mode starts clean.
        originalContent: block.originalContent ?? block.content,
        // And keep the accents the marks were read off, so the next re-point
        // uses them instead of starting over from a guess.
        ...(derived === null ? {} : {
          lypsautierantAccents: text,
          lypsautierantAccentsDerived: derived,
        }),
        lypsautierantFamily: lypsFamily,
        lypsautierantMode: lypsMode,
        lypsautierantVariation: lypsVariation,
      });
    } catch (err) {
      console.error('Lypsautierant apply error:', err);
      if (seq === lypsSeqRef.current) setLypsError(err instanceof Error ? err.message : String(err));
    } finally {
      if (seq === lypsSeqRef.current) setIsApplyingLyps(false);
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
      className={`group relative w-full mb-0 px-1 py-0 print:p-0 print:mb-0 rounded transition-colors border-2 hover:border-gray-200 ${
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
      {block.type === 'page-break' ? (
        <div className="text-center w-full border-t border-dashed border-[#ccc] pt-2 relative print:block print:break-after-page print:border-none print:pt-0 print:h-0 print:overflow-hidden">
          <span className="no-print text-[10px] text-[#999] uppercase tracking-widest bg-[#dcdcdc] px-2 absolute -top-2.5 left-1/2 -translate-x-1/2">Page Break</span>
        </div>
      ) : (
        <>
          {/* Editable Content */}
          {!hasTranslation && !(block.type === 'psalm' && block.gabcScore) && <EditableText
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
          />}

          {isActive && toolsTarget && createPortal(<div className="block-tools" onClick={e => e.stopPropagation()} onDragOver={e => e.stopPropagation()} onDrop={e => e.stopPropagation()}>
          {hasTranslation && block.content && <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={block.printTranslation !== false} onChange={e => updateBlock(block.id, { printTranslation: e.target.checked })} />
            Print translation below chant
          </label>}
          {block.type === 'psalm' && <div className="pointing-workflow">
            <section>
              <label className="pointing-row">Text:
                <select value={textChoice} disabled={isLoadingStress || isLoadingLatin} onChange={e => setTextChoice(e.target.value as typeof textChoice)}>
                  <option value="current">Keep current text</option>
                  <option value="english" disabled={!block.psalmNumber}>New English translation</option>
                  <option value="latin" disabled={!block.psalmNumber}>Latin</option>
                  {block.ibreviaryContent && <option value="imported">Original iBreviary text</option>}
                </select>
              </label>
              {textChoice !== 'current' && <button disabled={isLoadingStress || isLoadingLatin} onClick={async () => {
                if (textChoice === 'english') await handleLoadStressedText();
                else if (textChoice === 'latin') await handleLoadLatinText();
                else handleRestoreIbreviaryText();
                setShowPointEditor(false);
              }}>{isLoadingStress || isLoadingLatin ? 'Loading text…' : 'Use this text'}</button>}
              {!block.psalmNumber && <p>Text alternatives require an identified psalm or canticle.</p>}
            </section>

            <section>
              <label className="pointing-row">Method:
                <select value={pointingMethod} onChange={e => {
                  const method = e.target.value as typeof pointingMethod;
                  setPointingMethod(method);
                  setShowLypsPanel(method === 'stress');
                  setShowPointEditor(false);
                }}>
                  <option value="gregorian">Gregorian</option>
                  <option value="stress">+/− stress aware</option>
                  <option value="simple">Simple — bold / italics</option>
                  <option value="created">Custom Tone</option>
                </select>
              </label>

              {pointingMethod === 'gregorian' && <>
                <div className="pointing-fields">
                  <label>Tone:<select value={selectedTone} onChange={e => handleToneChange(e.target.value)}>
                    {toneNames.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></label>
                  <label>Ending:<select value={selectedVariant} onChange={e => handleVariantChange(e.target.value)}>
                    {variantOptions.map(v => <option key={v} value={v}>{v || 'Default'}</option>)}
                  </select></label>
                </div>
                {solemnAvailable && <label className="pointing-check"><input type="checkbox" checked={useSolemn} onChange={e => setUseSolemn(e.target.checked)} />Solemn form</label>}
                <button aria-expanded={showCustomTonePanel} onClick={() => setShowCustomTonePanel(v => !v)}>{showCustomTonePanel ? 'Hide tone formula' : 'Edit tone formula'}</button>
                {showCustomTonePanel && <div className="space-y-3">
                  <label>Mediant formula (GABC)<input value={customMediant} onChange={e => { setCustomMediant(e.target.value); updateBlock(block.id, { customMediant: e.target.value }); }} /></label>
                  <label>Ending formula (GABC)<input value={customTermination} onChange={e => { setCustomTermination(e.target.value); updateBlock(block.id, { customTermination: e.target.value }); }} /></label>
                </div>}
              </>}

              {pointingMethod === 'stress' && <>
                <label className="pointing-row">Family:<select value={lypsFamily} onChange={e => setLypsFamily(e.target.value)}>
                  <option value="english">English — stress aware</option>
                  <option value="gregorian">Gregorian — stress aware</option>
                  <option value="modes">Modal — syllable count</option>
                  <option value="french">French — syllable count</option>
                </select></label>
                <div className="pointing-fields">
                  <label>Mode:<select value={lypsMode} onChange={e => setLypsMode(e.target.value)}>
                    {['one','two','three','four','five','six','seven','eight','peregrinus'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select></label>
                  <label>Ending:<select value={lypsVariation} onChange={e => setLypsVariation(e.target.value)} disabled={!lypsVariations.length}>
                    {lypsVariations.map(v => <option key={v} value={v}>{v}</option>)}
                  </select></label>
                </div>
                <p>{lypsReadsAccents ? 'Marks follow word stress. Review or correct the stresses below.' : 'This family places marks by syllable count.'}</p>
                {lypsReadsAccents && block.lang !== 'la' && <details>
                  <summary>Review word stresses</summary>
                  <LypsautierantAccentEditor
                    text={lypsAccents.text}
                    onChange={handleAccentsChange}
                    derived={lypsAccents.derived}
                    save={{
                      exists: !!savedAccents,
                      current: accentsAreSaved,
                      busy: isSavingAccents,
                      note: accentSaveNote,
                      error: accentSaveError,
                      onSave: () => void handleSaveAccents(),
                      onForget: () => void handleForgetAccents(),
                    }}
                  />
                </details>}
                {lypsError && <p role="alert">{lypsError}</p>}
                {lypsWarnings.map((warning, i) => <p key={i}>{warning}</p>)}
              </>}

              {pointingMethod === 'created' && <>
                <label className="pointing-row">Tone:<select value={createdToneId} onChange={e => setCreatedToneId(e.target.value)} disabled={!createdTones.length}>
                  {createdTones.length ? createdTones.map(t => <option key={t.id} value={t.id}>{t.name} ({t.backend === 'lyps' ? '+ − =' : 'GABC'})</option>) : <option value="">No tones saved yet</option>}
                </select></label>
                <p>Tones are designed in the Psalm Tone Creator — the button beside Print, which opens in its own tab. Reopen this menu after saving there to pick up a new tone.</p>
                {createdToneError && <p role="alert">{createdToneError}</p>}
              </>}

              {pointingMethod === 'simple' && <>
                <label className="pointing-row">Preparation:<select value={finalePreps} onChange={e => setFinalePreps(Number(e.target.value) as 1 | 2 | 3)}>
                  {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                </select></label>
                <p>Bold marks the accent; italics mark the preparatory syllables.</p>
              </>}

              <button className="pointing-apply" disabled={isApplyingTone || isApplyingLyps || isApplyingCreated || isLoadingStress || isLoadingLatin || (pointingMethod === 'stress' && !lypsVariation) || (pointingMethod === 'created' && !createdToneId)} onClick={() => {
                if (pointingMethod === 'gregorian') void handleApplyTone();
                else if (pointingMethod === 'stress') void handleApplyLypsautierant();
                else if (pointingMethod === 'created') void handleApplyCreatedTone();
                else handleAutoPoint(finalePreps);
              }}>{isApplyingTone || isApplyingLyps || isApplyingCreated ? 'Applying…' : 'Apply pointing'}</button>
              <div className="flex flex-wrap gap-2">
                {pointingMethod === 'simple' && block.lang !== 'la' && <button onClick={() => setShowPointEditor(v => !v)}>{showPointEditor ? 'Close syllable editor' : 'Edit syllables'}</button>}
                <button onClick={() => {
                  updateBlock(block.id, { content: block.originalContent || block.content, gabcScore: undefined, createdTone: undefined });
                  setShowPointEditor(false);
                }}>Remove pointing</button>
              </div>
              {pointingMethod === 'simple' && showPointEditor && block.lang !== 'la' && <PsalmSyllableEditor
                content={block.content} finalePreps={finalePreps}
                onChange={content => updateBlock(block.id, { content })}
                onClose={() => setShowPointEditor(false)}
              />}
            </section>
            {pointingError && <div role="alert" className="flex items-start justify-between gap-2 text-sm">
              <p>{pointingError}</p><button onClick={clearPointingError}>Dismiss</button>
            </div>}
          </div>}

          {/* GABC Text Editor */}
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon' || block.type === 'psalm' || block.type === 'psalm-prayer') && (
            <details className="no-print rounded border border-slate-200 p-3" open={block.type !== 'psalm' ? true : undefined}>
              <summary className="cursor-pointer text-xs font-medium text-slate-700">Chant source and image</summary>

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
                rows={6}
                aria-label="GABC score source"
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
            </details>
          )}
          </div>, toolsTarget)}

          {/* GABC SVG render */}
          {(block.type === 'antiphon' || block.type === 'hymn' || block.type === 'invitatory-antiphon' || block.type === 'psalm' || block.type === 'psalm-prayer') &&
            block.gabcScore && !block.musicDataUri && (
              <GabcRenderer gabc={block.gabcScore} baseFontSize={baseFontSize} />
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
          {hasTranslation && block.printTranslation !== false && <EditableText
            value={block.content}
            onChange={content => updateBlock(block.id, { content })}
            className="w-full text-[0.82em] italic text-center text-[#555] mt-0.5"
            placeholder="Enter translation…"
          />}
        </>
      )}
    </div>
  );
}
