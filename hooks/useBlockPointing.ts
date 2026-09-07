import { useState, useMemo, useEffect } from 'react';
import { Block } from '@/lib/types';
import { getToneNames, getVariants, getPresetGabc, hasSolemnForm, SOLEMN_BY_DEFAULT } from '@/lib/psalm-tones/tone-data';
import { stripPointing } from '@/lib/psalm-tones/strip';
import { autoPointPsalm } from '@/components/psalm-utils';

export function useBlockPointing(
  block: Block,
  updateBlock: (id: string, updates: Partial<Block>) => void,
  insertBlock?: (index: number, newBlock: Omit<Block, 'id'>) => void,
  index?: number
) {
  const [showPointEditor, setShowPointEditor] = useState(false);
  const toneNames = useMemo(() => [...getToneNames(), 'Custom'], []);
  const [selectedTone, setSelectedTone] = useState<string>(block.psalmTone ?? '8.');
  const [selectedVariant, setSelectedVariant] = useState<string>(block.psalmVariant ?? '');

  // The Gospel canticles are sung to the solemn mediant, so that stays the
  // default — but it used to be decided inside handleApplyTone from the psalm
  // number alone, which meant choosing "1f" silently sang tone 1 solemn while
  // the selector still read "1f". It is now visible, overridable, and stored.
  const [useSolemn, setUseSolemn] = useState<boolean>(
    block.solemnTone ?? SOLEMN_BY_DEFAULT.includes(String(block.psalmNumber))
  );
  const solemnAvailable = useMemo(() => hasSolemnForm(selectedTone), [selectedTone]);
  const solemn = solemnAvailable && useSolemn;

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

  /**
   * The last failure from any of the three server round-trips, for display
   * next to the buttons. Every one of these used to fail silently: the tone
   * path quietly substituted a different client-side algorithm, and the two
   * text loaders had no `else` at all, so a 404 just made the button flicker.
   */
  const [pointingError, setPointingError] = useState<string | null>(null);

  /** Read `error` out of a failed response body, falling back to the status. */
  async function errorFrom(res: Response, fallback: string): Promise<string> {
    try {
      const data = await res.json();
      if (typeof data?.error === 'string' && data.error) return data.error;
    } catch {
      // Not JSON — fall through to the status line.
    }
    return `${fallback} (HTTP ${res.status} ${res.statusText})`;
  }

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
    setPointingError(null);
    const baseText = block.originalContent || stripPointing(block.content);
    const isCustomMode = selectedTone === 'Custom' || showCustomTonePanel;

    const updatePayload: Partial<Block> = {
      psalmTone: selectedTone,
      psalmVariant: selectedVariant,
      solemnTone: solemn,
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
          solemn,
        }),
      });
      if (!res.ok) {
        // Leave the text exactly as it was. Substituting autoPointPsalm here
        // silently handed the user a different algorithm's pointing.
        setPointingError(await errorFrom(res, 'Could not point this psalm'));
        return;
      }
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
              psalmVariant: selectedVariant,
              solemnTone: solemn,
            });
            
            // 2. Insert NEW block below for the rest of the psalm
            insertBlock(index + 1, {
              type: block.type, // remains psalm or psalm-prayer
              content: remainingHtml,
              originalContent: baseRemaining,
              psalmNumber: block.psalmNumber,
              psalmTone: selectedTone,
              psalmVariant: selectedVariant,
              solemnTone: solemn,
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
      setPointingError('The pointing service returned no text.');
    } catch (e) {
      console.error('[ApplyTone] Error:', e);
      setPointingError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsApplyingTone(false);
    }
  };

  const handleLoadStressedText = async () => {
    if (!block.psalmNumber) return;
    setIsLoadingStress(true);
    setPointingError(null);
    try {
      const res = await fetch(`/api/psalm-text?psalm=${encodeURIComponent(String(block.psalmNumber))}`);
      if (!res.ok) {
        setPointingError(await errorFrom(res, `No stressed English text for ${block.psalmNumber}`));
        return;
      }
      const data = await res.json();
      if (!data.rawText) {
        setPointingError(`No stressed English text for ${block.psalmNumber}.`);
        return;
      }
      const ibreviaryText = block.ibreviaryContent || stripPointing(block.content);
      // Any accents held for the lypsautierant tones belonged to the text
      // being replaced. Clearing them lets the new text supply its own —
      // psautier's psalter carries acutes of its own, and iBreviary's does
      // not and gets them from the stress dictionary.
      updateBlock(block.id, {
        content: data.rawText,
        originalContent: data.rawText,
        ibreviaryContent: ibreviaryText,
        lang: 'en',
        lypsautierantAccents: undefined,
        lypsautierantAccentsDerived: undefined,
      });
      setShowPointEditor(true);
    } catch (e) {
      console.error('[LoadStressedText] Error:', e);
      setPointingError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoadingStress(false);
    }
  };

  const handleLoadLatinText = async () => {
    if (!block.psalmNumber) return;
    setIsLoadingLatin(true);
    setPointingError(null);
    try {
      const res = await fetch(`/api/psalm-text?psalm=${encodeURIComponent(String(block.psalmNumber))}&collection=jgabc`);
      if (!res.ok) {
        setPointingError(await errorFrom(res, `No Latin text for ${block.psalmNumber}`));
        return;
      }
      const data = await res.json();
      if (!data.rawText) {
        setPointingError(`No Latin text for ${block.psalmNumber}.`);
        return;
      }
      const ibreviaryText = block.ibreviaryContent || stripPointing(block.content);
      // Any accents held for the lypsautierant tones belonged to the text
      // being replaced. Clearing them lets the new text supply its own —
      // psautier's psalter carries acutes of its own, and iBreviary's does
      // not and gets them from the stress dictionary.
      updateBlock(block.id, {
        content: data.rawText,
        originalContent: data.rawText,
        ibreviaryContent: ibreviaryText,
        lang: 'la',
        lypsautierantAccents: undefined,
        lypsautierantAccentsDerived: undefined,
      });
      setShowPointEditor(true);
    } catch (e) {
      console.error('[LoadLatinText] Error:', e);
      setPointingError(e instanceof Error ? e.message : String(e));
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
      // Back to the office's own text, so back to no accents: the next
      // lypsautierant pointing supplies them again from the dictionary.
      lypsautierantAccents: undefined,
      lypsautierantAccentsDerived: undefined,
    });
  };

  return {
    showPointEditor,
    setShowPointEditor,
    toneNames,
    selectedTone,
    selectedVariant,
    variantOptions,
    useSolemn,
    setUseSolemn,
    solemnAvailable,
    customMediant,
    setCustomMediant,
    customTermination,
    setCustomTermination,
    showCustomTonePanel,
    setShowCustomTonePanel,
    isApplyingTone,
    isLoadingStress,
    isLoadingLatin,
    pointingError,
    clearPointingError: () => setPointingError(null),
    handleToneChange,
    handleVariantChange,
    handleApplyTone,
    handleLoadStressedText,
    handleLoadLatinText,
    handleRestoreIbreviaryText,
    handleAutoPoint: (n: 1 | 2 | 3) => {
      const baseText = block.originalContent || stripPointing(block.content);
      updateBlock(block.id, { content: autoPointPsalm(baseText, n), originalContent: baseText, gabcScore: undefined });
    },
  };
}
