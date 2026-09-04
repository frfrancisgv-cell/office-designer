#!/usr/bin/env node
/**
 * Generate lib/psalm-tones/lypsautierant-{modes,syllabify}.ts from the
 * upstream lypsautierant sources.
 *
 *   node scripts/gen-lypsautierant.mjs
 *
 * Two files are generated:
 *
 *   lypsautierant-syllabify.ts  <- vendor/psautier/sedsyllables   (180 sed rules)
 *   lypsautierant-modes.ts      <- vendor/psautier/{modes,english,gregorian}/*.pm
 *
 * Both are mechanical transliterations, not reinterpretations. Verify with
 * scripts/verify-lypsautierant.sh, which diffs this output against the real
 * sed and perl over every psalm in the repo and expects zero differences.
 *
 * Hand-porting these rules is what produced the previous engine's wrong
 * output: the pointing rules count syllables and accents by position, so one
 * mis-split word or invented variation throws off a whole hemistich.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PSAUTIER = path.join(ROOT, 'vendor', 'psautier');
const OUT_DIR = path.join(ROOT, 'lib', 'psalm-tones');

const FAMILIES = ['modes', 'english', 'gregorian'];
const MODES = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'peregrinus'];

// ═══════════════════════════════════════════════════════════════════════════
// PART 1 — sedsyllables  ->  lypsautierant-syllabify.ts
// ═══════════════════════════════════════════════════════════════════════════

// sed's word constituents are alphanumerics plus '_'. Under C.UTF-8 that
// includes accented letters, so `\<` does NOT match the 'w' of "flów -- ing"
// (the preceding character is 'ó'). Curly apostrophes and quotes are
// punctuation and do still end a word. Getting this wrong silently changes
// the split of about 5% of all lines.
const WORD = '[\\p{L}\\p{N}_]';
const WSTART = `(?<!${WORD})(?=${WORD})`;
const WEND = `(?<=${WORD})(?!${WORD})`;

/** Convert one POSIX basic regular expression into a JS regex source string. */
function convPattern(bre) {
  let out = '';
  let i = 0;
  let inClass = false;
  while (i < bre.length) {
    const c = bre[i];
    if (inClass) {
      // POSIX bracket expressions have no escapes: a backslash inside [...]
      // stands for itself, so sed's [^ .,;?!:"\-] excludes a literal
      // backslash as well as '-'. JS would read \- as merely '-'.
      if (c === '\\') { out += '\\\\'; i++; continue; }
      out += c;
      if (c === ']') inClass = false;
      i++;
      continue;
    }
    if (c === '\\') {
      const n = bre[i + 1];
      if (n === '<') { out += WSTART; i += 2; continue; }
      if (n === '>') { out += WEND; i += 2; continue; }
      if (n === '(' || n === ')' || n === '|') { out += n; i += 2; continue; }
      if (n === 't') { out += '\\t'; i += 2; continue; }
      out += '\\' + n; i += 2; continue;
    }
    if (c === '[') {
      inClass = true;
      out += c; i++;
      if (bre[i] === '^') { out += bre[i]; i++; }
      if (bre[i] === ']') { out += '\\]'; i++; }  // a literal ] may lead a class
      continue;
    }
    // Metacharacters in JS that are plain literals in a BRE.
    if ('(){}+?'.includes(c)) { out += '\\' + c; i++; continue; }
    out += c; i++;
  }
  return out;
}

/** Convert a sed replacement into a JS String.replace replacement. */
function convReplacement(rep) {
  let out = '';
  for (let i = 0; i < rep.length; i++) {
    const c = rep[i];
    if (c === '\\' && /[1-9]/.test(rep[i + 1] ?? '')) { out += '$' + rep[i + 1]; i++; continue; }
    if (c === '&') { out += '$&'; continue; }
    if (c === '$') { out += '$$'; continue; }
    out += c;
  }
  return out;
}

/**
 * Corrections to rules that are simply broken upstream, keyed by the sed
 * source line so that they stop applying if the rule is ever fixed there.
 *
 * Each entry gives the corrected [pattern, replacement] as JS regex source,
 * and must not change how many " -- " breaks the rule inserts — the pointing
 * rules count syllables, so changing a count would move every mark in the
 * hemistich and invalidate the verification against perl.
 */
const RULE_FIXES = new Map([
  [
    // '&' is the whole match, so this expands "scáttered" to
    // "scscátteredt -- tered" — the author meant it to be the vowel alone.
    // Same one break either way, so only the visible text changes.
    's/sc[áa]ttered/sc&t -- tered/g;',
    { pattern: 'sc([áa])ttered', replacement: 'sc$1t -- tered', why: 'upstream & is the whole match, corrupting the word' },
  ],
]);

function generateSyllabifier() {
  const src = fs.readFileSync(path.join(PSAUTIER, 'sedsyllables'), 'utf8');
  const rules = [];
  let fixed = 0;
  for (const raw of src.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^s\/(.*)\/([^/]*)\/g;?$/);
    if (!m) throw new Error('unparsed sed rule: ' + line);
    const fix = RULE_FIXES.get(line);
    if (fix) {
      fixed++;
      rules.push([fix.pattern, fix.replacement, `${line}   [CORRECTED: ${fix.why}]`]);
      continue;
    }
    rules.push([convPattern(m[1]), convReplacement(m[2]), line]);
  }
  if (fixed !== RULE_FIXES.size) {
    throw new Error(`RULE_FIXES: ${RULE_FIXES.size - fixed} entry/entries no longer match a rule in sedsyllables`);
  }

  const body = rules
    .map(([p, r, orig]) => `  // ${orig}\n  [/${p.replace(/\//g, '\\/')}/gu, ${JSON.stringify(r)}],`)
    .join('\n');

  return `/**
 * lypsautierant-syllabify.ts — GENERATED FILE, DO NOT EDIT.
 * Regenerate with: node scripts/gen-lypsautierant.mjs
 *
 * Mechanical conversion of vendor/psautier/sedsyllables — the sed
 * script the upstream tool runs over psalm text before pointing it. Applying
 * these ${rules.length} rules in order reproduces \`sed -f sedsyllables\` exactly.
 *
 * This matters because the pointing rules count syllables from the end of
 * each hemistich: if a word splits differently here than upstream, every
 * mark in that hemistich lands on the wrong syllable. Do not "improve" the
 * splitting without regenerating the pointing rules against it.
 *
 * Rules marked [CORRECTED] below are the exception: they are broken upstream
 * in a way that mangles the text without changing how many syllables it has,
 * so fixing them moves no marks. See RULE_FIXES in the generator.
 */

/** [pattern, replacement] in upstream order; the comment is the sed original. */
const RULES: [RegExp, string][] = [
${body}
];

/**
 * Insert " -- " syllable breaks into one line of psalm text.
 *
 * The text should already carry acute accents on its stressed syllables, as
 * the Grail psalter under vendor/psautier/ does. Syllables within a
 * word come out separated by " -- ", words by a plain space.
 */
export function syllabifyLine(line: string): string {
  let s = line;
  for (const [re, rep] of RULES) s = s.replace(re, rep);
  return s;
}
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — {modes,english,gregorian}/*.pm  ->  lypsautierant-modes.ts
// ═══════════════════════════════════════════════════════════════════════════

function convExpr(e) {
  // Protect single-quoted Perl literals. Perl and JS both treat backslashes
  // in single quotes literally, so the text carries over verbatim — but a '.'
  // inside one must not be turned into concatenation.
  const lits = [];
  let s = e.replace(/'(?:[^'\\]|\\.)*'/g, (lit) => {
    lits.push(lit);
    return `__LIT${lits.length - 1}__`;
  });
  s = s.replace(/\$syl\s*=~\s*tr\/áéíóúýÁÉÍÓÚÝ\/\//g, 'hasAcc(syl)');
  s = s.replace(/\s*\.\s*/g, ' + ');             // Perl concat -> JS concat
  s = s.replace(/\$#(\w+)/g, '($1.length - 1)'); // $#a -> last index
  s = s.replace(/@(\w+)\[/g, '$1[');             // @i[n] used as an element
  s = s.replace(/\$(\w+)/g, '$1');               // drop scalar sigils
  s = s.replace(/\s+ne\s+/g, ' !== ');
  s = s.replace(/\s+eq\s+/g, ' === ');
  s = s.replace(/__LIT(\d+)__/g, (_, n) => lits[Number(n)]);
  return s;
}

function convLine(raw) {
  const t = raw.trim();
  if (!t || t.startsWith('#')) return null;

  // Prologue and epilogue are supplied by the emitter, not translated.
  if (/^my @l = split\(' ',shift\);$/.test(t)) return null;
  if (/^my \$r = join\(" ",reverse @a\);$/.test(t)) return null;
  if (/^\$r =~ s\/ -- \/\/g;$/.test(t)) return null;
  if (/^return \$r;$/.test(t)) return null;
  if (/^\$r \.= '\\\\flagflex\{\\\\dag\}';$/.test(t)) return { kind: 'flagflex' };

  let m;
  if ((m = t.match(/^my @(\w+);$/))) {
    return { code: m[1] === 'a' ? 'const a: string[] = [];' : `const ${m[1]}: number[] = [];` };
  }
  if ((m = t.match(/^my \$(\w+)\s*=\s*(.+);$/))) {
    if (m[2] === 'pop @l') return { code: `const ${m[1]} = l.pop() as string;` };
    // `my $csyl` appears inside a branch while sibling branches assign it
    // bare; the .pm files have no `use strict`, so it is one variable per sub.
    if (m[1] === 'csyl') return { code: `csyl = ${convExpr(m[2])};` };
    return { code: `let ${m[1]} = ${convExpr(m[2])};` };
  }
  if (/^while \(@l\)\{$/.test(t)) return { code: 'while (l.length) {' };
  if ((m = t.match(/^if\s*\((.*)\)\s*\{$/))) return { code: `if (${convExpr(m[1])}) {` };
  if ((m = t.match(/^elsif\s*\((.*)\)\s*\{$/))) return { code: `} else if (${convExpr(m[1])}) {`, dedent: true };
  if ((m = t.match(/^unless\s*\((.*)\)\s*\{$/))) return { code: `if (!(${convExpr(m[1])})) {` };
  if (/^else\s*\{$/.test(t)) return { code: '} else {', dedent: true };
  if (t === '}') return { code: '}', close: true };
  if ((m = t.match(/^push\s*\(\s*@(\w+)\s*,\s*(.+)\)\s*;?$/))) return { code: `${m[1]}.push(${convExpr(m[2])});` };
  if ((m = t.match(/^\$(\w+)\+\+;?$/))) return { code: `${m[1]}++;` };
  if ((m = t.match(/^\$(\w+)--;?$/))) return { code: `${m[1]}--;` };
  if ((m = t.match(/^([@$]?\w+(?:\[.*\])?)\s*=\s*(.+);$/))) {
    return { code: `${convExpr(m[1])} = ${convExpr(m[2])};` };
  }
  throw new Error('unhandled Perl statement: ' + t);
}

function transpileSub(name, body) {
  const toks = [];
  for (const raw of body.split('\n')) {
    let r;
    try { r = convLine(raw); } catch (e) { throw new Error(`${name}: ${e.message}`); }
    if (r) toks.push(r);
  }

  // Perl writes `}` on its own line before `elsif`/`else`; JS wants them joined.
  const merged = [];
  for (let k = 0; k < toks.length; k++) {
    if (toks[k].close && toks[k + 1]?.dedent) continue;
    merged.push(toks[k]);
  }

  const out = [];
  let flagflex = false;
  let depth = 1;
  for (const t of merged) {
    if (t.kind === 'flagflex') { flagflex = true; continue; }
    if (t.dedent || t.close) depth--;
    if (depth < 0) throw new Error(`${name}: unbalanced braces`);
    out.push('  '.repeat(depth) + t.code);
    if (t.code.endsWith('{')) depth++;
  }
  if (depth !== 1) throw new Error(`${name}: unbalanced braces (depth ${depth})`);

  const epi = ["let r = a.slice().reverse().join(' ').split(' -- ').join('');"];
  if (flagflex) epi.push("r += '\\\\flagflex{\\\\dag}';");
  epi.push('return r;');

  return [
    `  ${name}: (line: string): string => {`,
    '    const l = line.trim().split(/\\s+/);',
    ...(out.some(x => /\bcsyl\b/.test(x)) ? ['    let csyl: string;'] : []),
    ...out.map(s => '  ' + s),
    ...epi.map(s => '    ' + s),
    '  },',
  ].join('\n');
}

function generateModes() {
  const parts = [];

  parts.push(`/**
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
 * The upstream .pm files have no \`use utf8\`, so their
 * \`$syl =~ tr/áéíóúýÁÉÍÓÚÝ//\` counts matching *bytes* of the UTF-8 encoding
 * rather than characters. That byte set is
 * {C3,A1,A9,AD,B3,BA,BD,81,89,8D,93,9A,9D}, so the test also fires on
 * unrelated characters that merely share a byte: a closing curly quote
 * U+201D (E2 80 9D) collides with Y-acute (C3 9D), and every Latin-1
 * accented letter collides on the C3 lead byte. Upstream therefore points a
 * syllable such as the closing "ken," of a quotation as though stressed.
 *
 * We count characters, which is what the rule means. This is the ONLY
 * deliberate difference from upstream; setting
 * \`accentMode.perlByteCompat = true\` restores the byte behaviour, and
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
`);

  for (const fam of FAMILIES) {
    const varName = fam === 'modes' ? 'positionalModes' : fam + 'Modes';
    const label = fam === 'modes' ? 'MODES (== FRENCH)' : fam.toUpperCase();
    parts.push(`\n// ─────────────────────────────────────────────────────────────\n// ${label}\n// ─────────────────────────────────────────────────────────────\n`);
    parts.push(`const ${varName}: Record<string, Record<string, PointFn>> = {`);
    for (const mode of MODES) {
      const file = path.join(PSAUTIER, fam, `${mode}.pm`);
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, 'utf8');
      parts.push(`  ${mode}: {`);
      const re = /^sub\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
      let m;
      while ((m = re.exec(src)) !== null) {
        parts.push(transpileSub(m[1], m[2]).split('\n').map(s => '  ' + s).join('\n'));
      }
      parts.push('  },');
    }
    parts.push('};');
  }

  parts.push(`

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
  return (${JSON.stringify(MODES)} as ModeName[]).filter(m => fam[m]);
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
      \`lypsautierant: no rule \${family}/\${mode}/\${variation}; \` +
      \`\${family}/\${mode} defines: \${known}\`,
    );
  }
  return fn(syllabifiedLine);
}
`);

  return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════

fs.writeFileSync(path.join(OUT_DIR, 'lypsautierant-syllabify.ts'), generateSyllabifier());
fs.writeFileSync(path.join(OUT_DIR, 'lypsautierant-modes.ts'), generateModes());
console.log('wrote lib/psalm-tones/lypsautierant-syllabify.ts');
console.log('wrote lib/psalm-tones/lypsautierant-modes.ts');
