import React from 'react';
import { Block, BlockType } from '@/lib/types';
import { GripVertical, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

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
  selectBlock: (index: number) => void;
  openBlockEditor: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export const RightSidebar = React.forwardRef<HTMLDivElement, RightSidebarProps>(({
  blocks, activeBlockId, insertAfterIdx, setInsertAfterIdx,
  collapsedSections, toggleSection,
  addBlock, updateBlock, removeBlock, moveBlock, reorderBlock, moveSection, deleteSection,
  selectBlock, openBlockEditor, isCollapsed, onToggleCollapsed
}, forwardedRef) => {
  const [sidebarDragIdx, setSidebarDragIdx] = React.useState<number | null>(null);
  const [sidebarDropIdx, setSidebarDropIdx] = React.useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  
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
      className={`${isCollapsed ? 'w-12 overflow-hidden' : 'w-[min(100vw,28rem)] overflow-y-auto'} fixed right-0 top-14 bottom-0 bg-slate-50 border-l border-slate-200 flex flex-col no-print z-30 transition-[width] duration-200`}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="m-2 flex h-8 w-8 items-center justify-center rounded border border-[#ddd] bg-white text-[#666] shadow-sm hover:bg-[#f0f0f0] hover:text-[#111]"
          aria-label="Expand Structure & Elements sidebar"
          title="Expand Structure & Elements"
        >
          <ChevronLeft size={18} />
        </button>
      ) : <>
      <div className="border-b border-slate-200 bg-white px-3 py-2 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate font-semibold tracking-tight text-sm text-slate-900">Document structure</h2>
          <div className="relative">
            <button onClick={() => setShowAddMenu(open => !open)} className="flex items-center justify-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"><Plus size={13} />{insertAfterIdx === null ? 'Add' : `Add after ${insertAfterIdx + 1}`}</button>
            {showAddMenu && <div className="absolute right-0 top-full z-20 mt-1 grid w-64 grid-cols-2 gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-lg">
              {(['heading', 'subheading', 'text', 'rubric', 'antiphon', 'psalm', 'psalm-prayer', 'hymn', 'page-break'] as BlockType[]).map(type => <button key={type} onClick={() => { addBlock(type); setShowAddMenu(false); }} className="rounded px-2 py-1.5 text-left text-[11px] capitalize text-slate-700 hover:bg-slate-100">{type.replace('-', ' ')}</button>)}
            </div>}
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-[#777] hover:bg-[#f0f0f0] hover:text-[#111]"
            aria-label="Collapse Structure & Elements sidebar"
            title="Collapse sidebar"
          >
            <ChevronRight size={18} />
          </button>
        </div>
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
            // insertAfterIdx is the sidebar's click selection. Fall back to the
            // document's active block only when that selection has been cleared,
            // so controls never remain expanded on two different cards.
            const isMenuOpen = isSelected || (insertAfterIdx === null && activeBlockId === block.id);
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
                onClick={() => {
                  if (isSelected) openBlockEditor(block.id);
                  else selectBlock(idx);
                }}
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
                    <select onClick={e => e.stopPropagation()} value={block.type} onChange={e => updateBlock(block.id, { type: e.target.value as any })} className={`text-[10px] uppercase tracking-wider px-1 py-0.5 rounded outline-none border border-transparent hover:border-[#ccc] cursor-pointer ${
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
                  <div className={`${isMenuOpen ? 'flex' : 'hidden'} gap-1 flex-shrink-0`}>
                    <button onClick={e => { e.stopPropagation(); isSectionHead ? moveSection(idx, 'up') : moveBlock(idx, 'up'); }} disabled={idx === 0} className="text-[#888] hover:text-[#111] disabled:opacity-30" title={isSectionHead ? 'Move section up' : 'Move block up'}><ChevronUp size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); isSectionHead ? moveSection(idx, 'down') : moveBlock(idx, 'down'); }} disabled={idx === blocks.length - 1} className="text-[#888] hover:text-[#111] disabled:opacity-30" title={isSectionHead ? 'Move section down' : 'Move block down'}><ChevronDown size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); isSectionHead ? deleteSection(idx) : removeBlock(block.id); }} className="text-[#c00] hover:text-red-700 mx-1" title={isSectionHead ? 'Delete section' : 'Delete block'}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          }
          return els;
        })()}
      </div>
      </>}
    </div>
  );
});

RightSidebar.displayName = 'RightSidebar';
