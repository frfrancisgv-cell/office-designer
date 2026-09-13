'use client';
import React, { useState, useEffect, useRef } from 'react';

import { OfficeSettings } from '@/lib/types';
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, FileText, Share2, Trash2, X } from 'lucide-react';

import { BlockEditor, InsertPageBreak } from './BlockEditor';
import { prepareGabcForPrint } from './GabcRenderer';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { useOfficeBlocks } from '@/hooks/useOfficeBlocks';
import { isPsalmRubric, isSuppressedAttribution } from '@/lib/blocks';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { applyUserPreferences } from '@/lib/apply-user-preferences';

export default function OfficeEditor() {
  const { preferences, setPreferences, resetPreferences } = useUserPreferences();
  const {
    blocks, setBlocks,
    insertAfterIdx, setInsertAfterIdx,
    addBlock, insertBlock, updateBlock, removeBlock,
    deleteSection, moveSection, moveBlock, reorderBlock,
  } = useOfficeBlocks();

  const [settings, setSettings] = useState<OfficeSettings>({
    paperSize: 'HalfLetter',
    baseFontSize: 12,
    fontFamily: 'serif',
    rubricColor: '#C00000',
    lineSpacing: 'tight',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [preferenceErrors, setPreferenceErrors] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [finalePreps, setFinalePreps] = useState<1 | 2 | 3>(preferences.psalms.simplePreparations);
  const [fetchVersion, setFetchVersion] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [toolsTarget, setToolsTarget] = useState<HTMLDivElement | null>(null);
  const activeBlock = blocks.find(block => block.id === activeBlockId);
  const activeBlockIndex = blocks.findIndex(block => block.id === activeBlockId);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(true);

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (fetchVersion === 0 || blocks.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsedSections(new Set(blocks.filter(b => b.type === 'heading').map(b => b.id)));
  }, [fetchVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBlock = (id: string) => {
    const el = document.querySelector(`[data-block-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollSidebarToBlock = (id: string) => {
    let parentHeadingId: string | null = null;
    let parentSubheadingId: string | null = null;
    const targetIdx = blocks.findIndex(b => b.id === id);
    if (targetIdx !== -1) {
      for (let i = 0; i < targetIdx; i++) {
        if (blocks[i].type === 'heading') { parentHeadingId = blocks[i].id; parentSubheadingId = null; }
        else if (blocks[i].type === 'subheading') { parentSubheadingId = blocks[i].id; }
      }
    }
    const needsUncollapse =
      !!(parentHeadingId && collapsedSections.has(parentHeadingId)) ||
      !!(parentSubheadingId && collapsedSections.has(parentSubheadingId));
    if (needsUncollapse) {
      setCollapsedSections(prev => {
        const next = new Set(prev);
        if (parentHeadingId) next.delete(parentHeadingId);
        if (parentSubheadingId) next.delete(parentSubheadingId);
        return next;
      });
    }
    const doScroll = () => {
      const el = document.querySelector(`[data-sidebar-block-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    if (needsUncollapse) setTimeout(doScroll, 50); else doScroll();
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60 * 1000);
    return localToday.toISOString().split('T')[0];
  });
  const [selectedHour, setSelectedHour] = useState('vespers');
  const [selectedLang, setSelectedLang] = useState(preferences.defaultLanguage);
  const [availableOccasions, setAvailableOccasions] = useState<{ label: string; value: string }[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState('');

  const handleSelectedDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedOccasion('');
    setAvailableOccasions([]);
  };

  const handleSelectedHourChange = (hour: string) => {
    setSelectedHour(hour);
    setSelectedOccasion('');
    setAvailableOccasions([]);
  };

  useEffect(() => {
    // The document rail is useful by default on a desktop, but consumes the
    // entire working viewport on a phone. OfficeEditor renders nothing until
    // this client-only preference has been established, so there is no flash.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRightSidebarCollapsed(!window.matchMedia('(min-width: 1024px)').matches);
    setIsClient(true);
  }, []);

  const fetchOfflineLiturgy = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({ date: selectedDate, hour: selectedHour, lang: selectedLang });
      const res = await fetch(`/api/liturgy?${queryParams.toString()}`);
      const data = await res.json();
      if (data.blocks && data.blocks.length > 0) {
        const applied = await applyUserPreferences(data.blocks, preferences, 'generated', selectedHour, selectedLang, selectedDate);
        setBlocks(applied.blocks);
        setPreferenceErrors(applied.errors);
        setFetchVersion(v => v + 1);
      } else if (data.error) {
        alert('Offline Engine Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to generate offline office');
    }
    setIsLoading(false);
  };

  const fetchIBreviary = async (overrideOccasion?: string) => {
    setIsLoading(true);
    try {
      const occasionToUse = overrideOccasion !== undefined ? overrideOccasion : selectedOccasion;
      const queryParams = new URLSearchParams({ date: selectedDate, hour: selectedHour, lang: selectedLang });
      if (occasionToUse) queryParams.set('occasionOverride', occasionToUse);
      const res = await fetch(`/api/ibreviary?${queryParams.toString()}`);
      const data = await res.json();
      if (data.blocks && data.blocks.length > 0) {
        const applied = await applyUserPreferences(data.blocks, preferences, 'ibreviary', selectedHour, selectedLang, selectedDate);
        setBlocks(applied.blocks);
        setPreferenceErrors(applied.errors);
        if (data.availableOccasions) {
          setAvailableOccasions(data.availableOccasions);
          if (!occasionToUse && data.occasionCode) setSelectedOccasion(data.occasionCode);
          else if (overrideOccasion !== undefined) setSelectedOccasion(overrideOccasion);
        }
        setFetchVersion(v => v + 1);
      } else if (data.error) {
        alert('Server Error: ' + data.error);
      } else {
        alert('Server returned an empty result. Check server logs.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to fetch from iBreviary');
    }
    setIsLoading(false);
  };

  const [isPdfLoading, setIsPdfLoading] = useState(false);
  /**
   * A failed PDF build, with the captured lualatex log.
   *
   * /api/pdf already returns the last 4000 characters of office.log as
   * `detail`, but this component used to read only `err.error` and show it
   * through alert(), so every failure looked like "PDF generation failed:
   * PDF rendering failed" — and a real TeX error is far too long for an
   * alert() anyway. Without the log a single stray character in one psalm is
   * effectively undiagnosable.
   */
  const [pdfError, setPdfError] = useState<{ message: string; detail?: string } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const getBaseFilename = () => {
    const parts = ['office', selectedDate, selectedHour];
    if (selectedLang) parts.push(selectedLang);
    if (selectedOccasion) parts.push(selectedOccasion);
    return parts.join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const handleServerPdf = async () => {
    setIsPdfLoading(true);
    setPdfError(null);
    try {
      const filename = getBaseFilename();
      const res = await fetch(`/api/pdf?filename=${encodeURIComponent(filename)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocks, settings }) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        setPdfError({ message: err.error ?? res.statusText, detail: err.detail });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { setPdfError({ message: e instanceof Error ? e.message : String(e) }); }
    finally { setIsPdfLoading(false); }
  };

  const handleDownloadTex = async () => {
    try {
      const filename = getBaseFilename();
      const res = await fetch(`/api/pdf?format=tex&filename=${encodeURIComponent(filename)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ blocks, settings }) });
      if (!res.ok) { alert('Failed to generate .tex file'); return; }
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.tex`; a.click(); URL.revokeObjectURL(url);
    } catch (e) { alert(`Download failed: ${e instanceof Error ? e.message : String(e)}`); }
  };

  const handlePrayShare = async () => {
    if (!blocks.length) return;
    setIsSharing(true); setShareError(''); setShareCopied(false);
    try {
      const firstHeading = blocks.find(block => block.type === 'heading')?.content.replace(/<[^>]*>/g, '').trim();
      const title = firstHeading || `${selectedHour.charAt(0).toUpperCase()}${selectedHour.slice(1)} · ${selectedDate}`;
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, settings, title }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not create a prayer link.');
      setShareUrl(new URL(data.url, window.location.origin).href);
    } catch (e) { setShareError(e instanceof Error ? e.message : String(e)); }
    finally { setIsSharing(false); }
  };

  const handlePrint = async () => {
    setIsPreparingPrint(true);
    try {
      await prepareGabcForPrint();
      window.print();
    } finally {
      setIsPreparingPrint(false);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
    } catch { setShareError('The link could not be copied automatically. Select and copy it below.'); }
  };

  const nativeShare = async () => {
    if (!shareUrl) return;
    if (!navigator.share) { await copyShareUrl(); return; }
    try { await navigator.share({ title: 'Pray this office', url: shareUrl }); }
    catch (e) { if ((e as DOMException).name !== 'AbortError') setShareError('This device could not open its share menu.'); }
  };

  if (!isClient) return null;

  return (
    <div className="flex print:block min-h-screen bg-[#fdfdfd] text-[#1a1a1a] font-sans print:bg-white">

      <LeftSidebar
        selectedDate={selectedDate} setSelectedDate={handleSelectedDateChange}
        selectedHour={selectedHour} setSelectedHour={handleSelectedHourChange}
        selectedLang={selectedLang} setSelectedLang={setSelectedLang}
        availableOccasions={availableOccasions} selectedOccasion={selectedOccasion} setSelectedOccasion={setSelectedOccasion}
        fetchIBreviary={fetchIBreviary} fetchOfflineLiturgy={fetchOfflineLiturgy} isLoading={isLoading}
        settings={settings} setSettings={setSettings}
        preferences={preferences} setPreferences={next => { setPreferences(next); setSelectedLang(next.defaultLanguage); setFinalePreps(next.psalms.simplePreparations); }} resetPreferences={() => { resetPreferences(); setSelectedLang('en'); setFinalePreps(2); }}
        blocks={blocks}
        addBlock={addBlock}
        handleServerPdf={handleServerPdf} handleDownloadTex={handleDownloadTex} isPdfLoading={isPdfLoading}
        handlePrayShare={handlePrayShare} isSharing={isSharing}
        handlePrint={handlePrint} isPreparingPrint={isPreparingPrint}
        hasBlocks={blocks.length > 0}
        isCollapsed={false}
        onToggleCollapsed={() => {}}
      />

      <main className={`flex-1 min-w-0 overflow-x-hidden pt-16 sm:pt-20 ${isRightSidebarCollapsed && !activeBlock ? 'mr-12' : 'mr-12 lg:mr-112'} flex flex-col items-stretch sm:items-center px-3 sm:px-8 print:mx-0 print:p-0 bg-slate-100 print:bg-transparent relative pb-20 sm:pb-32 min-h-screen print:min-h-0`}>
        {preferenceErrors.length > 0 && (
          <div className="no-print mb-4 w-full max-w-3xl rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950" role="alert">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">The office loaded, but {preferenceErrors.length} item{preferenceErrors.length === 1 ? '' : 's'} could not be pointed automatically.</p><ul className="mt-1 list-disc pl-4">{preferenceErrors.slice(0, 5).map((error, index) => <li key={index}>{error}</li>)}</ul></div><button type="button" onClick={() => setPreferenceErrors([])} aria-label="Dismiss" className="font-bold">×</button></div>
          </div>
        )}
        {pdfError && (
          <div className="no-print w-full max-w-3xl mb-4 rounded border border-red-300 bg-red-50 p-3 text-[12px] text-red-900">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">PDF generation failed: {pdfError.message}</p>
              <button
                onClick={() => setPdfError(null)}
                className="shrink-0 text-red-700 hover:text-red-900 font-bold leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
            {pdfError.detail && (
              <details className="mt-2">
                <summary className="cursor-pointer select-none text-red-800">
                  Show the LaTeX log
                </summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded bg-white/70 p-2 text-[11px] leading-snug text-red-950">
                  {pdfError.detail}
                </pre>
              </details>
            )}
          </div>
        )}
        <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: ${settings.paperSize === 'HalfLetter' ? '5.5in 8.5in' : settings.paperSize === 'Letter' ? '8.5in 11in' : settings.paperSize === 'A5' ? 'A5' : 'A4'}; margin: 15mm; } .page-sheet { width:100%!important;min-height:0!important;padding:0!important;margin:0!important;box-shadow:none!important;border:none!important; } }` }} />
        <div className="print:block flex flex-col items-stretch sm:items-center w-full pb-20 sm:pb-32">
          <div
            className="page-sheet bg-white shadow-2xl relative print:w-auto print:min-h-0 print:border-none print:shadow-none print:p-0 print:m-0 transition-all duration-300"
            style={{
              width: settings.paperSize === 'HalfLetter' ? '5.5in' : settings.paperSize === 'Letter' ? '8.5in' : settings.paperSize === 'A5' ? '148mm' : '210mm',
              maxWidth: '100%',
              // A floor the office grows past, never a height. aspect-ratio cannot
              // serve here: the sheet is a flex item, so its automatic minimum comes
              // from the ratio rather than from the content, and a long hour spills
              // off the bottom of the paper. The ratio below is for the narrow screens
              // where this fixed height is the wrong shape; globals.css puts it to work.
              minHeight: settings.paperSize === 'HalfLetter' ? '8.5in' : settings.paperSize === 'Letter' ? '11in' : settings.paperSize === 'A5' ? '210mm' : '297mm',
              ...({ '--page-ratio': settings.paperSize === 'HalfLetter' ? '154.5%' : settings.paperSize === 'Letter' ? '129.4%' : settings.paperSize === 'A5' ? '141.9%' : '141.4%' } as React.CSSProperties),
              padding: '40px',
              fontFamily: settings.fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)',
              fontSize: `${settings.baseFontSize}pt`,
              lineHeight: settings.lineSpacing === 'tight' ? '1.15' : settings.lineSpacing === 'normal' ? '1.3' : '1.6',
            }}
          >
            <div className="absolute inset-0 pointer-events-none no-print z-0" style={{ border: '1px solid #eee' }} />
            <div className="relative z-10 w-full">
              {blocks.length === 0 && (
                <div className="text-center text-[#999] mt-20 no-print flex flex-col items-center">
                  <FileText size={48} className="mb-4 opacity-30 text-[#888]" />
                  <p>Your layout is empty.</p>
                  <p className="text-[10px] mt-2 text-[#999]">Click &quot;Grab texts from iBreviary&quot; or add blocks manually.</p>
                </div>
              )}
              {blocks.map((block, idx) => {
                if (isSuppressedAttribution(blocks, idx)) return null;
                return (
                  <React.Fragment key={block.id}>
                    <InsertPageBreak onInsert={() => addBlock('page-break', idx)} />
                    <BlockEditor
                      block={block} index={idx}
                      rubricColor={settings.rubricColor}
                      updateBlock={updateBlock} insertBlock={insertBlock}
                      reorderBlock={reorderBlock}
                      finalePreps={finalePreps} setFinalePreps={setFinalePreps}
                      centerRubric={isPsalmRubric(blocks, idx)}
                      baseFontSize={settings.baseFontSize}
                      isActive={activeBlockId === block.id}
                      toolsTarget={toolsTarget}
                      officeDate={selectedDate} officeHour={selectedHour}
                      onClick={() => { setActiveBlockId(block.id); scrollSidebarToBlock(block.id); setInsertAfterIdx(idx); }}
                    />
                  </React.Fragment>
                );
              })}
              <InsertPageBreak onInsert={() => addBlock('page-break', blocks.length)} />
            </div>
          </div>
        </div>
      </main>

      <RightSidebar
        blocks={blocks}
        activeBlockId={activeBlockId}
        insertAfterIdx={insertAfterIdx}
        setInsertAfterIdx={setInsertAfterIdx}
        collapsedSections={collapsedSections}
        toggleSection={toggleSection}
        addBlock={addBlock}
        updateBlock={updateBlock}
        removeBlock={removeBlock}
        moveBlock={moveBlock}
        reorderBlock={reorderBlock}
        moveSection={moveSection}
        deleteSection={deleteSection}
        selectBlock={idx => { setActiveBlockId(null); setInsertAfterIdx(idx); }}
        openBlockEditor={id => { setActiveBlockId(id); scrollToBlock(id); }}
        isCollapsed={isRightSidebarCollapsed}
        onToggleCollapsed={() => setIsRightSidebarCollapsed(collapsed => !collapsed)}
      />
      <aside
        aria-label="Block editor"
        className={`no-print fixed right-0 top-14 bottom-0 z-30 w-[min(100vw,28rem)] border-l border-slate-200 bg-white shadow-xl flex flex-col font-sans text-sm leading-normal ${activeBlock ? '' : 'hidden'}`}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold capitalize">Edit {activeBlock?.type.replaceAll('-', ' ')} <span className="font-normal text-slate-400">· {activeBlock?.content.replace(/<[^>]*>/g, '').slice(0, 70) || 'Empty block'}</span></h2>
          </div>
          <button type="button" onClick={() => moveBlock(activeBlockIndex, 'up')} disabled={activeBlockIndex <= 0} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30" title="Move block up" aria-label="Move block up"><ChevronUp size={15} /></button>
          <button type="button" onClick={() => moveBlock(activeBlockIndex, 'down')} disabled={activeBlockIndex < 0 || activeBlockIndex === blocks.length - 1} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30" title="Move block down" aria-label="Move block down"><ChevronDown size={15} /></button>
          <button type="button" onClick={() => { if (activeBlock) removeBlock(activeBlock.id); }} className="rounded p-1.5 text-red-600 hover:bg-red-50" title="Delete block" aria-label="Delete block"><Trash2 size={15} /></button>
          <button type="button" onClick={() => setActiveBlockId(null)} className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Structure</button>
        </div>
        <div key={activeBlockId} ref={setToolsTarget} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3" />
      </aside>

      {(shareUrl || shareError) && (
        <div className="no-print fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onPointerDown={event => { if (event.target === event.currentTarget) { setShareUrl(''); setShareError(''); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="pray-share-title" className="w-full max-w-md rounded-xl bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#4b3021] text-white"><Share2 size={17} /></span>
              <div className="min-w-0 flex-1">
                <h2 id="pray-share-title" className="font-semibold text-slate-900">Pray / Share this office</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Anyone with this link gets a screen-fitted, read-only prayer view. The link expires after 30 days.</p>
              </div>
              <button type="button" onClick={() => { setShareUrl(''); setShareError(''); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
            </div>
            {shareError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">{shareError}</p>}
            {shareUrl && <>
              <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Prayer link
                <input readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700" />
              </label>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => void nativeShare()} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#4b3021] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5f3d2b]"><Share2 size={14} />Share</button>
                <button type="button" onClick={() => void copyShareUrl()} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">{shareCopied ? <Check size={14} /> : <Copy size={14} />}{shareCopied ? 'Copied' : 'Copy link'}</button>
                <a href={shareUrl} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><ExternalLink size={14} />Open Pray view</a>
              </div>
            </>}
          </section>
        </div>
      )}
    </div>
  );
}
