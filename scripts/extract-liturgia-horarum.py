#!/usr/bin/env python3
"""Read the Liturgia Horarum typical edition into a page-indexed line corpus.

    python3 scripts/extract-liturgia-horarum.py

The book is `[Novus Ordo] Liturgia Horarum - Paul VI.pdf` at the repository
root: the Vatican 2010 Latin typical edition, all four tomes, 7114 pages,
digitised by Breviario Digitale in 2014. It is Libreria Editrice Vaticana's and
is not committed; neither is what this script writes. Both stay on disk, and
the app states the gap where they are absent rather than inventing text.

Output is `liturgia-horarum/pages.jsonl`, one JSON object per PDF page:

    {"pdf": 4052, "tome": 3, "page": 643,
     "crumb": ["Psalterium", "Hebd I", "Feria III", "Ad Horam mediam"],
     "lines": [{"top":…, "x0":…, "size":…, "red":…, "bold":…, "text":…}, …]}

Three things about this PDF have to be undone before any of it is text, and
each is done here by geometry rather than by guessing at wording.

**The navigation sidebar.** Every page carries a fixed column of tabs down its
right edge — SUMMARIUM, DE TEMPORE, … INDICES — above which sits a breadcrumb
naming the section, the week, the day and the hour, and below which sits the
printed page number and the tome. Read in reading order it interleaves into the
body, a line of it between every two lines of psalm. It sits in a constant
column: body text never reaches x1 = 850 and the sidebar never begins before
x0 = 887, so `BODY_X_MAX` separates them outright. Do not try to filter it by
wording — "Feria III" and "Ad Vesperas" are also things the office says.

**The versicle and response signs.** ℣ and ℞ are set as a red V or R with the
stroke drawn as a separate glyph in Zapfino, positioned some 40 points below
the letter it belongs to. In reading order the stroke lands on its own line, or
inside the line beneath. Each one is paired back to the nearest red V or R
above it and the pair becomes the single character it stands for.

**The thin space.** The space inside a guillemet quotation is a glyph the
font's ToUnicode maps to "i", so «i and i» come out of any plain text
extraction with an extra letter — and a word ending in i before a closing
guillemet gives no way to tell by spelling which i is which. It is set two
thirds the size of the text around it, which does.

The printed page number is what the book cross-references by — "HYMNUS, 115.",
"Psalmi et canticum de dominica hebd. I, 586." — and each tome is numbered from
its own page 1, so a reference resolves against (tome, page). The sidebar gives
both on every page, and within a tome the numbers run consecutively with no
gap, which `verify()` asserts.

Requires pdfplumber (`pip install pdfplumber`): the colour and the glyph sizes
are what make the three repairs above decidable, and no plain-text extractor
exposes either.
"""

import json
import os
import re
import sys
import unicodedata

try:
    import pdfplumber
except ImportError:  # pragma: no cover - a missing tool, not a code path
    sys.exit('pdfplumber is required: pip install pdfplumber')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = os.path.join(ROOT, '[Novus Ordo] Liturgia Horarum - Paul VI.pdf')
OUT_DIR = os.path.join(ROOT, 'liturgia-horarum')
PAGES = os.path.join(OUT_DIR, 'pages.jsonl')

# The navigation sidebar begins at x0 = 887.8 and body text ends at x1 = 849.8,
# measured over the whole book. Anything to the right of this is furniture.
BODY_X_MAX = 870.0

# Rubric red. The sidebar tabs are a darker (0.691, 0, 0) and are cropped away
# before this ever matters.
RED = (0.967, 0.197, 0.246)

# The fixed tabs, and the imprint under them. Everything else the sidebar says
# above the page number is the breadcrumb.
TABS = {
    'SUMMARIUM', 'DE TEMPORE', 'SOLLEMNITATES', 'ORDINARIUM', 'PSALTERIUM',
    'COMPLETORIUM', 'COMPLEMENTARIS', 'SANCTIS', 'COMMUNIA', 'DEFUNCTORUM',
    'APPENDIX', 'INDICES', 'Liturgia Horarum', '© Breviario Digitale', '2014',
}
ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4}


def is_red(char):
    colour = char.get('non_stroking_color')
    if not colour or len(colour) != 3:
        return False
    return all(abs(a - b) < 0.05 for a, b in zip(colour, RED))


def cluster_rows(chars, tolerance=6.0):
    """Group characters into lines by baseline.

    Not by `top`: a small capital, a versicle sign and a drop capital sit on
    the line's baseline at three different heights, and clustering by the top
    of the glyph box splits "LECTIO BREVIS" from the citation beside it.
    """
    rows = []
    for char in sorted(chars, key=lambda c: (c['bottom'], c['x0'])):
        if rows and abs(char['bottom'] - rows[-1][0]) <= tolerance:
            rows[-1][1].append(char)
        else:
            rows.append([char['bottom'], [char]])
    return rows


def versicle_signs(chars, strokes):
    """Pair each Zapfino stroke with the red V or R it is drawn beneath."""
    signs = set()
    for stroke in strokes:
        best, best_gap = None, 1e9
        for char in chars:
            if char['text'] not in ('V', 'R') or not is_red(char):
                continue
            gap = stroke['top'] - char['top']
            if not 10 < gap < 55 or abs(char['x0'] - stroke['x0']) > 20:
                continue
            if gap < best_gap:
                best, best_gap = char, gap
        if best is not None:
            signs.add(id(best))
    return signs


def render_row(chars, signs):
    """Put one line back together, spacing it by the gaps between glyphs.

    The font's own space characters are dropped and every space is inferred, so
    that the thin space of a guillemet quotation — which is not a space
    character at all — is spaced like one instead of printing as an "i".
    """
    body = max((c['size'] for c in chars), default=0)
    parts, previous = [], None
    for index, char in enumerate(chars):
        text = char['text']
        if text.isspace():
            continue
        if len(text) == 1 and unicodedata.combining(text):
            # An accent drawn as its own glyph belongs to the letter before it;
            # it has a width of nothing and must not open a space.
            parts.append(text)
            continue
        if id(char) in signs:
            text = '℣' if text == 'V' else '℞'
        elif text == 'i' and char['size'] < body * 0.85:
            neighbours = {chars[index - 1]['text'] if index else '',
                          chars[index + 1]['text'] if index + 1 < len(chars) else ''}
            if neighbours & {'«', '»'}:
                previous = char
                if parts and parts[-1] != ' ':
                    parts.append(' ')
                continue
        if previous is not None:
            gap = char['x0'] - previous['x1']
            if gap > previous['size'] * 2.2:
                parts.append('\t')     # a column break, not a word space
            elif gap > previous['size'] * 0.22 and (not parts or parts[-1] not in ' \t'):
                parts.append(' ')
        parts.append(text)
        previous = char
    return unicodedata.normalize('NFC', ''.join(parts)).strip()


def page_lines(page):
    chars = [c for c in page.chars
             if c['x0'] < BODY_X_MAX and 0 <= c['top'] < page.height]
    strokes = [c for c in chars if 'Zapfino' in c['fontname']]
    chars = [c for c in chars if 'Zapfino' not in c['fontname']]
    signs = versicle_signs(chars, strokes)

    lines = []
    for bottom, row in cluster_rows(chars):
        row.sort(key=lambda c: c['x0'])
        text = render_row(row, signs)
        if not text:
            continue
        lines.append({
            'top': round(row[0]['top'], 1),
            'bottom': round(bottom, 1),
            'x0': round(min(c['x0'] for c in row), 1),
            'x1': round(max(c['x1'] for c in row), 1),
            'size': round(max(c['size'] for c in row), 1),
            'red': sum(1 for c in row if is_red(c)) * 2 >= len(row),
            'bold': sum(1 for c in row if 'Bold' in c['fontname']) * 2 >= len(row),
            'text': text,
        })
    return lines


def page_sidebar(page):
    """The breadcrumb, the printed page number and the tome, off the sidebar."""
    chars = [c for c in page.chars if c['x0'] >= BODY_X_MAX and 0 <= c['top'] < page.height]
    crumb, printed, tome = [], None, None
    for _, row in cluster_rows(chars):
        row.sort(key=lambda c: c['x0'])
        text = unicodedata.normalize('NFC', ''.join(c['text'] for c in row)).strip()
        if not text:
            continue
        match = re.fullmatch(r'pag\.\s*(\d+)', text)
        if match:
            printed = int(match.group(1))
            continue
        match = re.fullmatch(r'tomo\s+(I|II|III|IV)', text)
        if match:
            tome = ROMAN[match.group(1)]
            continue
        if printed is None and text not in TABS:
            crumb.append(text)
    return crumb, printed, tome


def extract():
    os.makedirs(OUT_DIR, exist_ok=True)
    with pdfplumber.open(PDF) as pdf, open(PAGES, 'w', encoding='utf-8') as out:
        total = len(pdf.pages)
        for index, page in enumerate(pdf.pages):
            crumb, printed, tome = page_sidebar(page)
            record = {
                'pdf': index + 1,
                'tome': tome,
                'page': printed,
                'crumb': crumb,
                'lines': page_lines(page),
            }
            out.write(json.dumps(record, ensure_ascii=False) + '\n')
            page.flush_cache()
            if (index + 1) % 250 == 0:
                print(f'  {index + 1}/{total}', file=sys.stderr, flush=True)
    print(f'wrote {PAGES}', file=sys.stderr)


def verify():
    """The claims this corpus is read under, asserted over the whole book.

    The printed page numbers are the addresses every cross-reference in the
    book uses. If they are not consecutive within a tome, a reference resolves
    to the wrong page silently, so this is checked rather than assumed.
    """
    records = [json.loads(line) for line in open(PAGES, encoding='utf-8')]
    print(f'{len(records)} pages')

    unnumbered = [r['pdf'] for r in records if r['page'] is None or r['tome'] is None]
    print(f'  pages with no printed number: {len(unnumbered)} '
          f'({", ".join(map(str, unnumbered[:20]))})')

    breaks = 0
    for before, after in zip(records, records[1:]):
        if before['tome'] != after['tome'] or before['page'] is None or after['page'] is None:
            continue
        if after['page'] != before['page'] + 1:
            breaks += 1
            print(f'  ! printed pages jump {before["page"]} -> {after["page"]} '
                  f'at pdf {after["pdf"]}')
    print(f'  non-consecutive printed pages within a tome: {breaks}')

    for tome in (1, 2, 3, 4):
        pages = [r for r in records if r['tome'] == tome and r['page']]
        print(f'  tome {tome}: pdf {pages[0]["pdf"]}-{pages[-1]["pdf"]}, '
              f'printed {pages[0]["page"]}-{pages[-1]["page"]}')

    text = '\n'.join(l['text'] for r in records for l in r['lines'])
    for name, pattern in (('∫ left unpaired', r'∫'),
                          ('"i" left inside a quotation', r'«i|i»'),
                          ('℣', r'℣'), ('℞', r'℞')):
        print(f'  {name}: {len(re.findall(pattern, text))}')
    return breaks == 0


if __name__ == '__main__':
    if '--verify' not in sys.argv:
        extract()
    sys.exit(0 if verify() else 1)
