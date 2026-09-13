'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Music4, Pin, Plus, Target } from 'lucide-react';
import { CADENCES, CROWDING, DEFAULT_DISCERNED_RULE, MARKS, accentIndices, accentSpacing, anchorIndex, cadenceStart, formulaPreview, holdNote, markGroups, noteCount, validPitch, type CreatedTone, type Cadence, type Crowding, type DiscernedToneRule, type Mark, type PitchGlyph, type ToneExample, type ToneSyllable } from '@/lib/psalm-tones/creator';
import { narrowSystemTones, type SystemTone } from '@/lib/psalm-tones/system-tone-catalogue';
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
/** What a figure does on a line with no room for it; see Crowding. */
const crowdingLabels: Record<Crowding, string> = { step: 'Step back', slide: 'Slide', pass: 'Pass back', fold: 'Fold', trim: 'Trim', drop: 'Leave out' };
const crowdingTitles: Record<Crowding, string> = {
  step: 'Hang the figure on the accent before, and keep stepping back until it fits',
  slide: 'Move the whole figure towards the start of the line until it fits',
  pass: 'Keep the marks that fit and give the rest to the figure before, which carries them wherever it goes',
  fold: 'Write a mark with no spare syllable onto the one the figure last wrote on, as a pair mark',
  trim: 'Write the marks that fit and let the rest fall off',
  drop: 'Leave the figure off that line',
};
const crowdingHelp: Record<Crowding, string> = {
  step: 'On a line with no room for it — its accent too near the end, or the figure after it already on the syllables it needs — this figure hangs on the accent before instead, and keeps stepping back until it fits. The mediant of English and Gregorian 1, 6 and 7 puts “+ −” on the third-to-last accent this way when the second-to-last has no room.',
  slide: 'The figure stays whole and moves towards the start of the line until every mark has a syllable of its own, so a cadence whose last accent is also the last syllable of the line ends there and keeps the mark before it — beside the “+”, rather than back with the figure that lost it.',
  pass: 'The figure keeps the marks that fit, from its accent onwards, and gives the rest back to the figure before it. The mediant of English and Gregorian 1, 6 and 7 does this: where the last accent is also the last syllable, “− +” sings only its “+” there and hands the “−” back, so the figure before points “+ − −” — or, if it has to move as well, leaves that mark behind on its own accent and takes “+ −” to the accent before.',
  fold: 'A mark with no spare syllable goes onto the one this figure last wrote on, and the two are written as the pair mark. So “+ −” squeezed against the figure after it is written “+−” on its accent alone, and Gregorian 1 a, which sets “+ +” on the last accent and the syllable after it, writes “++” where that accent is the last syllable. A mark only ever joins one its own figure wrote.',
  trim: 'The marks that fit are written and the rest fall off, which is what a cadence measured from the last syllable does with its opening.',
  drop: 'The figure is left off any line without room for it, and only the figures after it are sung.',
};
/** Accents are numbered back from the end of the line, the way the rules count them. */
function ordinalLabel(n: number): string {
  return n === 1 ? 'the last accent' : n === 2 ? 'the second-to-last accent'
    : n === 3 ? 'the third-to-last accent' : `the ${n}th accent from the end`;
}
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

function backendLabel(backend: CreatedTone['backend']): string {
  return backend === 'lyps' ? '+ − =' : backend === 'jgabc' ? 'GABC' : 'Conditional';
}
/** The three notations a tone can be written in, named once for both pickers. */
const NOTATIONS: { value: CreatedTone['backend']; label: string; title: string }[] = [
  { value: 'lyps', label: '+ − = marks', title: 'Lypsautierant pointing marks' },
  { value: 'jgabc', label: 'Chant staff', title: 'jgabc chant notation' },
  { value: 'discerned', label: 'Conditional stress', title: 'Notes chosen from stress and syllable distance' },
];

/** The editable musical values behind the stress-and-distance algorithm. */
function DiscernedRuleEditor({ rule, onChange }: {
  rule: DiscernedToneRule;
  onChange: (rule: DiscernedToneRule) => void;
}) {
  const pitch = (label: string, value: string, set: (value: string) => void, help: string) =>
    <label className="tc-field">
      <span className="tc-label">{label}</span>
      <input value={value} maxLength={64} onChange={event => set(event.target.value)} />
      <span className="tc-hint">{help}</span>
    </label>;
  const mediation = (changes: Partial<DiscernedToneRule['mediation']>) =>
    onChange({ ...rule, mediation: { ...rule.mediation, ...changes } });
  const ending = (changes: Partial<DiscernedToneRule['ending']>) =>
    onChange({ ...rule, ending: { ...rule.ending, ...changes } });

  return <div className="tc-inspector">
    <div className="tc-inspector-head">
      <span className="tc-inspector-syl">Stress-and-distance rule</span>
      <span className="tc-hint">Tone 1 pattern</span>
    </div>
    <p>The dictionary supplies major stresses. When more than two unstressed syllables separate them, the engine proposes a minor stress and shows that choice in the whole-psalm preview.</p>
    {pitch('Reciting note', rule.reciting, reciting => onChange({ ...rule, reciting }), 'A is h under the default c4 clef.')}
    <h3>Mediation</h3>
    {pitch('Previous stress', rule.mediation.previous, previous => mediation({ previous }), 'B-flat is ixi: the flat sign and the note it lowers.')}
    {pitch('Return on final stress', rule.mediation.return, value => mediation({ return: value }), 'The supplied rule returns to A, written h.')}
    {pitch('Passing note', rule.mediation.passing, passing => mediation({ passing }), 'Used before the return according to the number of intervening syllables; G is g.')}
    <p>With one intervening syllable, the previous-stress and return notes form one neume. With two, the intervening notes are return then passing. With three or more, the final/non-final branches place the passing note as described in the rule.</p>
    <h3>Ending</h3>
    {pitch('Earlier preparation', rule.ending.preparations[0], value => ending({ preparations: [value, rule.ending.preparations[1]] }), 'The earlier of the two syllables before the last stress; G is g.')}
    {pitch('Later preparation', rule.ending.preparations[1], value => ending({ preparations: [rule.ending.preparations[0], value] }), 'The syllable immediately before the last stress; F is f.')}
    {pitch('Final stress', rule.ending.final, final => ending({ final }), 'The supplied rule ends on D, written d.')}
    <details className="tc-notation-help">
      <summary>GABC pitch help</summary>
      <p>These fields use the same GABC pitches as the chant staff editor. Each field must contain one sounding note; an accidental immediately before it is allowed.</p>
    </details>
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
  /**
   * Which of the tones the app sings is in hand, as the four selectors name
   * it rather than by id: what is asked for is kept as the catalogue is
   * narrowed differently around it, so moving from one family to another does
   * not lose the mode and the ending already chosen.
   */
  const [choice, setChoice] = useState({ backend: 'lyps', family: '', tone: '', variant: '' });
  /** What was lost or changed in reading an existing tone onto this text. */
  const [notes, setNotes] = useState<string[]>([]);
  const [loadingText, setLoadingText] = useState(false);
  const [mobilePane, setMobilePane] = useState<'setup' | 'edit' | 'preview'>('setup');
  const currentPreview = preview?.source === JSON.stringify({ tone, text, lang }) ? preview : null;
  /** The four selectors' options, and the one tone they come to rest on. */
  const narrowed = narrowSystemTones(system, choice);

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
      setCadence('first'); setSelected(0); setMobilePane('edit');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  /**
   * The chant/conditional engines and the lypsautierant tones divide English differently,
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
      change({
        ...tone,
        backend,
        examples: same ? tone.examples : data.examples,
        ...(backend === 'discerned' ? { discerned: tone.discerned ?? DEFAULT_DISCERNED_RULE } : {}),
      });
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
    if (!narrowed.picked) return;
    setBusy(true); setError(''); setStatus(''); setNotes([]);
    try {
      const data = await request({ action: 'import', id: narrowed.picked.id, text, lang });
      setTone(data.tone); setPreview(null); setCadence('first'); setSelected(0); setMobilePane('edit');
      setNotes(data.warnings);
      setStatus(`Copied as “${data.tone.name}”. Saving it adds a tone; the one it came from is untouched.`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function change(next: CreatedTone) { setTone(next); setPreview(null); setStatus(''); setNotes([]); }
  function open(saved: CreatedTone) { change(saved); setCadence('first'); setSelected(0); setMobilePane('edit'); }
  function edit(changes: Partial<ToneExample>) {
    if (!tone || !example) return;
    change({ ...tone, examples: { ...tone.examples, [cadence]: { ...example, ...changes } } });
  }
  function editSyllable(at: number, changes: Partial<ToneSyllable>) {
    if (!example) return;
    edit({ syllables: example.syllables.map((s, i) => i === at ? { ...s, ...changes } : s) });
  }
  /**
   * Only the opening syllable may be pinned, so this is not a per-syllable
   * setting the way a mark is: it says where that one syllable's mark is
   * counted from.
   */
  function setPinned(on: boolean) {
    if (!example) return;
    edit({ syllables: example.syllables.map((s, i) => i === 0 ? { ...s, atStart: on || undefined } : s) });
  }
  /**
   * Which accent a figure hangs on. It is set on the whole run rather than on
   * one syllable: a figure is sung as a unit, and half of it counted from one
   * accent and half from another is not a thing the rules do.
   */
  function setFigureAccent(indices: number[], ordinal: number | undefined) {
    if (!example) return;
    edit({ syllables: example.syllables.map((s, i) => indices.includes(i) ? { ...s, accent: ordinal } : s) });
  }
  /**
   * What a figure does on a line with no room for it. Like the accent it is
   * set on the whole run: the figure moves, or does not, as one thing.
   */
  function setFigureCrowding(indices: number[], crowded: Crowding) {
    if (!example) return;
    edit({ syllables: example.syllables.map((s, i) => indices.includes(i) ? { ...s, crowded: crowded === 'step' ? undefined : crowded } : s) });
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

  const lyps = tone?.backend === 'lyps';
  const anchorAt = example ? anchorIndex(example) : -1;
  /** Everything before this is recited: unmarked, and of no fixed length. */
  const cadenceAt = example ? cadenceStart(example) : 0;
  const pinned = !!example?.syllables[0]?.atStart;
  /**
   * The figures of the cadence and the accents they hang on. A tone measured
   * from the end of the line has no figures: its marks are one window, and
   * every one of them is counted from the last syllable.
   */
  const groups = lyps && example && example.anchor === 'accent' ? markGroups(example) : [];
  const accents = lyps && example ? accentIndices(example) : [];
  const groupAt = (i: number) => groups.find(g => g.indices.includes(i));
  const selectedGroup = groupAt(index);
  /** A syllable inside the cadence that no figure claims: it stretches. */
  const stretches = (i: number) => groups.length > 1 && i > cadenceAt
    && i < groups[groups.length - 1].indices[0] && !groupAt(i);
  const spacing = example ? accentSpacing(example) : null;
  const widths = example ? columnWidths(example.syllables, tone?.backend === 'jgabc') : [];
  const offsets = runningOffsets(widths);
  const width = Math.max(offsets[offsets.length - 1] ?? COL, COL);
  const noteKey = `${tone?.id}-${cadence}-${index}`;
  const noteValue = draft?.key === noteKey ? draft.value : syllable?.pitch ?? '';
  const holdKey = `${noteKey}-hold`;
  const holdValue = draft?.key === holdKey ? draft.value : syllable?.hold ?? '';

  function chip(s: ToneSyllable, i: number) {
    const recited = lyps && i < cadenceAt && !(i === 0 && s.atStart);
    const group = groupAt(i);
    const held = lyps && stretches(i);
    const label = lyps
      ? `${s.text}, ${i === 0 && s.atStart ? 'pinned to the opening, ' : recited ? 'recited, ' : held ? 'not counted, ' : ''}mark ${s.mark ? markLabels[s.mark] : 'none'}${group ? `, counted from ${ordinalLabel(group.ordinal)}, ${crowdingLabels[group.crowded].toLowerCase()} with no room for it` : ''}${accents.includes(i) ? ', accented' : ''}`
      : `${s.text}, notes ${s.pitch}, ${roleLabels[s.role]}`;
    return <button
      key={i}
      type="button"
      className={`tc-chip${recited || held ? ' is-recited' : ''}${held ? ' is-held' : ''}${lyps && groups.some(g => g.accent === i) ? ' is-anchor' : ''}${lyps && !groups.length && i === anchorAt ? ' is-anchor' : ''}`}
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
        {lyps && i === 0 && s.atStart && <Pin size={11} aria-hidden />}
        {lyps && i === anchorAt && <Target size={11} aria-hidden />}
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
    <nav className="tc-mobile-tabs" aria-label="Tone creator view">
      <button type="button" aria-pressed={mobilePane === 'setup'} onClick={() => setMobilePane('setup')}>Setup</button>
      <button type="button" aria-pressed={mobilePane === 'edit'} disabled={!tone} onClick={() => setMobilePane('edit')}>Cadence</button>
      <button type="button" aria-pressed={mobilePane === 'preview'} disabled={!tone} onClick={() => setMobilePane('preview')}>Preview</button>
    </nav>
    <div className="tc-mobile-messages" aria-live="polite">
      {error && <p className="tc-alert" role="alert">{error}</p>}
      {status && <p className="tc-status" role="status">{status}</p>}
    </div>
    <div className={`tc-body tc-mobile-${mobilePane}`}>
      {/* Naming the tone, choosing its notation and loading a model text are
          all one-line choices; only the cadence needs the width, so they sit
          together in the side panel and leave the middle to the staff. */}
      <aside className="tc-side">
        <section>
          <details className="tc-model" open={!tone}>
            <summary className="tc-model-summary">
              <span>Model text</span>
              <em>{text.trim() ? title : 'Choose a text'}</em>
            </summary>
            <div className="tc-model-content">
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
                ? <p className="tc-loaded"><span>{text.split('\n').find(line => line.trim()) ?? ''}</span></p>
                : <p>Load the psalm or canticle to model the tone on.</p>}
            </div>
          </details>
        </section>

        <section>
          <details className="tc-library" open={!tone}>
            <summary className="tc-library-summary">
              <span>Tone library</span>
              <em>{library.length ? `${library.length} saved` : 'No saved tones'}</em>
            </summary>
            <div className="tc-library-content">
              <ul>{library.map(t => <li key={t.id}>
                <button aria-current={tone?.id === t.id} onClick={() => open(t)}>
                  <span>{t.name}</span><em>{backendLabel(t.backend)}</em>
                </button>
              </li>)}</ul>
              <button className="tc-new" disabled={busy || !text.trim()} onClick={create}><Plus size={14} />{busy ? 'Preparing…' : 'New tone from this psalm'}</button>
              {/* A hundred and fifty tones are too many for one list, so the
                  catalogue is narrowed the way it is laid out: the notation,
                  then the family of rules, the mode or tone, and the ending. */}
              <div className="tc-field">
                <span className="tc-label">Or start from a tone the app sings</span>
                <div className="tc-picker">
                  <label className="tc-picker-wide">Notation
                    <select value={choice.backend} onChange={e => setChoice({ ...choice, backend: e.target.value })}>
                      {NOTATIONS.filter(n => system.some(t => t.backend === n.value))
                        .map(n => <option key={n.value} value={n.value} title={n.title}>{n.label}</option>)}
                    </select>
                  </label>
                  <label className="tc-picker-wide">Family
                    <select value={narrowed.family} onChange={e => setChoice({ ...choice, family: e.target.value })}>
                      {narrowed.families.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </label>
                  <label>{choice.backend === 'lyps' ? 'Mode' : 'Tone'}
                    <select value={narrowed.tone} onChange={e => setChoice({ ...choice, tone: e.target.value })}>
                      {narrowed.tones.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                  <label>Ending
                    <select value={narrowed.variant} disabled={narrowed.variants.length < 2}
                      onChange={e => setChoice({ ...choice, variant: e.target.value })}>
                      {narrowed.variants.map(v => <option key={v} value={v}>{v || 'Only one'}</option>)}
                    </select>
                  </label>
                </div>
                <div className="tc-row">
                  <p className="tc-picked">{narrowed.picked ? narrowed.picked.name : 'Loading the catalogue…'}</p>
                  <button className="tc-load" disabled={!narrowed.picked || busy || !text.trim()} onClick={() => void copyTone()}><Copy size={13} />Copy</button>
                </div>
              </div>
              {!text.trim() && <p>Load a model text first.</p>}
            </div>
          </details>
        </section>

        {tone && example && <section>
          <h2>The tone</h2>
          <label className="tc-field"><span className="tc-label">Name</span><input maxLength={100} value={tone.name} onChange={e => change({ ...tone, name: e.target.value })} /></label>
          <Segmented label="Notation" value={tone.backend} onChange={backend => void changeBackend(backend)} options={NOTATIONS} />
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
              <div className="tc-editor-title">
                <h2>{tone.backend === 'discerned' ? 'Conditional rule' : 'Cadence'}</h2>
                <details className="tc-editor-help">
                  <summary>{tone.backend === 'lyps' ? 'How figures work' : tone.backend === 'jgabc' ? 'How staff editing works' : 'How conditional stress works'}</summary>
                  <p>{tone.backend === 'lyps'
                    ? 'Adjacent marks make one figure, and each figure hangs on one accent. Leave a syllable bare to let the line stretch there: the bare opening is the recitation, and a bare gap between two figures is the stretch between them.'
                    : tone.backend === 'jgabc'
                      ? 'Drag across the staff to draw; reciting notes repeat and accent notes follow word stress.'
                      : 'This rule chooses actual notes after comparing the final stresses and the syllables between them.'}</p>
                </details>
              </div>
              {tone.backend !== 'discerned' && <div className="tc-segmented tc-tabs" role="group" aria-label="Cadence">
                {CADENCES.map(c => <button key={c} type="button" aria-pressed={cadence === c} onClick={() => { setCadence(c); setSelected(0); }}>{cadenceLabels[c]}</button>)}
              </div>}
            </div>

            {tone.backend === 'discerned'
              ? <DiscernedRuleEditor rule={tone.discerned ?? DEFAULT_DISCERNED_RULE} onChange={discerned => change({ ...tone, discerned })} />
              : <><div className="tc-strip">
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
                {/* The note the syllables after an accent are held on stands
                    between two columns and belongs to neither, so it is drawn
                    faint at the edge of the accent's: it is sung only when a
                    verse has syllables there. */}
                {example.syllables.map((s, i) => {
                  const held = holdNote(example, i);
                  return held ? <g key={`h${i}`} className="tc-note tc-held-note">
                    {glyphPositions(held, offsets[i] + widths[i] - COL / 2, COL).map(({ glyph, x, y }, j) =>
                      <Note key={j} glyph={glyph} x={x} y={y} />)}
                  </g> : null;
                })}
                {example.syllables.map((s, i) => <g key={i} className="tc-note">
                  {glyphPositions(s.pitch, offsets[i], widths[i]).map(({ glyph, x, y }, j) =>
                    <Note key={j} glyph={glyph} x={x} y={y} />)}
                </g>)}
              </svg>}
              <div className="tc-chips" style={{ width }}>{example.syllables.map(chip)}</div>
            </div>
            {tone.backend === 'jgabc' && spacing && <p role="alert">{spacing}</p>}
            {lyps && <p className="tc-hint">{anchorAt < 0
              ? 'This model line has no accented syllable, so there is no last accent to measure from. Choose “Last syllable” instead, or model this cadence on a line that carries a stress.'
              : cadenceAt >= example.syllables.length
                ? `Nothing is marked yet. Mark the syllables around “${example.syllables[anchorAt].text}”, ${example.anchor === 'end' ? 'the last syllable of the line' : 'the last accent of the line'}, and the same shape lands on every verse.`
                : groups.length > 1
                  // The point the single-window reading could not make: the
                  // gap between two figures is not counted, so a verse may
                  // have any number of syllables there.
                  ? `${groups.length} figures: ${groups.map(g => `“${g.indices.map(i => markLabels[example.syllables[i].mark]).join(' ')}” on “${example.syllables[g.accent].text}”, ${ordinalLabel(g.ordinal)}`).join('; and ')}. The syllables between them are not counted — a verse may have any number there.`
                  : `${cadenceAt === 0 ? 'The cadence starts at the first syllable of the model' : `“${example.syllables[cadenceAt].text}” opens the cadence, and the ${cadenceAt} syllable${cadenceAt === 1 ? '' : 's'} before it are recited`}. It is ${example.syllables.length - cadenceAt} syllable${example.syllables.length - cadenceAt === 1 ? '' : 's'} long, counted from “${example.syllables[groups[0]?.accent ?? anchorAt].text}”.`}</p>}

            <div className="tc-inspector">
              <div className="tc-inspector-head">
                <span className="tc-inspector-syl">{syllable.join ? '·' : ''}{syllable.text}</span>
                <span className="tc-hint">Syllable {index + 1} of {example.syllables.length}</span>
              </div>
              {tone.backend === 'lyps' ? <>
                <Segmented label="Mark" value={syllable.mark} onChange={mark => editSyllable(index, { mark })}
                  options={MARKS.map(m => ({ value: m, label: markLabels[m], title: m ? `Mark ${m}` : 'No mark' }))} />
                {/* Where a mark is counted from is not a choice on every
                    syllable: the anchor is read off the model line, and only
                    the opening syllable can be measured from the other end. */}
                <div className="tc-field">
                  <span className="tc-label">Counted from</span>
                  {index === 0 && syllable.mark
                    ? <div className="tc-segmented">
                        <button type="button" aria-pressed={!pinned} onClick={() => setPinned(false)}><Target size={12} />{example.anchor === 'end' ? 'The last syllable' : 'An accent'}</button>
                        <button type="button" aria-pressed={pinned} onClick={() => setPinned(true)}><Pin size={12} />The opening syllable</button>
                      </div>
                    : selectedGroup
                      ? <select
                          aria-label={`The accent “${syllable.text}” is counted from`}
                          value={selectedGroup.ordinal}
                          onChange={e => setFigureAccent(selectedGroup.indices, Number(e.target.value))}
                        >
                          {accents.map((at, k) => {
                            const ordinal = accents.length - k;
                            return <option key={at} value={ordinal}>{`“${example.syllables[at].text}” — ${ordinalLabel(ordinal)}`}</option>;
                          })}
                        </select>
                      : <p className="tc-counted">{!syllable.mark
                          ? stretches(index) ? 'Nothing. This syllable lies between two figures and is not counted.' : 'Nothing — this syllable is unmarked.'
                          : example.anchor === 'end'
                            ? anchorAt === index ? 'The last syllable of every line.' : `${anchorAt - index} syllable${anchorAt - index === 1 ? '' : 's'} before the end of every line.`
                            : 'There is no accent on this model line to count from.'}</p>}
                </div>
                {/* A verse shorter than the model can leave a figure nowhere
                    to go, and the model line cannot show what happens then
                    because the model line has room. So it is said here. */}
                {selectedGroup && <div className="tc-crowding">
                  <Segmented label="With no room for it" value={selectedGroup.crowded}
                    options={CROWDING.map(c => ({ value: c, label: crowdingLabels[c], title: crowdingTitles[c] }))}
                    onChange={crowded => setFigureCrowding(selectedGroup.indices, crowded)} />
                  <p>{crowdingHelp[selectedGroup.crowded]}</p>
                </div>}
                <details className="tc-context-help">
                  <summary>How this syllable behaves</summary>
                  <p>{index === 0 && syllable.mark
                    ? 'A mark on the opening syllable can stay at the head of every verse however long it is — that is what english 2′, 5′ and 8″ do — or be counted from an accent like the rest.'
                    : example.anchor === 'accent'
                      ? 'A figure is a run of adjacent marks, and it hangs on one accent. Two figures with a gap between them let that gap stretch: the mediant of English 1, 6 and 7 points “+ −” on one accent and “− +” on the next, whatever lies between. Leave a syllable bare to open the gap.'
                      : 'Every mark keeps its distance from the last syllable, so a verse shorter than the cadence loses the marks at its opening. To follow the text’s stresses instead, measure the cadence from the last accent.'}</p>
                </details>
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
                {/* A verse longer than the model has syllables between this
                    accent and the next written note, and the model line has
                    none there to draw them on — so the note they are held on
                    is named rather than drawn. */}
                {syllable.role === 'accent' && (holdNote(example, index) || syllable.hold) && <label className="tc-field"><span className="tc-label">Held on</span><input
                  value={holdValue}
                  maxLength={8}
                  placeholder={holdNote(example, index) ?? ''}
                  aria-label={`The note syllables after ${syllable.text} are held on`}
                  onChange={event => {
                    const value = event.target.value;
                    if (!/^[a-mA-Mxy#]*$/.test(value)) return;
                    setDraft({ key: holdKey, value });
                    if (!value.trim()) editSyllable(index, { hold: undefined });
                    else if (validPitch(value) && noteCount(value) === 1) editSyllable(index, { hold: value });
                  }}
                  onBlur={() => setDraft(null)}
                /></label>}
                <p>{syllable.role === 'recite'
                  ? 'A reciting note takes one pitch and repeats for as long as the verse needs before the cadence.'
                  : syllable.role === 'accent'
                    ? example.syllables[index + 1]?.role === 'recite'
                      ? `The reciting note on “${example.syllables[index + 1].text}” takes the syllables after this accent, so this accent holds none of its own.`
                      : `A verse with more syllables after this accent than the model has holds them on ${holdNote(example, index)}, drawn faint on the staff. Leave the field empty to follow the next note; ${syllable.hold ? 'clear it to go back to that' : 'name another to keep them elsewhere — on the accent’s own note, say'}.`
                    : 'Several letters put several notes on this one syllable, low to high as a-m.'}</p>
                <details className="tc-notation-help">
                  <summary>GABC notation help</summary>
                  <p>A capital is a punctum inclinatum; v adds a virga stem, w a quilisma, _ an episema, and . a mora. A letter followed by x is a flat on that line — “ixi” is a flat and the i it lowers — while y is a natural.</p>
                </details>
              </>}
            </div>

            <details className="tc-formula">
              <summary>Deduced formula</summary>
              <textarea readOnly rows={5} value={formulaPreview(tone)} />
            </details>
            </>}
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
