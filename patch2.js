const fs = require('fs');
let code = fs.readFileSync('app/api/ibreviary/gabc-lookup.ts', 'utf8');

// Replace populateGabc signature and remove latinHtml processing
code = code.replace(
`export function populateGabc(
  blocks: Block[],
  occasionCode: string | null,
  otWeekNum: number | null,
  liturgicalYear: 'a'|'b'|'c',
  hour: string,
  isFirstVespers: boolean
): Block[] {
  const { ants: latinAnts, hyms: latinHyms } = extractLatinItems(latinHtml);
  console.log(\`[OCO] \${latinAnts.length} Latin antiphons, \${latinHyms.length} Latin hymns extracted\`);`,
`export function populateGabc(
  blocks: Block[],
  occasionCode: string | null,
  otWeekNum: number | null,
  liturgicalYear: 'a'|'b'|'c',
  hour: string,
  isFirstVespers: boolean,
  ferialCode?: string | null,
  occasionOverride?: string | null
): Promise<Block[]> { // Return type should be Block[] but keeping signature compatible if needed, wait, the original was Promise<Block[]> because it was an async function? Let's check the view_file. It says Promise<Block[]>.`
);

fs.writeFileSync('patch2.js', code, 'utf8');
