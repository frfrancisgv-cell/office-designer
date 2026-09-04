/**
 * lypsautierant-modes.ts — GENERATED FILE, DO NOT EDIT.
 * Regenerate with: node scripts/gen-lypsautierant.mjs
 *
 * Mechanical transliteration of the pointing rules in
 * vendor/psautier/{modes,english,gregorian}/*.pm.
 *
 * Each function takes ONE syllabified hemistich (see syllabifyLine) and
 * returns it with LaTeX pointing macros applied and the intra-word " -- "
 * breaks closed up — byte-identical to the Perl original.
 *
 * The macros set a small mark UNDER the syllable (psautier/psalter.sty):
 *   pl "+"     pp "++"     plmi "+-"    mipl "-+"
 *   mi "-"     mimi "--"   dmi "="
 * plus flagflex, a dagger in the right margin marking a flex cadence.
 *
 * Only the variations that exist upstream are defined, and they are NOT
 * uniform across modes: gregorian/two has only 'd', gregorian/four has 'a'
 * and 'e', gregorian/six has 'f' and 'd'. Do not assume a mode has 'a'/'b'.
 */

const ACCENTS = 'áéíóúýÁÉÍÓÚÝ';

/**
 * The upstream .pm files have no `use utf8`, so their
 * `$syl =~ tr/áéíóúýÁÉÍÓÚÝ//` counts matching *bytes* of the UTF-8 encoding
 * rather than characters. That byte set is
 * {C3,A1,A9,AD,B3,BA,BD,81,89,8D,93,9A,9D}, so the test also fires on
 * unrelated characters that merely share a byte: a closing curly quote
 * U+201D (E2 80 9D) collides with Y-acute (C3 9D), and every Latin-1
 * accented letter collides on the C3 lead byte. Upstream therefore points a
 * syllable such as the closing "ken," of a quotation as though stressed.
 *
 * We count characters, which is what the rule means. This is the ONLY
 * deliberate difference from upstream; setting
 * `accentMode.perlByteCompat = true` restores the byte behaviour, and
 * scripts/verify-lypsautierant.sh uses that to prove nothing else differs.
 */
export const accentMode = { perlByteCompat: false };

const ACCENT_BYTES = new Set<number>(new TextEncoder().encode(ACCENTS));

function hasAcc(syl: string): number {
  let n = 0;
  if (accentMode.perlByteCompat) {
    for (const b of new TextEncoder().encode(syl)) if (ACCENT_BYTES.has(b)) n++;
  } else {
    for (const ch of syl) if (ACCENTS.includes(ch)) n++;
  }
  return n;
}

/** Points one syllabified hemistich, returning it with LaTeX macros applied. */
export type PointFn = (line: string) => string;


// ─────────────────────────────────────────────────────────────
// MODES (== FRENCH)
// ─────────────────────────────────────────────────────────────

const positionalModes: Record<string, Record<string, PointFn>> = {
  one: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 2)||(c == 6)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 2)||(c == 3)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 4)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 2)||(c == 4)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 4)||(c == 1)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 2)||(c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  two: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 3) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 1) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 3)||(c == 4)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 4)) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      a[(a.length - 1)] = '\\mi{' + a[(a.length - 1)] + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 2)||(c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  three: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 3) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 3) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 4)||(c == 1)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 4) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 1)||(c == 2)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 4)) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      a[(a.length - 1)] = '\\mi{' + a[(a.length - 1)] + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 2)||(c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  four: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 3)||(c == 4)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 6) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 1)||(c == 2)||(c == 4)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 2)) {
            a.push('\\pl{' + syl + '}');
          } else if (c == 3) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 4) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 3)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  five: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 3) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 1) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 3)||(c == 6)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 4)) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      a[(a.length - 1)] = '\\mi{' + a[(a.length - 1)] + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 2)||(c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  six: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 2)||(c == 6)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 1) {
            a.push('\\pl{' + syl + '}');
          } else if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 3) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 4)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 3)||(c == 4)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 2)||(c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  seven: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 2)||(c == 6)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 6) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 1)||(c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 7)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 4)||(c == 6)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 4)||(c == 1)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 7) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 1)||(c == 2)||(c == 4)||(c == 6)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  eight: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 3) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 1) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 3)||(c == 4)) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_dprime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if ((c == 1)||(c == 4)) {
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      a[(a.length - 1)] = '\\mi{' + a[(a.length - 1)] + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 4) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 3)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  peregrinus: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 5) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 2)||(c == 3)||(c == 4)||(c == 6)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\pl{' + syl + '}');
          } else if (c == 1) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      a[(a.length - 1)] = '\\pl{' + a[(a.length - 1)] + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 4) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 1)||(c == 2)||(c == 5)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 2) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 4)||(c == 1)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let c = 1;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          if (c == 7) {
            a.push('\\pl{' + syl + '}');
          } else if ((c == 1)||(c == 2)||(c == 4)||(c == 6)) {
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
          c++;
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
};

// ─────────────────────────────────────────────────────────────
// ENGLISH
// ─────────────────────────────────────────────────────────────

const englishModes: Record<string, Record<string, PointFn>> = {
  one: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\pl{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\pl{' + syl + '}');
            mc++;
          } else if (mc == 1) {
            a.push('\\pl{' + syl + '}');
            mc++;
          } else if ((mc == 2)||(mc == 3)) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mc++;
          } else if ((mc == 1)||(mc == 2)) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mc++;
          } else if (mc == 1) {
            a.push('\\pl{' + syl + '}');
            mc++;
          } else if (mc == 2) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mc++;
          } else if ((mc == 1)||(mc == 2)||(mc == 3)) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  two: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            mc++;
            a.push(syl);
          } else if (mc == 1) {
            mc++;
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      let final = 0;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\mi{' + syl + '}');
              final++;
            } else {
              a.push('\\pl{' + syl + '}');
            }
            mc++;
          } else if (mc == 1 ) {
            if (final) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
            }
            mc++;
          } else if (mc == 2) {
            if (final) {
              a.push('\\dmi{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
            }
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let fac = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)||(ac == 2)) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      csyl = a[idx-1];
      a[idx-1] = '\\mi{' + csyl + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  three: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            mc++;
            a.push(syl);
          } else if (mc == 1) {
            mc++;
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mc++;
          } else if (mc == 1) {
            a.push('\\pl{' + syl + '}');
            mc++;
          } else if (mc == 2) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mc++;
            } else if (ac == 2) {
              a.push('\\pl{' + syl + '}');
              mc++;
            } else {
              a.push(syl);
            }
          } else if (mc == 1) {
            a.push('\\mi{' + syl + '}');
            mc = 0;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  four: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 4)) {
            if (mv == 3) {
              a.push('\\mi{' + syl + '}');
              mv++;
            } else {
              a.push('\\pl{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 5)) {
            if (mv == 4) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 3)) {
            if (mv == 1) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\pl{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 3)) {
            if (mv == 2) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  five: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            mc++;
            a.push(syl);
          } else if (mc == 1) {
            mc++;
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let fac = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)||(ac == 2)) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      csyl = a[idx-1];
      a[idx-1] = '\\mi{' + csyl + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let scomp = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if (mc == 1) {
            a.push('\\pl{' + syl + '}');
            mc--;
            scomp = sc;
          } else if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mc++;
            } else if (ac == 2) {
              if (sc - scomp > 1) {
                a.push('\\pl{' + syl + '}');
                csyl = a[i[sc -2]];
                a[i[sc -2]] = '\\mi{' + csyl + '}';
              } else {
                a.push(syl);
                ac--;
              }
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if (hasAcc(syl)) {
            ac++;
            if ((sc == 1)&&(ac == 1)) {
              a.push('\\plmi{' + syl + '}');
            } else if ((ac == 1)||(ac == 2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc -2]];
              a[i[sc -2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  six: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\pl{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            mc++;
            a.push(syl);
          } else if (mc == 1) {
            mc++;
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mc++;
          } else if (mc == 1) {
            a.push('\\pl{' + syl + '}');
            mc++;
          } else if (mc == 2) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 4)) {
            if (mv == 3) {
              a.push('\\mi{' + syl + '}');
              mv++;
            } else {
              a.push('\\pl{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  seven: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\pl{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 4)) {
            if (mv == 3) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 5)) {
            if (mv == 4) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\pl{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 5)) {
            if (mv == 4) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  eight: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            mc++;
            a.push(syl);
          } else if (mc == 1) {
            mc++;
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 4)) {
            if (mv == 3) {
              a.push('\\dmi{' + syl + '}');
              mv++;
            } else {
              a.push('\\pl{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_prime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a_dprime: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let fac = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)||(ac == 2)) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      csyl = a[idx-1];
      a[idx-1] = '\\mi{' + csyl + '}';
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if ((mc != 0)&&(mc <= 3)) {
            if (mc == 2) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
            }
            mc++;
          } else if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mc++;
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  peregrinus: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 5)) {
            if (mv == 3) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\mi{' + syl + '}');
            mv++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if ((hasAcc(syl))&&(ac==0)) {
            ac++;
            mc++;
            a.push('\\mi{' + syl + '}');
          } else if (mc == 1) {
            mc++;
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mc++;
            } else if (ac == 2) {
              a.push('\\pl{' + syl + '}');
              mc++;
            } else {
              a.push(syl);
            }
          } else if (mc == 1) {
            a.push('\\mi{' + syl + '}');
            mc = 0;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
};

// ─────────────────────────────────────────────────────────────
// GREGORIAN
// ─────────────────────────────────────────────────────────────

const gregorianModes: Record<string, Record<string, PointFn>> = {
  one: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\pl{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\pp{' + syl + '}');
            } else {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            }
            mc++;
          } else if ((mc == 1)||(mc == 2)) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    d: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\plmi{' + syl + '}');
            if (sc != 1) {
              csyl = a[i[sc -2]];
              a[i[sc -2]] = '\\mi{' + csyl + '}';
            }
            mc++;
          } else if ((mc == 1 )||(mc == 2)) {
            mc++;
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  two: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    d: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      let final = 0;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\mi{' + syl + '}');
              final++;
            } else {
              a.push('\\pl{' + syl + '}');
            }
            mc++;
          } else if (mc == 1 ) {
            if (final) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
            }
            mc++;
          } else if (mc == 2) {
            if (final) {
              a.push('\\dmi{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
            }
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  three: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      let final = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\pl{' + syl + '}');
              final++;
            } else if (ac == 1) {
              a.push('\\mimi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              ec++;
            } else if ((ac == 2)&&(sc ==  4)&&(final)) {
              a.push('\\plmi{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
                csyl = a[i[sc-4]];
                a[i[sc-4]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    b: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if (hasAcc(syl)) {
            ac++;
            if ((sc == 1)&&(ac == 1)) {
              a.push('\\plmi{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[0]];
              a[i[0]] = '\\mi{' + csyl + '}';
            } else if (ac == 2) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if (hasAcc(syl)) {
            ac++;
            if ((sc == 1)&&(ac == 1)) {
              a.push('\\plmi{' + syl + '}\\mi{\\rule{2ex}{.5pt}}');
            } else if (ac == 1) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[0]];
              a[i[0]] = '\\mimi{' + csyl + '}';
            } else if (ac == 2) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  four: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 3)) {
            if (mv == 1) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              mv++;
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\mi{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            }
            mc++;
          } else if ((mc == 1)||(mc == 2)||(mc == 3)) {
            if ((mc == 1)||(mc == 2)) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
            }
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    e: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\mimi{' + syl + '}\\mi{\\rule{2ex}{.5pt}}');
            } else {
              a.push('\\mimi{' + syl + '}');
              csyl = a[i[0]];
              a[i[0]] = '\\mi{' + csyl + '}';
            }
            mc++;
          } else if ((mc == 1 )||(mc == 2)||(mc == 3)) {
            if (mc == 1 ) {
              a.push('\\plmi{' + syl + '}');
            } else if (mc == 2 ) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
            }
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  five: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      let final = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\pl{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if (hasAcc(syl)) {
            ac++;
            if ((sc == 1)&&(ac == 1)) {
              a.push('\\plmi{' + syl + '}');
            } else if ((ac == 1)||(ac == 2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc -2]];
              a[i[sc -2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  six: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mc = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\plmi{' + syl + '}');
            } else {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc -2]];
              a[i[sc -2]] = '\\mi{' + csyl + '}';
            }
            mc++;
          } else if (mc == 1) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    f: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\mimi{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            }
            mc++;
          } else if (mc == 1) {
            a.push('\\pp{' + syl + '}');
            mc++;
          } else if (mc == 2) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    d: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            a.push('\\plmi{' + syl + '}');
            if (sc != 1) {
              csyl = a[i[sc -2]];
              a[i[sc -2]] = '\\mi{' + csyl + '}';
            }
            mc++;
          } else if ((mc == 1 )||(mc == 2)) {
            mc++;
            a.push('\\mi{' + syl + '}');
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  seven: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\pl{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\pl{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\mimi{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mimi{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                csyl = a[i[sc-3]];
                a[i[sc-3]] = '\\mi{' + csyl + '}';
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    c: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\mipl{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mipl{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                if ((sc - 4) >= 1) {
                  csyl = a[i[sc-4]];
                  a[i[sc-4]] = '\\mi{' + csyl + '}';
                } else {
                  csyl = a[i[sc-3]];
                  a[i[sc-3]] = '\\mi{' + csyl + '}';
                }
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    c2: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if ((ac == 1)&&(sc == 1)) {
              a.push('\\plmi{' + syl + '}');
            } else if (ac == 1) {
              a.push('\\mi{' + syl + '}');
              mi++;
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\plmi{' + csyl + '}';
            } else if ((ac == 2)&&(sc == 3)) {
              a.push('\\mi{' + syl + '}');
              ec++;
            } else if ((ac == 2)&&(sc !=  2)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              if (mi == 0) {
                if ((sc - 4) >= 1) {
                  csyl = a[i[sc-4]];
                  a[i[sc-4]] = '\\mi{' + csyl + '}';
                } else {
                  csyl = a[i[sc-3]];
                  a[i[sc-3]] = '\\mi{' + csyl + '}';
                }
              }
            } else if ((ac == 3)&&(ec == 1)) {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  eight: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = 0;
      let mi = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx - 1);
          if (hasAcc(syl)) {
            ac++;
            if (ac == 1) {
              a.push('\\pl{' + syl + '}');
            } else {
              a.push(syl);
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    c: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      let final = 0;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\plmi{' + syl + '}');
            } else {
              a.push('\\pl{' + syl + '}');
              csyl = a[i[sc -2]];
              a[i[sc -2]] = '\\mi{' + csyl + '}';
            }
            mc++;
          } else if (mc == 1 ) {
            a.push('\\pl{' + syl + '}');
            mc++;
          } else if (mc == 2) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    g: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let idx = -1;
      let final = 0;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\mimi{' + syl + '}');
            } else {
              a.push('\\mi{' + syl + '}');
              csyl = a[i[sc -2]];
              a[i[sc -2]] = '\\mi{' + csyl + '}';
            }
            mc++;
          } else if (mc == 1 ) {
            a.push('\\pl{' + syl + '}');
            mc++;
          } else if (mc == 2) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
  peregrinus: {
    first: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let ac = 0;
      let sc = 0;
      let ec = 0;
      let idx = -1;
      let mv = 0;
      const a: string[] = [];
      const i: number[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((mv != 0)&&(mv != 4)) {
            if (mv == 2) {
              a.push('\\pl{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              mv++;
            }
          } else if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              a.push('\\mimi{' + syl + '}');
              mv++;
            } else {
              a.push('\\mi{' + syl + '}');
              csyl = a[i[sc-2]];
              a[i[sc-2]] = '\\mi{' + csyl + '}';
              mv++;
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
    flex: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let sc = 0;
      let ac = 0;
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        if (syl !== '--') {
          sc++;
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc != 1) {
              let fl = a[0];
              a[0] = '\\mi{' + fl + '}';
              a.push(syl);
            } else {
              a.push('\\mi{' + syl + '}');
            }
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      r += '\\flagflex{\\dag}';
      return r;
    },
    a: (line: string): string => {
      const l = line.trim().split(/\s+/);
      let csyl: string;
      let sc = 0;
      let ac = 0;
      let mc = 0;
      let es = 0;
      let idx = -1;
      const i: number[] = [];
      const a: string[] = [];
      while (l.length) {
        const syl = l.pop() as string;
        idx++;
        if (syl !== '--') {
          sc++;
          i.push(idx);
          if ((hasAcc(syl))&&(ac == 0)) {
            ac++;
            if (sc == 1) {
              ac--;
              es++;
              a.push('\\mimi{' + syl + '}');
            } else {
              a.push('\\pl{' + syl + '}');
              if (!(es)) {
                csyl = a[i[sc-2]];
                a[i[sc-2]] = '\\mimi{' + csyl + '}';
              }
              mc++;
            }
          } else if (mc == 1) {
            a.push('\\mi{' + syl + '}');
            mc++;
          } else {
            a.push(syl);
          }
        } else {
          a.push(syl);
        }
      }
      let r = a.slice().reverse().join(' ').split(' -- ').join('');
      return r;
    },
  },
};


// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

export type ModeFamily = 'modes' | 'french' | 'english' | 'gregorian';
export type ModeName = 'one' | 'two' | 'three' | 'four' | 'five' | 'six' | 'seven' | 'eight' | 'peregrinus';

/** psautier/french is byte-identical to psautier/modes upstream. */
const familyMap: Record<ModeFamily, Record<string, Record<string, PointFn>>> = {
  modes:     positionalModes,
  french:    positionalModes,
  english:   englishModes,
  gregorian: gregorianModes,
};

export function getFamilyNames(): ModeFamily[] {
  return ['modes', 'french', 'english', 'gregorian'];
}

/** Modes defined for a family. */
export function getModeNames(family: ModeFamily = 'modes'): ModeName[] {
  const fam = familyMap[family] ?? positionalModes;
  return (["one","two","three","four","five","six","seven","eight","peregrinus"] as ModeName[]).filter(m => fam[m]);
}

/**
 * Termination variations that actually exist for this family and mode.
 * 'first' (the mediant half) and 'flex' are roles rather than choices, so
 * they are excluded here — pointPsalmText selects those itself.
 */
export function getVariations(family: ModeFamily, mode: ModeName): string[] {
  return Object.keys(familyMap[family]?.[mode] ?? {}).filter(v => v !== 'first' && v !== 'flex');
}

export function hasVariation(family: ModeFamily, mode: ModeName, variation: string): boolean {
  return typeof familyMap[family]?.[mode]?.[variation] === 'function';
}

/**
 * Point one syllabified hemistich.
 *
 * Throws on an unknown family/mode/variation rather than returning the text
 * unmarked: a silently unpointed hemistich looks like a pointing bug, and is
 * how a previous set of invented variations went unnoticed.
 */
export function applyMode(
  family: ModeFamily,
  mode: ModeName,
  variation: string,
  syllabifiedLine: string,
): string {
  const fn = familyMap[family]?.[mode]?.[variation];
  if (!fn) {
    const known = getVariations(family, mode).join(', ') || '(none)';
    throw new Error(
      `lypsautierant: no rule ${family}/${mode}/${variation}; ` +
      `${family}/${mode} defines: ${known}`,
    );
  }
  return fn(syllabifiedLine);
}
