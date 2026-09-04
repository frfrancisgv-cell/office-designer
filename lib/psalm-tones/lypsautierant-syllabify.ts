/**
 * lypsautierant-syllabify.ts — GENERATED FILE, DO NOT EDIT.
 * Regenerate with: node scripts/gen-lypsautierant.mjs
 *
 * Mechanical conversion of vendor/psautier/sedsyllables — the sed
 * script the upstream tool runs over psalm text before pointing it. Applying
 * these 180 rules in order reproduces `sed -f sedsyllables` exactly.
 *
 * This matters because the pointing rules count syllables from the end of
 * each hemistich: if a word splits differently here than upstream, every
 * mark in that hemistich lands on the wrong syllable. Do not "improve" the
 * splitting without regenerating the pointing rules against it.
 *
 * Rules marked [CORRECTED] below are the exception: they are broken upstream
 * in a way that mangles the text without changing how many syllables it has,
 * so fixing them moves no marks. See RULE_FIXES in the generator.
 */

/** [pattern, replacement] in upstream order; the comment is the sed original. */
const RULES: [RegExp, string][] = [
  // s/\t/ /g;
  [/\t/gu, " "],
  // s/\(\<[iíúu]n\)\([^ .,;?!"]\)/\1 -- \2/g;
  [/((?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])[iíúu]n)([^ .,;?!"])/gu, "$1 -- $2"],
  // s/ful\>/ -- &/g;
  [/ful(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, " -- $&"],
  // s/\<\(f[óo]r\)\([a-z,áéíóú]\)/\1 -- \2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])(f[óo]r)([a-z,áéíóú])/gu, "$1 -- $2"],
  // s/\<\([óo]ff\)\([^aeiouáéíóú .,;-?!]\)/\1 -- \2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])([óo]ff)([^aeiouáéíóú .,;-?!])/gu, "$1 -- $2"],
  // s/\([^cK]\)\(ing[^a-z]\)/\1 -- \2/g;
  [/([^cK])(ing[^a-z])/gu, "$1 -- $2"],
  // s/[ln][ée]ss\>/ -- &/g;
  [/[ln][ée]ss(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, " -- $&"],
  // s/[t][ée]d\>/ -- &/g;
  [/[t][ée]d(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, " -- $&"],
  // s/[s][íi]on\>/ -- &/g;
  [/[s][íi]on(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, " -- $&"],
  // s/\([a-záéíóú][a-záéíóú]\)\([nlvrtdm]y\)\>/\1 -- \2/g;
  [/([a-záéíóú][a-záéíóú])([nlvrtdm]y)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1 -- $2"],
  // s/[a-z,áéíúó]l[ée]\([^a-r,áéíóú,t-z]\|\>\)/ -- &/g;
  [/[a-z,áéíúó]l[ée]([^a-r,áéíóú,t-z]|(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_]))/gu, " -- $&"],
  // s/\([^aeiouáéíóút .,;"`]i\)\([úu][^aeiouáéíóú .,;?!:"]\)/\1 -- \2/g;
  [/([^aeiouáéíóút .,;"`]i)([úu][^aeiouáéíóú .,;?!:"])/gu, "$1 -- $2"],
  // s/\([^ .,;?!"`][^aeiouáéíóú ,.;?!"]\)\([^aeiouáéíóú .,;!?:"][^ .,;?!:"\-]\)/\1 -- \2/g;
  [/([^ .,;?!"`][^aeiouáéíóú ,.;?!"])([^aeiouáéíóú .,;!?:"][^ .,;?!:"\\-])/gu, "$1 -- $2"],
  // s/\([AEIOUaeiouáéíóúÁÉÍÓÚ]\)\([^aeiouáéíóú .,;?!:"\-][AEIOUaeiouÁÉÍÓÚáéíóú][^ .,;?!:"]\)/\1 -- \2/g;
  [/([AEIOUaeiouáéíóúÁÉÍÓÚ])([^aeiouáéíóú .,;?!:"\\-][AEIOUaeiouÁÉÍÓÚáéíóú][^ .,;?!:"])/gu, "$1 -- $2"],
  // s/\([^aeiouáéíóúts .,;?!"`]i\)\([óo][^aeiouáéíóú .,;?!:"]\)/\1 -- \2/g;
  [/([^aeiouáéíóúts .,;?!"`]i)([óo][^aeiouáéíóú .,;?!:"])/gu, "$1 -- $2"],
  // s/\([^aeiouáéíóúts .,;?!"`]o\)\([ée][^aeiousáéíóú .,;?!:"]\)/\1 -- \2/g;
  [/([^aeiouáéíóúts .,;?!"`]o)([ée][^aeiousáéíóú .,;?!:"])/gu, "$1 -- $2"],
  // s/[t][áa]ge\>/ -- &/g;
  [/[t][áa]ge(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, " -- $&"],
  // s/\<nera\>/ne -- ra/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])nera(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ne -- ra"],
  // s/\<néra\>/né -- ra/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])néra(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "né -- ra"],
  // s/t -- h/ -- th/g;
  [/t -- h/gu, " -- th"],
  // s/g -- h/gh -- /g;
  [/g -- h/gu, "gh -- "],
  // s/gh -- \([st]\)/gh\1/g;
  [/gh -- ([st])/gu, "gh$1"],
  // s/T -- h/Th/g;
  [/T -- h/gu, "Th"],
  // s/\<s\([ch]\) -- /s\1/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])s([ch]) -- /gu, "s$1"],
  // s/wor -- th/worth/g;
  [/wor -- th/gu, "worth"],
  // s/wór -- th/wórth/g;
  [/wór -- th/gu, "wórth"],
  // s/\<wh -- ile\>/while/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wh -- ile(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "while"],
  // s/\<wh -- íle\>/whíle/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wh -- íle(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "whíle"],
  // s/\<\([Tt]h\) -- /\1/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])([Tt]h) -- /gu, "$1"],
  // s/\<\([dkprsSwzlb][tp]*[r]*\) -- \(ing[s]*\>\)/\1\2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])([dkprsSwzlb][tp]*[r]*) -- (ing[s]*(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_]))/gu, "$1$2"],
  // s/\([dvnrg]\) -- ing/ -- \1ing/g;
  [/([dvnrg]) -- ing/gu, " -- $1ing"],
  // s/\<\(b[rl]\|ch\) -- ing/\1ing/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])(b[rl]|ch) -- ing/gu, "$1ing"],
  // s/ -- \([^aeiouáéíóú]s\)\>/\1/g;
  [/ -- ([^aeiouáéíóú]s)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/ -- \(ths\)\>/\1/g;
  [/ -- (ths)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/\([cs]es\)\>/ -- \1/g;
  [/([cs]es)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, " -- $1"],
  // s/ -- \([sh]t\)\([s]\|\>\)/\1\2/g;
  [/ -- ([sh]t)([s]|(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_]))/gu, "$1$2"],
  // s/ -- \([pt]h\)\>/\1/g;
  [/ -- ([pt]h)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/\<\([Ss]t\) -- /\1/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])([Ss]t) -- /gu, "$1"],
  // s/ -- \([nwmpgsyzvkhlc]ed\)\>/\1/g;
  [/ -- ([nwmpgsyzvkhlc]ed)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/nís -- hed\>/níshed/g;
  [/nís -- hed(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "níshed"],
  // s/nís -- hed\>/níshed/g;
  [/nís -- hed(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "níshed"],
  // s/\<ton -- gue\>/tongue/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ton -- gue(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "tongue"],
  // s/\<tón -- gue\>/tóngue/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])tón -- gue(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "tóngue"],
  // s/ -- \([tvymkbn]es\)\>/\1/g;
  [/ -- ([tvymkbn]es)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/\<b -- less\>/bless/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])b -- less(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "bless"],
  // s/\<b -- léss\>/bléss/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])b -- léss(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "bléss"],
  // s/ -- \([cgstvz]e\)\>/\1/g;
  [/ -- ([cgstvz]e)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/ -- \([l]d\)\>/\1/g;
  [/ -- ([l]d)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/ -- \(ch\)\>/\1/g;
  [/ -- (ch)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1"],
  // s/\([a-záéíóú][a-záíéóú]\)el\>/\1 -- el/g;
  [/([a-záéíóú][a-záíéóú])el(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1 -- el"],
  // s/\<\(v[ií]c\) -- to -- \(r[yi]*[e]*[s]*\)/\1 -- to\2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])(v[ií]c) -- to -- (r[yi]*[e]*[s]*)/gu, "$1 -- to$2"],
  // s/\<\([sdbvt][eéoó][a]*\) -- red\>/\1red/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])([sdbvt][eéoó][a]*) -- red(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1red"],
  // s/\([dbvt][eé]\) -- red\>/\1red/g;
  [/([dbvt][eé]) -- red(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1red"],
  // s/sc[áa]ttered/sc&t -- tered/g;   [CORRECTED: upstream & is the whole match, corrupting the word]
  [/sc([áa])ttered/gu, "sc$1t -- tered"],
  // s/l\([íi]\)ghtnings/l\1ght -- nings/g;
  [/l([íi])ghtnings/gu, "l$1ght -- nings"],
  // s/l\([íi]\)ghtens/l\1gh -- tens/g;
  [/l([íi])ghtens/gu, "l$1gh -- tens"],
  // s/\<sa -- vi -- or\>/sa -- vior/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sa -- vi -- or(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "sa -- vior"],
  // s/\<sá -- vi -- or\>/sá -- vior/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sá -- vi -- or(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "sá -- vior"],
  // s/\<eve -- ry\>/ev -- ery/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])eve -- ry(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ev -- ery"],
  // s/\<éve -- ry\>/év -- ery/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])éve -- ry(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "év -- ery"],
  // s/\<wha -- tever\>/wha -- te -- ver/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wha -- tever(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "wha -- te -- ver"],
  // s/\<wha -- téver\>/wha -- té -- ver/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wha -- téver(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "wha -- té -- ver"],
  // s/\<e -- ver\>/ev -- er/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])e -- ver(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ev -- er"],
  // s/\<é -- ver\>/év -- er/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])é -- ver(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "év -- er"],
  // s/\<l\([ií]\)\(ver[es]*[d]*\)\>/l\1 -- \2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])l([ií])(ver[es]*[d]*)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "l$1 -- $2"],
  // s/\<nities\>/ni -- ties/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])nities(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ni -- ties"],
  // s/\<níties\>/ní -- ties/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])níties(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ní -- ties"],
  // s/\<ene -- my\>/e -- ne -- my/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ene -- my(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "e -- ne -- my"],
  // s/\<e -- nemies\>/e -- ne -- mies/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])e -- nemies(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "e -- ne -- mies"],
  // s/\<str\([óo]\)ngh -- \(old[s]*\>\)/str\1ng -- h\2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])str([óo])ngh -- (old[s]*(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_]))/gu, "str$1ng -- h$2"],
  // s/\<éne -- my\>/é -- ne -- my/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])éne -- my(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "é -- ne -- my"],
  // s/\<in -- te -- rest\>/in -- terest/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])in -- te -- rest(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "in -- terest"],
  // s/\<in -- te -- rést\>/in -- térest/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])in -- te -- rést(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "in -- térest"],
  // s/\<sh -- el -- ter\>/shel -- ter/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sh -- el -- ter(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "shel -- ter"],
  // s/\<sh -- él -- ter\>/shél -- ter/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sh -- él -- ter(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "shél -- ter"],
  // s/\<tran -- sgres -- sions\>/trans -- gres -- sions/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])tran -- sgres -- sions(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "trans -- gres -- sions"],
  // s/\<tran -- sgrés -- sions\>/trans -- grés -- sions/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])tran -- sgrés -- sions(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "trans -- grés -- sions"],
  // s/\<wi -- \(thh[ée]ld\)\>/with -- held/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wi -- (thh[ée]ld)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "with -- held"],
  // s/\<wi -- thout\>/with -- out/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wi -- thout(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "with -- out"],
  // s/\<wi -- thóut\>/with -- óut/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wi -- thóut(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "with -- óut"],
  // s/\<be -- loved\>/be -- lo -- ved/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])be -- loved(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "be -- lo -- ved"],
  // s/\<be -- lóved\>/be -- ló -- ved/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])be -- lóved(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "be -- ló -- ved"],
  // s/\<di -- vided\>/di -- vi -- ded/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])di -- vided(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "di -- vi -- ded"],
  // s/\<di -- víded\>/di -- ví -- ded/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])di -- víded(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "di -- ví -- ded"],
  // s/\<\(pr[áa]\) -- \(yer[s]*\)\>/\1\2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])(pr[áa]) -- (yer[s]*)(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1$2"],
  // s/\<\([sb][noó][aá]*\) -- res\>/\1res/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])([sb][noó][aá]*) -- res(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1res"],
  // s/\<\([tóo][hr][uú]*[n]*\) -- de -- red\>/\1 -- dered/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])([tóo][hr][uú]*[n]*) -- de -- red(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1 -- dered"],
  // s/\<of -- fe -- rings\>/of -- ferings/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])of -- fe -- rings(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "of -- ferings"],
  // s/\<óf -- fe -- rings\>/óf -- ferings/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])óf -- fe -- rings(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "óf -- ferings"],
  // s/\<pur -- suers\>/pur -- su -- ers/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])pur -- suers(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "pur -- su -- ers"],
  // s/\<pur -- súers\>/pur -- sú -- ers/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])pur -- súers(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "pur -- sú -- ers"],
  // s/\<cor -- ruption\>/cor -- rup -- tion/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])cor -- ruption(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "cor -- rup -- tion"],
  // s/\<cor -- rúption\>/cor -- rúp -- tion/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])cor -- rúption(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "cor -- rúp -- tion"],
  // s/\<so -- meone\>/some -- one/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])so -- meone(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "some -- one"],
  // s/\<só -- meone\>/sóme -- one/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])só -- meone(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "sóme -- one"],
  // s/\<sp -- ring\([,.!"?:;"]\)/spring\1/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sp -- ring([,.!"?:;"])/gu, "spring$1"],
  // s/\<sp -- ríng\([,.!"?:;"]\)/spríng\1/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sp -- ríng([,.!"?:;"])/gu, "spríng$1"],
  // s/\<sp -- ring\>/spring/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sp -- ring(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "spring"],
  // s/\<sp -- ríng\>/spríng/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sp -- ríng(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "spríng"],
  // s/\<sp -- \(l[ée]n\)dor\>/sp\1 -- dor/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sp -- (l[ée]n)dor(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "sp$1 -- dor"],
  // s/\<r -- ule\>/rule/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])r -- ule(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "rule"],
  // s/\<r -- úle\>/rúle/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])r -- úle(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "rúle"],
  // s/\<\(c[eé]n\)\(dant[s]*\)/\1 -- \2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])(c[eé]n)(dant[s]*)/gu, "$1 -- $2"],
  // s/\<jud -- gments\>/judg -- ments/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])jud -- gments(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "judg -- ments"],
  // s/\<júd -- gments\>/júdg -- ments/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])júd -- gments(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "júdg -- ments"],
  // s/\<jud -- gment\>/judg -- ment/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])jud -- gment(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "judg -- ment"],
  // s/\<júd -- gment\>/júdg -- ment/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])júd -- gment(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "júdg -- ment"],
  // s/\<tran -- sgress\>/trans -- gress/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])tran -- sgress(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "trans -- gress"],
  // s/\<tran -- sgréss\>/trans -- gréss/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])tran -- sgréss(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "trans -- gréss"],
  // s/\<gu -- ile\>/guile/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])gu -- ile(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "guile"],
  // s/\<gú -- ile\>/gúile/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])gú -- ile(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "gúile"],
  // s/\<memo -- ry\>/me -- mory/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])memo -- ry(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "me -- mory"],
  // s/\<mémo -- ry\>/mé -- mory/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])mémo -- ry(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "mé -- mory"],
  // s/\<ruined\>/ru -- ined/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ruined(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ru -- ined"],
  // s/\<rúined\>/rú -- ined/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])rúined(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "rú -- ined"],
  // s/\<Whoe -- ver\>/Who -- e -- ver/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])Whoe -- ver(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "Who -- e -- ver"],
  // s/\<Whoé -- ver\>/Who -- é -- ver/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])Whoé -- ver(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "Who -- é -- ver"],
  // s/\<ho -- pes\>/hopes/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ho -- pes(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "hopes"],
  // s/\<hó -- pes\>/hópes/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])hó -- pes(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "hópes"],
  // s/\<sc -- hemes\>/schemes/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sc -- hemes(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "schemes"],
  // s/\<sc -- hémes\>/schémes/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])sc -- hémes(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "schémes"],
  // s/\<Ch -- rist\>/Christ/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])Ch -- rist(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "Christ"],
  // s/\<Ch -- ríst\>/Chríst/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])Ch -- ríst(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "Chríst"],
  // s/\<co -- vetous\>/co -- ve -- tous/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])co -- vetous(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "co -- ve -- tous"],
  // s/\<có -- vetous\>/có -- ve -- tous/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])có -- vetous(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "có -- ve -- tous"],
  // s/\<ínte -- rest\>/ín -- terest/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ínte -- rest(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ín -- terest"],
  // s/\<inte -- rest\>/in -- terest/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])inte -- rest(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "in -- terest"],
  // s/\<inst -- ruction\>/in -- struc -- tion/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])inst -- ruction(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "in -- struc -- tion"],
  // s/\<inst -- rúction\>/in -- strúc -- tion/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])inst -- rúction(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "in -- strúc -- tion"],
  // s/\<re -- deemer\>/re -- dee -- mer/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])re -- deemer(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "re -- dee -- mer"],
  // s/\<re -- déemer\>/re -- dée -- mer/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])re -- déemer(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "re -- dée -- mer"],
  // s/\<\(p[ée]\)ri\>/\1 -- ri/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])(p[ée])ri(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "$1 -- ri"],
  // s/\<fortune\>/for -- tune/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])fortune(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "for -- tune"],
  // s/\<fórtune\>/fór -- tune/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])fórtune(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "fór -- tune"],
  // s/\<troubled\>/trou -- bled/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])troubled(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "trou -- bled"],
  // s/\<tróubled\>/tróu -- bled/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])tróubled(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "tróu -- bled"],
  // s/\<wicked\>/wic -- ked/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wicked(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "wic -- ked"],
  // s/\<wícked\>/wíc -- ked/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wícked(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "wíc -- ked"],
  // s/\<mighty\>/mi -- ghty/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])mighty(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "mi -- ghty"],
  // s/\<míghty\>/mí -- ghty/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])míghty(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "mí -- ghty"],
  // s/\<daughter\>/daugh -- ter/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])daughter(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "daugh -- ter"],
  // s/\<dáughter\>/dáugh -- ter/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])dáughter(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "dáugh -- ter"],
  // s/\<any\>/a -- ny/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])any(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "a -- ny"],
  // s/\<ány\>/á -- ny/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ány(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "á -- ny"],
  // s/\<hear -- t’s\>/heart’s/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])hear -- t’s(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "heart’s"],
  // s/\<héar -- t’s\>/héart’s/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])héar -- t’s(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "héart’s"],
  // s/\<hy -- mns\>/hymns/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])hy -- mns(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "hymns"],
  // s/\<hý -- mns\>/hýmns/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])hý -- mns(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "hýmns"],
  // s/\<ritance\>/ri -- tance/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ritance(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ri -- tance"],
  // s/\<ritánce\>/ri -- tánce/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ritánce(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "ri -- tánce"],
  // s/\<\(ch[áa]\) -- ri -- \(ot[s]*\)/\1 -- ri\2/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])(ch[áa]) -- ri -- (ot[s]*)/gu, "$1 -- ri$2"],
  // s/\<bri -- deg -- room\>/bride -- groom/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])bri -- deg -- room(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "bride -- groom"],
  // s/\<brí -- deg -- room\>/bríde -- groom/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])brí -- deg -- room(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "bríde -- groom"],
  // s/\<wi -- de-o -- pen\>/wide- -- o -- pen/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wi -- de-o -- pen(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "wide- -- o -- pen"],
  // s/\<wí -- de-o -- pen\>/wíde- -- o -- pen/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])wí -- de-o -- pen(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "wíde- -- o -- pen"],
  // s/\<vin -- dica -- ted\>/vin -- di -- ca -- ted/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])vin -- dica -- ted(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "vin -- di -- ca -- ted"],
  // s/\<vín -- dica -- ted\>/vín -- di -- ca -- ted/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])vín -- dica -- ted(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "vín -- di -- ca -- ted"],
  // s/\<Al -- le -- luia\>/Al -- le -- lu -- ia/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])Al -- le -- luia(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "Al -- le -- lu -- ia"],
  // s/\<Al -- le -- lúia\>/Al -- le -- lú -- ia/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])Al -- le -- lúia(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "Al -- le -- lú -- ia"],
  // s/\<who -- mever\>/who -- me -- ver/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])who -- mever(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "who -- me -- ver"],
  // s/\<who -- méver\>/who -- mé -- ver/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])who -- méver(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "who -- mé -- ver"],
  // s/LO -- RD/LORD/g;
  [/LO -- RD/gu, "LORD"],
  // s/LÓ -- RD/LÓRD/g;
  [/LÓ -- RD/gu, "LÓRD"],
  // s/\<stronger\>/stron -- ger/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])stronger(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "stron -- ger"],
  // s/\<strónger\>/strón -- ger/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])strónger(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "strón -- ger"],
  // s/\<for -- m\>/form/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])for -- m(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "form"],
  // s/\<fór -- m\>/fórm/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])fór -- m(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "fórm"],
  // s/\<quáli\>/quá -- li/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])quáli(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "quá -- li"],
  // s/\<quali\>/qua -- li/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])quali(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "qua -- li"],
  // s/\<só -- meth -- ing\>/sóme -- thing/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])só -- meth -- ing(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "sóme -- thing"],
  // s/\<so -- meth -- ing\>/some -- thing/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])so -- meth -- ing(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "some -- thing"],
  // s/\<bédient\>/bé -- dient/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])bédient(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "bé -- dient"],
  // s/\<bedient\>/be -- dient/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])bedient(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "be -- dient"],
  // s/\<ná -- me\>/náme/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ná -- me(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "náme"],
  // s/\<na -- me\>/name/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])na -- me(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "name"],
  // s/\<bén -- d\>/bénd/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])bén -- d(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "bénd"],
  // s/\<ben -- d\>/bend/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])ben -- d(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "bend"],
  // s/\<Lór -- d\>/Lórd/g;
  [/(?<![\p{L}\p{N}_])(?=[\p{L}\p{N}_])Lór -- d(?<=[\p{L}\p{N}_])(?![\p{L}\p{N}_])/gu, "Lórd"],
  // s/--  --/--/g;
  [/--  --/gu, "--"],
  // s/  -- / /g;
  [/  -- /gu, " "],
];

/**
 * Insert " -- " syllable breaks into one line of psalm text.
 *
 * The text should already carry acute accents on its stressed syllables, as
 * the Grail psalter under vendor/psautier/ does. Syllables within a
 * word come out separated by " -- ", words by a plain space.
 */
export function syllabifyLine(line: string): string {
  let s = line;
  for (const [re, rep] of RULES) s = s.replace(re, rep);
  return s;
}
