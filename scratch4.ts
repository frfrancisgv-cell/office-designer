import { applyPsalmTone } from './lib/psalm-tones/psalmtone-wrapper';

const med = "g h jr 'k jr j.";
const medGabc = applyPsalmTone({
  text: "Magníficat",
  gabc: med,
  clef: "c4",
  useBoldItalic: false,
  lang: "la"
});
console.log(medGabc);
