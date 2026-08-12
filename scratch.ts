import { applyPsalmTone } from './lib/psalm-tones/psalmtone-wrapper';

const med = "g h jr 'k jr j.";
const term = "jr i j 'h gr g.";
const combinedTone = med + ' * ' + term;

const gabcScore = applyPsalmTone({
  text: "Magníficat * ánima mea Dóminum.",
  gabc: combinedTone,
  clef: "c4",
  useBoldItalic: false,
  lang: "la"
});

console.log(gabcScore);
