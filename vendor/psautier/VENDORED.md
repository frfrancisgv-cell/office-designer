# vendor/psautier — vendored, do not edit here

Copied from the `psautier/` directory of
<https://github.com/frfrancisgv-cell/lypsautierant> (which is also checked out
as the `lypsautierant/` submodule, and is itself a continuation of
`ftherese/lypsautierant`).

## Why a copy exists

`lib/psalm-tones/psalm-index.ts` serves the English psalm text from
`revisedGrailPsalter/` and `theAbbeyPsalmsAndCanticles/` **at runtime**, so a
clone that skipped `--recurse-submodules` would boot with no English psalter at
all. Vendoring the subtree the app needs makes the submodule optional: it is
kept for full history, the LilyPond sources, the fonts and the psalter-book
build machinery, none of which office-designer touches.

## What is here, and who reads it

| Path | Reader |
|---|---|
| `revisedGrailPsalter/`, `theAbbeyPsalmsAndCanticles/` | `lib/psalm-tones/psalm-index.ts` at runtime, plus both checks in `scripts/verify-lypsautierant.sh` |
| `commons/`, `seasons/`, `sanctoral/` | the verification corpus only |
| `modes/`, `english/`, `gregorian/`, `french/` (`*.pm`) | `scripts/gen-lypsautierant.mjs`, and the perl side of the verifier |
| `sedsyllables` | `scripts/gen-lypsautierant.mjs` |
| `modes.pl` | `scripts/verify-lypsautierant.sh` check 3, for the role sequence |
| `psalter.sty` | reference only — `lib/latex/renderer.ts` mirrors its mark set |

## Changing any of it

Edit it in the `lypsautierant` repo, commit and push there, then re-copy into
this directory and bump the submodule gitlink in the same commit. Editing only
this copy makes the two silently disagree, and
`scripts/verify-lypsautierant.sh` compares the generated TypeScript against
**this** copy's perl and sed — so a divergence here is a divergence in what the
tests prove.
