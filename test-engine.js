const { tokeniseSylls, pickAccents, pointHemistich } = require('./lib/psalm-tones/psalm-tone-engine.ts');
const sylls = tokeniseSylls('Dixit Dóminus Dómino meo:', 'la');
console.log("SYLLS:", JSON.stringify(sylls, null, 2));
console.log("ACCENTS:", pickAccents(sylls, { accents: 1, preparatory: 2 }));
console.log("POINTED:", pointHemistich('Dixit Dóminus Dómino meo:', { accents: 1, preparatory: 2 }, 'la'));
