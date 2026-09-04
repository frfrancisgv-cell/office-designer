import { useState, useCallback } from 'react';
import { Block, BlockType } from '@/lib/types';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useOfficeBlocks(initialBlocks: Block[] = []) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [insertAfterIdx, setInsertAfterIdx] = useState<number | null>(null);

  const addBlock = useCallback((type: BlockType, index?: number) => {
    setBlocks(current => {
      const insertAt = index !== undefined ? index : (insertAfterIdx !== null ? insertAfterIdx + 1 : current.length);
      const newBlock: Block = { id: generateId(), type, content: '' };
      const newBlocks = [...current];
      newBlocks.splice(insertAt, 0, newBlock);
      // setInsertAfterIdx needs to be called by the component, or we return the new insert index
      return newBlocks;
    });
  }, [insertAfterIdx]);

  const insertBlock = useCallback((index: number, newBlockData: Omit<Block, 'id'>) => {
    setBlocks(current => {
      const newBlock: Block = { id: generateId(), ...newBlockData };
      const newBlocks = [...current];
      newBlocks.splice(index, 0, newBlock);
      return newBlocks;
    });
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(current => current.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(current => current.filter(b => b.id !== id));
  }, []);

  const deleteSection = useCallback((startIndex: number) => {
    setBlocks(current => {
      const level = current[startIndex].type === 'heading' ? 1 : current[startIndex].type === 'subheading' ? 2 : Infinity;
      let endIndex = startIndex + 1;
      while (endIndex < current.length) {
        const lvl = current[endIndex].type === 'heading' ? 1 : current[endIndex].type === 'subheading' ? 2 : Infinity;
        if (lvl <= level) break;
        endIndex++;
      }
      const nb = [...current];
      nb.splice(startIndex, endIndex - startIndex);
      return nb;
    });
  }, []);

  const moveSection = useCallback((startIndex: number, direction: 'up' | 'down') => {
    setBlocks(current => {
      const level = current[startIndex].type === 'heading' ? 1 : current[startIndex].type === 'subheading' ? 2 : Infinity;
      let endIndex = startIndex + 1;
      while (endIndex < current.length) {
        const lvl = current[endIndex].type === 'heading' ? 1 : current[endIndex].type === 'subheading' ? 2 : Infinity;
        if (lvl <= level) break;
        endIndex++;
      }
      const sectionLen = endIndex - startIndex;
      const section = current.slice(startIndex, endIndex);
      
      const nb = [...current];
      if (direction === 'up') {
        if (startIndex === 0) return current;
        let prev = startIndex - 1;
        while (prev >= 0) {
          const lvl = current[prev].type === 'heading' ? 1 : current[prev].type === 'subheading' ? 2 : Infinity;
          if (lvl === level) break;
          if (lvl < level) { prev++; break; }
          prev--;
        }
        if (prev < 0) prev = 0;
        if (prev === startIndex) return current;
        
        nb.splice(startIndex, sectionLen);
        nb.splice(prev, 0, ...section);
      } else {
        if (endIndex >= current.length) return current;
        let nextEnd = endIndex + 1;
        while (nextEnd < current.length) {
          const lvl = current[nextEnd].type === 'heading' ? 1 : current[nextEnd].type === 'subheading' ? 2 : Infinity;
          if (lvl <= level) break;
          nextEnd++;
        }
        nb.splice(startIndex, sectionLen);
        nb.splice(nextEnd - sectionLen, 0, ...section);
      }
      return nb;
    });
  }, []);

  const moveBlock = useCallback((index: number, direction: 'up' | 'down') => {
    setBlocks(current => {
      const nb = [...current];
      if (direction === 'up' && index > 0) {
        [nb[index - 1], nb[index]] = [nb[index], nb[index - 1]];
      } else if (direction === 'down' && index < current.length - 1) {
        [nb[index + 1], nb[index]] = [nb[index], nb[index + 1]];
      }
      return nb;
    });
  }, []);

  const reorderBlock = useCallback((sourceIndex: number, destIndex: number) => {
    setBlocks(current => {
      const nb = [...current];
      const [moved] = nb.splice(sourceIndex, 1);
      nb.splice(destIndex, 0, moved);
      return nb;
    });
  }, []);

  return {
    blocks,
    setBlocks,
    insertAfterIdx, setInsertAfterIdx,
    addBlock, insertBlock, updateBlock, removeBlock,
    deleteSection,
    moveSection,
    moveBlock,
    reorderBlock,
  };
}
