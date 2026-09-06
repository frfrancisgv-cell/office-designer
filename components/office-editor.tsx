'use client';
import React, { useState, useEffect, useRef } from 'react';

import { OfficeSettings } from '@/lib/types';
import { FileText } from 'lucide-react';

import { BlockEditor, InsertPageBreak } from './BlockEditor';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { useOfficeBlocks } from '@/hooks/useOfficeBlocks';
import { isPsalmRubric, isSuppressedAttribution } from '@/lib/blocks';

export default function OfficeEditor() {
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
  const [isClient, setIsClient] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [finalePreps, setFinalePreps] = useState<1 | 2 | 3>(2);
  const [fetchVersion, setFetchVersion] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

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
  const [selectedLang, setSelectedLang] = useState('en');
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  const fetchOfflineLiturgy = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({ date: selectedDate, hour: selectedHour, lang: selectedLang });
      const res = await fetch(`/api/liturgy?${queryParams.toString()}`);
      const data = await res.json();
      if (data.blocks && data.blocks.length > 0) {
        setBlocks(data.blocks);
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
        setBlocks(data.blocks);
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
        addBlock={addBlock}
        handleServerPdf={handleServerPdf} handleDownloadTex={handleDownloadTex} isPdfLoading={isPdfLoading}
        hasBlocks={blocks.length > 0}
        isCollapsed={isLeftSidebarCollapsed}
        onToggleCollapsed={() => setIsLeftSidebarCollapsed(collapsed => !collapsed)}
      />

      <div className={`flex-1 ${isLeftSidebarCollapsed ? 'ml-12' : 'ml-72'} ${isRightSidebarCollapsed ? 'mr-12' : 'mr-80'} flex flex-col items-center p-8 print:mx-0 print:p-0 bg-[#dcdcdc] print:bg-transparent relative pb-32 min-h-screen print:min-h-0 transition-[margin] duration-200`}>
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
        <div className="print:block flex flex-col items-center w-full pb-32">
          <div
            className="page-sheet bg-white shadow-2xl relative print:w-auto print:min-h-0 print:border-none print:shadow-none print:p-0 print:m-0 transition-all duration-300"
            style={{
              width: settings.paperSize === 'HalfLetter' ? '5.5in' : settings.paperSize === 'Letter' ? '8.5in' : settings.paperSize === 'A5' ? '148mm' : '210mm',
              minHeight: settings.paperSize === 'HalfLetter' ? '8.5in' : settings.paperSize === 'Letter' ? '11in' : settings.paperSize === 'A5' ? '210mm' : '297mm',
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
                      block={block} index={idx} total={blocks.length}
                      rubricColor={settings.rubricColor}
                      updateBlock={updateBlock} insertBlock={insertBlock} removeBlock={removeBlock}
                      moveBlock={moveBlock} reorderBlock={reorderBlock}
                      finalePreps={finalePreps} setFinalePreps={setFinalePreps}
                      centerRubric={isPsalmRubric(blocks, idx)}
                      baseFontSize={settings.baseFontSize}
                      isActive={activeBlockId === block.id}
                      onClick={() => { setActiveBlockId(block.id); scrollSidebarToBlock(block.id); setInsertAfterIdx(idx); }}
                    />
                  </React.Fragment>
                );
              })}
              <InsertPageBreak onInsert={() => addBlock('page-break', blocks.length)} />
            </div>
          </div>
        </div>
      </div>

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
        scrollToBlock={scrollToBlock}
        isCollapsed={isRightSidebarCollapsed}
        onToggleCollapsed={() => setIsRightSidebarCollapsed(collapsed => !collapsed)}
      />
    </div>
  );
}
