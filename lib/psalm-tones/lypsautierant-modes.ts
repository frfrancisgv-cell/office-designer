/**
 * lypsautierant-modes.ts
 *
 * TypeScript port of the Perl psalm-tone mode families from
 * lypsautierant/psautier/{modes,english,gregorian}/*.pm
 *
 * Two real families:
 *  - POSITIONAL ("modes" / "french"): pure right-to-left syllable counting
 *  - ACCENT-AWARE ("english" / "gregorian"): reads acute-accented syllables
 *
 * Each variation function receives a pre-split syllable array
 * (already split from the hemistich; '--' separators removed).
 * Returns an array of MarkedSyllable with the correct mark for LaTeX/display.
 */

export type Mark = 'pl' | 'mi' | 'plmi' | 'mipl' | 'mimi' | 'dmi' | null;

export interface MarkedSyllable {
  text: string;
  mark: Mark;
  flagflex?: boolean;
}

const ACCENT_RE = /[áéíóúýÁÉÍÓÚÝ]/;

function hasAccent(s: string): boolean {
  return ACCENT_RE.test(s);
}

/** Core helper for positional modes: scan right-to-left, apply mark at position c */
type PosFn = (c: number) => Mark;

function positional(syls: string[], markAt: PosFn): MarkedSyllable[] {
  const result: MarkedSyllable[] = new Array(syls.length);
  let c = 1;
  for (let i = syls.length - 1; i >= 0; i--) {
    result[i] = { text: syls[i], mark: markAt(c) };
    c++;
  }
  return result;
}

function addFlagflex(a: MarkedSyllable[]) {
  if (a.length > 0) a[a.length - 1].flagflex = true;
}

// ─────────────────────────────────────────────────────────────
// POSITIONAL FAMILY  (modes/ == french/)
// ─────────────────────────────────────────────────────────────

const positionalModes: Record<string, Record<string, (syls: string[]) => MarkedSyllable[]>> = {
  one: {
    first:   (s) => positional(s, c => (c===2||c===6)?'pl':(c===3||c===5)?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a:       (s) => positional(s, c => (c===2||c===3)?'pl':(c===4||c===5)?'mi':null),
    b:       (s) => positional(s, c => (c===1||c===2||c===4)?'mi':null),
    a_prime: (s) => positional(s, c => c===2?'pl':(c===4||c===1)?'mi':null),
    b_prime: (s) => positional(s, c => (c===1||c===2||c===3||c===5)?'mi':null),
  },
  two: {
    first:   (s) => positional(s, c => c===2?'pl':c===1?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a:       (s) => positional(s, c => (c===1||c===2)?'pl':(c===3||c===4)?'mi':null),
    b:       (s) => positional(s, c => c===2?'pl':(c===1||c===3)?'mi':null),
    a_prime: (s) => positional(s, c => c===2?'pl':(c===1||c===4)?'mi':null),
  },
  three: {
    first:   (s) => positional(s, c => (c===2||c===6)?'pl':(c===3||c===5)?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a:       (s) => positional(s, c => (c===2||c===3)?'pl':(c===4||c===5)?'mi':null),
    b:       (s) => positional(s, c => c===3?'pl':(c===2||c===4)?'mi':null),
    a_prime: (s) => positional(s, c => (c===3||c===4)?'pl':(c===2||c===5)?'mi':null),
    b_prime: (s) => positional(s, c => (c===1||c===2||c===3||c===5)?'mi':null),
  },
  four: {
    first:   (s) => positional(s, c => (c===2||c===6)?'pl':(c===3||c===5)?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a:       (s) => positional(s, c => (c===2||c===3)?'pl':(c===4||c===5)?'mi':null),
    b:       (s) => positional(s, c => c===3?'pl':(c===2||c===4)?'mi':null),
    a_prime: (s) => positional(s, c => c===2?'pl':(c===4||c===1)?'mi':null),
    b_prime: (s) => positional(s, c => (c===1||c===2||c===3||c===5)?'mi':null),
  },
  five: {
    first:   (s) => positional(s, c => (c===2||c===6)?'pl':(c===3||c===5)?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a:       (s) => positional(s, c => (c===2||c===3)?'pl':(c===4||c===5)?'mi':null),
    b:       (s) => positional(s, c => c===1?'pl':c===2?'mi':null),
    a_prime: (s) => positional(s, c => (c===3||c===4)?'pl':(c===2||c===5)?'mi':null),
    b_prime: (s) => positional(s, c => (c===1||c===2||c===3||c===5)?'mi':null),
  },
  six: {
    first:   (s) => positional(s, c => c===1?'pl':c===2?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a:       (s) => positional(s, c => (c===3||c===4)?'pl':(c===2||c===5)?'mi':null),
    b:       (s) => positional(s, c => c===3?'pl':(c===2||c===4)?'mi':null),
    a_prime: (s) => positional(s, c => (c===3||c===4)?'pl':(c===2||c===5)?'mi':null),
    b_prime: (s) => positional(s, c => (c===1||c===2||c===3||c===5)?'mi':null),
  },
  seven: {
    first:   (s) => positional(s, c => (c===2||c===6)?'pl':(c===3||c===5)?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a:       (s) => positional(s, c => c===6?'pl':(c===1||c===3||c===5)?'mi':null),
    b:       (s) => positional(s, c => (c===1||c===7)?'pl':(c===2||c===4||c===6)?'mi':null),
    a_prime: (s) => positional(s, c => c===2?'pl':(c===4||c===1)?'mi':null),
    b_prime: (s) => positional(s, c => c===7?'pl':(c===1||c===2||c===4||c===6)?'mi':null),
  },
  eight: {
    first:    (s) => positional(s, c => c===3?'pl':null),
    flex:     (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a_prime:  (s) => positional(s, c => c===1?'pl':null),
    a:        (s) => positional(s, c => (c===3||c===4)?'pl':(c===2||c===5)?'mi':null),
    a_dprime: (s) => {
      const r = positional(s, c => (c===1||c===4)?'pl':null);
      if (r.length > 0) r[r.length - 1].mark = 'mi';
      return r;
    },
    b:        (s) => positional(s, c => c===4?'pl':(c===2||c===3||c===5)?'mi':null),
  },
  peregrinus: {
    first:   (s) => positional(s, c => c===5?'pl':(c===2||c===3||c===4||c===6)?'mi':null),
    flex:    (s) => { const r = positional(s, c => c===2?'mi':null); addFlagflex(r); return r; },
    a: (s) => {
      const r = positional(s, c => c===2?'pl':c===1?'mi':null);
      if (r.length > 0) r[r.length - 1].mark = 'pl';
      return r;
    },
    b:       (s) => positional(s, c => c===4?'pl':(c===1||c===2||c===5)?'mi':null),
    a_prime: (s) => positional(s, c => c===2?'pl':(c===4||c===1)?'mi':null),
    b_prime: (s) => positional(s, c => c===7?'pl':(c===1||c===2||c===4||c===6)?'mi':null),
  },
};

// ─────────────────────────────────────────────────────────────
// SHARED ACCENT HELPERS
// ─────────────────────────────────────────────────────────────

function accentFlex(syls: string[]): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  let ac = 0, sc = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++;
    if (hasAccent(syls[i]) && ac === 0) {
      ac++;
      if (sc !== 1) a[syls.length - 1].mark = 'mi';
      else a[i].mark = 'mi';
    }
  }
  addFlagflex(a);
  return a;
}

function accentAwareLinear(syls: string[], mvPattern: (Mark)[], accentIdx = 0): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  let ac = 0, mv = 0;
  const stop = mvPattern.length;
  for (let i = syls.length - 1; i >= 0; i--) {
    if (mv > 0 && mv < stop) { a[i].mark = mvPattern[mv]; mv++; }
    else if (hasAccent(syls[i]) && ac === 0) { ac++; a[i].mark = mvPattern[accentIdx]; mv++; }
  }
  return a;
}

/** First half accent with retroactive marking of previous syllable */
function accentFirstRetroactive(syls: string[], accentMark: Mark, prevMark: Mark): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  const idx: number[] = [];
  let ac = 0, sc = 0, mi = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++; idx.unshift(i);
    if (hasAccent(syls[i])) {
      ac++;
      if (ac === 1 && sc === 1) a[i].mark = accentMark;
      else if (ac === 1) {
        a[i].mark = accentMark; mi++;
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = prevMark;
      }
    }
  }
  return a;
}

/** Full gregorian first-half: handles up to ac=3, ec flag */
function gregorianFirst_full(syls: string[]): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  const idx: number[] = [];
  let ac = 0, sc = 0, ec = 0, mi = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++; idx.unshift(i);
    if (hasAccent(syls[i])) {
      ac++;
      if (ac === 1 && sc === 1) a[i].mark = 'pl';
      else if (ac === 1) {
        a[i].mark = 'mi'; mi++;
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'pl';
      } else if (ac === 2 && sc === 3) { a[i].mark = 'mi'; ec++; }
      else if (ac === 2 && sc !== 2) {
        a[i].mark = 'pl';
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi';
        if (mi === 0 && idx.length >= 3) a[idx[idx.length - 3]].mark = 'mi';
      } else if (ac === 3 && ec === 1) {
        a[i].mark = 'pl';
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi';
      }
    }
  }
  return a;
}

function gregorianTermination_b_full(syls: string[]): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  const idx: number[] = [];
  let ac = 0, sc = 0, ec = 0, mi = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++; idx.unshift(i);
    if (hasAccent(syls[i])) {
      ac++;
      if (ac === 1 && sc === 1) a[i].mark = 'mimi';
      else if (ac === 1) {
        a[i].mark = 'mi'; mi++;
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mimi';
      } else if (ac === 2 && sc === 3) { a[i].mark = 'mi'; ec++; }
      else if (ac === 2 && sc !== 2) {
        a[i].mark = 'pl';
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi';
        if (mi === 0 && idx.length >= 3) a[idx[idx.length - 3]].mark = 'mi';
      } else if (ac === 3 && ec === 1) {
        a[i].mark = 'pl';
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi';
      }
    }
  }
  return a;
}

function gregorianTermination_c_full(syls: string[], accentMark: Mark): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  const idx: number[] = [];
  let ac = 0, sc = 0, ec = 0, mi = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++; idx.unshift(i);
    if (hasAccent(syls[i])) {
      ac++;
      if (ac === 1 && sc === 1) a[i].mark = accentMark;
      else if (ac === 1) {
        a[i].mark = 'mi'; mi++;
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = accentMark;
      } else if (ac === 2 && sc === 3) { a[i].mark = 'mi'; ec++; }
      else if (ac === 2 && sc !== 2) {
        a[i].mark = 'pl';
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi';
        if (mi === 0) {
          const skip = sc >= 4 ? idx[idx.length - 4] : idx[idx.length - 3];
          if (skip !== undefined) a[skip].mark = 'mi';
        }
      } else if (ac === 3 && ec === 1) {
        a[i].mark = 'pl';
        if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi';
      }
    }
  }
  return a;
}

function gregorianTermination_a_full(syls: string[]): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  const idx: number[] = [];
  let ac = 0, sc = 0, mc = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++; idx.unshift(i);
    if (hasAccent(syls[i]) && ac === 0) {
      ac++;
      if (sc === 1) a[i].mark = 'pl';
      else { a[i].mark = 'pl'; if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'pl'; }
      mc++;
    } else if (mc === 1 || mc === 2) { a[i].mark = 'mi'; mc++; }
  }
  return a;
}

function gregorianTermination_d_full(syls: string[]): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  const idx: number[] = [];
  let ac = 0, sc = 0, mc = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++; idx.unshift(i);
    if (hasAccent(syls[i]) && ac === 0) {
      ac++; a[i].mark = 'plmi';
      if (sc !== 1 && idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi';
      mc++;
    } else if (mc === 1 || mc === 2) { a[i].mark = 'mi'; mc++; }
  }
  return a;
}

function gregorianEightC(syls: string[], firstMark: Mark): MarkedSyllable[] {
  const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
  const idx: number[] = [];
  let ac = 0, sc = 0, mc = 0;
  for (let i = syls.length - 1; i >= 0; i--) {
    sc++; idx.unshift(i);
    if (hasAccent(syls[i]) && ac === 0) {
      ac++;
      if (sc === 1) a[i].mark = firstMark;
      else { a[i].mark = 'pl'; if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi'; }
      mc++;
    } else if (mc === 1) { a[i].mark = 'pl'; mc++; }
    else if (mc === 2) { a[i].mark = 'mi'; mc++; }
  }
  return a;
}

// ─────────────────────────────────────────────────────────────
// ACCENT-AWARE FAMILY — ENGLISH
// ─────────────────────────────────────────────────────────────

const englishModes: Record<string, Record<string, (syls: string[]) => MarkedSyllable[]>> = {
  one: {
    first:   gregorianFirst_full,
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','mi','mi','pl'], 0),
    b:       (s) => accentAwareLinear(s, ['pl','mi','mi','mi','pl'], 0),
    a_prime: (s) => accentAwareLinear(s, ['mi','mi','mi'], 0),
    b_prime: (s) => accentAwareLinear(s, ['mi','mi','mi','mi','pl'], 0),
  },
  two: {
    first:   (s) => accentFirstRetroactive(s, 'mi', 'pl'),
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','mi','mi','pl'], 0),
    b:       (s) => accentAwareLinear(s, ['pl','mi','mi','mi','pl'], 0),
    b_prime: (s) => accentAwareLinear(s, ['mi','mi','mi','mi','pl'], 0),
  },
  three: {
    first:   (s) => accentFirstRetroactive(s, 'mi', 'pl'),
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','mi','mi','pl'], 0),
    b:       (s) => accentAwareLinear(s, ['pl','mi','mi','mi','pl'], 0),
    a_prime: (s) => accentAwareLinear(s, ['mi','mi','mi'], 0),
    b_prime: (s) => accentAwareLinear(s, ['mi','mi','mi','mi','pl'], 0),
  },
  four: {
    first:   (s) => accentFirstRetroactive(s, 'mi', 'pl'),
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','mi','mi','pl'], 0),
    b:       (s) => accentAwareLinear(s, ['pl','mi','mi','mi','pl'], 0),
    a_prime: (s) => accentAwareLinear(s, ['mi','mi','mi'], 0),
    b_prime: (s) => accentAwareLinear(s, ['mi','mi','mi','mi','pl'], 0),
  },
  five: {
    first:   (s) => accentFirstRetroactive(s, 'mi', 'pl'),
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','mi','mi','pl'], 0),
    b:       (s) => accentAwareLinear(s, ['pl','mi','mi','mi','pl'], 0),
    a_prime: (s) => accentAwareLinear(s, ['mi','mi','mi'], 0),
    b_prime: (s) => accentAwareLinear(s, ['mi','mi','mi','mi','pl'], 0),
  },
  six: {
    first:   (s) => accentFirstRetroactive(s, 'mi', 'pl'),
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','mi','mi','pl'], 0),
    b:       (s) => accentAwareLinear(s, ['pl','mi','mi','mi','pl'], 0),
    a_prime: (s) => accentAwareLinear(s, ['mi','mi','mi'], 0),
    b_prime: (s) => accentAwareLinear(s, ['mi','mi','mi','mi','pl'], 0),
  },
  seven: {
    first:   (s) => accentFirstRetroactive(s, 'mi', 'pl'),
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','mi','mi','pl'], 0),
    b:       (s) => accentAwareLinear(s, ['pl','mi','mi','mi','pl'], 0),
    a_prime: (s) => accentAwareLinear(s, ['mi','mi','mi'], 0),
    b_prime: (s) => accentAwareLinear(s, ['mi','mi','mi','mi','pl'], 0),
  },
  eight: {
    first: (syls) => {
      // Mark syllable AFTER first accent as pl
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      let ac = 0, mc = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        if (hasAccent(syls[i])) { ac++; mc++; }
        else if (mc === 1) { a[i].mark = 'pl'; mc++; }
      }
      return a;
    },
    flex:    accentFlex,
    a:       (s) => accentAwareLinear(s, ['mi','pl','dmi'], 0),
    a_prime: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      let ac = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        if (hasAccent(syls[i]) && ac === 0) { ac++; a[i].mark = 'pl'; }
      }
      return a;
    },
    a_dprime: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      let ac = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        if (hasAccent(syls[i])) { ac++; if (ac <= 2) a[i].mark = 'pl'; }
      }
      if (syls.length > 0) a[0].mark = 'mi';
      return a;
    },
    b: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      let ac = 0, mc = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        if (mc > 0 && mc <= 3) { a[i].mark = mc === 2 ? 'pl' : 'mi'; mc++; }
        else if (hasAccent(syls[i]) && ac === 0) { ac++; a[i].mark = 'mi'; mc++; }
      }
      return a;
    },
  },
  peregrinus: {
    first: (s) => accentAwareLinear(s, ['mi','mi','pl','mi'], 0),
    flex:  accentFlex,
    a: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      let ac = 0, mc = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        if (hasAccent(syls[i]) && ac === 0) { ac++; a[i].mark = 'mi'; mc++; }
        else if (mc === 1) { a[i].mark = 'pl'; mc++; }
      }
      return a;
    },
    b: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      let ac = 0, mc = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        if (hasAccent(syls[i])) {
          ac++;
          if (ac === 1) { a[i].mark = 'mi'; mc++; }
          else if (ac === 2) { a[i].mark = 'pl'; mc++; }
        } else if (mc === 1) { a[i].mark = 'mi'; mc = 0; }
      }
      return a;
    },
  },
};

// ─────────────────────────────────────────────────────────────
// ACCENT-AWARE FAMILY — GREGORIAN
// ─────────────────────────────────────────────────────────────

const gregorianModes: Record<string, Record<string, (syls: string[]) => MarkedSyllable[]>> = {
  one: {
    first: gregorianFirst_full,
    flex:  accentFlex,
    a:     gregorianTermination_a_full,
    d:     gregorianTermination_d_full,
  },
  two: {
    first: gregorianFirst_full,
    flex:  accentFlex,
    a:     gregorianTermination_a_full,
    b:     gregorianTermination_b_full,
    c:     (s) => gregorianTermination_c_full(s, 'mimi'),
    c2:    (s) => gregorianTermination_c_full(s, 'plmi'),
    d:     gregorianTermination_d_full,
  },
  three: {
    first: gregorianFirst_full,
    flex:  accentFlex,
    a:     gregorianTermination_a_full,
    b:     gregorianTermination_b_full,
    c:     (s) => gregorianTermination_c_full(s, 'mimi'),
    c2:    (s) => gregorianTermination_c_full(s, 'plmi'),
    d:     gregorianTermination_d_full,
  },
  four: {
    first: gregorianFirst_full,
    flex:  accentFlex,
    a:     gregorianTermination_a_full,
    b:     gregorianTermination_b_full,
    d:     gregorianTermination_d_full,
  },
  five: {
    first: gregorianFirst_full,
    flex:  accentFlex,
    a:     gregorianTermination_a_full,
    b:     gregorianTermination_b_full,
    d:     gregorianTermination_d_full,
  },
  six: {
    first: gregorianFirst_full,
    flex:  accentFlex,
    a:     gregorianTermination_a_full,
    b:     gregorianTermination_b_full,
    d:     gregorianTermination_d_full,
  },
  seven: {
    first: gregorianFirst_full,
    flex:  accentFlex,
    a:     gregorianTermination_a_full,
    b:     gregorianTermination_b_full,
    c:     (s) => gregorianTermination_c_full(s, 'mipl'),
    c2:    (s) => gregorianTermination_c_full(s, 'plmi'),
    d:     gregorianTermination_d_full,
  },
  eight: {
    first: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      let ac = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        if (hasAccent(syls[i])) { ac++; if (ac === 1) a[i].mark = 'pl'; }
      }
      return a;
    },
    flex: accentFlex,
    c:    (s) => gregorianEightC(s, 'plmi'),
    g:    (s) => gregorianEightC(s, 'mimi'),
  },
  peregrinus: {
    first: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      const idx: number[] = [];
      let ac = 0, sc = 0, mv = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        sc++; idx.unshift(i);
        if (mv > 0 && mv < 4) { a[i].mark = mv === 2 ? 'pl' : 'mi'; mv++; }
        else if (hasAccent(syls[i]) && ac === 0) {
          ac++;
          if (sc === 1) { a[i].mark = 'mimi'; mv++; }
          else { a[i].mark = 'mi'; if (idx.length >= 2) a[idx[idx.length - 2]].mark = 'mi'; mv++; }
        }
      }
      return a;
    },
    flex: accentFlex,
    a: (syls) => {
      const a: MarkedSyllable[] = syls.map(t => ({ text: t, mark: null as Mark }));
      const idx: number[] = [];
      let ac = 0, sc = 0, es = 0, mc = 0;
      for (let i = syls.length - 1; i >= 0; i--) {
        sc++; idx.unshift(i);
        if (hasAccent(syls[i]) && ac === 0) {
          ac++;
          if (sc === 1) { ac--; es++; a[i].mark = 'mimi'; }
          else { a[i].mark = 'pl'; if (!es && idx.length >= 2) a[idx[idx.length - 2]].mark = 'mimi'; mc++; }
        } else if (mc === 1) { a[i].mark = 'mi'; mc++; }
      }
      return a;
    },
  },
};

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

export type ModeFamily = 'modes' | 'french' | 'english' | 'gregorian';
export type ModeName = 'one'|'two'|'three'|'four'|'five'|'six'|'seven'|'eight'|'peregrinus';

const familyMap: Record<ModeFamily, Record<string, Record<string, (syls: string[]) => MarkedSyllable[]>>> = {
  modes:     positionalModes,
  french:    positionalModes,
  english:   englishModes,
  gregorian: gregorianModes,
};

export function getVariations(family: ModeFamily, mode: ModeName): string[] {
  return Object.keys(familyMap[family]?.[mode] ?? {});
}

export function getModeNames(): ModeName[] {
  return ['one','two','three','four','five','six','seven','eight','peregrinus'];
}

export function applyMode(
  family: ModeFamily,
  mode: ModeName,
  variation: string,
  syllables: string[]
): MarkedSyllable[] {
  const fn = familyMap[family]?.[mode]?.[variation];
  if (!fn) {
    console.warn(`lypsautierant: unknown ${family}/${mode}/${variation}`);
    return syllables.map(t => ({ text: t, mark: null }));
  }
  return fn(syllables);
}

/** Render to LaTeX (for PDF export) */
export function toLatex(marked: MarkedSyllable[]): string {
  return marked.map(({ text, mark, flagflex }) => {
    const f = flagflex ? '\\flagflex{\\dag}' : '';
    switch (mark) {
      case 'pl':   return `\\pl{${text}}${f}`;
      case 'mi':   return `\\mi{${text}}${f}`;
      case 'plmi': return `\\plmi{${text}}${f}`;
      case 'mipl': return `\\mipl{${text}}${f}`;
      case 'mimi': return `\\mimi{${text}}${f}`;
      case 'dmi':  return `\\dmi{${text}}${f}`;
      default:     return `${text}${f}`;
    }
  }).join(' ');
}

/** Render to simplified HTML for on-screen display (pl→bold, mi→italic) */
export function toHtml(marked: MarkedSyllable[]): string {
  return marked.map(({ text, mark, flagflex }) => {
    const f = flagflex ? '<sup>†</sup>' : '';
    switch (mark) {
      case 'pl':
      case 'plmi': return `<strong>${text}</strong>${f}`;
      case 'mi':
      case 'mipl':
      case 'dmi':  return `<em>${text}</em>${f}`;
      case 'mimi': return `<em><strong>${text}</strong></em>${f}`;
      default:     return `${text}${f}`;
    }
  }).join(' ');
}
