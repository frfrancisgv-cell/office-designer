import React from 'react';
import { Block, BlockType } from '@/lib/types';
import { GripVertical, Trash2, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

interface RightSidebarProps {
  blocks: Block[];
  activeBlockId: string | null;
  insertAfterIdx: number | null;
  setInsertAfterIdx: (idx: number | null) => void;
  collapsedSections: Set<string>;
  toggleSection: (id: string) => void;
  addBlock: (type: BlockType, index?: number) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (index: number, direction: 'up' | 'down') => void;
  reorderBlock: (sourceIndex: number, destIndex: number) => void;
  moveSection: (startIndex: number, direction: 'up' | 'down') => void;
  deleteSection: (startIndex: number) => void;
  scrollToBlock: (id: string) => void;
}

export const RightSidebar = React.forwardRef<HTMLDivElement, RightSidebarProps>(({
  blocks, activeBlockId, insertAfterIdx, setInsertAfterIdx,
  collapsedSections, toggleSection,
  addBlock, updateBlock, removeBlock, moveBlock, reorderBlock, moveSection, deleteSection,
  scrollToBlock
}, forwardedRef) => {
  const [sidebarDragIdx, setSidebarDragIdx] = React.useState<number | null>(null);
  const [sidebarDropIdx, setSidebarDropIdx] = React.useState<number | null>(null);
  
  const innerRef = React.useRef<HTMLDivElement>(null);
  const sidebarRef = (forwardedRef as any) || innerRef;
  const dragScrollRef = React.useRef<{ raf: number | null; y: number }>({ raf: null, y: 0 });

  const handleSidebarDragOver = React.useCallback((e: React.DragEvent) => {
    if (sidebarDragIdx === null) return;
    const el = sidebarRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragScrollRef.current.y = e.clientY;
    const zone = 60;
    const distTop = e.clientY - rect.top;
    const distBot = rect.bottom - e.clientY;
    if (dragScrollRef.current.raf) cancelAnimationFrame(dragScrollRef.current.raf);
    if (distTop < zone || distBot < zone) {
      const scroll = () => {
        if (sidebarDragIdx === null) return;
        const speed = 8;
        const dt = dragScrollRef.current.y - rect.top;
        const db = rect.bottom - dragScrollRef.current.y;
        if (dt < zone) el.scrollTop -= Math.ceil(speed * (1 - dt / zone));
        else if (db < zone) el.scrollTop += Math.ceil(speed * (1 - db / zone));
        dragScrollRef.current.raf = requestAnimationFrame(scroll);
      };
      dragScrollRef.current.raf = requestAnimationFrame(scroll);
    }
  }, [sidebarDragIdx, sidebarRef]);

  const stopDragScroll = React.useCallback(() => {
    if (dragScrollRef.current.raf) { cancelAnimationFrame(dragScrollRef.current.raf); dragScrollRef.current.raf = null; }
  }, []);

  return (
    <div
      ref={sidebarRef}
      onDragOver={handleSidebarDragOver}
      onDragLeave={stopDragScroll}
      onDrop={stopDragScroll}
      className="w-80 fixed right-0 top-0 bottom-0 bg-[#fafafa] border-l border-[#e5e5e5] h-screen overflow-y-auto flex flex-col no-print z-40"
    >
      <div className="p-4 border-b border-[#eee] bg-white sticky top-0 z-10 shadow-sm">
        <h2 className="font-medium tracking-tight text-sm">Structure &amp; Elements</h2>
        <p className="text-[10px] text-[#888] uppercase tracking-widest">Click to select · Drag to reorder</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => addBlock('text')} className="flex-1 py-1.5 text-xs bg-white border border-[#ddd] hover:bg-[#f0f0f0] rounded">+ Text</button>
          <button onClick={() => addBlock('rubric')} className="flex-1 py-1.5 text-xs bg-white border border-[#ddd] hover:bg-[#f0f0f0] rounded">+ Rubric</button>
          <button onClick={() => addBlock('page-break')} className="flex-1 py-1.5 text-xs bg-white border border-[#ddd] hover:bg-[#f0f0f0] rounded">+ Break</button>
        </div>
        {insertAfterIdx !== null
          ? <p className="text-[9px] text-blue-600 mt-1.5">Inserting after #{insertAfterIdx + 1}&nbsp;<button className="underline text-gray-400 hover:text-gray-600" onClick={() => setInsertAfterIdx(null)}>clear</button></p>
          : <p className="text-[9px] text-[#999] mt-1.5">Adding at end — click a block to insert after it</p>}
      </div>
      <div className="flex-1 p-2 space-y-1 pb-10">
        {(() => {
          const els: React.ReactNode[] = [];
          let headingCollapsed = false;
          let subheadingCollapsed = false;
          for (let idx = 0; idx < blocks.length; idx++) {
            const block = blocks[idx];
            const isHeading = block.type === 'heading';
            const isSubheading = block.type === 'subheading';
            if (isHeading) { headingCollapsed = collapsedSections.has(block.id); subheadingCollapsed = false; }
            else if (isSubheading && !headingCollapsed) { subheadingCollapsed = collapsedSections.has(block.id); }
            const isSectionHead = isHeading || isSubheading;
            const isCollapsible = isHeading || (isSubheading && !headingCollapsed);
            const thisCollapsed = isCollapsible && collapsedSections.has(block.id);
            const show = isHeading || (!headingCollapsed && isSubheading) || (!headingCollapsed && !subheadingCollapsed);
            if (!show) continue;
            const isSelected = insertAfterIdx === idx;
            const isDragging = sidebarDragIdx === idx;
            const isDropTarget = sidebarDropIdx === idx && sidebarDragIdx !== idx;
            els.push(
              <div
                key={block.id}
                draggable
                onDragStart={() => setSidebarDragIdx(idx)}
                onDragEnd={() => { setSidebarDragIdx(null); setSidebarDropIdx(null); stopDragScroll(); }}
                onDragOver={e => { e.preventDefault(); setSidebarDropIdx(idx); }}
                onDragLeave={() => setSidebarDropIdx(null)}
                onDrop={e => { e.preventDefault(); if (sidebarDragIdx !== null && sidebarDragIdx !== idx) reorderBlock(sidebarDragIdx, idx); setSidebarDragIdx(null); setSidebarDropIdx(null); }}
                onClick={() => { scrollToBlock(block.id); setInsertAfterIdx(idx); }}
                data-sidebar-block-id={block.id}
                className={`flex flex-col p-2 bg-white border rounded shadow-sm cursor-pointer group transition-all
                  ${isHeading ? 'mt-4 border-t-2 border-t-blue-300 !ml-0' : isSubheading ? 'ml-2 border-l-2 border-l-cyan-200' : 'ml-4'}
                  ${activeBlockId === block.id ? 'border-indigo-400 ring-2 ring-indigo-300' : isSelected ? 'border-blue-400 ring-1 ring-blue-300' : 'border-[#eee] hover:border-[#ccc]'}
                  ${isDragging ? 'opacity-40' : ''} ${isDropTarget ? 'border-t-2 border-t-blue-500' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 overflow-hidden flex-1">
                    <GripVertical size={12} className="text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0" />
                    <div className="text-[9px] font-bold text-[#999] w-4">{idx + 1}</div>
                    {isCollapsible && (
                      <button onClick={e => { e.stopPropagation(); toggleSection(block.id); }} className="text-[#888] hover:text-[#333] flex-shrink-0">
                        {thisCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    <select value={block.type} onChange={e => updateBlock(block.id, { type: e.target.value as any })} className={`text-[10px] uppercase tracking-wider px-1 py-0.5 rounded outline-none border border-transparent hover:border-[#ccc] cursor-pointer ${
                      block.type === 'heading' ? 'bg-blue-100 text-blue-800 font-bold' : block.type === 'subheading' ? 'bg-cyan-100 text-cyan-800 font-bold' : block.type === 'rubric' ? 'bg-red-100 text-red-800' : block.type === 'psalm' ? 'bg-green-100 text-green-800' : block.type === 'psalm-prayer' ? 'bg-teal-100 text-teal-800' : block.type === 'antiphon' ? 'bg-purple-100 text-purple-800' : block.type === 'hymn' ? 'bg-amber-100 text-amber-800' : block.type === 'page-break' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <option value="heading">Heading</option><option value="subheading">Subheading</option>
                      <option value="text">Text</option><option value="rubric">Rubric</option>
                      <option value="psalm">Psalm</option><option value="psalm-prayer">Psalm Prayer</option>
                      <option value="antiphon">Antiphon</option><option value="hymn">Hymn</option>
                      <option value="page-break">Page Break</option>
                    </select>
                    <div className="text-[11px] text-[#333] truncate flex-1" dangerouslySetInnerHTML={{ __html: block.content ? block.content.replace(/<[^>]*>?/gm, '').substring(0, 40) : '...' }} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); moveBlock(idx, 'up'); }} disabled={idx === 0} className="text-[#888] hover:text-[#111] disabled:opacity-30"><ChevronUp size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); moveBlock(idx, 'down'); }} disabled={idx === blocks.length - 1} className="text-[#888] hover:text-[#111] disabled:opacity-30"><ChevronDown size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }} className="text-[#c00] hover:text-red-700 mx-1"><Trash2 size={14} /></button>
                  </div>
                </div>
                {isSectionHead && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-[#f5f5f5] opacity-0 group-hover:opacity-100 transition-opacity items-center">
                    <span className="text-[9px] uppercase text-[#999] tracking-widest flex-1">Section:</span>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} disabled={idx === 0} className="text-[10px] text-blue-600 hover:underline px-1 py-0.5">Up</button>
                    <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} disabled={idx === blocks.length - 1} className="text-[10px] text-blue-600 hover:underline px-1 py-0.5">Down</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteSection(idx); }} className="text-[10px] text-red-600 hover:underline px-1 py-0.5 font-bold">Del</button>
                  </div>
                )}
              </div>
            );
          }
          return els;
        })()}
      </div>
    </div>
  );
});

RightSidebar.displayName = 'RightSidebar';
