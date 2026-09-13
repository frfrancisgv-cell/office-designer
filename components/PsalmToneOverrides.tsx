'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { OverrideEngine, PointingFamily, PsalmToneOverride } from '@/lib/types';
import { getToneNames, getVariants } from '@/lib/psalm-tones/tone-data';
import { lypsForJgabcTone } from '@/lib/psalm-tones/mode-map';
import { describePsalmToneKey, parsePsalmToneOverrideKey, psalmToneOverrideKey } from '@/lib/user-preferences';

const field = 'mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800';
const label = 'block text-[10px] font-semibold uppercase tracking-wider text-slate-500';

const ENGINE_LABELS: Record<OverrideEngine, string> = {
  gregorian: 'Gregorian GABC',
  lypsautierant: 'Stress-aware + / −',
  created: 'A tone I designed',
};
const FAMILY_LABELS: Record<PointingFamily, string> = {
  english: 'English — stress aware',
  gregorian: 'Gregorian — stress aware',
  modes: 'Modal — syllable count',
  french: 'French — syllable count',
};
const MODE_NUMBERS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5',
  six: '6', seven: '7', eight: '8', peregrinus: 'peregrinus',
};

/** `a_prime` is the book's a′; the underscored spelling is the engine's key. */
function variationLabel(variation: string): string {
  return variation.replace('_dprime', '″').replace('_prime', '′');
}
function modeLabel(mode: string): string {
  return MODE_NUMBERS[mode] ?? mode;
}

/** family → mode → the variations that family and mode actually define. */
type Catalogue = Record<string, Record<string, string[]>>;
interface LibraryTone { id: string; name: string; backend: string }

/**
 * What the app does with a tone when no row overrides it, said in the row
 * itself.
 *
 * The correspondence between a Gregorian tone and the lypsautierant English
 * variation that sings it is already in the app — `lib/psalm-tones/mode-map.ts`
 * reads it out of the mode OCO records on the antiphon — and it is exactly
 * what somebody about to override a tone needs to see: the row starts from the
 * tone the app would otherwise choose rather than from a blank.
 */
function defaultTarget(tone: string, variant: string): Partial<PsalmToneOverride> {
  const lyps = lypsForJgabcTone(tone, variant);
  return {
    tone,
    variant,
    ...(lyps ? { family: lyps.family, mode: lyps.mode, variation: lyps.variation } : {}),
  };
}

function describeDefault(tone: string, variant: string): string {
  const lyps = lypsForJgabcTone(tone, variant);
  return lyps
    ? `Left alone, this tone is sung as ${describePsalmToneKey(psalmToneOverrideKey(tone, variant))} in Gregorian, or English ${modeLabel(lyps.mode)} · ${variationLabel(lyps.variation)} stress-aware.`
    : 'The stress-aware tables have no row for this tone, so the stress-aware engine falls back on its own.';
}

/**
 * The override table: which tone, called for by an antiphon, is sung by
 * something other than the engine chosen under Psalm defaults.
 *
 * The library of designed tones and the list of lypsautierant variations are
 * both read from the server — the tone library lives in `data/`, and the
 * variations are not uniform across modes (gregorian/two has only `d`), so
 * they cannot be guessed here. Both are fetched once, when this tab is first
 * opened, and a row that names something the fetch did not return keeps
 * naming it: the row is the user's, and a failed fetch is not grounds for
 * quietly rewriting it.
 */
export function PsalmToneOverrides({ overrides, onChange }: {
  overrides: Record<string, PsalmToneOverride>;
  onChange: (value: Record<string, PsalmToneOverride>) => void;
}) {
  const toneNames = React.useMemo(() => getToneNames(), []);
  const [catalogue, setCatalogue] = React.useState<Catalogue>({});
  const [library, setLibrary] = React.useState<LibraryTone[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [newTone, setNewTone] = React.useState(toneNames[0] ?? '8.');
  const [newVariant, setNewVariant] = React.useState(getVariants(toneNames[0] ?? '8.')[0] ?? '');

  React.useEffect(() => {
    const controller = new AbortController();
    const fail = (message: string) => { if (!controller.signal.aborted) setLoadError(message); };
    fetch('/api/lypsautierant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'catalogue' }), signal: controller.signal,
    })
      .then(response => response.json())
      .then(data => setCatalogue(data.families ?? {}))
      .catch(() => fail('The stress-aware mode list could not be read.'));
    fetch('/api/tone-creator', { signal: controller.signal })
      .then(response => response.json())
      .then(data => setLibrary(data.tones ?? []))
      .catch(() => fail('The saved tone library could not be read.'));
    return () => controller.abort();
  }, []);

  const keys = Object.keys(overrides).sort();
  const set = (key: string, row: PsalmToneOverride) => onChange({ ...overrides, [key]: row });
  const remove = (key: string) => {
    const next = { ...overrides };
    delete next[key];
    onChange(next);
  };
  const add = () => {
    const key = psalmToneOverrideKey(newTone, newVariant);
    if (overrides[key]) return;
    // A new row opens on the most likely reason for making one — a designed
    // tone — and on the Gregorian tone it replaces when the library is empty.
    const first = library[0];
    set(key, {
      enabled: true,
      ...defaultTarget(newTone, newVariant),
      ...(first
        ? { engine: 'created' as const, createdToneId: first.id, createdToneName: first.name }
        : { engine: 'gregorian' as const }),
    });
  };

  const variationsFor = (family?: string, mode?: string): string[] =>
    (family && mode && catalogue[family]?.[mode]) || [];

  return <section className="space-y-3">
    <div>
      <h3 className="text-xs font-semibold text-slate-900">Psalm tone overrides</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        Every antiphon names the tone its psalms are sung to. Where that tone and termination are
        listed below, the psalms under it are pointed by what the row says — engine, family, tone and
        termination together — instead of by the engine chosen under Psalm defaults. This is where a
        tone from the Tone Creator takes the place of what a family sings by default. Clear a row&rsquo;s
        checkbox to set it aside without losing what it holds.
      </p>
    </div>

    <div className="flex items-end gap-2 rounded bg-slate-50 p-2">
      <label className={`${label} flex-1`}>Tone
        <select className={field} value={newTone} onChange={e => {
          setNewTone(e.target.value);
          setNewVariant(getVariants(e.target.value)[0] ?? '');
        }}>{toneNames.map(tone => <option key={tone} value={tone}>{tone}</option>)}</select>
      </label>
      <label className={`${label} flex-1`}>Termination
        <select className={field} value={newVariant} onChange={e => setNewVariant(e.target.value)}>
          {getVariants(newTone).map(variant => <option key={variant} value={variant}>{variant || '(only one)'}</option>)}
        </select>
      </label>
      <button type="button" onClick={add} className="flex items-center gap-1 rounded bg-slate-900 px-2 py-2 text-xs font-semibold text-white">
        <Plus size={13} />Add
      </button>
    </div>

    {loadError && <p role="alert" className="text-[11px] text-red-700">{loadError}</p>}

    {!keys.length && <p className="text-[11px] text-slate-500">No overrides yet. Every tone is sung by the engine chosen under Psalm defaults.</p>}

    {keys.map(key => {
      const row = overrides[key];
      const { tone, variant } = parsePsalmToneOverrideKey(key);
      const chosen = library.find(item => item.id === row.createdToneId);
      const variations = variationsFor(row.family, row.mode);
      return <div key={key} className={`rounded border p-2 ${row.enabled ? 'border-slate-300' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-2">
          <input
            type="checkbox" checked={row.enabled}
            aria-label={`Override tone ${describePsalmToneKey(key)}`}
            onChange={e => set(key, { ...row, enabled: e.target.checked })}
          />
          <span className="text-xs font-semibold text-slate-900">Tone {describePsalmToneKey(key)}</span>
          <button
            type="button" onClick={() => remove(key)} title="Remove this override"
            aria-label={`Remove the override for tone ${describePsalmToneKey(key)}`}
            className="ml-auto rounded border border-slate-300 px-1.5 py-1 text-red-600 hover:bg-red-50"
          ><Trash2 size={13} /></button>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{describeDefault(tone, variant)}</p>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className={label}>Sing it with
            <select className={field} value={row.engine} onChange={e => {
              const engine = e.target.value as OverrideEngine;
              const first = library[0];
              set(key, {
                ...row,
                engine,
                // Switching to a designed tone with nothing chosen yet takes
                // the first in the library; the other targets are already
                // filled from the tone this row stands for.
                ...(engine === 'created' && !row.createdToneId && first
                  ? { createdToneId: first.id, createdToneName: first.name } : {}),
                ...(engine === 'lypsautierant' && !row.family ? defaultTarget(tone, variant) : {}),
                ...(engine === 'gregorian' && !row.tone ? { tone, variant } : {}),
              });
            }}>
              {(Object.keys(ENGINE_LABELS) as OverrideEngine[]).map(engine =>
                <option key={engine} value={engine} disabled={engine === 'created' && !library.length}>
                  {ENGINE_LABELS[engine]}{engine === 'created' && !library.length ? ' — none saved' : ''}
                </option>)}
            </select>
          </label>

          {row.engine === 'gregorian' && <>
            <label className={label}>Tone
              <select className={field} value={row.tone ?? tone} onChange={e => set(key, {
                ...row, tone: e.target.value, variant: getVariants(e.target.value)[0] ?? '',
              })}>{toneNames.map(name => <option key={name} value={name}>{name}</option>)}</select>
            </label>
            <label className={`${label} col-span-2`}>Termination
              <select className={field} value={row.variant ?? ''} onChange={e => set(key, { ...row, variant: e.target.value })}>
                {getVariants(row.tone ?? tone).map(code => <option key={code} value={code}>{code || '(only one)'}</option>)}
              </select>
            </label>
          </>}

          {row.engine === 'lypsautierant' && <>
            <label className={label}>Family
              <select className={field} value={row.family ?? 'english'} onChange={e => {
                const family = e.target.value as PointingFamily;
                const modes = Object.keys(catalogue[family] ?? {});
                const mode = modes.includes(row.mode ?? '') ? row.mode! : (modes[0] ?? row.mode ?? 'eight');
                const codes = variationsFor(family, mode);
                set(key, {
                  ...row, family, mode,
                  variation: codes.includes(row.variation ?? '') ? row.variation : (codes[0] ?? row.variation),
                });
              }}>
                {(Object.keys(FAMILY_LABELS) as PointingFamily[]).map(family =>
                  <option key={family} value={family}>{FAMILY_LABELS[family]}</option>)}
              </select>
            </label>
            <label className={label}>Mode
              <select className={field} value={row.mode ?? ''} onChange={e => {
                const codes = variationsFor(row.family, e.target.value);
                set(key, {
                  ...row, mode: e.target.value,
                  variation: codes.includes(row.variation ?? '') ? row.variation : (codes[0] ?? row.variation),
                });
              }}>
                {(Object.keys(catalogue[row.family ?? 'english'] ?? {}).length
                  ? Object.keys(catalogue[row.family ?? 'english'] ?? {})
                  : [row.mode ?? '']).map(mode => <option key={mode} value={mode}>{modeLabel(mode)}</option>)}
              </select>
            </label>
            <label className={label}>Ending
              <select className={field} value={row.variation ?? ''} onChange={e => set(key, { ...row, variation: e.target.value })}>
                {(variations.length ? variations : [row.variation ?? '']).map(code =>
                  <option key={code} value={code}>{variationLabel(code)}</option>)}
              </select>
            </label>
          </>}

          {row.engine === 'created' && <label className={label}>Designed tone
            <select className={field} value={row.createdToneId ?? ''} disabled={!library.length} onChange={e => {
              const tone = library.find(item => item.id === e.target.value);
              set(key, { ...row, createdToneId: e.target.value, createdToneName: tone?.name });
            }}>
              {library.length
                ? library.map(item => <option key={item.id} value={item.id}>{item.name} ({item.backend === 'lyps' ? '+ − =' : item.backend === 'jgabc' ? 'GABC' : 'Conditional'})</option>)
                : <option value="">No tones saved yet</option>}
            </select>
          </label>}
        </div>

        {row.engine === 'created' && row.createdToneId && !chosen && <p role="alert" className="mt-1 text-[10px] text-red-700">
          {row.createdToneName ? `"${row.createdToneName}"` : 'This tone'} is not in the saved library any more, so this override cannot be sung.
        </p>}
      </div>;
    })}
  </section>;
}
