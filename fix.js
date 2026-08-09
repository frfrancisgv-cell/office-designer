const fs = require('fs');
let lines = fs.readFileSync('lib/psalm-tones/psalm-tone-engine.ts', 'utf8').split('\n');

// 1. Add import at line 39 (index 38)
lines.splice(38, 0, "import { englishPhoneticSyllabify, inferEnglishWordStress } from './english-phonetic';");

// find start and end of dictionaries
let dictStart = lines.findIndex(l => l.startsWith('const ENGLISH_PSALM_DICT'));
let phonEnd = lines.findIndex((l, i) => i > dictStart && l.startsWith('export function syllabifyWord'));
lines.splice(dictStart, phonEnd - dictStart);

let stressStart = lines.findIndex(l => l.startsWith('const ENGLISH_STRESS_DICT'));
let tokeniseStart = lines.findIndex((l, i) => i > stressStart && l.includes('function tokeniseSylls'));
lines.splice(stressStart, tokeniseStart - stressStart);

fs.writeFileSync('lib/psalm-tones/psalm-tone-engine.ts', lines.join('\n'));
console.log("Done");
