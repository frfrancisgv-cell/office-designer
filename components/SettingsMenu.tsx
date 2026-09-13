'use client';

import React from 'react';
import { RotateCcw, Save, Trash2 } from 'lucide-react';
import type {
  Block, ChantedOrdinaryPreference, OfficeBlockVisibility, PsalmPointingPreference, UserPreferences,
} from '@/lib/types';
import {
  BLOCK_VISIBILITY_LABELS, IBREVIARY_SECTION_LABELS, effectiveBlockVisibility, structureFromBlocks,
} from '@/lib/user-preferences';
import { PsalmToneOverrides } from './PsalmToneOverrides';
import {
  ORDINARY_PART_FIELDS, ORDINARY_PART_LABELS, chantsForPart, type OrdinaryPart,
} from '@/lib/chanted-ordinary';

const field = 'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800';
const label = 'block text-[10px] font-semibold uppercase tracking-wider text-slate-500';

function PointingDefaults({ title, description, value, onChange }: {
  title: string; description: string; value: PsalmPointingPreference;
  onChange: (value: PsalmPointingPreference) => void;
}) {
  return <section className="border-t border-slate-100 pt-3">
    <h3 className="text-xs font-semibold text-slate-900">{title}</h3>
    <p className="mb-2 text-[11px] text-slate-500">{description}</p>
    <div className="grid grid-cols-2 gap-2">
      <label className={label}>Language<select className={field} value={value.language} onChange={e => onChange({ ...value, language: e.target.value as PsalmPointingPreference['language'] })}><option value="office">Use office language</option><option value="en">English</option><option value="la">Latin</option></select></label>
      <label className={label}>Pointing engine<select className={field} value={value.engine} onChange={e => onChange({ ...value, engine: e.target.value as PsalmPointingPreference['engine'] })}><option value="gregorian">Gregorian GABC</option><option value="lypsautierant">Stress-aware + / −</option><option value="simple">Simple bold / italic</option><option value="none">Leave unpointed</option></select></label>
      {value.engine === 'lypsautierant' && <label className={`${label} col-span-2`}>Family<select className={field} value={value.family} onChange={e => onChange({ ...value, family: e.target.value as PsalmPointingPreference['family'] })}><option value="auto">From the antiphon</option><option value="english">English — stress aware</option><option value="gregorian">Gregorian — stress aware</option><option value="modes">Modal — syllable count</option><option value="french">French — syllable count</option></select></label>}
      {value.engine === 'simple' && <label className={label}>Preparatory syllables<select className={field} value={value.simplePreparations} onChange={e => onChange({ ...value, simplePreparations: Number(e.target.value) as 1 | 2 | 3 })}><option>1</option><option>2</option><option>3</option></select></label>}
      {value.engine === 'gregorian' && <label className="col-span-2 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={value.solemnTone} onChange={e => onChange({ ...value, solemnTone: e.target.checked })} />Solemn mediant<span className="text-[11px] text-slate-500">&mdash; the fuller cadence at the asterisk</span></label>}
    </div>
  </section>;
}

/**
 * The three parts of the ordinary that can be sung rather than said, each with
 * the setting it is sung to. "Say it" is the empty id — the same thing the
 * office did before any of this — so a part is turned off where it is chosen.
 */
function ChantedOrdinary({ value, onChange }: {
  value: ChantedOrdinaryPreference; onChange: (value: ChantedOrdinaryPreference) => void;
}) {
  return <section className="border-t border-slate-100 pt-3">
    <h3 className="text-xs font-semibold text-slate-900">Sung ordinary</h3>
    <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
      Set the parts every office says the same way to their Gregorian chant, with the office&rsquo;s own
      words beneath the staff. Compline is not covered: its opening is <em>Convérte nos</em>, which the
      chant cache has no setting of.
    </p>
    <div className="space-y-2">
      {(Object.keys(ORDINARY_PART_LABELS) as OrdinaryPart[]).map(part => {
        const key = ORDINARY_PART_FIELDS[part];
        return <label key={part} className={label}>{ORDINARY_PART_LABELS[part]}
          <select className={field} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })}>
            <option value="">Say it, do not sing it</option>
            {chantsForPart(part).map(chant =>
              <option key={chant.id} value={chant.id}>{chant.name} — {chant.source}</option>)}
          </select>
        </label>;
      })}
    </div>
  </section>;
}

export function SettingsMenu({ preferences, onChange, onReset, blocks, hour }: {
  preferences: UserPreferences; onChange: (value: UserPreferences) => void; onReset: () => void;
  blocks: Block[]; hour: string;
}) {
  const [tab, setTab] = React.useState<'general' | 'structure' | 'advanced'>('general');
  // Which hour the "saved" confirmation belongs to: a structure saved for one
  // hour says nothing about the next, so the confirmation goes when the hour
  // under the button changes.
  const [savedHour, setSavedHour] = React.useState<string | null>(null);
  const saved = savedHour === hour;
  const set = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => onChange({ ...preferences, [key]: value });
  const template = preferences.structureTemplates[hour];
  const saveStructure = () => {
    const next = structureFromBlocks(blocks);
    onChange({ ...preferences, structureTemplates: { ...preferences.structureTemplates, [hour]: next } });
    setSavedHour(hour);
  };
  /** Adjust one of this hour's block switches without re-saving the office. */
  const setHourVisibility = (key: keyof OfficeBlockVisibility, value: boolean) => {
    if (!template) return;
    const blockVisibility = { ...effectiveBlockVisibility(preferences, template), [key]: value };
    onChange({
      ...preferences,
      structureTemplates: { ...preferences.structureTemplates, [hour]: { ...template, blockVisibility } },
    });
  };
  const hourVisibility = template ? effectiveBlockVisibility(preferences, template) : null;
  const hidden = hourVisibility
    ? (Object.keys(BLOCK_VISIBILITY_LABELS) as (keyof OfficeBlockVisibility)[])
      .filter(key => !hourVisibility[key])
      .map(key => BLOCK_VISIBILITY_LABELS[key].toLowerCase())
    : [];

  return <div className="w-full">
    <div className="mb-3 flex border-b border-slate-200" role="tablist">
      {(['general', 'structure', 'advanced'] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`px-3 py-2 text-xs font-semibold capitalize ${tab === value ? 'border-b-2 border-red-700 text-red-800' : 'text-slate-500'}`}>{value}</button>)}
    </div>
    {tab === 'general' && <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      <section><h3 className="text-xs font-semibold text-slate-900">Office defaults</h3><div className="mt-2 grid grid-cols-2 gap-2">
        <label className={label}>Office language<select className={field} value={preferences.defaultLanguage} onChange={e => set('defaultLanguage', e.target.value as UserPreferences['defaultLanguage'])}><option value="en">English</option><option value="la">Latin</option><option value="it">Italiano</option><option value="fr">Français</option><option value="es">Español</option></select></label>
        <label className="mt-5 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={preferences.showTranslations} onChange={e => set('showTranslations', e.target.checked)} />Show chant translations</label>
      </div></section>
      <PointingDefaults title="Psalm defaults" description="Language, engine, and family for the psalmody." value={preferences.psalms} onChange={value => set('psalms', value)} />
      <PointingDefaults title="Gospel Canticle defaults" description="Independent defaults for the Magnificat, Benedictus, and Nunc Dimittis." value={preferences.gospelCanticles} onChange={value => set('gospelCanticles', value)} />
      <label className="flex items-start gap-2 rounded bg-slate-50 p-2 text-xs text-slate-700"><input className="mt-0.5" type="checkbox" checked={preferences.selectProperGospelAntiphon} onChange={e => set('selectProperGospelAntiphon', e.target.checked)} /><span><strong className="block font-semibold text-slate-900">Select the proper Gospel antiphon</strong>Sing the antiphon the day appoints — its own proper first, and on a Sunday the one for this year&rsquo;s cycle — instead of leaving the OCO choice unresolved.</span></label>
      <label className="flex items-start gap-2 rounded bg-slate-50 p-2 text-xs text-slate-700"><input className="mt-0.5" type="checkbox" checked={preferences.sundayCollectOnFerials} onChange={e => set('sundayCollectOnFerials', e.target.checked)} /><span><strong className="block font-semibold text-slate-900">Sunday&rsquo;s collect on ferial weekdays</strong>On a weekday of Ordinary Time, say the collect of that week&rsquo;s Sunday in place of the psalter&rsquo;s own prayer for the day — at Lauds, Vespers and the Office of Readings, which are the hours that say the day&rsquo;s collect.</span></label>
      <ChantedOrdinary value={preferences.chantedOrdinary} onChange={value => set('chantedOrdinary', value)} />
    </div>}
    {tab === 'structure' && <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      <section><h3 className="text-xs font-semibold text-slate-900">Default structure for {hour}</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Arrange or remove sections <em>and</em> blocks in the current office, then save it as the default for future {hour} offices. Saving records the section set and order, and which of the blocks below the office kept.</p>
        <div className="mt-2 flex gap-2"><button type="button" disabled={!blocks.length} onClick={saveStructure} className="flex flex-1 items-center justify-center gap-1 rounded bg-slate-900 px-2 py-2 text-xs font-semibold text-white disabled:opacity-40"><Save size={13} />{saved ? 'Structure saved' : 'Save current structure'}</button>{template && <button type="button" title="Forget saved structure" aria-label="Forget saved structure" onClick={() => { const next = { ...preferences.structureTemplates }; delete next[hour]; set('structureTemplates', next); setSavedHour(null); }} className="rounded border border-slate-300 px-2 text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>}</div>
        {template && <p className="mt-1 text-[10px] text-emerald-700">A default with {template.sectionOrder.length} sections is saved for this hour{hidden.length ? `, hiding ${hidden.join(', ')}` : ''}.</p>}
        {hourVisibility && <div className="mt-2 rounded bg-slate-50 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Blocks in a {hour} office</p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">Read from the office you saved. These stand in for the general block defaults whenever this hour is loaded.</p>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
            {(Object.entries(BLOCK_VISIBILITY_LABELS) as [keyof OfficeBlockVisibility, string][]).map(([key, text]) =>
              <label key={key} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={hourVisibility[key]} onChange={e => setHourVisibility(key, e.target.checked)} />{text}</label>)}
          </div>
        </div>}
      </section>
      <section className="border-t border-slate-100 pt-3"><h3 className="text-xs font-semibold text-slate-900">Sections to include</h3><div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">{Object.entries(IBREVIARY_SECTION_LABELS).map(([key, text]) => <label key={key} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={preferences.ibreviarySections[key as keyof typeof preferences.ibreviarySections]} onChange={e => set('ibreviarySections', { ...preferences.ibreviarySections, [key]: e.target.checked })} />{text}</label>)}</div></section>
      <section className="border-t border-slate-100 pt-3"><h3 className="text-xs font-semibold text-slate-900">Individual block defaults</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Used by every hour that has no saved structure of its own{template ? `; ${hour} follows the switches saved with its structure above` : ''}.</p>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        {(Object.entries(BLOCK_VISIBILITY_LABELS) as [keyof OfficeBlockVisibility, string][]).map(([key, text]) => <label key={key} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={preferences.blockVisibility[key]} onChange={e => set('blockVisibility', { ...preferences.blockVisibility, [key]: e.target.checked })} />{text}</label>)}
      </div></section>
    </div>}
    {tab === 'advanced' && <div className="max-h-[70vh] overflow-y-auto pr-1">
      <PsalmToneOverrides
        overrides={preferences.psalmToneOverrides}
        onChange={value => set('psalmToneOverrides', value)}
      />
    </div>}
    <button type="button" onClick={onReset} className="mt-3 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"><RotateCcw size={12} />Reset all local defaults</button>
  </div>;
}
