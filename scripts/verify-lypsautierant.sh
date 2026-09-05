#!/usr/bin/env bash
#
# Prove that the generated lypsautierant TypeScript reproduces the upstream
# perl and sed exactly, over every psalm and canticle in the repo.
#
#   ./scripts/verify-lypsautierant.sh
#
# Two checks:
#
#   1. syllabify — lypsautierant-syllabify.ts vs `sed -f sedsyllables`
#   2. pointing  — lypsautierant-modes.ts vs each psautier/*/*.pm sub,
#                  run with accentMode.perlByteCompat so that the one
#                  deliberate divergence (see lypsautierant-modes.ts) does
#                  not mask an accidental one.
#
# Requires perl and sed. Both checks must report 0 differing lines.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSAUTIER="$ROOT/vendor/psautier"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ ! -d "$PSAUTIER" ]; then
  echo "FAIL: $PSAUTIER not found (see vendor/psautier/VENDORED.md)" >&2
  exit 1
fi

# ── Corpus: every text line of every psalm, minus each file's title line,
# ── which modes.pl also skips (it applies sedsyllables to lines 2..$).
# ──
# ── Which files count as text is `scripts/psalter-corpus.mjs`, shared with the
# ── syllable audit. A plain `"$d"/*` swept in the psalter book's own sed and
# ── perl tooling and the .tex output of the file beside it.
cd "$PSAUTIER"
node "$ROOT/scripts/psalter-corpus.mjs" "$PSAUTIER" > "$WORK/files.txt"
while IFS= read -r f; do
  [ -f "$f" ] || continue
  tail -n +2 "$f"
  echo
done < "$WORK/files.txt" > "$WORK/raw.txt"

RAW_LINES=$(wc -l < "$WORK/raw.txt")
echo "corpus: $RAW_LINES lines from $(wc -l < "$WORK/files.txt") files"

# ══════════════════════════════════════════════════════════════════════════
# 1. Syllabification
# ══════════════════════════════════════════════════════════════════════════
sed -f sedsyllables "$WORK/raw.txt" > "$WORK/syl_ref.txt"

cat > "$WORK/syldrive.mjs" <<JS
import fs from 'fs';
import { syllabifyLine } from '$ROOT/lib/psalm-tones/lypsautierant-syllabify.ts';
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n');
if (lines.length && lines[lines.length - 1] === '') lines.pop();
process.stdout.write(lines.map(syllabifyLine).join('\n') + '\n');
JS

node "$WORK/syldrive.mjs" "$WORK/raw.txt" > "$WORK/syl_ts.txt" 2>"$WORK/syl.err" || {
  echo "FAIL: syllabifier threw:" >&2; cat "$WORK/syl.err" >&2; exit 1;
}

# Lines holding a word whose sed rule we deliberately corrected (RULE_FIXES
# in the generator) are expected to differ; nothing else may.
diff "$WORK/syl_ref.txt" "$WORK/syl_ts.txt" > "$WORK/syl.diff" || true
SYL_EXPECTED=$(grep -c '^[<>].*sc[áa]ttered' "$WORK/syl.diff" || true)
SYL_DIFF=$(grep '^<' "$WORK/syl.diff" | grep -vc 'scsc[áa]ttered' || true)
if [ "$SYL_DIFF" -eq 0 ]; then
  echo "  syllabify: OK — identical to sed on all $RAW_LINES lines" \
       "($((SYL_EXPECTED / 2)) corrected 'scattered' lines aside)"
else
  echo "  syllabify: FAIL — $SYL_DIFF lines differ from sed unexpectedly" >&2
  grep '^<' "$WORK/syl.diff" | grep -v 'scsc[áa]ttered' | head -20 >&2
fi

# ══════════════════════════════════════════════════════════════════════════
# 2. Pointing rules
# ══════════════════════════════════════════════════════════════════════════

# Drives one psautier/<family>/<mode>.pm sub over stdin. modes.pl cannot be
# reused directly: it wraps everything in LaTeX and needs '.' on @INC, which
# perl dropped in 5.26.
cat > "$WORK/drive.pl" <<'PERL'
use strict; use warnings;
my ($fam, $mode, $sub) = @ARGV;
require "$fam/$mode.pm";
no strict 'refs';
my $fn = "modes::${mode}::${sub}";
while (my $line = <STDIN>) {
  chomp $line;
  if ($line =~ /^\s*$/) { print "\n"; next; }
  print &{$fn}($line), "\n";
}
PERL

cat > "$WORK/tsdrive.mjs" <<JS
import fs from 'fs';
import { applyMode, accentMode } from '$ROOT/lib/psalm-tones/lypsautierant-modes.ts';
accentMode.perlByteCompat = true;
const [family, mode, variation, file] = process.argv.slice(2);
const lines = fs.readFileSync(file, 'utf8').split('\n');
if (lines.length && lines[lines.length - 1] === '') lines.pop();
let out = '';
for (const line of lines) out += (line.trim() ? applyMode(family, mode, variation, line) : '') + '\n';
process.stdout.write(out);
JS

pass=0; fail=0; failed=()
for fam in modes english gregorian; do
  for m in one two three four five six seven eight peregrinus; do
    pm="$PSAUTIER/$fam/$m.pm"
    [ -e "$pm" ] || continue
    for sub in $(grep -o '^sub [a-z_0-9]*' "$pm" | sed 's/sub //'); do
      ( cd "$PSAUTIER" && perl -I. "$WORK/drive.pl" "$fam" "$m" "$sub" ) \
        < "$WORK/syl_ref.txt" > "$WORK/p.out" 2>/dev/null
      node "$WORK/tsdrive.mjs" "$fam" "$m" "$sub" "$WORK/syl_ref.txt" \
        > "$WORK/t.out" 2>"$WORK/t.err"
      if cmp -s "$WORK/p.out" "$WORK/t.out"; then
        pass=$((pass + 1))
      else
        fail=$((fail + 1)); failed+=("$fam/$m/$sub")
      fi
    done
  done
done

if [ "$fail" -eq 0 ]; then
  echo "  pointing:  OK — all $pass rules identical to perl on all $RAW_LINES lines"
else
  echo "  pointing:  FAIL — $fail of $((pass + fail)) rules differ from perl" >&2
  printf '    %s\n' "${failed[@]}" >&2
fi

# ══════════════════════════════════════════════════════════════════════════
# 3. Verse structure — which hemistich is a mediant, a termination, a flex
# ══════════════════════════════════════════════════════════════════════════
#
# modes.pl with its pointing calls replaced by the name of the rule it chose,
# so the role sequence can be compared without comparing the text.
#
# Only files with a real title line followed by a blank are compared. In the
# others modes.pl mistakes the first line of the psalm for a title AND leaves
# its $plines at 0, which disables flex detection for the whole first stanza;
# there is no rule to reproduce there, just an initialisation bug. Those
# files (43 of the 270, all in theAbbeyPsalmsAndCanticles) are skipped.
sed -e 's/^use Text::Unaccent::PurePerl.*$//' "$PSAUTIER/modes.pl" > "$WORK/roles.pl"
python3 - "$WORK/roles.pl" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p).read()
s = s.replace("""    $temp = eval qq~modes::~.$ARGV[2].qq~::flex(\\$line);~;
    print $temp.'\\\\\\\\*';$plines=2;}""", """    print "FLEX\\n";$plines=2;}""")
s = s.replace("""    $temp = eval qq~modes::~ . $ARGV[2]. qq~::first(\\$line);~;
    print $temp .'\\\\\\\\*';$reallines++;}""", """    print "FIRST\\n";$reallines++;}""")
s = s.replace("""    $temp = eval qq~modes::~ . $ARGV[2] . '::' . $ARGV[$alt] . qq~(\\$line);~;
    if($alt == 3){$alt=4;}else{$alt=3;}
    print $temp . '\\\\\\\\';$reallines++;}""", """    if($alt == 3){$alt=4;}else{$alt=3;}
    print "TERM\\n";$reallines++;}""")
s = s.replace("""   print $line.'\\\\\\\\!'."\\n";""", """   print "SEP\\n";""")
s = re.sub(r"^\s*print '\\\\(lilypondfile|begin\{flushleft\}|end\{verse\}).*\n", "", s, flags=re.M)
s = re.sub(r"^\s*print \"\\\\flagverse.*\n", "", s, flags=re.M)
i = s.find('my $line = "N')
if i > 0: s = s[:i]           # drop the hard-coded trailing doxology
open(p, 'w').write(s)
PY

cat > "$WORK/roledrive.mjs" <<JS
import fs from 'fs';
import { describeStructure } from '$ROOT/lib/psalm-tones/lypsautierant-engine.ts';
// modes.pl consumes the first line as the psalm's title.
const text = fs.readFileSync(process.argv[2], 'utf8').split('\n').slice(1).join('\n');
const out = [];
for (const st of describeStructure(text)) for (const h of st) {
  if (h.role === 'divider') continue;
  out.push(h.role === 'first' ? 'FIRST' : h.role === 'flex' ? 'FLEX' : 'TERM');
}
process.stdout.write(out.join('\n') + '\n');
JS

cat > "$WORK/tsresolve.mjs" <<'JS'
import { existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
export function resolve(spec, ctx, next) {
  if (spec.startsWith('.') && ctx.parentURL?.startsWith('file:') && !/\.[a-z]+$/.test(spec)) {
    const base = path.dirname(fileURLToPath(ctx.parentURL));
    for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
      const p = path.resolve(base, spec + ext);
      if (existsSync(p)) return next(pathToFileURL(p).href, ctx);
    }
  }
  return next(spec, ctx);
}
JS
cat > "$WORK/tsresolve-reg.mjs" <<JS
import { register } from 'module';
import { pathToFileURL } from 'url';
register('$WORK/tsresolve.mjs', pathToFileURL('$WORK/'));
JS

rpass=0; rfail=0; rskip=0; rfailed=()
while IFS= read -r f; do
  [ -f "$f" ] || continue
  # Skip files where modes.pl has no title line to consume (see above).
  if [ -n "$(sed -n '2p' "$f" | tr -d '[:space:]')" ]; then rskip=$((rskip+1)); continue; fi

  rel="${f#"$PSAUTIER"/}"
  esc=$(printf '%s' "$rel" | sed 's/ /\\ /g')
  ( cd "$PSAUTIER" && perl -I. "$WORK/roles.pl" "$esc" modes three a b ) 2>/dev/null \
    | grep -oE 'FIRST|TERM|FLEX' > "$WORK/pr.out"
  node --import "$WORK/tsresolve-reg.mjs" "$WORK/roledrive.mjs" "$f" 2>/dev/null > "$WORK/tr.out"
  if cmp -s "$WORK/pr.out" "$WORK/tr.out"; then
    rpass=$((rpass + 1))
  else
    rfail=$((rfail + 1)); rfailed+=("$rel")
  fi
done < "$WORK/files.txt"

if [ "$rfail" -eq 0 ]; then
  echo "  structure: OK — role sequence matches modes.pl on all $rpass psalms ($rskip skipped)"
else
  echo "  structure: FAIL — $rfail of $((rpass + rfail)) psalms have a different role sequence" >&2
  printf '    %s\n' "${rfailed[@]}" >&2
fi

if [ "$SYL_DIFF" -eq 0 ] && [ "$fail" -eq 0 ] && [ "$rfail" -eq 0 ]; then
  echo "PASS"
  exit 0
fi
echo "FAILED" >&2
exit 1
