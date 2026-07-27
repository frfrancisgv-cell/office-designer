import React, { useState } from 'react';
import { Block } from '@/lib/types';

export function GabcSearchPanel({
  block,
  onSelect,
}: {
  block: Block;
  onSelect: (gabc: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState(
    block.type === 'hymn' ? 'hymn' : block.type === 'invitatory-antiphon' ? 'invitatory' : 'antiphon'
  );
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ibreviary/gabc-search?q=${encodeURIComponent(query)}&type=${searchType}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="mt-2 p-2 bg-white border border-gray-200 rounded shadow-sm">
      <div className="text-[10px] font-bold text-gray-600 mb-1">SEARCH GABC DATABASE</div>
      <div className="flex gap-1 mb-2">
        <select
          value={searchType}
          onChange={e => setSearchType(e.target.value)}
          className="text-xs p-1 border rounded bg-white focus:ring-0"
        >
          <option value="antiphon">Antiphons</option>
          <option value="hymn">Hymns</option>
          <option value="invitatory">Invitatories</option>
          <option value="all">All (Gregobase)</option>
        </select>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search latin incipit..."
          className="flex-1 text-xs p-1 border rounded"
        />
        <button onClick={handleSearch} className="px-2 py-1 bg-gray-100 border rounded text-xs">
          Search
        </button>
      </div>
      {loading && <div className="text-xs text-gray-500">Searching...</div>}
      <div className="max-h-40 overflow-y-auto">
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
