# office-designer

A layout editor for printable booklets of the **sung Divine Office**.

Pick a date and an hour; the app assembles the office, matches Gregorian chant
scores to the antiphons, hymns and invitatory, points the psalms to a tone, and
typesets the whole thing through LuaLaTeX and GregorioTeX into a booklet you can
hand to a choir.

![The editor: settings on the left, the booklet page in the middle, the office's structure on the right](docs/screenshots/editor.png)

---

## What it does

- **Builds the office for a given day** — either scraped live from
  [iBreviary](https://www.ibreviary.com/), or generated **entirely offline**
  from the psalter, calendar and chant indexes in this repository.
- **Finds the chant.** Antiphons, hymns, invitatories and responsories are
  looked up by Ordo Cantus Officii reference in a local GregoBase extract of
  18,522 scores, and rendered as live notation in the browser (Exsurge) and as
  real GregorioTeX in the PDF. Anything it cannot find, you can search for by
  incipit or paste in as GABC.
- **Points the psalms.** Three independent pointing engines mark accents,
  preparatory syllables, flexes and mediants for a chosen tone — in Latin or
  English. The tone is inherited automatically from the mode of the antiphon
  that precedes the psalm.
- **Everything stays editable.** Every element of the office is a block: reword
  it in place, change what kind of block it is (heading → rubric → antiphon…),
  drag it into a new position, delete it, or break the page after it.
- **Exports** a half-letter or A5 booklet as a LuaLaTeX-rendered PDF, as the
  `.tex` source, or through the browser's own print dialog.

### Pointing a psalm

Select a psalm and its toolbar appears. The `♪ 1. g` chip is the tone taken
from the antiphon above it (mode 1, termination *g*); *Apply Tone* re-points the
text, and the second and third rows switch text source and pointing engine.

![A psalm block selected, showing the pointing toolbar](docs/screenshots/pointing.png)

#### Correcting the stresses, once

The *+/− stress aware* engines sing from acute accents, and the office texts
arrive without them: `accentuateEnglish` supplies them from the psalters' own
pointing and gets about 92% of words right. *Review word stresses* opens the
rest for correction — click a syllable to move the accent, click it again to
unaccent the word and let the cadence pass over it.

**Save these accents** keeps the correction, so it is made once:

- the corrected text is kept whole and matched by its own words, so the psalm
  comes back accented when it next comes round on the four-week cycle;
- a word whose accent was *moved* also teaches the word list, so the same word
  is accented right in psalms never opened. Unaccenting teaches it nothing —
  a cadence passing over "God" in one line says nothing about "God" elsewhere.

Both live in `data/accent-corrections.json`, in the repository: it is editorial
work, and belongs where it can be read and diffed. *Forget saved accents* drops
the text; the corrected words stay.

### Chant scores

Each antiphon carries its GABC source. Edit it in place, search the local
database by incipit, or upload an image as a fallback; the score below re-renders
as you type.

![The GABC editor and the chant database search on an antiphon block](docs/screenshots/chant.png)

### The PDF it produces

`Server PDF (LuaLaTeX)` renders the same document through GregorioTeX — real
square notation, EB Garamond, red rubrics, pointed psalm verses.

![Two pages of the rendered booklet: the invitatory, and psalmody with a pointed Psalm 104](docs/screenshots/pdf.png)

---

## Quick start

### Requirements

| Need | Why |
|---|---|
| **Node.js 22** | the scripts rely on Node's native TypeScript stripping |
| **`lualatex`** | TeX Live — `texlive-luatex` or `texlive-full` |
| **`gregorio`** + the **`gregoriotex`** LaTeX package | `texlive-music`, or from CTAN |
| `perl`, `sed` | `scripts/verify-lypsautierant.sh` only |

The two binary paths are hard-coded in [lib/latex/process.ts](lib/latex/process.ts)
as `/usr/bin/lualatex` and `/usr/local/bin/gregorio`. `GET /api/pdf` reports the
version of each, or the error if one is missing — check there first when an
export fails.

On Debian/Ubuntu:

```bash
sudo apt-get install texlive-luatex texlive-fonts-recommended \
     texlive-lang-latin texlive-music
```

### Install and run

```bash
git clone https://github.com/frfrancisgv-cell/office-designer.git
cd office-designer
npm install
npm run dev            # http://localhost:3000
```

Or under PM2, the way it runs in production — port 4001, see
[ecosystem.config.js](ecosystem.config.js):

```bash
npx next build && pm2 start ecosystem.config.js
```

No API keys, no accounts, no submodule step. The psalter text the app serves,
and the perl and sed the tests compare against, are vendored in
[vendor/psautier/](vendor/psautier/) — see
[vendor/psautier/VENDORED.md](vendor/psautier/VENDORED.md) for what is there and
why. See [.env.example](.env.example) for the two optional variables.

`lypsautierant/` is a submodule pointing at the same sources upstream, kept for
their full history, the LilyPond scores, the fonts and the psalter-book build
machinery. The app never reads it, so clone it only if you need those:
`git submodule update --init`.

---

## Using it

1. **Choose the day.** Date, hour (Matins through Compline) and language in the
   left sidebar. Offline generation does not accept Matins yet — see
   [Status](#status).
2. **Fill the booklet.** *Grab from iBreviary* scrapes the day's office —
   English, Latin, Italian, French or Spanish — and enriches it with chant. Or
   *Generate Office (Offline)* builds it from local data with no network at all.
   Where iBreviary offers alternatives for the day, an **Occasion** dropdown
   appears; changing it re-fetches.
3. **Set the page.** Paper size (Half Letter and A5 are the booklet sizes),
   line spacing, base font size, EB Garamond or Inter.
4. **Edit.** Click any block to edit its text in place. The right sidebar is the
   document outline: click to jump, drag to reorder, change a block's type from
   its dropdown, collapse a whole section, or move and delete a section at once.
   *+ Text*, *+ Rubric* and *+ Break* insert after the selected block.
5. **Point the psalms.** Select a psalm: choose a tone and termination, tick
   *solemn* for a solemn mediant, and press *Apply Tone*. `Lypsautierant (EN)`
   and `✝ Latin (jgabc)` swap in a different text for the same psalm;
   `♩ Lypsautierant` points with the psautier rules instead; *Finale 1/2/3* is
   the naive client-side fallback.
6. **Fix the chant.** On an antiphon or hymn, edit the GABC directly, search the
   database by Latin incipit, or upload an image if no score exists.
7. **Export.** *Server PDF (LuaLaTeX)* for the real thing, *Download .tex
   source* to typeset it yourself, *Print / Export PDF* for the browser's own
   rendering. A failed LaTeX run shows the log inline.

---

## Where the texts and the chant come from

Two independent paths produce the same kind of `Block[]` document:

| | **iBreviary** (`/api/ibreviary`) | **Offline** (`/api/liturgy`) |
|---|---|---|
| Needs network | yes | no |
| Text | scraped from iBreviary, five languages | local psalters and Latin books |
| Calendar | iBreviary's own | [romcal](https://github.com/romcal/romcal), US calendar |
| Psalm assignment | as published | Ordo Cantus Officii + the four-week psalter schema |
| Chant | OCO-referenced GregoBase lookup | the same lookup |
| Best at | any day, any language | **Latin** — see [Status](#status) |

The data on disk:

| Path | What |
|---|---|
| `IDX_ANT.csv` | 2,813 antiphons indexed by OCO occasion code |
| `IDX_INV.csv`, `IDX_RB.csv` | invitatory antiphons (78) and responsories (210) |
| `OCO/` | the Ordo Cantus Officii itself, plus the hymn index (353 hymns) |
| `gregobase-cache.json` | 18,522 GABC scores, extracted from `gregobase_online.sql` |
| `jgabc-psalms/` | Latin psalm texts (Nova Vulgata) |
| `vendor/psautier/` | the Revised Grail Psalter and the Abbey Psalms and Canticles, and the perl/sed pointing rules |
| `lib/liturgy/data/` | the four-week psalter schema and the hymn table |
| `data/accent-corrections.json` | psalm stresses corrected by hand in the editor, kept |

### The three pointing engines

They coexist deliberately, and are chosen per block in the UI:

- **`psalm-tone-engine.ts`** — GABC-driven. Counts accents and preparatory
  syllables in a tone's GABC string and marks the text to match. Serves
  `/api/psalm-tone` (*Apply Tone*). The tone catalogue in `tone-data.ts` covers
  tones 1–8 with their terminations and solemn mediants, *tonus peregrinus*,
  *in directum*, the monastic and *antiquo* variants, the introit tones and the
  versicle tones.
- **`lypsautierant-engine.ts`** — a TypeScript port of the perl and sed rules
  under `vendor/psautier/`. Serves `/api/lypsautierant`. Verified line-for-line
  against the perl original on every psalm in the corpus.
- **`components/psalm-utils.ts`** (`autoPointPsalm`) — a naive client-side
  fallback, reached only through the explicit Finale 1/2/3 buttons.

---

## HTTP API

| Route | Purpose |
|---|---|
| `GET /api/ibreviary?date&hour&lang[&occasionOverride]` | scrape and enrich a day's office |
| `GET /api/liturgy?date&hour&lang[&collection][&psalterWeek]` | build the same office offline |
| `GET /api/ibreviary/gabc-search?q&type` | search the chant database by incipit |
| `GET /api/psalm-text?psalm=N` (or `ot=N`, `nt=N`) | one psalm or canticle, Latin or English |
| `POST /api/psalm-tone` | point text to a tone (`{action:'point', text, tone, variant, lang, solemn}`) |
| `POST /api/lypsautierant` | point text with the psautier rules (`{action:'point', text, family, mode, variation}`); `{action:'variations', family, mode}` lists one mode's endings and `{action:'catalogue'}` the whole family/mode/ending tree |
| `GET /api/chanted-ordinary` | the GABC for the sung introduction, Pater noster and dismissal, by gregobase id |
| `GET /api/sunday-collect?date&hour` | the week's Sunday collect for a ferial weekday of Ordinary Time |
| `POST /api/pdf` | `{blocks, settings}` → PDF; `?format=tex` returns the source bundle |
| `GET /api/pdf` | dependency check: `lualatex` and `gregorio` versions |
| `GET /api/accents` · `POST /api/accents` | the saved accent corrections; `{action:'save', accents, label?}` keeps a corrected psalm and learns its moved accents, `{action:'forget', text}` drops one |
| `POST /api/share` · `GET /api/share?id=` | store a document under `/tmp/office-shares`, 30-day expiry, readable at `/share/<id>` (not yet wired into the editor) |

---

## Project layout

| Path | What |
|---|---|
| `app/` | Next.js app router; the editor page and every API route |
| `components/` | the editor UI — `office-editor.tsx` is the root, `BlockEditor.tsx` one block |
| `hooks/` | document state (`useOfficeBlocks`), pointing (`useBlockPointing`), saved accents (`useAccentCorrections`) |
| `lib/latex/` | `renderer.ts` builds the .tex; `process.ts` runs gregorio and lualatex |
| `lib/psalm-tones/` | the three pointing engines and the tone catalogue |
| `lib/liturgy/` | offline office construction, for `/api/liturgy` |
| `app/api/ibreviary/` | the scraper, and the OCO → GregoBase chant lookup |
| `scripts/` | data generation, the verifiers, the test resolver hook |
| `docs/screenshots/` | the images in this README |

[Guide.md](Guide.md) is the engineering guide to the iBreviary scraper and the
OCO alignment — read it before touching `app/api/ibreviary/`.

---

## Development

```bash
npm run dev                          # next dev
npm run build                        # next build
npm run lint                         # eslint .
npm test                             # unit + lypsautierant + latin syllabification
npm run test:unit                    # just the unit tests (~1s)
npm run test:lyps                    # just verify-lypsautierant.sh (~1 min)
npm run test:latin                   # just verify-latin-syllabify.mjs
npm run check:hymns                  # cross-check OCO/INDEX_HYM2.{json,tex}
node scripts/gen-lypsautierant.mjs   # regenerate lypsautierant-{syllabify,modes}.ts
node scripts/build-gabc-cache.mjs    # rebuild gregobase-cache.json from the .sql
```

**Both `lypsautierant-syllabify.ts` and `lypsautierant-modes.ts` are generated**
— edit `scripts/gen-lypsautierant.mjs` instead.

### Tests

`npm test` runs all three suites, and all three must pass.

`verify-lypsautierant.sh` is the heavy one: it runs every psalm in the corpus
(11,823 lines, 259 files) through both the perl original and the TypeScript port
and requires them to agree, line for line. It must pass before any change to
`lib/psalm-tones/lypsautierant-*.ts` lands.

The unit tests are `lib/**/*.test.ts` and `app/**/*.test.ts`, run by
`node --test`. Node 22 strips the types natively, so there is no build step and
no test framework to install; `scripts/ts-resolve.mjs` (installed by
`scripts/test-register.mjs`) supplies the two things plain Node does not know —
extensionless imports and the `@/*` alias — which Next.js otherwise provides at
build time.

They cover the places where a silent wrong answer is expensive and easy to make:
`escLtx` (an unescaped character kills the whole PDF), `hebrewToVulgate` (a wrong
number reads the wrong psalm, or none), and `stripPointing` (a bad strip corrupts
the text the user is editing, and compounds on every re-point). Import a module
from a test and it must be importable outside Next, which is why `lib/` imports
types with `import type`.

---

## Status

The app is used in earnest for Latin booklets; the English side is limited by
what is publishable, not by what is coded.

- **Offline Latin** — Lauds, Vespers, Compline and the minor hours come out
  whole: psalms, canticles, antiphons, hymns, invitatory and collect, all with
  chant. This is the part the app is best at, and the part no transition to a
  new English edition can disturb.
- **Offline English** — the psalms and canticles are complete and accented, but
  the antiphons and hymns still come out as placeholders (`Ant. 1: Psalm 110`,
  `III p. @ordinaryTime:thirdHymn`). The English propers of the second-edition
  *Liturgy of the Hours* are not published in a form this repository can carry.
  Use iBreviary for English until they are.
- **Office of Readings, offline** — the psalmody is assembled, but the two
  readings and their responsories are emitted as bracketed placeholders, and the
  psalm selection does not yet follow the day.
- **Known bug** — the left sidebar's *Matins / Readings* option sends
  `hour=matins`, which `/api/liturgy` rejects (`unsupported hour: matins`); the
  hour it accepts is `readings`. Offline Matins therefore errors from the UI
  today. iBreviary handles that hour fine.
- **Not built, deliberately** — psalm prayers and intercessions.
- **Sharing** exists as an API and a read-only page but has no button in the
  editor yet.

## Sources and their terms

The code here is one thing; the books it reads are another. The chant comes from
[GregoBase](https://gregobase.selapa.net/), the Latin psalms from the Nova
Vulgata, the English from the Revised Grail Psalter and the Abbey Psalms and
Canticles by way of
[lypsautierant](https://github.com/frfrancisgv-cell/lypsautierant), and the
antiphon assignments from the Ordo Cantus Officii. The rights in those texts
belong to their publishers, and the *Liturgia Horarum* typical edition is
deliberately **not** in this repository for that reason — it is read locally by
the extraction scripts and excluded in [.gitignore](.gitignore). Check the terms
before redistributing anything you generate.

### Psalm Tone Creator

Select a psalm, then open **Pointing → Psalm Tone Creator**. Choose **New tone
from this psalm** to prepare syllable models for the mediant, ending, and flex.
Edit each cadence before saving the tone.

- **Lypsautierant + − =** places marks under individual syllables. A mark is
  not a note: it is a sign telling the singer to leave the reciting note, so
  the elastic part of a hemistich is exactly the part that carries *no* mark.
  A rule in `psautier/{english,gregorian}` is one or more **figures** — runs
  of adjacent marks — each hung on one accent, with everything else left bare.
  Choose what the cadence follows under **Cadence measured from**: the last
  syllable of the line, or its accents. Under *accents* the editor groups
  adjacent marks into figures and hangs each on the accent it covers, counting
  accents back from the end of the line; **Counted from** in the inspector
  moves a whole figure to a different accent when the reading needs correcting.
  The anchor is read off the model line rather than picked by hand, so the
  marks you draw and the marks the engine lays down are in the same places.

  Bare syllables are where a verse stretches, and they are shown greyed: the
  bare opening is the recitation, and a bare gap *between* two figures is not
  counted at all. That gap is what a one-anchor reading could not express — the
  mediant of English 1, 6 and 7 and Gregorian 1, 3 and 7 points `+ −` on the
  second-to-last accent and `− +` on the last, with however many unaccented
  syllables the line happens to have between them, and counting through that
  stretch dragged the opening figure off its accent on every line spaced
  differently from the model. The one further exception the corpus has is a
  mark on the *first* syllable of a hemistich, which English 2′, 5′ and 8″ use;
  select the opening syllable and set **Counted from → The opening syllable**
  to pin one there. These rules execute through the existing
  TypeScript Lypsautierant port; the Creator does not require or invoke an
  external `perl/model.pl`.

  A model line has room for the whole cadence, and half the psalter has not:
  an accent can stand so near the end that a figure runs off it, or the figure
  after it can already hold the syllables it needs. What happens then cannot be
  drawn on a line that never meets the difficulty, so it is said — select a
  marked syllable and set **With no room for it** for that whole figure:

  | | |
  | --- | --- |
  | **Step back** | hang it on the accent before, and keep stepping back until it fits — the mediant of English and Gregorian 1, 6 and 7 puts `+ −` on the *third*-to-last accent when the second-to-last has no room |
  | **Slide** | keep the figure whole and move it towards the start of the line until every mark has a syllable of its own |
  | **Pass back** | keep the marks that fit, from the accent onwards, and give the rest to the figure before |
  | **Fold** | write a mark with no spare syllable onto the one the figure last wrote on, the two as a pair mark — `+ −` squeezed against the figure after it becomes `+−` on its accent alone, and Gregorian 1 a's `+ +` becomes `++` where the accent *is* the last syllable |
  | **Trim** | write the marks that fit and let the rest fall off |
  | **Leave out** | leave the figure off any line with no room for it |

  *Pass back* is how the two-figure mediants finish a line whose last accent is
  also its last syllable: `− +` sings only its `+` there and hands the `−` back,
  so `+ −` on the accent before becomes `+ − −`. A passed mark rides at the end
  of the run that took it in — counting as that figure's own from then on — but
  only while the run stays put: a figure that steps back, slides, or is left off
  the line leaves the mark behind on the accent it vacated, which is exactly what
  `english/one/first` does, marking a bare `−` on the second-to-last accent and
  taking its own `+ −` back to the third.

  The rules combine per figure, so a cadence can be squeezed rather than moved:
  *Fold* on `+ −` with *Slide* on `− +` points “I will bléss you áll my lífe;”
  as `bléss you +−áll −my +lífe;`, the opening figure written whole on its own
  accent because the line has no spare syllable to carry its second mark.

  A figure whose accent the line does not have at all — one accent where the
  model had two — is always dropped whole, rather than slid onto a neighbouring
  accent and pointing the line with a figure the tone puts nowhere near it.
- **jgabc chant notation** lets you click a four-line staff (or use arrow keys)
  to choose a pitch above each syllable. The note field also accepts multiple
  pitches, a–m, for a neume. Choose reciting, fixed, and accent roles to distinguish
  the tenor from the cadence. Repeated recitation collapses into an open note;
  an open note after each accent allows the formula to accommodate different
  numbers of unstressed syllables.

  Which note those extra syllables are *held on* is a choice the tone makes,
  and the model line usually cannot show it — a line with no spare syllable
  after the accent sings the same whichever note is chosen. So it is named
  rather than drawn: select an accent and set **Held on**, and the note appears
  faint on the staff at the edge of that accent's column. It defaults to the
  note the accent moves on to. Leaving it at the default made a tone whose
  extras belong on the accent's own note sing that next pitch twice — `'f gr g`
  where the tone wants `'f fr g` — so "to behold your strength and your glory"
  came out with the g doubled. Reading an existing tone in keeps whatever note
  its formula holds them on.
- **Conditional stress** is selected under **Tone library → Or start from a
  tone the app sings → Engine**; choose its English phrase-stress family and
  Tone 1, then copy it into the editor. It assigns actual notes only after reading the phrase's
  stresses and the number of syllables between them. Its initial Tone 1 rule
  is the supplied A/B-flat/G mediation and G/F/D ending: edit the reciting,
  previous-stress, return, passing, preparation, and final pitches directly as
  GABC notes. With one intervening syllable the previous-stress and return
  notes form one neume; the two-syllable and longer branches are chosen by the
  engine. A long gap may receive a proposed minor stress, and every such choice
  is named above the whole-psalm preview for review. No missing Tone 2, 3, 7,
  or 8 melody is inferred. Conditional rules currently support English only.

The formula box updates immediately and the whole-psalm preview follows each
edit. **Save tone** keeps the named examples in `data/created-tones.json`;
**Saved tones** makes them available on every other psalm. **Use on this psalm**
applies the preview and embeds the tone definition in the office so it travels
with saved/shared offices. Saving a tone alone does not change the psalm.

Copying a built-in psautier tone tries every half-line of the model psalm as
the model, under both anchors and with or without the opening mark pinned, then
fits each figure with the short-line rule that suits it, and keeps the reading
that follows the rule over the most of the psalm — a rule's shape is only as
visible as the line it is read off, and a line whose accents fall close
together hides a two-figure cadence entirely. It says so when the copy and the
tone part company. Across every psautier tone copied onto Psalm 63, the copy
points 98% of half-lines exactly as the tone itself does, against 87% with the
figures alone and 61% before them; the mediant of English 1, 6 and 7 — the rule
that drove this — now comes across exactly, on every half-line. What is left is
mostly `gregorian/three`, whose terminations write a rule (`\rule{2ex}{.5pt}`,
a dash in the margin) that has no mark to stand for it. Inference otherwise
follows the explicit roles and anchors in the model; it does not infer all
possible exceptional cadences from a single verse.
The three notation modes retain their own marks, pitches, and conditional rule:
plus/minus pointing alone cannot determine an absolute chant melody. English
stress comes from the existing accentuation system; correct the psalm's accents
before preparing a model when necessary.
