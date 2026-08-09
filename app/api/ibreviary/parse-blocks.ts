import * as cheerio from 'cheerio';
import { Block } from '@/lib/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

export function parseBlocks(
  $: cheerio.CheerioAPI,
  dateText: string,
  displayName: string,
  serviceTitle: string
): Block[] {
  const parsedBlocks: Block[] = [];
  let stopParsing = false;
  let currentSection = 'NONE';
  let currentAntNum = 0;
  let nextIsPsalmPrayer = false;
  // Track which gospel canticle we're currently in so psalm blocks get psalmNumber set
  let currentCanticleName: string | null = null;
  
  $('#contenuto .inner').children().each((_, el) => {
    if (stopParsing) return false;
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'h1' || tagName === 'h2') {
       // handled globally usually
    } else {
       let elHtml = $(el).html() || '';
       // Split only on double (or more) <br> — paragraph/stanza boundaries.
       // Single <br> within a stanza (verse half) is preserved and converted to \n inside the block.
       const parts = elHtml.split(/(?:<br\s*\/?>){2,}/gi);
       for (const part of parts) {
          const part$ = cheerio.load(part);
          const rawText = part$.text().trim();
          if (!rawText) continue;
          
          if (rawText.includes('*****') || rawText.includes('DONATE') || rawText.includes('SUBSCRIBE')) {
             stopParsing = true;
             break;
          }

          if (part.includes('class="sezione"')) {
            // sezione = date/service line — treat as a subheading (label row)
            parsedBlocks.push({ id: generateId(), type: 'subheading', content: rawText });
          } else if (part.includes('class="sottotitolo"') || part.includes('class="subtitle"')) {
            // Psalm/canticle subtitle (e.g. "God stands by us in dangers") — always rubric
            parsedBlocks.push({ id: generateId(), type: 'rubric', content: rawText });
          } else if (part.includes('class="capolettera_piccolo"') || part.includes('class="titoletto"')) {
            // Major liturgical section heading (HYMN, PSALMODY, READING, etc.)
            // Handles English, Latin, and Italian iBreviary headings.
            nextIsPsalmPrayer = false;
            const up = rawText.toUpperCase();
            if (up.includes('PSALMODY') || up.includes('SALMODIA')) currentSection = 'PSALMODY';
            else if (up.includes('INVITATORY') || up.includes('INVITATORIO')) currentSection = 'INVITATORY';
            else if (up.includes('READING') || up.includes('LETTURA') || up.includes('LECTIO')) currentSection = 'READING';
            else if (up.includes('RESPONSORY') || up.includes('RESPONSORIO')) currentSection = 'RESPONSORY';
            else if (up.includes('CANTICLE') || up.includes('GOSPEL') || up.includes('MAGNIFICAT') || up.includes('BENEDICTUS') || up.includes('CANTICO')) {
              currentSection = 'CANTICLE';
              // Detect which gospel canticle this is for psalmNumber stamping
              if (up.includes('MAGNIFICAT')) currentCanticleName = 'Magnificat';
              else if (up.includes('BENEDICTUS')) currentCanticleName = 'Benedictus';
              else if (up.includes('NUNC')) currentCanticleName = 'Nunc dimittis';
              // else keep previous canticleName or null
            }
            else if (up.includes('HYMN') || up.includes('INNO') || up.includes('HYMNUS')) currentSection = 'HYMN';
            else if (up.includes('INTERCESSIONS') || up.includes('INTERCESSIONI') || up.includes('PRECES')) currentSection = 'INTERCESSIONS';
            else if (up.includes('CONCLUDING') || up.includes("LORD'S PRAYER") || up.includes('BLESSING') || up.includes('ORAZIONE') || up.includes('CONCLUSIO')) currentSection = 'CONCLUSION';
            else if (up.includes('INTRODUCTION') || up.includes('INTRODUZIONE')) currentSection = 'INTRODUCTION';

            // Split "READINGJames 1:19-22" → heading + citation rubric (no duplicate push).
            // Includes Italian/Latin heading variants for correct splitting.
            const sectionKeywords = [
              'READING', 'RESPONSORY', 'PSALMODY', 'HYMN',
              'GOSPEL CANTICLE', 'BENEDICTUS', 'MAGNIFICAT',
              'INTERCESSIONS', 'INTRODUCTION', 'INVITATORY', 'BLESSING',
              // Italian / Latin variants
              'LETTURA', 'RESPONSORIO', 'SALMODIA', 'INNO',
              'CANTICO DEL VANGELO', 'CANTICO EVANGELICO',
              'INTERCESSIONI', 'INVITATORIO', 'ORAZIONE',
            ];
            const matchedKw = sectionKeywords.find(kw => rawText.toUpperCase().startsWith(kw));
            if (matchedKw && rawText.length > matchedKw.length + 1) {
              parsedBlocks.push({ id: generateId(), type: 'heading', content: rawText.slice(0, matchedKw.length).trim() });
              parsedBlocks.push({ id: generateId(), type: 'rubric', content: rawText.slice(matchedKw.length).trim() });
            } else {
              parsedBlocks.push({ id: generateId(), type: 'heading', content: rawText });
            }
          } else if (part.includes('class="ritornello"') || part.includes('class="versetto"') || part.includes('class="refrain"')) {
            // Responsory-specific elements — always text
            const cleanHtml2 = part.replace(/<br\s*\/?>/gi, '\n');
            const rt = cheerio.load(cleanHtml2).text().trim();
            if (rt) parsedBlocks.push({ id: generateId(), type: 'text', content: rt });
          } else if (part.includes('class="antifona"') || rawText.toLowerCase().startsWith('ant.')) {
            const digitMatch = rawText.match(/^Ant\.?\s*(\d+)/i);
            if (digitMatch) {
              currentAntNum = parseInt(digitMatch[1], 10);
            }
            const antText = rawText.replace(/^Ant\.?\s*\d*\.?\s*/i, '').trim();
            parsedBlocks.push({
              id: generateId(),
              type: currentSection === 'INVITATORY' ? 'invitatory-antiphon' : 'antiphon',
              content: antText || rawText,
              place: currentAntNum > 0 ? currentAntNum.toString() : null
            });
          } else {
            const cleanHtml = part.replace(/<br\s*\/?>/gi, '\n');
            const clean$ = cheerio.load(cleanHtml);
            const finalText = clean$.text().trim();

            if (part.includes('class="citazione"')) {
               parsedBlocks.push({ id: generateId(), type: 'rubric', content: finalText });
            } else if (/^<em>/i.test(part.trim()) && (finalText.includes('(') || /\d:\d/.test(finalText))) {
               // Scripture citation in italic (psalm intro line)
               parsedBlocks.push({ id: generateId(), type: 'rubric', content: finalText });
            } else if (nextIsPsalmPrayer) {
               nextIsPsalmPrayer = false;
               parsedBlocks.push({ id: generateId(), type: 'psalm-prayer', content: finalText });
            } else if (currentSection === 'HYMN') {
                // Attribution lines (Tune:, Text:, Music:) → rubric, not hymn content
                if (/^(Tune|Text|Music|Mode|Melody|Copyright):/i.test(finalText)) {
                  parsedBlocks.push({ id: generateId(), type: 'rubric', content: finalText });
                } else if (/^(Alternate\s+)?Hymn(us)?$/i.test(finalText) || part.includes('name="alternatehymn"')) {
                  // Skip redundant label blocks and the actual alternate hymn text block
                } else {
                  parsedBlocks.push({ id: generateId(), type: 'hymn', content: finalText });
                }
            } else if (currentSection === 'RESPONSORY') {
               // Responsory text: ritornello (refrain), versetto (versicle), or plain text
               if (finalText) parsedBlocks.push({ id: generateId(), type: 'text', content: finalText });
            } else if (currentSection === 'PSALMODY' || currentSection === 'CANTICLE' || currentSection === 'INVITATORY') {
                // Psalm/canticle intro lines → rubric (not psalm text)
                 const isPsalmIntro = /^(Psalm |Canticle[: ]|Luke |Col |Eph |Phil |Rev |Ap |Dan |Is |Jer |Hab |Ez |Ex |Deut |Sam |Chr |Tob |Jud |Wis |Sir |I{1,3}V?\s*$|IV\s*$|\d+:\d)/i.test(finalText)
                  || (finalText.length < 80 && /^[A-Z][a-z]+ \d|^\d+[,.]\d/.test(finalText))
                  || /^(The Invitatory is said|The antiphon is repeated|If the Invitatory is not said)/i.test(finalText);
               if (isPsalmIntro) {
                 parsedBlocks.push({ id: generateId(), type: 'rubric', content: finalText });
               } else {
                 const textNoNums = finalText.replace(/^\d+\s*/gm, '');
                 const extra: Partial<Block> = {};
                 if (currentSection === 'CANTICLE' && currentCanticleName) {
                   extra.psalmNumber = currentCanticleName;
                 }
                 parsedBlocks.push({ id: generateId(), type: 'psalm', content: textNoNums, ...extra });
               }
            } else {
               parsedBlocks.push({ id: generateId(), type: 'text', content: finalText });
            }
          }
        }
     }
  });

  const blocks: Block[] = [];
  if (dateText && !dateText.includes('- Menu -')) {
     // Date and liturgical name are metadata labels, not structural headings
     blocks.push({ id: generateId(), type: 'subheading', content: dateText });
     if (displayName) {
         blocks.push({ id: generateId(), type: 'subheading', content: displayName });
     }
     if (serviceTitle) {
         blocks.push({ id: generateId(), type: 'subheading', content: serviceTitle });
     }
  }

  const invAnts = parsedBlocks.filter(b => b.type === 'invitatory-antiphon');
  const firstInvId = invAnts.length > 0 ? invAnts[0].id : null;
  const lastInvId = invAnts.length > 1 ? invAnts[invAnts.length - 1].id : null;

  for (let i = 0; i < parsedBlocks.length; i++) {
     const b = parsedBlocks[i];
     
     if (b.type === 'invitatory-antiphon') {
        if (b.id !== firstInvId && b.id !== lastInvId) {
           continue; // Skip intermediate invitatory antiphons so the psalm verses merge!
        }
     }
     if (blocks.length > 0) {
        const last = blocks[blocks.length - 1];
        // If a text block follows a Psalm Prayer rubric, classify it as a psalm-prayer
        if (b.type === 'text' && last.type === 'rubric' && last.content.toLowerCase().includes('psalm prayer')) {
           b.type = 'psalm-prayer';
        }
        // If both are psalms, hymns, or text, we can merge them
        if ((b.type === 'psalm' && last.type === 'psalm') ||
            (b.type === 'hymn' && last.type === 'hymn') ||
            (b.type === 'text' && last.type === 'text')) {
           last.content += '\n\n' + b.content;
           continue;
        }
     }
     blocks.push(b);
  }

  return blocks.filter(b => 
     b.content 
     && !b.content.includes('- Menu -') 
     && !b.content.includes('DONATE')
     && !b.content.includes('SUBSCRIBE')
     && !b.content.includes('*****')
     && b.content !== 'Breviary'
     && b.content !== 'Breviarium'
  );
}
