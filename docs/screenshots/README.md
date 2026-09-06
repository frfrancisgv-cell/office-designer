# Screenshots

The four images in the repository README. They are captured from the running
app, not mocked up, so they should be retaken whenever the editor's layout
changes noticeably.

How the current set was made, against `http://localhost:4001` with the app
running and Lauds of Saturday 5 September 2026 generated offline in Latin:

| File | What it shows |
|---|---|
| `editor.png` | the whole editor, PSALMODY expanded in the structure sidebar |
| `pointing.png` | the psalm toolbar under Psalm 8, with its antiphon above |
| `chant.png` | the GABC editor and database search on an antiphon |
| `pdf.png` | pages 1 and 7 of the LuaLaTeX output, side by side |

The first three are browser captures at 1680×1000, `deviceScaleFactor: 2`, with
`spellcheck` turned off on the contenteditable blocks (otherwise every Latin
word is underlined in red). The fourth comes from the real pipeline:

```bash
curl -s "http://localhost:4001/api/liturgy?date=2026-09-05&hour=lauds&lang=la" > liturgy.json
# wrap as {blocks, settings} and POST it
curl -s -X POST http://localhost:4001/api/pdf -H 'Content-Type: application/json' \
     --data @pdfbody.json -o office.pdf
pdftoppm -r 150 -f 1 -l 1 -png office.pdf hi && pdftoppm -r 150 -f 7 -l 7 -png office.pdf hi
montage hi-01.png hi-07.png -tile 2x1 -geometry +12+12 \
        -background '#e8e8e8' -bordercolor '#cccccc' -border 1 pdf.png
```

Run `optipng -o2 *.png` afterwards; it takes about a fifth off.
