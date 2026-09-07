'use client';

/**
 * useAccentCorrections — the saved accent corrections, on the client.
 *
 * The store is fetched once and shared. Every psalm block mounts a
 * BlockEditor, so a hook that fetched per component would fire a request a
 * block; the module-level copy below is subscribed to instead, and a save from
 * one block is seen by all of them at once.
 *
 * Failing to load is not an error the user is shown: the accent editor works
 * without saved corrections, which is exactly how it worked before there were
 * any. A failing *save* does get reported — the user asked for that one.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  EMPTY_CORRECTIONS,
  parseCorrections,
  wordAccentMap,
  type AccentCorrections,
} from '@/lib/psalm-tones/accent-corrections';

let store: AccentCorrections = EMPTY_CORRECTIONS;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: AccentCorrections): void {
  store = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function load(): Promise<void> {
  loading ??= fetch('/api/accents')
    .then(res => (res.ok ? res.json() : null))
    .then(json => { if (json) publish(parseCorrections(json)); })
    .catch(() => { /* the editor is usable without them */ });
  return loading;
}

async function post(body: Record<string, unknown>): Promise<{ learned: string[] }> {
  const res = await fetch('/api/accents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `The server answered ${res.status}`);
  if (json?.store) publish(parseCorrections(json.store));
  return { learned: Array.isArray(json?.learned) ? json.learned : [] };
}

export function useAccentCorrections() {
  const corrections = useSyncExternalStore(subscribe, () => store, () => EMPTY_CORRECTIONS);
  useEffect(() => { void load(); }, []);

  /** The word layer, in the form accentuateEnglish reads. */
  const words = useMemo(() => wordAccentMap(corrections), [corrections]);

  /** Keep this corrected text, and learn the accents it moved. */
  const save = useCallback(
    async (accents: string, label?: string) =>
      (await post({ action: 'save', accents, label })).learned,
    [],
  );

  /** Drop the saved copy of this text. The learned words stay. */
  const forget = useCallback(
    async (text: string) => { await post({ action: 'forget', text }); },
    [],
  );

  return { corrections, words, save, forget };
}
