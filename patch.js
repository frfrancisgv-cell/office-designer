const fs = require('fs');
let content = fs.readFileSync('psalmtone.js', 'utf8');

// Patch globals
content = content.replace(/var o_g_tones =/, 'var o_g_tones;');
content = content.replace(/    g_tones = {/, 'var g_tones = o_g_tones = {');
content = content.replace(/var o_bi_formats =/, 'var o_bi_formats;');
content = content.replace(/    bi_formats = \(/, 'var bi_formats = o_bi_formats = (');
content = content.replace(/splitPsalmsMap = {/, 'var splitPsalmsMap = {');
content = content.replace(/splitPsalmNames = {/, 'var splitPsalmNames = {');

// Wrap window assignments
content = content.replace(/window\['getPsalm'\] =/g, "if(typeof window !== 'undefined'){window['getPsalm'] =");
content = content.replace(/window\['shiftGabc'\] = shiftGabc;/g, "window['shiftGabc'] = shiftGabc;}");

// Patch addBoldItalic signature
content = content.replace(
  'function addBoldItalic(text,accents,preparatory,sylsAfterBold,format,onlyVowel,verseNumber,prefix,suffix,verseIndex) {',
  'function addBoldItalic(text,accents,preparatory,sylsAfterBold,format,onlyVowel,verseNumber,prefix,suffix,verseIndex,lang) {\n  var getSyllables = lang == "en" ? _getEnSyllables : _getLaSyllables;'
);

// Add localStorage polyfill securely
content = "if (typeof localStorage === 'undefined') { global.localStorage = {}; }\n" + content;

// Add module exports
content += `\nif (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addBoldItalic,
    applyPsalmTone,
    getPsalmTones,
    getEndings,
    _getLaSyllables
  };
}\n`;

fs.writeFileSync('psalmtone.js', content);
