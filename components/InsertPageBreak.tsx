import React from 'react';
import { Plus } from 'lucide-react';

export function InsertPageBreak({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="relative h-2 group/ins no-print flex items-center">
      <button
        onClick={onInsert}
        className="absolute inset-x-0 flex items-center justify-center opacity-0 group-hover/ins:opacity-100 transition-opacity"
        title="Insert page break here"
      >
        <span className="flex-1 h-px bg-gray-200" />
        <span className="mx-2 flex items-center gap-1 text-[9px] text-gray-400 hover:text-gray-600 whitespace-nowrap bg-white px-1 rounded">
          <Plus size={9} /> page break
        </span>
        <span className="flex-1 h-px bg-gray-200" />
      </button>
    </div>
  );
}
