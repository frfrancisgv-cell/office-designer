const fs = require('fs');

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const text = fs.readFileSync('IDX_ANT.csv', 'utf8');
const lines = text.split('\n').filter(Boolean);
const results = lines.map(parseCsvLine).filter(cols => cols[11] === '3');
results.forEach(cols => console.log(cols[9], cols[10], cols[11], cols[0]));
