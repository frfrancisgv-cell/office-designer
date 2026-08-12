import { applyPsalmTone } from './lib/psalm-tones/psalmtone-wrapper';

const med = "g h jr 'k jr j.";
const term = "jr i j 'h gr g.";

const p1 = applyPsalmTone({ text: "Magníficat", gabc: med, clef: "c4", lang: "la", useBoldItalic: false });
const p2 = applyPsalmTone({ text: "ánima mea Dóminum.", gabc: term, clef: "c4", lang: "la", useBoldItalic: false });

console.log(p1);
console.log(p2);
