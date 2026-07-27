const fs = require('fs');
let code = fs.readFileSync('app/api/ibreviary/gabc-lookup.ts', 'utf8');

// 1. antsByOccasion
code = code.replace(
`      const gabc = resolveGabc(e.gbId, e.gabc);
      if (!gabc) return [];
      return [{ incipit: e.incipit, gabc: withAnnotation(gabc, e.incipit, e.mode), mode: e.mode, office: e.office,`,
`      const gabc = resolveGabc(e.gbId, e.gabc) || '';
      return [{ incipit: e.incipit, gabc: gabc ? withAnnotation(gabc, e.incipit, e.mode) : '', mode: e.mode, office: e.office,`
);

// 2. sundayMagBenCandidates
code = code.replace(
`    for (const e of matches) {
      const gabc = resolveGabc(e.gbId, e.gabc);
      if (gabc) {
        let label = e.office;
        const p = e.place.trim();
        if (p === \`M\${yr}\` || p === \`B\${yr}\`) label += \` (Proper for Year \${yr.toUpperCase()})\`;
        else if (p === 'M' || p === 'B') label += \` (Generic/Common)\`;
        else if (p.includes('ad lib')) label += \` (\${p})\`;
        else if (/^[MB][abc]$/.test(p)) label += \` (Proper for Year \${p.slice(-1).toUpperCase()})\`;

        candidates.push({
          incipit: e.incipit, gabc: withAnnotation(gabc, e.incipit, e.mode), mode: e.mode,
          office: label,
          occasion: occ, source: e.gbId > 0 ? 'gregobase' : 'OCO',
          gbId: e.gbId || undefined,
        });
      }
    }`,
`    for (const e of matches) {
      const gabc = resolveGabc(e.gbId, e.gabc) || '';
      let label = e.office;
      const p = e.place.trim();
      if (p === \`M\${yr}\` || p === \`B\${yr}\`) label += \` (Proper for Year \${yr.toUpperCase()})\`;
      else if (p === 'M' || p === 'B') label += \` (Generic/Common)\`;
      else if (p.includes('ad lib')) label += \` (\${p})\`;
      else if (/^[MB][abc]$/.test(p)) label += \` (Proper for Year \${p.slice(-1).toUpperCase()})\`;

      candidates.push({
        incipit: e.incipit, gabc: gabc ? withAnnotation(gabc, e.incipit, e.mode) : '', mode: e.mode,
        office: label,
        occasion: occ, source: e.gbId > 0 ? 'gregobase' : 'OCO',
        gbId: e.gbId || undefined,
      });
    }`
);

// 3. Delete scoreLeading, extractLatinItems, antCandidates, invCandidates, hymCandidates
// We will use regex to remove them.
code = code.replace(/function scoreLeading.*?^}/ms, '');
code = code.replace(/\/\/ ── Latin text extraction ──.*?^}/ms, '');
code = code.replace(/function antCandidates.*?^}/ms, '');
code = code.replace(/function invCandidates.*?^}/ms, '');
code = code.replace(/function hymCandidates.*?^}/ms, '');

// Also remove toWords, normalize from import
code = code.replace(/normalize, toWords,/, '');
code = code.replace(/const TOP_N = 5;\s*const MIN_SCORE = 0\.4;/, '');
code = code.replace(/\/\/ ── Build candidate list ──+/, '');

// 4. invByOccasion
code = code.replace(
`function invByOccasion(occasionCode: string): GabcCandidate[] {
  const match = getInvs().find(e => e.occasion === occasionCode);
  if (match) {
    const gabc = resolveGabc(match.gbId, match.gabc);
    if (gabc) {
      return [{
        incipit: match.incipit, gabc, mode: match.mode,
        office: 'INV', occasion: match.occasion,
        source: match.gbId > 0 ? 'gregobase' : 'OCO',
        gbId: match.gbId || undefined,
      }];
    }
  }
  return [];
}`,
`function invByOccasion(occasionCode: string): GabcCandidate[] {
  const match = getInvs().find(e => e.occasion === occasionCode);
  if (match) {
    const gabc = resolveGabc(match.gbId, match.gabc) || '';
    return [{
      incipit: match.incipit, gabc, mode: match.mode,
      office: 'INV', occasion: match.occasion,
      source: match.gbId > 0 ? 'gregobase' : 'OCO',
      gbId: match.gbId || undefined,
    }];
  }
  return [];
}`
);

// 5. hymnByOccasion
code = code.replace(
`    .flatMap(e => {
      const g = grego[e.gregobaseId];
      if (!g?.gabc) return [];
      
      return [{
        incipit: e.incipit,
        gabc: withAnnotation(g.gabc, e.incipit, ''),
        office: e.page ? \`\${e.officePart} (Liber Hymnarius p. \${e.page})\` : e.officePart,
        occasion: e.seasonCode,
        source: 'gregobase',
        gbId: e.gregobaseId
      } satisfies GabcCandidate];
    });`,
`    .flatMap(e => {
      const g = grego[e.gregobaseId];
      return [{
        incipit: e.incipit,
        gabc: g?.gabc ? withAnnotation(g.gabc, e.incipit, '') : '',
        office: e.page ? \`\${e.officePart} (Liber Hymnarius p. \${e.page})\` : e.officePart,
        occasion: e.seasonCode,
        source: 'gregobase',
        gbId: e.gregobaseId
      } satisfies GabcCandidate];
    });`
);

// 6. populateGabc
// Remove `latinHtml: string` arg from populateGabc
code = code.replace(
`export function populateGabc(
  blocks: Block[],
  occasionCode: string | null,
  otWeekNum: number | null,
  liturgicalYear: 'a'|'b'|'c',
  hour: string,
  isFirstVespers: boolean,
  latinHtml: string
): Block[] {`,
`export function populateGabc(
  blocks: Block[],
  occasionCode: string | null,
  otWeekNum: number | null,
  liturgicalYear: 'a'|'b'|'c',
  hour: string,
  isFirstVespers: boolean
): Block[] {`
);

// 7. populateGabc Invitatory fallback
code = code.replace(
`       if (cands.length === 0) {
          const latins = extractLatinItems(latinHtml);
          const latinNorm = latins.ants[0]; 
          if (latinNorm) {
            cands = invCandidates(latinNorm);
          }
       }`,
``);

// 8. ocoMagBen map fallback
code = code.replace(
`        .flatMap(e => { const g = resolveGabc(e.gbId, e.gabc); return g ? [{ incipit: e.incipit, gabc: g, mode: e.mode, office: e.office, occasion: e.occasion, source: (e.gbId > 0 ? 'gregobase' : 'OCO') as 'gregobase'|'OCO' } satisfies GabcCandidate] : []; })`,
`        .flatMap(e => { const g = resolveGabc(e.gbId, e.gabc) || ''; return [{ incipit: e.incipit, gabc: g, mode: e.mode, office: e.office, occasion: e.occasion, source: (e.gbId > 0 ? 'gregobase' : 'OCO') as 'gregobase'|'OCO', gbId: e.gbId || undefined } satisfies GabcCandidate]; })`
);

// 9. populateGabc Antiphon fallback
// We remove `const { ants: latinAnts, hyms: latinHyms } = extractLatinItems(latinHtml);`
// Actually wait, let's just replace the whole antiphon text match fallback block.
code = code.replace(/      \/\/ ── Text-match fallback ──.*?cacheAndReturn\({ \.\.\.block, gabcCandidates: candidates }\);\s*}/ms,
`      // ── No OCO match found ──────────────────────────────────────────────────
      // The dataset (IDX_ANT.csv) does not contain a specific antiphon for this place,
      // or we lack the occasion code. We strictly rely on the determinism of the OCO;
      // if it's not mapped, we return the text without hallucinating a fuzzy match.
      console.log(\`[OCO] ANT ✗ missing from dataset for place \${block.place ?? 'unknown'}\`);
      antIdx++;
      return cacheAndReturn(block);
    }`
);

// 10. populateGabc Hymn fallback
code = code.replace(/      \/\/ ── Path 2: No occasion code ──.*?return { \.\.\.block, gabcCandidates: candidates };/ms,
`      // ── Path 2: No occasion code ─────────────────────────────────────────────
      // We strictly rely on the determinism of the OCO.
      // If we don't have an occasion code, we return the text without a fuzzy match.
      console.log(\`[OCO] HYM ✗ no occasion code to lookup hymn\`);
      return block;`
);

fs.writeFileSync('app/api/ibreviary/gabc-lookup.ts', code, 'utf8');
