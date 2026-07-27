const fs = require('fs');
let code = fs.readFileSync('app/api/ibreviary/gabc-lookup.ts', 'utf8');

// The original signature of populateGabc is:
const targetSignature = `export async function populateGabc(
  blocks: Block[],
  latinHtml: string,
  hour: string,
  occasionCode?: string | null,
  otWeekNum?: number | null,
  liturgicalYear?: 'a' | 'b' | 'c',
  ferialCode?: string | null,
  occasionOverride?: string | null,
  isSaturday: boolean = false,
  isFirstVespers: boolean = false
): Promise<Block[]> {
  const { ants: latinAnts, hyms: latinHyms } = extractLatinItems(latinHtml);
  console.log(\`[OCO] \${latinAnts.length} Latin antiphons, \${latinHyms.length} Latin hymns extracted\`);`;

const replacementSignature = `export async function populateGabc(
  blocks: Block[],
  latinHtml: string,
  hour: string,
  occasionCode?: string | null,
  otWeekNum?: number | null,
  liturgicalYear?: 'a' | 'b' | 'c',
  ferialCode?: string | null,
  occasionOverride?: string | null,
  isSaturday: boolean = false,
  isFirstVespers: boolean = false
): Promise<Block[]> {`;

code = code.replace(targetSignature, replacementSignature);

// Remove hymCandidates fallback
const targetHymnFallback = `      // ── Path 2: No occasion code — text-match fallback from Latin iBreviary ──
      // Only used when the season is unrecognised and we have no OCO occasion code.
      const latinNorm = latinHyms[hymIdx++];
      if (!latinNorm) return block;
      const candidates = hymCandidates(latinNorm);
      if (!candidates.length) { console.log(\`[OCO] HYM ✗ "\${latinNorm.slice(0,50)}"\`); return block; }
      if (candidates.length === 1) {
        console.log(\`[OCO] HYM auto "\${candidates[0].incipit.slice(0,40)}"\`);
        return { ...block, gabcScore: candidates[0].gabc, gabcCandidates: undefined };
      }
      console.log(\`[OCO] HYM \${candidates.length} candidates for "\${latinNorm.slice(0,40)}"\`);
      return { ...block, gabcCandidates: candidates };`;

const replacementHymnFallback = `      // ── Path 2: No occasion code ─────────────────────────────────────────────
      // We strictly rely on the determinism of the OCO.
      // If we don't have an occasion code, we return the text without a fuzzy match.
      console.log(\`[OCO] HYM ✗ no occasion code to lookup hymn\`);
      return block;`;

code = code.replace(targetHymnFallback, replacementHymnFallback);

fs.writeFileSync('app/api/ibreviary/gabc-lookup.ts', code, 'utf8');
