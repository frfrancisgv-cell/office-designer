const fs = require('fs');
let content = fs.readFileSync('lib/liturgy/data/psalter-schema.ts', 'utf8');

const ntMap = {
  sunday: '12',      // Rev 19
  monday: '4',       // Eph 1
  tuesday: '9',      // Rev 4-5
  wednesday: '6',    // Col 1
  thursday: '10',    // Rev 11-12
  friday: '11',      // Rev 15
};

const satMap = {
  1: '5',            // Phil 2
  2: '6',            // Col 1
  3: '7',            // 1 Tim 3
  4: '8',            // 1 Pet 2
};

// We will parse the file and replace nt-canticle ids week by week.
// But it's easier to use a state machine based on the comments.

let currentWeek = 1;
let currentDay = 0; // 0=Sunday
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('// WEEK 1')) currentWeek = 1;
  else if (line.includes('// WEEK 2')) currentWeek = 2;
  else if (line.includes('// WEEK 3')) currentWeek = 3;
  else if (line.includes('// WEEK 4')) currentWeek = 4;
  
  if (line.match(/\/\/\s*Sunday/i)) currentDay = 0;
  else if (line.match(/\/\/\s*Monday/i)) currentDay = 1;
  else if (line.match(/\/\/\s*Tuesday/i)) currentDay = 2;
  else if (line.match(/\/\/\s*Wednesday/i)) currentDay = 3;
  else if (line.match(/\/\/\s*Thursday/i)) currentDay = 4;
  else if (line.match(/\/\/\s*Friday/i)) currentDay = 5;
  else if (line.match(/\/\/\s*Saturday/i)) currentDay = 6;
  
  if (line.includes("type: 'nt-canticle'")) {
    let newId = '12';
    let title = 'NT Canticle';
    if (currentDay === 0) { newId = '12'; title = 'NT Canticle (Rev 19)'; }
    else if (currentDay === 1) { newId = '4'; title = 'NT Canticle (Eph 1:3-10)'; }
    else if (currentDay === 2) { newId = '9'; title = 'NT Canticle (Rev 4:11; 5:9-12)'; }
    else if (currentDay === 3) { newId = '6'; title = 'NT Canticle (Col 1:12-20)'; }
    else if (currentDay === 4) { newId = '10'; title = 'NT Canticle (Rev 11:17-18; 12:10-12)'; }
    else if (currentDay === 5) { newId = '11'; title = 'NT Canticle (Rev 15:3-4)'; }
    else if (currentDay === 6) {
      newId = satMap[currentWeek];
      if (newId === '5') title = 'NT Canticle (Phil 2:6-11)';
      else if (newId === '6') title = 'NT Canticle (Col 1:12-20)';
      else if (newId === '7') title = 'NT Canticle (1 Tim 3:16)';
      else if (newId === '8') title = 'NT Canticle (1 Pet 2:21-24)';
    }
    
    // Replace the id and title in the line
    lines[i] = line.replace(/id:\s*'[^']+'/, `id: '${newId}'`).replace(/title:\s*'[^']+'/, `title: '${title}'`);
  }
}

fs.writeFileSync('lib/liturgy/data/psalter-schema.ts', lines.join('\n'));
console.log('Fixed psalter schema NT canticles!');
