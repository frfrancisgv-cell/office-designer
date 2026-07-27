# Debug Log: OCO Alignment & Scraper Optimizations

## Status: All Fixes Implemented ✓

The strict equality evaluation bug in `hymnByOccasion` and the scraping alignment issues have been successfully resolved. 

### Resolved Issues in `gabc-lookup.ts`
1. **Hymn Matching Refactor:** The `hymnByOccasion` function now correctly uses `officeFilters(hour)` and `.some(f => e.officePart.includes(f))`. This resolves the bug where composite labels like `"1V"`, `"2V"`, or `"Ol V"` were failing strict equality checks, bypassing the fragile iBreviary HTML text matching engine.
2. **Precise Mapping:** `populateGabc` now correctly reads the structural `block.place` label to execute precise row-matching for antiphons instead of relying on sequential `ocoIdx` pointers.
3. **Latin Deduplication:** `extractLatinItems` correctly filters out duplicate antiphons by checking against its internal string array, keeping the Latin tracking array in 1:1 index alignment with the parsed English blocks.

### Resolved Issues in `route.ts`
1. **Antiphon Tracking:** A stateful `currentAntNum` tracker is implemented to accurately map antiphon structures even when iBreviary repeats an antiphon without its digit label.
2. **Heading Detection:** The `gcIdx` lookup injection now correctly targets `"BENEDICTUS"`, `"MAGNIFICAT"`, and `"GOSPEL CANTICLE"`, enabling accurate scoring for Lauds and Vespers.
3. **Psalm Intro Regex:** The `isPsalmIntro` evaluation successfully parses Old Testament canticle sources unique to Lauds (e.g., `Dan`, `Is`, `Jer`, `Hab`).

**Conclusion:**
All required structural changes identified in the previous review have been integrated into the codebase. `Guide.md` has been updated to reflect these established architectural patterns.

### Phase 4: Modular Refactoring
To clean up the codebase:
- `office-editor.tsx` was broken into `office-editor.tsx` (main UI wrapper), `BlockEditor.tsx`, `GabcRenderer.tsx`, `PsalmSyllableEditor.tsx`, and pure `psalm-utils.ts`.
- `route.ts` parsing logic was extracted into `parse-blocks.ts`.
- `gabc-lookup.ts` data loading was extracted into `gabc-loaders.ts`.
- Static variables and contextual functions were pushed to `constants.ts` and `derive-context.ts`.