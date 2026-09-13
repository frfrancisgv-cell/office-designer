import React, { useState } from 'react';
import { Block } from '@/lib/types';
import type { DayAnswer } from '@/app/api/ibreviary/day-search';

/**
 * Searching the chant index for a block.
 *
 * Two ways of asking. **By incipit** is the original: type the antiphon's first
 * words and get every setting of them. **By day or feast** is for when you do
 * not know the words — which is the ordinary case for a Gospel-canticle
 * antiphon — and asks the index what a named day appoints: type a date, or the
 * celebration's name, and it lists that day's antiphons with the Magnificat's
 * or Benedictus's named as such. Where the day has none of its own, it offers
 * the common's instead.
 */
export function GabcSearchPanel({
  block,
  officeDate,
  officeHour,
  onSelect,
}: {
  block: Block;
  /** The date the office is being built for, as the day search's first guess. */
  officeDate?: string;
  officeHour?: string;
  onSelect: (gabc: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState(
    block.type === 'hymn' ? 'hymn' : block.type === 'invitatory-antiphon' ? 'invitatory' : 'antiphon'
  );
  const [results, setResults] = useState<any[]>([]);
  const [day, setDay] = useState<DayAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const byDay = searchType === 'day';

  const handleSearch = async () => {
    // The day search starts from the office's own date, so the common case —
    // "what does today actually appoint?" — is the Search button and nothing
    // else typed.
    const asked = query.trim() || (byDay ? officeDate ?? '' : '');
    if (!asked) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: asked, type: searchType });
      if (byDay) params.set('hour', officeHour || 'vespers');
      const res = await fetch(`/api/ibreviary/gabc-search?${params.toString()}`);
      const data = await res.json();
      if (data.error) { setError(String(data.error)); setResults([]); setDay(null); }
      else if (byDay) { setDay(data as DayAnswer); setResults([]); }
      else { setResults(data.results || []); setDay(null); }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  };

  return (
    <div className="mt-2 p-2 bg-white border border-gray-200 rounded shadow-sm">
      <div className="text-[10px] font-bold text-gray-600 mb-1">SEARCH GABC DATABASE</div>
      <div className="flex flex-wrap gap-1 mb-2">
        <select
          value={searchType}
          onChange={e => { setSearchType(e.target.value); setResults([]); setDay(null); setError(null); }}
          className="min-w-0 shrink text-xs p-1 border rounded bg-white focus:ring-0"
          aria-label="What to search"
        >
          <option value="antiphon">Antiphons</option>
          <option value="hymn">Hymns</option>
          <option value="invitatory">Invitatories</option>
          <option value="all">All (Gregobase)</option>
          <option value="day">By day or feast</option>
        </select>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={byDay
            ? (officeDate ? `${officeDate}, or a feast’s name…` : 'A date, or a feast’s name…')
            : 'Search latin incipit...'}
          className="min-w-0 flex-1 basis-32 text-xs p-1 border rounded"
          aria-label={byDay ? 'Date or feast' : 'Latin incipit'}
        />
        <button onClick={handleSearch} className="shrink-0 px-2 py-1 bg-gray-100 border rounded text-xs">
          Search
        </button>
      </div>
      {byDay && (
        <div className="text-[9px] text-gray-500 mb-1">
          The antiphons {officeHour ? `at ${officeHour}` : ''} of a day named by its date
          (2026-09-08) or by its title (“nativity of the virgin mary”).
        </div>
      )}
      {loading && <div className="text-xs text-gray-500">Searching...</div>}
      {error && <div role="alert" className="text-xs text-red-700">{error}</div>}

      <div className="max-h-60 overflow-y-auto">
        {day && (
          <div>
            <div className="text-[10px] font-semibold text-gray-700 py-1">{day.heading}</div>
            {day.groups.length === 0 && !loading && (
              <div className="text-[10px] text-gray-500 pb-1">
                The antiphon index holds nothing for this day at this hour.
              </div>
            )}
            {day.groups.map(group => (
              <div key={group.code} className="mb-2">
                <div className="text-[10px] text-indigo-700 font-semibold border-b border-indigo-100">
                  {group.label} <span className="text-gray-400 font-normal">· {group.code}</span>
                </div>
                {group.note && <div className="text-[9px] text-gray-500 italic py-0.5">{group.note}</div>}
                {group.results.map((r, i) => (
                  <div key={i} className="flex justify-between items-center gap-2 p-1 border-b last:border-0 hover:bg-gray-50">
                    <div className="min-w-0 text-xs truncate" title={r.incipit}>
                      {r.placeLabel && <span className="text-[9px] text-indigo-600">{r.placeLabel} · </span>}
                      {r.incipit}
                      <span className="text-[9px] text-gray-400">
                        {r.mode ? ` [${r.mode}]` : ''}{r.office ? ` · ${r.office}` : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => onSelect(r.gabc)}
                      className="shrink-0 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded border border-indigo-200"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {results.map((r, i) => (
          <div key={i} className="flex justify-between items-center p-1 border-b last:border-0 hover:bg-gray-50">
            <div className="text-xs truncate" title={r.incipit}>
              {r.incipit} <span className="text-[9px] text-gray-400">({r.occasion})</span>
            </div>
            <button
              onClick={() => onSelect(r.gabc)}
              className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded border border-indigo-200"
            >
              Select
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
