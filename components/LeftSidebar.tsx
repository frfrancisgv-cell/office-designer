import React from 'react';
import { PaperSize, OfficeSettings, BlockType } from '@/lib/types';
import { FileDown, Printer, Zap, Plus } from 'lucide-react';

interface LeftSidebarProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedHour: string;
  setSelectedHour: (hour: string) => void;
  selectedLang: string;
  setSelectedLang: (lang: string) => void;
  availableOccasions: { label: string; value: string }[];
  selectedOccasion: string;
  setSelectedOccasion: (occ: string) => void;
  fetchIBreviary: (overrideOccasion?: string) => Promise<void>;
  fetchOfflineLiturgy: () => Promise<void>;
  isLoading: boolean;
  settings: OfficeSettings;
  setSettings: (settings: OfficeSettings) => void;
  addBlock: (type: BlockType, index?: number) => void;
  handleServerPdf: () => Promise<void>;
  handleDownloadTex: () => Promise<void>;
  isPdfLoading: boolean;
  hasBlocks: boolean;
}

export function LeftSidebar({
  selectedDate, setSelectedDate,
  selectedHour, setSelectedHour,
  selectedLang, setSelectedLang,
  availableOccasions, selectedOccasion, setSelectedOccasion,
  fetchIBreviary, fetchOfflineLiturgy, isLoading,
  settings, setSettings,
  addBlock,
  handleServerPdf, handleDownloadTex, isPdfLoading, hasBlocks
}: LeftSidebarProps) {
  return (
    <div className="w-72 fixed left-0 top-0 bottom-0 bg-[#fafafa] border-r border-[#e5e5e5] h-screen overflow-y-auto flex flex-col no-print z-40">
      <div className="p-4 flex items-center justify-between border-b border-[#eee] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#c00] rounded-sm flex items-center justify-center text-white font-serif italic text-xl">O</div>
          <div>
            <h1 className="font-medium tracking-tight text-sm">Office Layout</h1>
            <p className="text-[10px] text-[#888] uppercase tracking-widest">Booklet Editor</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Integrations</h2>
          <div className="space-y-2 bg-white border border-[#eee] rounded-md p-3 shadow-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider block">Office Date</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border border-[#ddd] p-1.5 text-xs rounded focus:ring-0 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider block">Office Hour</label>
              <select value={selectedHour} onChange={e => setSelectedHour(e.target.value)} className="w-full border border-[#ddd] p-1.5 text-xs rounded focus:ring-0 bg-white">
                <option value="matins">Matins / Readings</option>
                <option value="lauds">Lauds (Morning)</option>
                <option value="terce">Terce (Midmorning)</option>
                <option value="sext">Sext (Midday)</option>
                <option value="none">None (Midafternoon)</option>
                <option value="vespers">Vespers (Evening)</option>
                <option value="compline">Compline (Night)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider block">Language</label>
              <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)} className="w-full border border-[#ddd] p-1.5 text-xs rounded focus:ring-0 bg-white">
                <option value="en">English</option>
                <option value="la">Latin</option>
                <option value="it">Italiano</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
            {availableOccasions.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-[#eee]">
                <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider block">Occasion</label>
                <select value={selectedOccasion} onChange={e => { setSelectedOccasion(e.target.value); fetchIBreviary(e.target.value); }} className="w-full border border-[#ddd] p-1.5 text-xs rounded focus:ring-0 bg-white">
                  {availableOccasions.map((occ, i) => <option key={i} value={occ.value}>{occ.label}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => fetchIBreviary()} disabled={isLoading} className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-[#1a1a1a] hover:bg-black text-white border border-[#1a1a1a] rounded shadow-xs text-xs font-semibold transition">
              <FileDown size={14} />{isLoading ? 'Retrieving...' : 'Grab from iBreviary'}
            </button>
            <button onClick={fetchOfflineLiturgy} disabled={isLoading} className="w-full mt-1.5 flex items-center justify-center gap-2 p-2 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-700 rounded shadow-xs text-xs font-semibold transition disabled:opacity-50">
              <Zap size={14} />{isLoading ? 'Generating...' : '⚡ Generate Offline (4-Wk Psalter)'}
            </button>
          </div>
          <p className="text-[10px] text-[#999] leading-relaxed">Retrieves structure from iBreviary or generates offline from local 4-Week Psalter & psalm databases.</p>
        </div>
        <hr className="border-[#eee]" />
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Booklet Setup</h2>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[#444] block">Paper Size</label>
            <select value={settings.paperSize} onChange={e => setSettings({ ...settings, paperSize: e.target.value as PaperSize })} className="w-full border border-[#ddd] p-2 text-sm rounded focus:ring-0 bg-white">
              <option value="Letter">US Letter (8.5&quot; x 11&quot;)</option>
              <option value="HalfLetter">Half Letter (Booklet - 5.5&quot; x 8.5&quot;)</option>
              <option value="A4">A4 Default</option>
              <option value="A5">A5 (Booklet)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[#444] block">Line Spacing</label>
            <select value={settings.lineSpacing} onChange={e => setSettings({ ...settings, lineSpacing: e.target.value as 'tight' | 'normal' | 'relaxed' })} className="w-full border border-[#ddd] p-2 text-sm rounded focus:ring-0 bg-white">
              <option value="tight">Tight</option><option value="normal">Normal</option><option value="relaxed">Relaxed</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[#444] block">Font Size (pt)</label>
              <input type="number" value={settings.baseFontSize} onChange={e => setSettings({ ...settings, baseFontSize: parseInt(e.target.value) })} className="w-full border border-[#ddd] p-2 text-sm rounded focus:ring-0 bg-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[#444] block">Typography</label>
              <select value={settings.fontFamily} onChange={e => setSettings({ ...settings, fontFamily: e.target.value as 'serif' | 'sans' })} className="w-full border border-[#ddd] p-2 text-sm rounded focus:ring-0 bg-white">
                <option value="serif">EB Garamond</option><option value="sans">Inter (Modern)</option>
              </select>
            </div>
          </div>
        </div>
        <hr className="border-[#eee]" />
        <div className="space-y-3">
          <h2 className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Add Elements</h2>
          <div className="grid grid-cols-2 gap-2">
            {(['heading', 'rubric', 'antiphon', 'psalm', 'text', 'page-break'] as BlockType[]).map(t => (
              <button key={t} onClick={() => addBlock(t)} className={`text-xs flex items-center justify-center gap-1 p-2 border rounded ${t === 'rubric' ? 'bg-[#fbecec] hover:bg-[#f0c2c2] border-[#f0c2c2] text-[#c00]' : 'bg-white hover:bg-[#f0f0f0] border-[#e0e0e0] text-[#555]'}`}>
                <Plus size={12} /> {t.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-auto p-4 bg-[#f9f9f9] border-t border-[#eee] flex flex-col gap-2">
        <button onClick={() => window.print()} className="w-full py-2 border border-[#1a1a1a] bg-[#1a1a1a] hover:bg-black text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition">
          <Printer size={16} /> Print / Export PDF
        </button>
        <button onClick={handleServerPdf} disabled={isPdfLoading || !hasBlocks} className="w-full py-2 border border-[#4a4a8a] bg-[#4a4a8a] hover:bg-[#3a3a7a] disabled:opacity-50 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition">
          <FileDown size={16} />{isPdfLoading ? 'Generating…' : 'Server PDF (LuaLaTeX)'}
        </button>
        <button onClick={handleDownloadTex} disabled={!hasBlocks} className="w-full py-1.5 border border-[#6a6a6a] bg-transparent hover:bg-[#f0f0f0] disabled:opacity-50 text-[#555] text-xs font-bold rounded flex items-center justify-center gap-2 transition">
          <FileDown size={14} /> Download .tex source
        </button>
      </div>
    </div>
  );
}
