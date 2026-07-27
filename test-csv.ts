import { parseCsvLine } from './app/api/ibreviary/gabc-loaders';
import * as fs from 'fs';

const text = fs.readFileSync('IDX_ANT.csv', 'utf8');
const lines = text.split('\n').filter(Boolean);
const results = lines.map(parseCsvLine).filter(cols => cols[10] === '2V' && cols[11] === '3');
results.forEach(cols => console.log(cols[9], cols[10], cols[11], cols[0]));
