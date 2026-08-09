const Hypher = require('hypher');
const la = require('hyphenation.la');
global.Hypher = Hypher;
global.Hypher.languages = {};
global.Hypher.languages['la'] = new Hypher(la);
const psalmtone = require('./psalmtone.js');
console.log(psalmtone.applyPsalmTone({ text: 'Dixit Dóminus Dómino meo:', gabc: 'f gh hr \'ixi hr \'g hr h.', format: 'html', lang: 'la' }));
