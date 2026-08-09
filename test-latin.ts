import { pointHemistich } from './lib/psalm-tones/psalm-tone-engine';

const text = "Sede a dextris meis";
const res = pointHemistich(text, { accents: 1, preparatory: 2, tenor: 'h' }, 'la');
console.log(res);
