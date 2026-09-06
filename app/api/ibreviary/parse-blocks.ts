import * as cheerio from 'cheerio';
import type { Block } from '@/lib/types';
import { stripVerseNumbers } from '@/lib/psalm-tones/verse-numbers';

const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Rubrics that offer an alternative to the office we always say.
 *
 * Psalm 94/95 is the only invitatory psalm this app prints, and the
 * Invitatory is always said, so iBreviary's "or you could…" scaffolding is
 * noise. The same regex already classified these as rubric further down; here
 * it drops them instead.
 */
const OPTION_RUBRIC = /^The Invitatory is said when/i;

/**
 * The rubric that introduces the opening used *instead* of the Invitatory.
 * Everything after it, to the end of its paragraph, is that alternative:
 * "God, come to my assistance" and the Glory Be that follows it.
 */
const INVITATORY_ALTERNATIVE = /^If the Invitatory is not said/i;

/**
 * The alternative opening itself, matched on its own words.
 *
 * The Latin page needs this: it prints the same alternative but puts its
 * rubric *after* it — "Omnia supra dicta omituntur, quando Invitatorium
 * immediate præcedit" — so there is no introducing rubric to key on. Matching
 * the versicle starts the same drop, and the trailing rubric falls inside it.
 */
const ALTERNATIVE_OPENING = /come to my assistance|adiut[oó]rium meum/i;

/**
 * Headings that iBreviary sometimes runs together with the citation that
 * follows them — "READINGJames 1:19-22", "LECTIO BREVISCant 8, 7".
 *
 * Sorted longest first, and that ordering is load-bearing: a Latin heading
 * must match its own word rather than the shorter English or Italian one it
 * happens to begin with. 'HYMNUS' has to be tried before 'HYMN', or the Latin
 * hymn is headed "HYMN" with a stray rubric "US" beside it.
 */
const SECTION_KEYWORDS = [
  'READING', 'RESPONSORY', 'PSALMODY', 'HYMN',
  'GOSPEL CANTICLE', 'BENEDICTUS', 'MAGNIFICAT',
  'INTERCESSIONS', 'INTRODUCTION', 'INVITATORY', 'BLESSING',
  // Italian
  'LETTURA', 'RESPONSORIO', 'SALMODIA', 'INNO',
  'CANTICO DEL VANGELO', 'CANTICO EVANGELICO',
  'INTERCESSIONI', 'INVITATORIO', 'ORAZIONE',
  // Latin
  'AD INVITATORIUM', 'HYMNUS', 'PSALMODIA', 'LECTIO BREVIS', 'LECTIO',
  'RESPONSORIUM BREVE', 'RESPONSORIUM', 'CANTICUM EVANGELICUM', 'CANTICUM',
  'PRECES', 'PATER NOSTER', 'ORATIO', 'CONCLUSIO',
].sort((a, b) => b.length - a.length);

/**
 * The line that names a psalm or canticle, in either language: "Psalm 92",
 * "Psalmus 91 (92)", "Canticle: Deuteronomy 32:1-12", "Canticum Deut 32,
 * 1-12". It titles the text that follows and is a rubric, not part of it.
 */
const PSALM_TITLE = /^(?:Psalm |Psalmus |Canticle[: ]|Canticum |I{1,3}V?\s*$|IV\s*$|\d+:\d)/i;

/**
 * A scripture citation standing alone, as the reading's reference or the
 * antiphon-source line under a psalm title.
 *
 * The book abbreviation must be followed by a number, and that is the whole
 * point of this being separate: matching a bare "Ex " turned the second
 * strophe of Psalm 8 — "Ex ore infántium et lactántium…" — into a rubric on
 * every Latin Lauds that prays it.
 */
const SCRIPTURE_CITATION =
  /^(?:Luke|Lc|Col|Eph|Phil|Rev|Ap|Dan|Is|Jer|Hab|Ez|Ex|Deut|Sam|Chr|Tob|Jud|Wis|Sir|Hebr?|Cant)\s+\d/i;

/** A section heading, which ends whatever the previous rubric was governing. */
const SECTION_HEADING = /class="(?:capolettera_piccolo|titoletto)"/;

/**
 * A versicle: a line, then its response, introduced by an em dash in English
 * and by the response sign in Latin.
 *
 * "Lord, + open my lips. / — And my mouth will proclaim your praise." reaches
 * the parser inside the INVITATORY section, where everything else is psalm
 * text, so it was typed `psalm` — offered for psalm-tone pointing, and merged
 * into Psalm 95. No verse of Psalm 94/95 opens on either mark.
 */
const VERSICLE = /^\s*(?:[—–]\s|℟)/m;

/**
 * Is this part a rubric wearing a word of the office inside it?
 *
 * Requiring the rubrica spans to be the *whole* of the part missed the one
 * that introduces the New Testament canticle of Vespers — "The following
 * canticle is said with the Alleluia when Evening Prayer is sung…", the Latin
 * "Sequens canticum dicitur cum Allelúia…" — because the Alleluia it speaks
 * of is set outside the span, in the type of the text it is quoting. So the
 * instruction came through as a verse and, being a verse next to a verse, the
 * whole canticle was merged into it: every English Vespers whose canticle
 * takes the Alleluia opened on a sentence of rubric.
 *
 * Measured across Lauds and Vespers in both languages, the instruction
 * rubrics are 88% and 90% rubrica, and nothing that is genuinely psalmody
 * reaches 71% — a verse carries a rubrica span only for its `*` and `†`.
 */
function isMostlyRubrica(part$: cheerio.CheerioAPI): boolean {
  const all = part$.text().replace(/\s+/g, '').length;
  if (!all) return false;
  const rubrica = part$('.rubrica').text().replace(/\s+/g, '').length;
  return rubrica / all >= 0.75;
}

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
       // Scoped to this element, so the alternative opening can only swallow
       // the rest of its own paragraph — never the hymn that follows it.
       let droppingInvitatoryAlternative = false;
       for (const part of parts) {
          const part$ = cheerio.load(part);
          const rawText = part$.text().trim();
          if (!rawText) continue;
          
          if (rawText.includes('*****') || rawText.includes('DONATE') || rawText.includes('SUBSCRIBE')) {
             stopParsing = true;
             break;
          }

          // Everything from "If the Invitatory is not said" to the end of the
          // paragraph is the opening we never use. A section heading ends it
          // early, in case iBreviary ever reorders the page.
          if (droppingInvitatoryAlternative) {
             if (!SECTION_HEADING.test(part)) continue;
             droppingInvitatoryAlternative = false;
          }

          // A part that is nothing but a link is navigation: "Go to the
          // Hymn", and the "Psalm 24 / 67 / 100" that offer the other
          // invitatory psalms. Nothing legitimate on the page is a bare link.
          const linkText = part$('a').text().trim();
          if (linkText && linkText === rawText) continue;

          if (currentSection === 'INVITATORY' && OPTION_RUBRIC.test(rawText)) continue;
          if (currentSection === 'INVITATORY'
              && (INVITATORY_ALTERNATIVE.test(rawText) || ALTERNATIVE_OPENING.test(rawText))) {
             droppingInvitatoryAlternative = true;
             continue;
          }

          if (part.includes('class="sezione"')) {
            // sezione = date/service line — treat as a subheading (label row)
            parsedBlocks.push({ id: generateId(), type: 'subheading', content: rawText });
          } else if (part.includes('class="sottotitolo"') || part.includes('class="subtitle"')) {
            // Psalm/canticle subtitle (e.g. "God stands by us in dangers") — always rubric.
            // Also detect canticle name here (e.g. iBreviary subtitle says "Magnificat" after
            // a generic "GOSPEL CANTICLE" heading).
            if (currentSection === 'CANTICLE' && !currentCanticleName) {
              const upSub = rawText.toUpperCase();
              if (upSub.includes('MAGNIFICAT') || upSub.includes('MARY')) currentCanticleName = 'Magnificat';
              else if (upSub.includes('BENEDICTUS') || upSub.includes('ZECHARIAH')) currentCanticleName = 'Benedictus';
              else if (upSub.includes('NUNC DIMITTIS') || upSub.includes('NUNC DIMITIS') || upSub.includes('SIMEON')) currentCanticleName = 'Nunc dimittis';
            }
            parsedBlocks.push({ id: generateId(), type: 'rubric', content: rawText });
          } else if (part.includes('class="capolettera_piccolo"') || part.includes('class="titoletto"')) {
            // Major liturgical section heading (HYMN, PSALMODY, READING, etc.)
            // Handles English, Latin, and Italian iBreviary headings.
            nextIsPsalmPrayer = false;
            const up = rawText.toUpperCase();
            if (up.includes('PSALMODY') || up.includes('SALMODIA')) currentSection = 'PSALMODY';
            // The Latin heading is "AD INVITATORIUM", which matches neither the
            // English nor the Italian word, so a Latin office never entered
            // this section at all: its invitatory antiphon was typed
            // `antiphon`, the keep-first-and-last rule never ran, and the
            // psalm came through in several blocks instead of one. Matched on
            // its own word rather than by shortening the Italian one, so the
            // heading block still prints whatever the page wrote.
            else if (up.includes('INVITATORY') || up.includes('INVITATORIO')
                     || up.includes('INVITATORIUM')) currentSection = 'INVITATORY';
            else if (up.includes('READING') || up.includes('LETTURA') || up.includes('LECTIO')) currentSection = 'READING';
            else if (up.includes('RESPONSORY') || up.includes('RESPONSORIO') || up.includes('RESPONSORIUM')) currentSection = 'RESPONSORY';
            else if (up.includes('CANTICLE') || up.includes('GOSPEL') || up.includes('MAGNIFICAT') || up.includes('BENEDICTUS') || up.includes('CANTICO') || up.includes('CANTICUM')) {
              currentSection = 'CANTICLE';
              // Detect which gospel canticle this is for psalmNumber stamping
              if (up.includes('MAGNIFICAT') || up.includes('MARY')) currentCanticleName = 'Magnificat';
              else if (up.includes('BENEDICTUS') || up.includes('ZECHARIAH')) currentCanticleName = 'Benedictus';
              else if (up.includes('NUNC') || up.includes('SIMEON')) currentCanticleName = 'Nunc dimittis';
              // else keep previous canticleName or null
            }
            else if (up.includes('HYMN') || up.includes('INNO') || up.includes('HYMNUS')) currentSection = 'HYMN';
            else if (up.includes('INTERCESSIONS') || up.includes('INTERCESSIONI') || up.includes('PRECES')) currentSection = 'INTERCESSIONS';
            else if (up.includes('CONCLUDING') || up.includes("LORD'S PRAYER") || up.includes('BLESSING') || up.includes('ORAZIONE') || up.includes('CONCLUSIO')) currentSection = 'CONCLUSION';
            else if (up.includes('INTRODUCTION') || up.includes('INTRODUZIONE')) currentSection = 'INTRODUCTION';

            // Split "READINGJames 1:19-22" → heading + citation rubric (no
            // duplicate push). The longest keyword wins, which is what keeps a
            // heading in its own language: "HYMNUS" was matching 'HYMN' and
            // coming out as a heading "HYMN" followed by a rubric "US", and
            // "LECTIO BREVISCant 8, 7" had no Latin keyword to cut at.
            const matchedKw = SECTION_KEYWORDS.find(kw => rawText.toUpperCase().startsWith(kw));
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
            } else if (currentSection === 'INVITATORY' && VERSICLE.test(finalText)) {
               // "Lord, open my lips" — a versicle, not a verse of Psalm 95.
               parsedBlocks.push({ id: generateId(), type: 'text', content: finalText });
            } else if (currentSection === 'PSALMODY' || currentSection === 'CANTICLE' || currentSection === 'INVITATORY') {
                // Detect canticle name from any text element if not yet determined
                if (currentSection === 'CANTICLE' && !currentCanticleName) {
                  const upFt = finalText.toUpperCase();
                  if (upFt.includes('MAGNIFICAT') || upFt.includes('MARY')) currentCanticleName = 'Magnificat';
                  else if (upFt.includes('BENEDICTUS') || upFt.includes('ZECHARIAH')) currentCanticleName = 'Benedictus';
                  else if (upFt.includes('NUNC DIMITTIS') || upFt.includes('NUNC DIMITIS') || upFt.includes('SIMEON')) currentCanticleName = 'Nunc dimittis';
                }
                // Psalm/canticle intro lines → rubric (not psalm text)
                 const isPsalmIntro = PSALM_TITLE.test(finalText)
                  || SCRIPTURE_CITATION.test(finalText)
                  // A part that is mostly rubrica span is a rubric, never a
                  // verse. The English rubrics of these sections happen to be
                  // caught by the names above — "Psalm 95", "Psalm Prayer",
                  // "Canticle of Zechariah" — so the class itself was never
                  // consulted; Latin has none of those names, so once the
                  // Latin headings started opening their sections its titles
                  // came through as psalm text and were merged into the psalm
                  // they title. Tested only here, where the alternative is to
                  // typeset a rubric as a verse.
                  || isMostlyRubrica(part$)
                  || (finalText.length < 80 && /^[A-Z][a-z]+ \d|^\d+[,.]\d/.test(finalText))
                  || /^(The Invitatory is said|The antiphon is repeated|If the Invitatory is not said)/i.test(finalText);
               if (isPsalmIntro) {
                 parsedBlocks.push({ id: generateId(), type: 'rubric', content: finalText });
               } else {
                 const textNoNums = stripVerseNumbers(finalText);
                 // Last-resort: detect canticle from opening verse content
                 if (currentSection === 'CANTICLE' && !currentCanticleName) {
                   const opening = textNoNums.slice(0, 80).toUpperCase();
                   if (opening.includes('MAGNIFICAT') || opening.includes('MY SOUL GLORIFIES') || opening.includes('MY SOUL PROCLAIMS') || opening.includes('MY SOUL MAGNIF')) {
                     currentCanticleName = 'Magnificat';
                   } else if (opening.includes('BENEDICTUS') || opening.includes('BLESSED BE THE LORD') || opening.includes('BLESSED BE GOD')) {
                     currentCanticleName = 'Benedictus';
                   } else if (opening.includes('NUNC') || opening.includes('LORD, NOW') || opening.includes('LORD NOW LET')) {
                     currentCanticleName = 'Nunc dimittis';
                   }
                 }
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
