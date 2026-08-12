import { useState, useMemo, useEffect } from 'react';
import { Block } from '@/lib/types';
import { getToneNames, getVariants, getPresetGabc } from '@/lib/psalm-tones/tone-data';
import { stripPointing } from '@/lib/psalm-tones/utils';
import { autoPointPsalm } from '@/components/psalm-utils';

export function useBlockPointing(
  block: Block,
  updateBlock: (id: string, updates: Partial<Block>) => void,
  finalePreps: 1 | 2 | 3,
  insertBlock?: (index: number, newBlock: Omit<Block, 'id'>) => void,
  index?: number
) {
  const [showPointEditor, setShowPointEditor] = useState(false);
  const toneNames = useMemo(() => [...getToneNames(), 'Custom'], []);
  const [selectedTone, setSelectedTone] = useState<string>(block.psalmTone ?? '8.');
  const [selectedVariant, setSelectedVariant] = useState<string>(block.psalmVariant ?? '');

  const initialPresets = useMemo(
    () => getPresetGabc(block.psalmTone ?? '8.', block.psalmVariant ?? ''),
    [block.psalmTone, block.psalmVariant]
  );

  const [customMediant, setCustomMediant] = useState<string>(
    block.customMediant ?? initialPresets.mediant
  );
  const [customTermination, setCustomTermination] = useState<string>(
    block.customTermination ?? initialPresets.termination
  );
  const [showCustomTonePanel, setShowCustomTonePanel] = useState<boolean>(
    Boolean(block.customMediant || block.customTermination || block.psalmTone === 'Custom')
  );

  const [isApplyingTone, setIsApplyingTone] = useState(false);
  const [isLoadingStress, setIsLoadingStress] = useState(false);
  const [isLoadingLatin, setIsLoadingLatin] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (block.psalmTone) setSelectedTone(block.psalmTone);
  }, [block.psalmTone]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (block.psalmVariant !== undefined) setSelectedVariant(block.psalmVariant);
  }, [block.psalmVariant]);

  const variantOptions = useMemo(
    () => (selectedTone === 'Custom' ? [] : getVariants(selectedTone)),
    [selectedTone]
  );

  const handleToneChange = (tone: string) => {
    setSelectedTone(tone);
    if (tone === 'Custom') {
      setShowCustomTonePanel(true);
      updateBlock(block.id, { psalmTone: 'Custom' });
    } else {
      const variants = getVariants(tone);
      const firstVariant = variants[0] ?? '';
      setSelectedVariant(firstVariant);
      const preset = getPresetGabc(tone, firstVariant);
      setCustomMediant(preset.mediant);
      setCustomTermination(preset.termination);
      updateBlock(block.id, {
        psalmTone: tone,
        psalmVariant: firstVariant,
        customMediant: preset.mediant,
        customTermination: preset.termination,
      });
    }
  };

  const handleVariantChange = (variant: string) => {
    setSelectedVariant(variant);
    const preset = getPresetGabc(selectedTone, variant);
    setCustomMediant(preset.mediant);
    setCustomTermination(preset.termination);
    updateBlock(block.id, {
      psalmVariant: variant,
      customMediant: preset.mediant,
      customTermination: preset.termination,
    });
  };

  const handleApplyTone = async () => {
    setIsApplyingTone(true);
    const baseText = block.originalContent || stripPointing(block.content);
    const isCustomMode = selectedTone === 'Custom' || showCustomTonePanel;

    const updatePayload: Partial<Block> = {
      psalmTone: selectedTone,
      psalmVariant: selectedVariant,
      originalContent: baseText,
    };
    if (isCustomMode || customMediant || customTermination) {
      updatePayload.customMediant = customMediant;
      updatePayload.customTermination = customTermination;
    }
    updateBlock(block.id, updatePayload);

    try {
      const res = await fetch('/api/psalm-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'point',
          text: baseText,
          tone: isCustomMode ? undefined : selectedTone,
          variant: isCustomMode ? undefined : selectedVariant,
          customMediant: (isCustomMode || customMediant) ? customMediant : undefined,
          customTermination: (isCustomMode || customTermination) ? customTermination : undefined,
          lang: block.lang || 'en',
          solemn: ['Magnificat', 'Benedictus', 'Nunc dimittis'].includes(String(block.psalmNumber)),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          if (data.gabcScore && insertBlock && index !== undefined && (block.type === 'psalm' || block.type === 'psalm-prayer')) {
            // Split the returned HTML by newline
            const lines = data.result.split('\n');
            const firstVerseIdx = lines.findIndex((l: string) => l.trim().length > 0);
            
            if (firstVerseIdx !== -1) {
              const firstVerseHtml = lines[firstVerseIdx];
              lines.splice(firstVerseIdx, 1);
              const remainingHtml = lines.join('\n');
              
              // Base text split (original raw text)
              const baseLines = baseText.split('\n');
              const baseFirstVerseIdx = baseLines.findIndex((l: string) => l.trim().length > 0);
              const baseFirstVerse = baseFirstVerseIdx !== -1 ? baseLines[baseFirstVerseIdx] : baseText;
              let baseRemaining = baseText;
              if (baseFirstVerseIdx !== -1) {
                 const newBaseLines = [...baseLines];
                 newBaseLines.splice(baseFirstVerseIdx, 1);
                 baseRemaining = newBaseLines.join('\n');
              }
              
              // 1. Turn CURRENT block into an antiphon
              updateBlock(block.id, {
                type: 'antiphon',
                content: firstVerseHtml,
                originalContent: baseFirstVerse,
                gabcScore: data.gabcScore,
                psalmTone: selectedTone,
                psalmVariant: selectedVariant
              });
              
              // 2. Insert NEW block below for the rest of the psalm
              insertBlock(index + 1, {
                type: block.type, // remains psalm or psalm-prayer
                content: remainingHtml,
                originalContent: baseRemaining,
                psalmNumber: block.psalmNumber,
                psalmTone: selectedTone,
                psalmVariant: selectedVariant,
                lang: block.lang,
                // Do not attach gabcScore to the remaining block
              });
              
              setShowPointEditor(true);
              return;
            }
          }
          
          // Fallback if no split needed
          const updates: Partial<Block> = { content: data.result, originalContent: baseText };
          if (data.gabcScore) updates.gabcScore = data.gabcScore;
          updateBlock(block.id, updates);
          setShowPointEditor(true);
          return;
        }
      }
      console.warn('[ApplyTone] API failed, falling back to auto-point');
      updateBlock(block.id, { content: autoPointPsalm(baseText, finalePreps), originalContent: baseText });
      setShowPointEditor(true);
    } catch (e) {
      console.error('[ApplyTone] Error:', e);
      updateBlock(block.id, { content: autoPointPsalm(baseText, finalePreps), originalContent: baseText });
      setShowPointEditor(true);
    } finally {
      setIsApplyingTone(false);
    }
  };

  const handleLoadStressedText = async () => {
    if (!block.psalmNumber) return;
    setIsLoadingStress(true);
    try {
      const res = await fetch(`/api/psalm-text?psalm=${encodeURIComponent(String(block.psalmNumber))}`);
      if (res.ok) {
        const data = await res.json();
        if (data.rawText) {
          const ibreviaryText = block.ibreviaryContent || stripPointing(block.content);
          updateBlock(block.id, {
            content: data.rawText,
            originalContent: data.rawText,
            ibreviaryContent: ibreviaryText,
            lang: 'en',
          });
          setShowPointEditor(true);
        }
      }
    } catch (e) {
      console.error('[LoadStressedText] Error:', e);
    } finally {
      setIsLoadingStress(false);
    }
  };

  const handleLoadLatinText = async () => {
    if (!block.psalmNumber) return;
    setIsLoadingLatin(true);
    try {
      const res = await fetch(`/api/psalm-text?psalm=${encodeURIComponent(String(block.psalmNumber))}&collection=jgabc`);
      if (res.ok) {
        const data = await res.json();
        if (data.rawText) {
          const ibreviaryText = block.ibreviaryContent || stripPointing(block.content);
          updateBlock(block.id, {
            content: data.rawText,
            originalContent: data.rawText,
            ibreviaryContent: ibreviaryText,
            lang: 'la',
          });
          setShowPointEditor(true);
        }
      }
    } catch (e) {
      console.error('[LoadLatinText] Error:', e);
    } finally {
      setIsLoadingLatin(false);
    }
  };

  const handleRestoreIbreviaryText = () => {
    if (!block.ibreviaryContent) return;
    updateBlock(block.id, {
      content: block.ibreviaryContent,
      originalContent: block.ibreviaryContent,
      lang: 'en',
    });
  };

  return {
    showPointEditor,
    setShowPointEditor,
    toneNames,
    selectedTone,
    selectedVariant,
    variantOptions,
    customMediant,
    setCustomMediant,
    customTermination,
    setCustomTermination,
    showCustomTonePanel,
    setShowCustomTonePanel,
    isApplyingTone,
    isLoadingStress,
    isLoadingLatin,
    handleToneChange,
    handleVariantChange,
    handleApplyTone,
    handleLoadStressedText,
    handleLoadLatinText,
    handleRestoreIbreviaryText,
    handleAutoPoint: (n: 1 | 2 | 3) => {
      const baseText = block.originalContent || stripPointing(block.content);
      updateBlock(block.id, { content: autoPointPsalm(baseText, n), originalContent: baseText });
    },
  };
}
