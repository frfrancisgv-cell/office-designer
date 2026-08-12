import { applyPsalmTone } from './lib/psalm-tones/psalmtone-wrapper';

const combinedTone = ' * ';

const gabcScore = applyPsalmTone({
  text: "Magníficat * ánima mea Dóminum.",
  gabc: combinedTone,
  clef: "c4",
  useBoldItalic: false,
  lang: "la"
});

console.log(gabcScore);
