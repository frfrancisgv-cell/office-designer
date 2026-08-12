// @ts-ignore
import Hypher from 'hypher';
// @ts-ignore
import la from 'hyphenation.la';
// @ts-ignore
import en from 'hyphenation.en-us';

if (typeof global !== 'undefined') {
  (global as any).Hypher = Hypher;
  if (!(global as any).Hypher.languages) (global as any).Hypher.languages = {};
  (global as any).Hypher.languages['la'] = new Hypher(la);
  (global as any).Hypher.languages['en'] = new Hypher(en);
  (global as any).Hypher.languages['en-us'] = new Hypher(en);
  if (typeof (global as any).location === 'undefined') {
    (global as any).location = { search: '' };
  }
}

// Use eval to prevent webpack from bundling psalmtone.js.
// psalmtone.js uses implicit global var declarations that break under
// webpack's strict-mode bundling/minification (specifically the oTags
// variable inside the syllable() function). eval() forces Node.js to
// load it as a raw CommonJS file at runtime, bypassing webpack.
// We must use an absolute path since the relative path breaks when
// the code runs from inside .next/server/chunks/ at runtime.
// eslint-disable-next-line no-eval
const psalmtone = eval("require")(require('path').join(process.cwd(), 'psalmtone.js'));

export const applyPsalmTone = psalmtone.applyPsalmTone;
export const getPsalmTones = psalmtone.getPsalmTones;
export const getEndings = psalmtone.getEndings;
export const addBoldItalic = psalmtone.addBoldItalic;
export const getLaSyllables = psalmtone._getLaSyllables;
