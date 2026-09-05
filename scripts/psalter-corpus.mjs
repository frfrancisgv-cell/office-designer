/**
 * The psalter corpus: which files under `vendor/psautier` are sung text.
 *
 * `scripts/verify-lypsautierant.sh` and `scripts/audit-english-syllables.mjs`
 * both need the same answer, and both used to take it as `<collection>/*` —
 * every file in the five collection directories, one level down. That swept in
 * the psalter book's own build machinery, which is not psalm text and is not
 * even English: `formatter` and `itemizer` are sed scripts, `accents.pl` is
 * perl, and the `.tex` files are the typeset output of the plain file sitting
 * beside them, so their text was counted twice, once wearing LaTeX macros.
 *
 * The consequence was worst in the audit, whose whole output is a list of
 * oddly-split words: `textbf`, `abcd`, `vspace` and `\hangindent` are not
 * words, and they crowded out the ones that are.
 *
 * Note what this reveals about `seasons/` and `sanctoral/`: a one-level glob
 * reaches five files in the first and one in the second, and every one of them
 * is tooling. Their actual offices live a directory further down and have
 * never been in the corpus at all. Reaching them would be a real widening of
 * what the verifier proves, and is its own change, not this one.
 *
 * Run directly to print the file list, one path per line, for the shell.
 */

import fs from 'fs';
import path from 'path';

export const COLLECTIONS = [
  'revisedGrailPsalter', 'theAbbeyPsalmsAndCanticles', 'commons', 'seasons', 'sanctoral',
];

/**
 * Files that are not sung text, named rather than sniffed: the vendored tree
 * is a copy of a fixed upstream, so a list can be read and checked, and a
 * heuristic could only be trusted.
 */
const NOT_TEXT = new Set([
  'accents.pl',                    // perl: moves the accents in a psalm file
  'fixformat',                     // sed: repairs a psalm file's line breaks
  'formatter',                     // sed: office text -> LaTeX
  'hymnformatter',                 // sed: the same for hymns
  'itemizer',                      // sed: the same for intercessions
  'seasons',                       // empty
  'Psalter',                       // the editor's notes and open questions
  'canticlesOTNTlineNumbers.txt',  // an index of citations, not a canticle
]);

/** Absolute paths of the corpus files, in the order the collections are listed. */
export function corpusFiles(root = path.join(process.cwd(), 'vendor', 'psautier')) {
  const files = [];
  for (const collection of COLLECTIONS) {
    let names;
    try { names = fs.readdirSync(path.join(root, collection)).sort(); } catch { continue; }
    for (const name of names) {
      if (NOT_TEXT.has(name)) continue;
      // An editor's leavings: a `.OT 59.swp` was in the corpus for years.
      if (name.startsWith('.')) continue;
      // The typeset output of the plain file beside it.
      if (name.endsWith('.tex')) continue;
      const file = path.join(root, collection, name);
      if (!fs.statSync(file).isFile()) continue;
      files.push(file);
    }
  }
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(corpusFiles(process.argv[2]).join('\n') + '\n');
}
