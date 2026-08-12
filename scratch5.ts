import { applyPsalmTone } from './lib/psalm-tones/psalmtone-wrapper';

const med = "g h jr 'k jr j.";
const term = "jr i j 'h gr g.";

const gabcScore = applyPsalmTone({
  text: "Magníficat * ánima mea Dóminum.",
  gabc: med, // not used for multi-segment if format has it
  clef: "c4",
  useBoldItalic: false,
  lang: "la",
  format: {
    mediant: med,
    termination: term,
    bold: [], italic: [], nbsp: "", verse: ["",""]
  }
});

console.log(gabcScore);
