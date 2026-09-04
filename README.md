# office-designer

A layout editor for printable booklets of the sung Divine Office. It pulls an
hour's text from iBreviary, matches Gregorian chant scores to the antiphons and
hymns, points the psalms to a tone, and exports a typeset PDF through lualatex
and gregoriotex.

Runs at http://localhost:4001 under PM2 (`ecosystem.config.js`).

## Requirements

- Node.js 22 (the scripts rely on Node's native TypeScript stripping)
- `lualatex` — TeX Live, `texlive-luatex` or `texlive-full`
- `gregorio` and the `gregoriotex` LaTeX package — `texlive-music` or CTAN.
  The paths are hard-coded in `lib/latex/process.ts` as `/usr/bin/lualatex`
  and `/usr/local/bin/gregorio`.
- `perl` and `sed`, for `scripts/verify-lypsautierant.sh` only.

`GET /api/pdf` reports the versions of both binaries, or the error if either
is missing.

## Setup

```bash
git clone <this repo>
npm install
npm run dev          # or: npx next build && pm2 start ecosystem.config.js
```

No submodule step is needed. The psalter text the app serves and the perl and
sed the tests compare against are vendored in `vendor/psautier/` — see
`vendor/psautier/VENDORED.md` for what is there and why.

`lypsautierant/` is a submodule pointing at the same sources upstream, kept for
their full history, the LilyPond scores, the fonts and the psalter-book build
machinery. The app never reads it, so clone it only if you need those:
`git submodule update --init`.

No API keys are needed. See `.env.example` for the two optional variables.

## Layout

| Path | What |
|---|---|
| `app/` | Next.js app router; the editor page and every API route |
| `components/` | The editor UI — `office-editor.tsx` is the root, `BlockEditor.tsx` one block |
| `hooks/` | Document state (`useOfficeBlocks`) and pointing (`useBlockPointing`) |
| `lib/latex/` | `renderer.ts` builds the .tex; `process.ts` runs gregorio and lualatex |
| `lib/psalm-tones/` | The three pointing engines (see below) |
| `lib/liturgy/` | Offline office construction, for `/api/liturgy` |
| `OCO/`, `IDX_*.csv` | Antiphon, invitatory, responsory and hymn indexes |
| `gregobase-cache.json` | GABC scores extracted from `gregobase_online.sql` |
| `jgabc-psalms/` | Latin psalm texts |

### Three pointing engines

They coexist deliberately and are chosen per block in the UI:

- **`psalm-tone-engine.ts`** — GABC-driven. Counts accents and preparatory
  syllables in a tone's GABC string and marks the text to match. Serves
  `/api/psalm-tone` ("Apply Tone").
- **`lypsautierant-engine.ts`** — a TypeScript port of the perl and sed rules
  under `lypsautierant/psautier/`. Serves `/api/lypsautierant`.
- **`components/psalm-utils.ts`** (`autoPointPsalm`) — a naive client-side
  fallback, reached only through the explicit Finale 1/2/3 buttons.

## Scripts

```bash
npm run dev                          # next dev
npm run build                        # next build
npm run lint                         # eslint .
npm test                             # unit tests + verify-lypsautierant.sh
npm run test:unit                    # just the unit tests (~0.5s)
npm run test:lyps                    # just verify-lypsautierant.sh (~1 min)
npm run check:hymns                  # cross-check OCO/INDEX_HYM2.{json,tex}
node scripts/gen-lypsautierant.mjs   # regenerate lypsautierant-{syllabify,modes}.ts
node scripts/build-gabc-cache.mjs    # rebuild gregobase-cache.json from the .sql
```

### Tests

`npm test` runs both halves.

`verify-lypsautierant.sh` is the heavier one: it runs every psalm in the
corpus through both the perl original and the TypeScript port and requires
them to agree, line for line. It must print `PASS` before any change to
`lib/psalm-tones/lypsautierant-*.ts` lands.

The unit tests are `lib/**/*.test.ts`, run by `node --test`. Node 22 strips
the types natively, so there is no build step and no test framework to
install; `scripts/ts-resolve.mjs` supplies the two things plain Node does not
know — extensionless imports and the `@/*` alias — which Next.js otherwise
provides at build time.

They cover the places where a silent wrong answer is expensive and a wrong
answer is easy to make: `escLtx` (an unescaped character kills the whole
PDF), `hebrewToVulgate` (a wrong number reads the wrong psalm, or none), and
`stripPointing` (a bad strip corrupts the text the user is editing, and
compounds on every re-point). Import a module from a test and it must be
importable outside Next, which is why `lib/` imports types with
`import type`.

Both `lypsautierant-syllabify.ts` and `lypsautierant-modes.ts` are **generated**
— edit `scripts/gen-lypsautierant.mjs` instead.
