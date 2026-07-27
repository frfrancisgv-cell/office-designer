# Implementation Guide: iBreviary Scraper & OCO Alignment Optimization

This engineering guide provides the structural context, logical fixes, and implementation details for the optimized liturgical office scraper architecture. All modifications outlined below have been successfully implemented in `route.ts` and `gabc-lookup.ts` to cleanly support Lauds, Minor Hours, and resilient Liber Hymnarius (Source 15) hymn matching.

---

## Architectural Context

The application executes a Next.js API route (`route.ts`) that programmatically logs into iBreviary's mobile portal via custom session cookies, downloads both English and Latin layouts for a specific liturgical day, flattens the DOM structure into normalized content tokens (`blocks`), and enriches them with authoritative Gregorian chant scores via `gabc-lookup.ts` using Ordo Cantus Officii (OCO) references.

### Multi-Language Fetch Strategy

The route issues up to **three concurrent HTTP requests** per API call, each with its own PHP session cookie:

| Request | Language | Cookie | Purpose |
|---|---|---|---|
| `mainMenuUrl` | **Always English** | `enFetchHeaders` | Extracts the liturgical date string for `deriveContext()`. The OCO occasion-code regexes only understand English phrase patterns (e.g. *"week in ordinary time"*). |
| `ibreviaryUrl` | **User's language** | `fetchHeaders` | The primary scrape — provides the display text for all `Block` content. |
| `ibreviaryUrl` | **Always Latin** | `laFetchHeaders` | Reference scrape — provides Latin antiphon/hymn incipits for the text-match fallback in `extractLatinItems()`. |

> **Why a separate English session?** iBreviary's PHP sets language on the server session via `opzioni.php`. If the user selects Latin or Italian, the user-language cookie returns non-English text for the menu, breaking the `deriveContext()` regex parsing. A fresh English session is always created when `lang ≠ 'en'` to guarantee reliable OCO code derivation.

### Multi-Language Heading Detection

The primary scrape may be in Italian or Latin. The section-heading parser (`class="capolettera_piccolo"`) maps iBreviary's Italian/Latin heading names to internal section constants:

| iBreviary Text | Internal `currentSection` |
|---|---|
| HYMN / INNO / HYMNUS | `'HYMN'` |
| RESPONSORY / RESPONSORIO | `'RESPONSORY'` |
| INVITATORY / INVITATORIO | `'INVITATORY'` |
| READING / LETTURA / LECTIO | `'READING'` |
| INTERCESSIONS / INTERCESSIONI / PRECES | `'INTERCESSIONS'` |
| CANTICLE / CANTICO / BENEDICTUS / MAGNIFICAT | `'CANTICLE'` |
| PSALMODY / SALMODIA | `'PSALMODY'` |

---

## Phase 1: Normalizing Lauds & Minor Hours (`route.ts`) - **[✓ IMPLEMENTED]**

### 1. Stateful Antiphon Tracker

* **The Problem:** iBreviary explicitly labels an antiphon before a psalm (e.g., `Ant. 1`), but drops the digit during its repetition after the psalm (e.g., `Ant.`). Blind sequential indexing (`ocoIdx++`) causing layout assignment shifts whenever an unexpected antiphon configuration or an Invitatory appears.


* **The Implementation:** Maintain a persistent variable `currentAntNum` inside the scraper loop to memorize the current structural position, and map it directly to the block metadata.

```typescript
// Inside GET route loop: Initialize parsing states
let currentSection = 'NONE';
let currentAntNum = 0; 
let nextIsPsalmPrayer = false;

// Within the child-element parsing loop:
} else if (part.includes('class="rubrica"') || rawText.toLowerCase().startsWith('ant.')) {
  const digitMatch = rawText.match(/^Ant\.?\s*(\d+)/i);
  if (digitMatch) {
    currentAntNum = parseInt(digitMatch[1], 10);
  }

  const antText = rawText.replace(/^Ant\.?\s*\d*\.?\s*/i, '').trim();
  
  parsedBlocks.push({ 
    id: generateId(), 
    type: 'antiphon', 
    content: antText || rawText,
    place: currentAntNum > 0 ? currentAntNum.toString() : null // Transmit metadata
  });
}

```

### 2. Header Extraction & Injection Anchors

* **The Problem:** The short responsory injection logic looks specifically for a heading containing `"GOSPEL CANTICLE"`. Lauds skips this explicit phrasing and names its heading `"BENEDICTUS"` or `"CANTICLE OF ZECHARIAH"`, returning an index of `-1` and failing to assign the correct score.


* **The Implementation:** Update the section splitting array and the subsequent index search to intercept both variants.

```typescript
// 1. Expand Section Splitting Array
const sectionKeywords = [
  'READING', 'RESPONSORY', 'PSALMODY', 'HYMN', 
  'GOSPEL CANTICLE', 'BENEDICTUS', 'MAGNIFICAT', 
  'INTERCESSIONS', 'INTRODUCTION'
];

// 2. Expand Injection Lookup Target
const gcIdx = enrichedBlocks.findIndex(b =>
  (b.type === 'heading') && (
    b.content.toUpperCase().includes('GOSPEL CANTICLE') ||
    b.content.toUpperCase().includes('BENEDICTUS') ||
    b.content.toUpperCase().includes('MAGNIFICAT')
  )
);

```

### 3. Old Testament Canticle Recognition

* **The Problem:** The regex defining `isPsalmIntro` checks primarily for New Testament Epistles and Canticles, causing Old Testament scriptural source attributions unique to Lauds (Isaiah, Daniel, Habakkuk) to be miscategorized as standard psalm text lines.

```typescript
const isPsalmIntro = /^(Psalm |Canticle[: ]|God [a-z]|Christ [a-z]|The soul |Mary,?\s|Luke |Col |Eph |Phil |Rev |Ap|Dan|Is|Jer|Hab|Ez|Ex|Deut|Sam|Chr|Tob|Jud|Wis|Sir|I{1,3}V?\s*$|IV\s*$|\d+:\d)/i.test(finalText)
  || (finalText.length < 80 && /^[A-Z][a-z]+ \d|^\d+[,.]\d/.test(finalText));
```

---

## Phase 2: Core Data Alignment Synchronization (`gabc-lookup.ts`) - **[✓ IMPLEMENTED]**

### 1. Synchronized Latin Deduplication

* **The Problem:** `route.ts` correctly filters consecutive or duplicate antiphon blocks to keep the frontend tidy. However, `extractLatinItems` in `gabc-lookup.ts` does not execute this deduplication. This means the mapped `latinAnts` string array drifts out of a 1:1 index alignment with the parsed English content blocks.


* **The Implementation:** Re-architect the utility loop to check against internal array history before adding items.

```typescript
function extractLatinItems(html: string) {
  const $ = cheerio.load(html);
  const ants: string[] = [], hyms: string[] = [];
  let stop = false;

  $('#contenuto .inner').children().each((_, el) => {
    if (stop) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag === 'h1' || tag === 'h2') return;
    const raw = $(el).html() || '';
    
    for (const part of raw.split(/<br\s*\/?>(?:\s*<br\s*\/?>)*/gi)) {
      const text = cheerio.load(part).text().trim();
      if (text.includes('*****') || text.includes('DONATE')) { stop = true; break; }
      
      if (part.includes('class="rubrica"') || /^Ant\.?\s*\d*/i.test(text)) {
        const normalizedAnt = normalize(text.replace(/^Ant\.?\s*\d*\.?\s*/i,'').replace(/[*†]/g,'').trim());
        
        // Block tracking index array drift
        const isDupe = ants.some(prev => prev.slice(0, 50) === normalizedAnt.slice(0, 50));
        if (!isDupe && normalizedAnt) {
          ants.push(normalizedAnt);
        }
      }
      if (part.includes('class="capolettera_piccolo"') || part.includes('class="hymn"') || /^Hy(mnus)?\.?\s/i.test(text))
        hyms.push(normalize(text.replace(/^Hy(mnus)?\.?\s*/i,'').split(/[\n\r]/)[0].trim()));
    }
  });
  return { ants, hyms };
}
```

### 2. Explicit Antiphon Position Association

* **The Problem:** Instead of matching the structural step tags (`"1"`, `"2"`, `"3"`), `populateGabc` relies on blind indexing pointers (`ocoIdx++`), causing assignments to cascade incorrectly if an error occurs.


* **The Implementation:** Use the structural `place` label to execute precise row-matching.

```typescript
// Inside populateGabc block loop mapping psalm antiphons
if (ocoAntiphons && !isLastAnt) {
  const candidate = block.place 
    ? ocoAntiphons.find(c => c.place === block.place)
    : ocoAntiphons[ocoIdx++]; // Fallback index tracking if iBreviary labels are absent

  if (candidate) {
    antIdx++;
    return { ...block, gabcScore: candidate.gabc, gabcCandidates: undefined };
  }
}
```


---

## Phase 3: Relational Hymn Query Refactoring - **[✓ IMPLEMENTED]**

### 1. Broad Office Filter Inclusion

* **The Problem:** `INDEX_HYM2.json` contains comprehensive metadata mappings including exact `grebobase_id` definitions and source page records for the *Liber Hymnarius* (Source 15). However, the scraper exact-matches `officePart === officeFilter`. Because your database labels store complex strings like `"1V"`, `"Ol V"`, or `"L V"`, exact character equality evaluations return false and exclude correct matches.


* **The Implementation:** Shift from a strict string mapping pattern to an array-based inclusion check using `officeFilters(hour)`.

```typescript
function hymnByOccasion(occasionCode: string, hour: string): GabcCandidate[] {
  const m = occasionCode.match(/^(\d)H(\d)$/);
  if (!m) return [];
  const week  = parseInt(m[1]);
  const feria = parseInt(m[2]);
  const pair  = week % 2 === 1 ? '1.3' : '2.4';
  const seasonCode = `${pair}H${feria}`;

  // Pulls target array limits e.g., ['V', '2V', '1V', 'v']
  const validFilters = officeFilters(hour);
  const grego = getGrego();

  return getHyms()
    .filter(e => 
      e.seasonCode === seasonCode && 
      (validFilters.length === 0 || validFilters.some(f => e.officePart.includes(f)))
    )
    .flatMap(e => {
      const g = grego[e.gregobaseId];
      if (!g?.gabc) return [];
      
      return [{ 
        incipit: e.incipit, 
        gabc: withAnnotation(g.gabc, e.incipit, ''), 
        office: `${e.officePart} (Liber Hymnarius p. ${e.page})`, // Injects explicit source citation
        occasion: e.seasonCode, 
        source: 'gregobase',
        gbId: e.gregobaseId 
      } satisfies GabcCandidate];
    });
}
```

---

## Phase 4: Modular Architecture Refactoring - **[✓ IMPLEMENTED]**

### 1. Extracted Pure Utilities and Constants
To improve maintainability and decouple code logic from UI/Orchestration:
- Extracted static data logic from `route.ts` into `constants.ts` and context derivation logic into `derive-context.ts`.
- Separated `gabc-lookup.ts` into distinct data loading utilities (`gabc-loaders.ts`) and lookup functions, significantly reducing its monolithic size.
- Extracted Cheerio DOM parsing loops from `route.ts` into `parse-blocks.ts`, narrowing `route.ts` strictly to API request/response orchestration.

### 2. Client-Side Component Modularity
The massive monolithic `office-editor.tsx` (~1500 lines) was broken down into strict domain-focused files:
- **`psalm-utils.ts`**: Pure utilities for syllabification and psalm pointing.
- **`GabcRenderer.tsx`**: Exsurge SVG client renderer.
- **`PsalmSyllableEditor.tsx`**: Interactive click-to-accent UI.
- **`BlockEditor.tsx`**: Isolated UI controls per layout block.
- **`office-editor.tsx`**: Retains only the core UI wrapper, right-sidebar settings, and drag-and-drop orchestration state.
