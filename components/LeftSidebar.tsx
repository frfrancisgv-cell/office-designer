'use client';

import React from 'react';
import { PaperSize, OfficeSettings, BlockType } from '@/lib/types';
import { ChevronDown, Download, FileDown, Music4, Printer, Settings2, Zap } from 'lucide-react';

interface LeftSidebarProps {
  selectedDate: string; setSelectedDate: (date: string) => void;
  selectedHour: string; setSelectedHour: (hour: string) => void;
  selectedLang: string; setSelectedLang: (lang: string) => void;
  availableOccasions: { label: string; value: string }[];
  selectedOccasion: string; setSelectedOccasion: (occ: string) => void;
  fetchIBreviary: (overrideOccasion?: string) => Promise<void>;
  fetchOfflineLiturgy: () => Promise<void>; isLoading: boolean;
  settings: OfficeSettings; setSettings: (settings: OfficeSettings) => void;
  addBlock: (type: BlockType, index?: number) => void;
  handleServerPdf: () => Promise<void>; handleDownloadTex: () => Promise<void>;
  isPdfLoading: boolean; hasBlocks: boolean;
  isCollapsed: boolean; onToggleCollapsed: () => void;
}

function Menu({ label, children, isOpen, onToggle }: { label: string; children: React.ReactNode; isOpen: boolean; onToggle: (isOpen: boolean) => void }) {
  return <details className="relative" open={isOpen} onToggle={event => onToggle(event.currentTarget.open)}>
    <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
      {label}<ChevronDown size={14} />
    </summary>
    <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">{children}</div>
  </details>;
}

const fieldClass = 'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800';
const labelClass = 'block text-[10px] font-semibold uppercase tracking-wider text-slate-500';

export function LeftSidebar({
  selectedDate, setSelectedDate, selectedHour, setSelectedHour, selectedLang, setSelectedLang,
  availableOccasions, selectedOccasion, setSelectedOccasion,
  fetchIBreviary, fetchOfflineLiturgy, isLoading, settings, setSettings,
  handleServerPdf, handleDownloadTex, isPdfLoading, hasBlocks,
}: LeftSidebarProps) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const menu = (label: string) => ({
    isOpen: openMenu === label,
    onToggle: (isOpen: boolean) => setOpenMenu(isOpen ? label : null),
  });

  React.useEffect(() => {
    const closeOutsideMenu = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('details')) setOpenMenu(null);
    };
    document.addEventListener('pointerdown', closeOutsideMenu);
    return () => document.removeEventListener('pointerdown', closeOutsideMenu);
  }, []);

  return <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur no-print">
    <div className="mr-5 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-[#b91c1c] font-serif text-lg italic text-white">O</div>
      <div className="leading-tight"><h1 className="text-sm font-semibold tracking-tight text-slate-900">Office Layout</h1><p className="text-[9px] font-medium uppercase tracking-widest text-slate-500">Booklet editor</p></div>
    </div>

    <nav className="flex items-center gap-1">
      <Menu label="Office" {...menu('Office')}>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>Date<input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={fieldClass} /></label>
          <label className={labelClass}>Hour
            <select value={selectedHour} onChange={e => setSelectedHour(e.target.value)} className={fieldClass}>
              <option value="matins">Matins / Readings</option><option value="lauds">Lauds</option><option value="terce">Terce</option><option value="sext">Sext</option><option value="none">None</option><option value="vespers">Vespers</option><option value="compline">Compline</option>
            </select>
          </label>
          <label className={labelClass}>Language
            <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)} className={fieldClass}>
              <option value="en">English</option><option value="la">Latin</option><option value="it">Italiano</option><option value="fr">Français</option><option value="es">Español</option>
            </select>
          </label>
          {availableOccasions.length > 0 && <label className={labelClass}>Occasion
            <select value={selectedOccasion} onChange={e => { setOpenMenu(null); setSelectedOccasion(e.target.value); fetchIBreviary(e.target.value); }} className={fieldClass}>
              {availableOccasions.map(occ => <option key={occ.value} value={occ.value}>{occ.label}</option>)}
            </select>
          </label>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => { setOpenMenu(null); fetchIBreviary(); }} disabled={isLoading} className="rounded bg-slate-900 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"><FileDown className="mr-1 inline" size={13} />{isLoading ? 'Loading…' : 'Load iBreviary'}</button>
          <button onClick={() => { setOpenMenu(null); fetchOfflineLiturgy(); }} disabled={isLoading} className="rounded bg-emerald-700 px-2 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Zap className="mr-1 inline" size={13} />{isLoading ? 'Loading…' : 'Generate'}</button>
        </div>
      </Menu>
      <Menu label="Page" {...menu('Page')}>
        <div className="space-y-3">
          <label className={labelClass}>Paper size
            <select value={settings.paperSize} onChange={e => setSettings({ ...settings, paperSize: e.target.value as PaperSize })} className={fieldClass}>
              <option value="Letter">US Letter</option><option value="HalfLetter">Half Letter booklet</option><option value="A4">A4</option><option value="A5">A5 booklet</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Text size<select value={settings.baseFontSize} onChange={e => setSettings({ ...settings, baseFontSize: Number(e.target.value) })} className={fieldClass}>{[8, 9, 10, 11, 12, 14, 17, 20].map(n => <option key={n} value={n}>{n} pt</option>)}</select></label>
            <label className={labelClass}>Type<select value={settings.fontFamily} onChange={e => setSettings({ ...settings, fontFamily: e.target.value as 'serif' | 'sans' })} className={fieldClass}><option value="serif">Book serif</option><option value="sans">Modern sans</option></select></label>
          </div>
          <label className={labelClass}>Line spacing<select value={settings.lineSpacing} onChange={e => setSettings({ ...settings, lineSpacing: e.target.value as OfficeSettings['lineSpacing'] })} className={fieldClass}><option value="tight">Tight</option><option value="normal">Normal</option><option value="relaxed">Relaxed</option></select></label>
        </div>
      </Menu>
    </nav>

    <div className="ml-auto flex items-center gap-2">
      {/* The creator is a workshop of its own; a new tab keeps the office
          being laid out — which lives only in this page's state — intact. */}
      <a href="/tone-creator" target="_blank" rel="noopener" className="hidden items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:flex"><Music4 size={14} />Tone Creator</a>
      <button onClick={() => window.print()} className="hidden items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:flex"><Printer size={14} />Print</button>
      <Menu label="Export" {...menu('Export')}>
        <div className="space-y-2">
          <button onClick={handleServerPdf} disabled={isPdfLoading || !hasBlocks} className="flex w-full items-center gap-2 rounded bg-indigo-700 px-3 py-2 text-left text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"><Download size={14} />{isPdfLoading ? 'Generating PDF…' : 'Download typeset PDF'}</button>
          <button onClick={handleDownloadTex} disabled={!hasBlocks} className="flex w-full items-center gap-2 rounded border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Settings2 size={14} />Download TeX source</button>
        </div>
      </Menu>
    </div>
  </header>;
}
