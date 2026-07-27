require('ts-node').register();
const { getAnts } = require('./app/api/ibreviary/gabc-loaders.ts');
const ants = getAnts();
const sun3 = ants.filter(a => a.occasion === '3H1' && a.office === '2V' && a.place === '3');
console.log('Found:', sun3.length);
