'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Music4, Plus, Repeat, Target } from 'lucide-react';
import { CADENCES, MARKS, accentSpacing, anchorIndex, formulaPreview, repeatIndex, validPitch, type CreatedTone, type Cadence, type Mark, type PitchGlyph, type ToneExample, type ToneSyllable } from '@/lib/psalm-tones/creator';
import type { SystemTone } from '@/lib/psalm-tones/system-tones';
import { COL, FLOOR, STAFF_HEIGHT, STAFF_LINES, STEP, columnWidths, glyphPositions, noteMarks, runningOffsets, yToPitch } from '@/lib/psalm-tones/staff';
import { stripPointing } from '@/lib/psalm-tones/strip';
import { GabcRenderer } from './GabcRenderer';

async function request(body?: object, signal?: AbortSignal) {
  const res = await fetch('/api/tone-creator', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal } : { signal });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Tone request failed.');
  return data;
}
const cadenceLabels: Record<Cadence, string> = { first: 'Mediant *', termination: 'Ending', flex: 'Flex †' };
/** The marks as the singer sees them: a true minus sign, and the pairs spaced. */
const markLabels: Record<Mark, string> = { '': '·', '+': '+', '-': '−', '=': '=', '++': '+ +', '+-': '+ −', '-+': '− +', '--': '− −' };
const roleLabels: Record<ToneSyllable['role'], string> = { recite: 'Reciting', fixed: 'Fixed', accent: 'Accent' };
interface Preview { source: string; html: string; gabc: string; warnings: string[] }

/**
 * The index keys the psalm API answers to, as they are typed into it: the
 * psalms by number, the Abbey canticles as OT and NT, and the three gospel
 * canticles it knows by name.
 */
const GOSPEL_CANTICLES = ['Benedictus', 'Magnificat', 'Nunc dimittis'];
function referenceList(keys: string[]): string[] {
  const psalms = keys.filter(k => k.startsWith('psalm-')).map(k => k.slice(6).toUpperCase())
    .sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));
  const canticles = (prefix: string) => keys.filter(k => k.startsWith(prefix + '-'))
    .map(k => Number(k.slice(prefix.length + 1))).sort((a, b) => a - b).map(n => `${prefix.toUpperCase()} ${n}`);
  return [...psalms, ...canticles('ot'), ...canticles('nt'), ...GOSPEL_CANTICLES];
}

/** One note, in the marks the staff module says draw it. */
function Note({ glyph, x, y }: { glyph: PitchGlyph; x: number; y: number }) {
  return <g>{noteMarks(glyph, x, y).map((mark, i) => mark.kind === 'rect'
    ? <rect key={i} x={mark.x} y={mark.y} width={mark.width} height={mark.height} rx={mark.rx} />
    : mark.kind === 'circle'
      ? <circle key={i} cx={mark.cx} cy={mark.cy} r={mark.r} />
      : <path key={i} className={mark.kind === 'stroke' ? 'tc-stroke' : undefined} d={mark.d} />)}</g>;
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  return <div className="tc-field">
    <span className="tc-label">{label}</span>
    <div className="tc-segmented" role="group" aria-label={label}>
      {options.map(option => <button key={option.value} type="button" title={option.title} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  </div>;
}

/**
 * The creator is a workshop of its own, reached from the button beside Print
 * and opened in its own tab. It used to hang off a psalm block inside the
 * pointing panel, which meant designing a tone interrupted whatever office
 * was being laid out — and the model text was whichever psalm happened to be
 * under the cursor. Here the text is chosen deliberately, the whole-psalm
 * preview stays in view beside the cadence being edited, and the tones it
 * saves are applied back in the booklet from the block's pointing menu.
 */
export function PsalmToneCreator() {
  const [tone, setTone] = useState<CreatedTone | null>(null);
  const [library, setLibrary] = useState<CreatedTone[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [cadence, setCadence] = useState<Cadence>('first');
  const [selected, setSelected] = useState(0);
  /** The notes field while it is being typed in, so it can pass through empty. */
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState('');
  const [lang, setLang] = useState<'en' | 'la'>('en');
  const [reference, setReference] = useState('63');
  const [title, setTitle] = useState('');
  const [references, setReferences] = useState<string[]>([]);
  const [system, setSystem] = useState<SystemTone[]>([]);
  const [pick, setPick] = useState('');
  /** What was lost or changed in reading an existing tone onto this text. */
  const [notes, setNotes] = useState<string[]>([]);
  const [loadingText, setLoadingText] = useState(false);
  const currentPreview = preview?.source === JSON.stringify({ tone, text, lang }) ? preview : null;

  const example: ToneExample | null = tone ? tone.examples[cadence] : null;
  const index = example ? Math.min(selected, example.syllables.length - 1) : 0;
  const syllable: ToneSyllable | null = example ? example.syllables[index] : null;

  useEffect(() => {
    const controller = new AbortController();
    request(undefined, controller.signal)
      .then(data => { setLibrary(data.tones); setSystem(data.system); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    fetch('/api/psalm-text?list=true', { signal: controller.signal })
      .then(res => res.json()).then(data => setReferences(referenceList(data.keys ?? [])))
      .catch(() => {});
    // Nothing can be drawn without a text, so the page opens on one.
    void loadText();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Every edit re-points the whole psalm, so the round-trip is debounced and
  // the one in flight is dropped as soon as another edit lands.
  useEffect(() => {
    if (!tone || !text.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPreview(null);
      request({ action: 'preview', tone, text, lang }, controller.signal)
        .then(data => { setPreview({ ...data, source: JSON.stringify({ tone, text, lang }) }); setError(''); })
        .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [tone, text, lang]);

  async function loadText() {
    if (!reference.trim()) return;
    setLoadingText(true); setError(''); setStatus('');
    try {
      const query = `psalm=${encodeURIComponent(reference.trim())}${lang === 'la' ? '&collection=jgabc' : ''}`;
      const res = await fetch(`/api/psalm-text?${query}`);
      const data = await res.json();
      if (!res.ok || !data.rawText) throw new Error(data.error || `No ${lang === 'la' ? 'Latin' : 'English'} text on file for “${reference.trim()}”.`);
      setText(stripPointing(data.rawText));
      setTitle(data.title || reference.trim());
      setStatus('');
    } catch (e) { setError((e as Error).message); }
    finally { setLoadingText(false); }
  }
  async function create() {
    setBusy(true); setError(''); setPreview(null); setStatus('');
    try {
      const data = await request({ action: 'prepare', text, lang, backend: 'lyps' });
      setTone({ version: 1, id: crypto.randomUUID(), name: 'New psalm tone', backend: 'lyps', clef: 'c4', examples: data.examples });
      setCadence('first'); setSelected(0);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  /**
   * The chant engine and the lypsautierant tones divide English differently,
   * so the syllables are read again for the notation being switched to — and
   * kept, with whatever is drawn on them, when the two divisions agree.
   */
  async function changeBackend(backend: CreatedTone['backend']) {
    if (!tone || backend === tone.backend) return;
    if (!text.trim()) { change({ ...tone, backend }); return; }
    setBusy(true); setError(''); setStatus('');
    try {
      const data = await request({ action: 'prepare', text, lang, backend });
      const divided = (examples: Record<Cadence, ToneExample>) => CADENCES.map(key => examples[key].syllables.map(s => s.text).join('|')).join('//');
      const same = divided(data.examples) === divided(tone.examples);
      change({ ...tone, backend, examples: same ? tone.examples : data.examples });
      setSelected(0);
      if (!same) setStatus('This notation divides the text differently, so the cadences were read again from the model text.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  /**
   * A tone the app already sings, read onto this text. It arrives as a new and
   * unsaved tone with a name of its own: the tone it was taken from is on file
   * behind the app and is never written back to.
   */
  async function copyTone() {
    if (!pick) return;
    setBusy(true); setError(''); setStatus(''); setNotes([]);
    try {
      const data = await request({ action: 'import', id: pick, text, lang });
      setTone(data.tone); setPreview(null); setCadence('first'); setSelected(0);
      setNotes(data.warnings);
      setStatus(`Copied as “${data.tone.name}”. Saving it adds a tone; the one it came from is untouched.`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function change(next: CreatedTone) { setTone(next); setPreview(null); setStatus(''); setNotes([]); }
  function open(saved: CreatedTone) { change(saved); setCadence('first'); setSelected(0); }
  function edit(changes: Partial<ToneExample>) {
    if (!tone || !example) return;
    change({ ...tone, examples: { ...tone.examples, [cadence]: { ...example, ...changes } } });
  }
  function editSyllable(at: number, changes: Partial<ToneSyllable>) {
    if (!example) return;
    edit({ syllables: example.syllables.map((s, i) => i === at ? { ...s, ...changes } : s) });
  }
  /** One anchor and one repeating syllable per cadence; both are exclusive. */
  function setAnchorAt(at: number) {
    if (!example) return;
    edit({ syllables: example.syllables.map((s, i) => ({ ...s, role: i === at ? 'accent' : s.role === 'accent' ? 'fixed' : s.role })) });
  }
  function setRepeatAt(at: number, on: boolean) {
    if (!example) return;
    edit({ syllables: example.syllables.map((s, i) => ({ ...s, repeat: on && i === at ? true : undefined })) });
  }
  function pointer(event: React.PointerEvent<SVGSVGElement>) {
    if (!example) return;
    const box = event.currentTarget.getBoundingClientRect();
    const at = event.clientX - box.left;
    const column = offsets.findIndex((offset, i) => at >= offset && at < offset + widths[i]);
    if (column < 0) return;
    setSelected(column);
    editSyllable(column, { pitch: yToPitch(event.clientY - box.top) });
  }
  function nudge(at: number, by: number) {
    if (!example) return;
    const pitch = example.syllables[at].pitch;
    const last = [...pitch.matchAll(/[a-mA-M]/g)].pop();
    if (!last) return;
    // The letter's case is the shape — a capital is an inclinatum — so only
    // the step moves, and the shape written around it stays as it is.
    const upper = last[0] === last[0].toUpperCase();
    const base = upper ? 65 : 97;
    const step = String.fromCharCode(Math.max(base, Math.min(base + 12, last[0].charCodeAt(0) + by)));
    editSyllable(at, { pitch: pitch.slice(0, last.index) + step + pitch.slice(last.index + 1) });
  }

  const anchorAt = example ? anchorIndex(example) : -1;
  const repeatAt = example ? repeatIndex(example) : -1;
  const spacing = example ? accentSpacing(example) : null;
  const widths = example ? columnWidths(example.syllables, tone?.backend === 'jgabc') : [];
  const offsets = runningOffsets(widths);
  const width = Math.max(offsets[offsets.length - 1] ?? COL, COL);
  const noteKey = `${tone?.id}-${cadence}-${index}`;
  const noteValue = draft?.key === noteKey ? draft.value : syllable?.pitch ?? '';

  function chip(s: ToneSyllable, i: number) {
    const lyps = tone?.backend === 'lyps';
    const label = lyps
      ? `${s.text}, mark ${s.mark ? markLabels[s.mark] : 'none'}${s.repeat ? ', repeating' : ''}${i === anchorAt && example?.anchor === 'accent' ? ', anchor' : ''}`
      : `${s.text}, notes ${s.pitch}, ${roleLabels[s.role]}`;
    return <button
      key={i}
      type="button"
      className="tc-chip"
      style={{ width: widths[i] ?? COL }}
      aria-current={i === index}
      aria-label={label}
      onClick={() => setSelected(i)}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          setSelected(Math.max(0, Math.min((example?.syllables.length ?? 1) - 1, i + (event.key === 'ArrowRight' ? 1 : -1))));
        } else if (!lyps && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
          event.preventDefault();
          nudge(i, event.key === 'ArrowUp' ? 1 : -1);
        }
      }}
    >
      {lyps && <span className={`tc-chip-mark${s.mark ? ' is-set' : ''}`}>{markLabels[s.mark]}</span>}
      <span className="tc-chip-text">{s.join ? '·' : ''}{s.text}</span>
      <span className="tc-chip-flags">
        {s.repeat && lyps && <Repeat size={11} aria-hidden />}
        {lyps && example?.anchor === 'accent' && i === anchorAt && <Target size={11} aria-hidden />}
      </span>
    </button>;
  }

  return <div className="tone-creator-page">
    <header className="tc-bar">
      <div className="tc-brand">
        <span className="tc-mark"><Music4 size={16} /></span>
        <div><h1>Psalm Tone Creator</h1><p>Model a cadence on one psalm, then reuse its formula</p></div>
      </div>
      <Link className="tc-back" href="/"><ArrowLeft size={14} />Back to the booklet</Link>
    </header>
    <div className="tc-body">
      {/* Naming the tone, choosing its notation and loading a model text are
          all one-line choices; only the cadence needs the width, so they sit
          together in the side panel and leave the middle to the staff. */}
      <aside className="tc-side">
        <section>
          <h2>Model text</h2>
          <Segmented label="Language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'la', label: 'Latin' }]} />
          <div className="tc-field">
            <label className="tc-label" htmlFor="tc-reference">Psalm or canticle</label>
            <div className="tc-row">
              <input id="tc-reference" list="tc-references" value={reference} onChange={e => setReference(e.target.value)} placeholder="63, OT 3, Magnificat" />
              <datalist id="tc-references">{references.map(r => <option key={r} value={r} />)}</datalist>
              <button className="tc-load" disabled={loadingText || !reference.trim()} onClick={() => void loadText()}>{loadingText ? '…' : 'Load'}</button>
            </div>
          </div>
          {text.trim()
            ? <p className="tc-loaded"><strong>{title}</strong><span>{text.split('\n').find(line => line.trim()) ?? ''}</span></p>
            : <p>Load the psalm or canticle to model the tone on.</p>}
        </section>

        <section>
          <h2>Tone library</h2>
          {library.length === 0 && <p>No tones saved yet.</p>}
          <ul>{library.map(t => <li key={t.id}>
            <button aria-current={tone?.id === t.id} onClick={() => open(t)}>
              <span>{t.name}</span><em>{t.backend === 'lyps' ? '+ − =' : 'GABC'}</em>
            </button>
          </li>)}</ul>
          <button className="tc-new" disabled={busy || !text.trim()} onClick={create}><Plus size={14} />{busy ? 'Preparing…' : 'New tone from this psalm'}</button>
          <div className="tc-field">
            <label className="tc-label" htmlFor="tc-system">Or start from a tone the app sings</label>
            <div className="tc-row">
              <select id="tc-system" value={pick} onChange={e => setPick(e.target.value)}>
                <option value="">Choose a tone…</option>
                {[...new Set(system.map(t => t.group))].map(group => <optgroup key={group} label={group}>
                  {system.filter(t => t.group === group).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>)}
              </select>
              <button className="tc-load" disabled={!pick || busy || !text.trim()} onClick={() => void copyTone()}><Copy size={13} />Copy</button>
            </div>
          </div>
          {!text.trim() && <p>Load a model text first.</p>}
        </section>

        {tone && example && <section>
          <h2>The tone</h2>
          <label className="tc-field"><span className="tc-label">Name</span><input maxLength={100} value={tone.name} onChange={e => change({ ...tone, name: e.target.value })} /></label>
          <Segmented label="Notation" value={tone.backend} onChange={backend => void changeBackend(backend)}
            options={[{ value: 'lyps', label: '+ − = marks', title: 'Lypsautierant pointing marks' }, { value: 'jgabc', label: 'Chant staff', title: 'jgabc chant notation' }]} />
          {tone.backend === 'lyps'
            ? <Segmented label="Cadence measured from" value={example.anchor} onChange={anchor => edit({ anchor })}
                options={[{ value: 'end', label: 'Last syllable' }, { value: 'accent', label: 'Last accent' }]} />
            : <Segmented label="Clef" value={tone.clef} onChange={clef => change({ ...tone, clef })}
                options={['c1', 'c2', 'c3', 'c4', 'f3', 'f4'].map(c => ({ value: c, label: c }))} />}
        </section>}
      </aside>

      <main className="tc-work">
        {!tone || !example || !syllable ? <section>
          <h2>Cadence</h2>
          <p>Choose a tone in the side panel — one of your own, or a copy of one the app already sings — or start a new one from the model text.</p>
        </section> : <>
          <section className="tc-editor">
            <div className="tc-editor-head">
              <h2>Cadence</h2>
              <div className="tc-segmented tc-tabs" role="group" aria-label="Cadence">
                {CADENCES.map(c => <button key={c} type="button" aria-pressed={cadence === c} onClick={() => { setCadence(c); setSelected(0); }}>{cadenceLabels[c]}</button>)}
              </div>
            </div>
            <p>{tone.backend === 'lyps'
              ? 'Click a syllable, then give it a mark below. One syllable may be set to repeat, and it stretches to cover however many syllables a real verse has at that point.'
              : 'Drag across the staff to draw the melody. Reciting notes repeat for as long as the verse needs; accent notes follow the word stresses.'}</p>

            <div className="tc-strip">
              {tone.backend === 'jgabc' && <svg
                className="tc-staff"
                aria-hidden
                width={width}
                height={STAFF_HEIGHT}
                onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); pointer(event); }}
                onPointerMove={event => { if (dragging) pointer(event); }}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
              >
                {/* The part a syllable plays used to be drawn into the note
                    itself, which put chant shapes where they do not belong;
                    it is the tint behind the column now. */}
                {example.syllables.map((s, i) => <rect key={i} className={`tc-column is-${s.role}`} x={offsets[i]} y={0} width={widths[i]} height={STAFF_HEIGHT} />)}
                <rect className="tc-staff-selected" x={offsets[index]} y={0} width={widths[index]} height={STAFF_HEIGHT} />
                {STAFF_LINES.map(step => <line key={step} className="tc-staff-line" x1={0} x2={width} y1={FLOOR - step * STEP} y2={FLOOR - step * STEP} />)}
                {example.syllables.map((s, i) => <g key={i} className="tc-note">
                  {glyphPositions(s.pitch, offsets[i], widths[i]).map(({ glyph, x, y }, j) =>
                    <Note key={j} glyph={glyph} x={x} y={y} />)}
                </g>)}
              </svg>}
              <div className="tc-chips" style={{ width }}>{example.syllables.map(chip)}</div>
            </div>
            {tone.backend === 'jgabc' && spacing && <p role="alert">{spacing}</p>}

            <div className="tc-inspector">
              <div className="tc-inspector-head">
                <span className="tc-inspector-syl">{syllable.join ? '·' : ''}{syllable.text}</span>
                <span className="tc-hint">Syllable {index + 1} of {example.syllables.length}</span>
              </div>
              {tone.backend === 'lyps' ? <>
                <Segmented label="Mark" value={syllable.mark} onChange={mark => editSyllable(index, { mark })}
                  options={MARKS.map(m => ({ value: m, label: markLabels[m], title: m ? `Mark ${m}` : 'No mark' }))} />
                <div className="tc-field">
                  <span className="tc-label">Length</span>
                  <div className="tc-segmented">
                    <button type="button" aria-pressed={!!syllable.repeat} onClick={() => setRepeatAt(index, !syllable.repeat)}><Repeat size={12} />Repeats as needed</button>
                    {example.anchor === 'accent' && <button type="button" aria-pressed={index === anchorAt} onClick={() => setAnchorAt(index)}><Target size={12} />Anchor here</button>}
                  </div>
                </div>
                <p>{repeatAt < 0
                  ? 'With nothing set to repeat, every mark is counted back from the anchor, so a verse shorter than the model loses the marks at its opening.'
                  : `“${example.syllables[repeatAt].text}” repeats: marks before it are counted from the start of each verse, and the rest are counted back from the anchor.`}</p>
                {example.anchor === 'accent' && anchorAt < 0 && <p role="alert">Choose the syllable this cadence is anchored on.</p>}
              </> : <>
                <label className="tc-field"><span className="tc-label">Notes</span><input
                  value={noteValue}
                  maxLength={64}
                  aria-label={`Notes for ${syllable.text}`}
                  onChange={event => {
                    const value = event.target.value;
                    if (!/^[a-mA-MvVwWoOsSxy#~_.'!/,]*$/.test(value)) return;
                    // Held as a draft so the field can be cleared and retyped;
                    // only a pitch the staff can draw is written back.
                    setDraft({ key: noteKey, value });
                    if (validPitch(value)) editSyllable(index, { pitch: value });
                  }}
                  onBlur={() => setDraft(null)}
                /></label>
                <Segmented label="Note" value={syllable.role} onChange={role => editSyllable(index, { role })}
                  options={(['recite', 'fixed', 'accent'] as const).map(r => ({ value: r, label: roleLabels[r] }))} />
                <p>{syllable.role === 'recite'
                  ? 'A reciting note takes one pitch and repeats for as long as the verse needs before the cadence.'
                  : 'Several letters put several notes on this one syllable, low to high as a-m.'} This is GABC, so the letters carry its notation: a capital is a punctum inclinatum, v hangs a virga’s stem, w makes a quilisma, _ sets an episema over the note, . a mora beside it. A letter followed by x is a flat standing on that line — “ixi” is a flat and the i it lowers — and y is a natural.</p>
              </>}
            </div>

            <details className="tc-formula">
              <summary>Deduced formula</summary>
              <textarea readOnly rows={5} value={formulaPreview(tone)} />
            </details>
          </section>
        </>}
        {notes.map(note => <p key={note} className="tc-hint">{note}</p>)}
        {error && <p className="tc-alert" role="alert">{error}</p>}
        {status && <p className="tc-status" role="status">{status}</p>}
      </main>

      <aside className="tc-preview-pane">
        <div className="tc-preview-head">
          <h2>Whole psalm</h2>
          {tone && <button className="tc-save" disabled={!currentPreview || busy || !tone.name.trim()} onClick={async () => {
            setBusy(true); setError('');
            try {
              const data = await request({ action: 'save', tone });
              setLibrary(data.tones);
              setTone(data.tone);
              setStatus(data.tone.name === tone.name
                ? 'Tone saved. Choose it under Pointing on any psalm in the booklet.'
                : `Saved as “${data.tone.name}” — that name was taken.`);
            }
            catch (e) { setError((e as Error).message); } finally { setBusy(false); }
          }}>{busy ? 'Saving…' : 'Save tone'}</button>}
        </div>
        <div aria-live="polite">
          {!tone ? <p>The preview follows the tone you are editing.</p>
            : !text.trim() ? <p>Nothing to sing yet — load or paste a model text.</p>
            : !currentPreview ? <p>Updating preview…</p>
            : <>
              {/* Ahead of the score: a whole psalm is long, and what the engine
                  did differently from the staff is the point of reading it. */}
              {currentPreview.warnings.map(w => <p key={w} className="tc-hint">{w}</p>)}
              {currentPreview.html && <div className="tc-preview" dangerouslySetInnerHTML={{ __html: currentPreview.html }} />}
              {currentPreview.gabc && <div className="tc-preview"><GabcRenderer gabc={currentPreview.gabc} /></div>}
            </>}
        </div>
      </aside>
    </div>
  </div>;
}
