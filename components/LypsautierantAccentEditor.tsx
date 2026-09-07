'use client';

/**
 * LypsautierantAccentEditor.tsx
 *
 * Click a syllable to put the accent there; click the accented one to take the
 * accent off the word entirely.
 *
 * The english and gregorian lypsautierant tones find their stresses by reading
 * acute accents, and the office texts do not have them — iBreviary prints the
 * 1963 Grail plain. accentuateEnglish supplies them from the psalters' own
 * pointing and is right about 92% of the time, which means the other 8% has to
 * be fixable. Typing an "á" is not a fix anyone can make on a US keyboard, so
 * the accents are shown as syllables instead.
 *
 * A correction is worth making once. "Save these accents" keeps it on disk —
 * the text whole, so this psalm comes back corrected when it next comes round,
 * and the words whose accent was moved, so the same word is accented right in
 * psalms nobody has opened yet. See lib/psalm-tones/accent-corrections.ts.
 *
 * All the parsing and rewriting is in lib/psalm-tones/accent-editing.ts.
 */

import React from 'react';
import {
  parseAccentLines,
  setAccentAt,
  countAccents,
  type AccentToken,
} from '@/lib/psalm-tones/accent-editing';

/** Keeping the corrections, and what to say about the ones already kept. */
export interface AccentSaveControls {
  /** A correction of this text is already on disk. */
  exists: boolean;
  /** What is on disk is exactly what is shown — nothing to save. */
  current: boolean;
  busy: boolean;
  /** What the last save or forget did, for the user to read. */
  note?: string | null;
  error?: string | null;
  onSave: () => void;
  onForget: () => void;
}

interface Props {
  /** The accented psalm text: one hemistich per line, `*` and `†` kept. */
  text: string;
  onChange: (text: string) => void;
  /** Whether the accents shown were supplied rather than read off the text. */
  derived?: boolean;
  /** Omitted where the corrections cannot be saved; then nothing is offered. */
  save?: AccentSaveControls;
}

export function LypsautierantAccentEditor({ text, onChange, derived, save }: Props) {
  const lines = React.useMemo(() => parseAccentLines(text), [text]);

  function handleClick(li: number, token: AccentToken, syllable: number) {
    if (token.kind !== 'word') return;
    // Clicking the syllable that already has it takes the accent off, which is
    // how a word the phrase does not stress gets passed over.
    const next = token.accent === syllable ? null : syllable;
    onChange(setAccentAt(text, li, token.index, next));
  }

  return (
    <div className="no-print mt-2 p-2 bg-slate-50 border border-slate-200 rounded font-serif text-sm leading-loose select-none print:hidden">
      <div className="text-[10px] uppercase tracking-wider text-slate-600 mb-1 font-sans">
        Accents — click a syllable to move it, click it again to unaccent the word
        {derived && (
          <span className="normal-case tracking-normal italic text-slate-700">
            {' '}· supplied from the psalters&rsquo; pointing, not read off this text
          </span>
        )}
        {!derived && save?.exists && (
          <span className="normal-case tracking-normal italic text-slate-700">
            {' '}· {save.current ? 'your saved corrections for this text' : 'saved corrections for this text, with unsaved changes'}
          </span>
        )}
      </div>

      {lines.map((tokens, li) => {
        if (!tokens.some(t => t.kind === 'word')) {
          return <div key={li} className="h-2" />;
        }
        const n = countAccents(tokens);
        return (
          <div key={li} className="flex flex-wrap items-baseline">
            {tokens.map((token, ti) =>
              token.kind === 'gap' ? (
                <span key={ti} className="whitespace-pre text-gray-500">{token.text}</span>
              ) : (
                <span key={ti} className="whitespace-pre">
                  {token.syllables.map((syl, si) => (
                    <button
                      key={si}
                      type="button"
                      onClick={() => handleClick(li, token, si)}
                      title={token.accent === si ? 'Unaccent this word' : 'Put the accent here'}
                      className={`px-px rounded hover:bg-slate-200 ${
                        token.accent === si ? 'bg-slate-300 font-bold' : ''
                      }`}
                    >
                      {syl}
                    </button>
                  ))}
                </span>
              ),
            )}
            {/* Psalmody carries two or three accents to a line; four is rare and
                more than that is usually a word that should have been passed
                over, so the count is worth seeing while correcting. */}
            <span
              className={`ml-2 font-sans text-[9px] ${
                n >= 2 && n <= 3 ? 'text-slate-400' : 'text-slate-700 font-semibold'
              }`}
              title="Accents on this line — psalmody usually takes two or three"
            >
              {n}
            </span>
          </div>
        );
      })}

      {save && (
        <div className="mt-2 pt-2 border-t border-slate-200 font-sans">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={save.busy || save.current}
              onClick={save.onSave}
              title="Keep these accents for the next time this psalm comes round, and use the corrected words in every psalm"
              className="px-2 py-1 text-xs rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white"
            >
              {save.busy
                ? 'Saving…'
                : save.current
                  ? 'Accents saved'
                  : save.exists
                    ? 'Update saved accents'
                    : 'Save these accents'}
            </button>
            {save.exists && (
              <button
                type="button"
                disabled={save.busy}
                onClick={save.onForget}
                title="Drop the saved copy of this text. Corrected word stresses are kept."
                className="px-2 py-1 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Forget saved accents
              </button>
            )}
          </div>
          {save.note && <p className="mt-1 text-[10px] text-slate-600">{save.note}</p>}
          {save.error && (
            <p role="alert" className="mt-1 text-[10px] text-red-700">
              Could not save: {save.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
