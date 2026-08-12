global.location = { search: '' };
global.URLSearchParams = class URLSearchParams { get() { return null; } };
const { applyPsalmTone } = require('./lib/psalm-tones/psalmtone-wrapper.ts');
const gabcResult = applyPsalmTone({
  text: "Dixit Dóminus Dómino meo: * Sede a dextris meis:",
  gabc: "g h jr 'k jr j.",
  clef: "c4",
  useBoldItalic: false,
  format: undefined
});
console.log(gabcResult);
