/**
 * escLtx — the LaTeX escape pass.
 *
 * Two live bugs motivated these: a missing '_' rule, which killed the whole
 * PDF for any block containing an underscore ("Missing $ inserted"), and a
 * chained-.replace() implementation whose backslash rule ran first, so the
 * braces it introduced were escaped again by the later brace rules and
 * "a\b" came out as "a\textbackslash\{\}b".
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildLatexDocument, escLtx } from './renderer';
import type { Block, OfficeSettings } from '@/lib/types';

test('chant translations follow the score and can be omitted without removing the score', () => {
  const settings: OfficeSettings = { paperSize: 'A4', baseFontSize: 12, fontFamily: 'serif', rubricColor: '#C00000', lineSpacing: 'normal' };
  for (const type of ['antiphon', 'invitatory-antiphon', 'hymn'] as const) {
    const block: Block = { id: type, type, content: 'Translation example', gabcScore: '(c4) Test(g) (::)' };
    const included = buildLatexDocument([block], settings);
    assert.ok(included.texContent.indexOf('Translation example') > included.texContent.indexOf('\\gregorioscore{'));
    const omitted = buildLatexDocument([{ ...block, printTranslation: false }], settings);
    assert.ok(!omitted.texContent.includes('Translation example'));
    assert.equal(Object.keys(omitted.gabcFiles).length, 1);
    assert.equal(block.content, 'Translation example');
  }
});

test('escapes every LaTeX special character', () => {
  assert.equal(escLtx('&'), '\\&');
  assert.equal(escLtx('%'), '\\%');
  assert.equal(escLtx('$'), '\\$');
  assert.equal(escLtx('#'), '\\#');
  assert.equal(escLtx('{'), '\\{');
  assert.equal(escLtx('}'), '\\}');
  assert.equal(escLtx('~'), '\\textasciitilde{}');
  assert.equal(escLtx('^'), '\\textasciicircum{}');
});

test("'_' is escaped — the character that used to kill the document", () => {
  assert.equal(escLtx('_'), '\\_');
  assert.equal(escLtx('snake_case'), 'snake\\_case');
  assert.equal(escLtx('a_b_c'), 'a\\_b\\_c');
});

test('a backslash does not have its own replacement re-escaped', () => {
  // The braces in \textbackslash{} are output, not input: a second pass over
  // them would give "a\textbackslash\{\}b" and a broken document.
  assert.equal(escLtx('\\'), '\\textbackslash{}');
  assert.equal(escLtx('a\\b'), 'a\\textbackslash{}b');
});

test('every special character at once, in one pass', () => {
  assert.equal(
    escLtx('\\&%$#_{}~^'),
    '\\textbackslash{}\\&\\%\\$\\#\\_\\{\\}\\textasciitilde{}\\textasciicircum{}',
  );
});

test('versicle and response glyphs become macros', () => {
  assert.equal(escLtx('℣'), '\\versicle{}');
  assert.equal(escLtx('℟'), '\\response{}');
  assert.equal(escLtx('℣. Deus, in adiutórium'), '\\versicle{}. Deus, in adiutórium');
});

test('UTF-8 and ordinary text are left alone', () => {
  // LuaLaTeX + fontspec handle these directly.
  assert.equal(escLtx('Glória Patri, et Fílio'), 'Glória Patri, et Fílio');
  assert.equal(escLtx('in sǽcula sæculórum'), 'in sǽcula sæculórum');
  assert.equal(escLtx(''), '');
});

test('Gregorio exports keep red responsory stars and define response signs', () => {
  const blocks: Block[] = [{
    id: 'rb',
    type: 'antiphon',
    content: 'Responsory',
    // Bare is the form present in the affected OCO antiphons.
    gabcScore: '(c4) Re(f)spon(g)de,(f) \\greheightstar(;) '
      + 'V/.(::) Verse(f) R/.(::)',
  }];
  const settings: OfficeSettings = {
    paperSize: 'A4', baseFontSize: 12, fontFamily: 'serif',
    rubricColor: '#C00000', lineSpacing: 'normal',
  };
  const rendered = buildLatexDocument(blocks, settings);
  const gabc = Object.values(rendered.gabcFiles)[0];

  assert.match(gabc, /<v>\\greheightstar<\/v>/);
  assert.match(gabc, /<sp>V\/<\/sp>/);
  assert.match(gabc, /<sp>R\/<\/sp>/);
  assert.match(rendered.texContent, /\\def\\Vbar\{\{\\color\{rubricred\}\\gothVbar\}\}/);
  assert.match(rendered.texContent, /\\def\\Rbar\{\{\\color\{rubricred\}\\gothRbar\}\}/);
});

test('the \\x00 sentinel names contain no escapable character', () => {
  // htmlToLatex turns <strong>/<em> into \x00NAME\x00 sentinels, runs escLtx
  // over the result, and only then expands them into \textbf{...} etc. So a
  // sentinel name holding any character in the escape table is rewritten
  // ("BOLD_OPEN" -> "BOLD\_OPEN"), the expansion pass no longer matches it,
  // and the raw \x00 reaches lualatex: "Text line contains an invalid
  // character". That is exactly what happened when '_' was added.
  //
  // Read out of the source rather than duplicated here, so renaming a
  // sentinel cannot quietly escape this check.
  const source = fs.readFileSync(path.join(import.meta.dirname, 'renderer.ts'), 'utf8')
    // Comments out first: the note above the escape table quotes the old
    // "\x00BOLD_OPEN\x00" by name to explain what went wrong, and that is
    // prose, not a sentinel in use.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  // [^\\] rather than a class of the characters a name is *allowed* to hold:
  // a name containing the very characters this test hunts for must not be
  // able to hide from it by failing to match.
  const names = [...source.matchAll(/\\x00([^\\]+?)\\x00/g)].map((m) => m[1]);

  assert.ok(names.length >= 6, `expected to find the sentinels, found ${names.length}`);
  for (const name of new Set(names)) {
    assert.equal(escLtx(name), name, `sentinel "${name}" is altered by escLtx`);
  }
});
