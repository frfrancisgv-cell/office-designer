/**
 * psalm-utils.ts
 *
 * Pure (non-React) utilities for psalm syllabification, stress detection,
 * and liturgical pointing. These functions have no UI dependencies and can
 * be used in both client and server contexts.
 */

// ── Stress dictionaries ───────────────────────────────────────────────────────

export const UNSTRESSED_WORDS = new Set([
  'a','an','the','of','in','to','for','and','or','but','nor',
  'at','by','on','as','it','is','was','are','be','he','she','we',
  'his','her','our','its','my','your','their','that','this','these',
  'those','with','from','not','no','am','has','had','have','do',
  'did','does','if','up','than','when','will','who','what','all','some','any',
]);

export const UNSTRESSED_FIRST_SYLLS = new Set([
  'a','be','de','di','en','em','ex','e','pre','pro','re','un','for',
]);

// ── Syllabification ───────────────────────────────────────────────────────────

/**
 * Naïve English syllabifier. Splits a single token into syllable parts.
 * Good enough for liturgical pointing of psalms.
 */
export function syllabify(word: string): string[] {
  const m = word.match(/^([^a-zA-Z]*)([a-zA-Z']+)([^a-zA-Z]*)$/);
  if (!m) return [word];
  const [, pre, core, post] = m;
  if (core.length <= 2) return [word];

  const lower = core.toLowerCase();
  const hasSilentE = lower.length > 2 && /[^aeiou]e$/.test(lower);
  const work = hasSilentE ? lower.slice(0, -1) : lower;

  const vRe = /[aeiouy]+/g;
  const vowelRuns: Array<{ s: number; e: number }> = [];
  let vm: RegExpExecArray | null;
  while ((vm = vRe.exec(work)) !== null) vowelRuns.push({ s: vm.index, e: vm.index + vm[0].length });

  if (vowelRuns.length <= 1) return [word];

  const splitPts: number[] = [];
  for (let i = 0; i < vowelRuns.length - 1; i++) {
    const gap = work.substring(vowelRuns[i].e, vowelRuns[i + 1].s);
    splitPts.push(gap.length <= 1 ? vowelRuns[i].e : vowelRuns[i].e + 1);
  }

  const parts: string[] = [];
  let start = 0;
  for (const sp of splitPts) { parts.push(core.substring(start, sp)); start = sp; }
  parts.push(core.substring(start));

  parts[0] = pre + parts[0];
  parts[parts.length - 1] += post;
  return parts.filter(s => s.length > 0);
}

/** Return the stressed syllable index within a syllable array. */
export function wordStressIdx(syllables: string[]): number {
  if (syllables.length === 1) return 0;
  const first = syllables[0].toLowerCase().replace(/[^a-z]/g, '');
  return UNSTRESSED_FIRST_SYLLS.has(first) ? 1 : 0;
}

// ── Auto-pointing ─────────────────────────────────────────────────────────────

/**
 * Point a single segment of psalm text (between flex/mediant/finale markers).
 * Returns the segment with <strong> and <em> markup applied.
 */
export function pointSegment(segText: string, numItalics: number): string {
  const raw = segText.split(/([a-zA-Z']+)/);
  const tokens: Array<{ text: string; isSyll: boolean }> = [];
  for (const p of raw) {
    if (!p) continue;
    if (/^[a-zA-Z']/.test(p)) syllabify(p).forEach(s => tokens.push({ text: s, isSyll: true }));
    else tokens.push({ text: p, isSyll: false });
  }

  const syllPos = tokens.flatMap((t, i) => t.isSyll ? [i] : []);
  if (!syllPos.length) return segText;

  const words: Array<{ syllIndices: number[] }> = [];
  let cur: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].isSyll) { cur.push(i); }
    else if (cur.length) { words.push({ syllIndices: cur }); cur = []; }
  }
  if (cur.length) words.push({ syllIndices: cur });

  let accentIdx = syllPos[syllPos.length - 1];
  for (let wi = words.length - 1; wi >= 0; wi--) {
    const wText = words[wi].syllIndices.map(i => tokens[i].text).join('').toLowerCase().replace(/[^a-z]/g, '');
    if (!UNSTRESSED_WORDS.has(wText) || wi === words.length - 1) {
      const sylls = words[wi].syllIndices.map(i => tokens[i].text);
      const si = Math.min(wordStressIdx(sylls), words[wi].syllIndices.length - 1);
      accentIdx = words[wi].syllIndices[si];
      break;
    }
  }

  const accentPos = syllPos.indexOf(accentIdx);
  const italicSet = new Set(syllPos.slice(Math.max(0, accentPos - numItalics), accentPos));

  return tokens.map((t, i) => {
    if (i === accentIdx) return `<strong>${t.text}</strong>`;
    if (italicSet.has(i)) return `<em>${t.text}</em>`;
    return t.text;
  }).join('');
}

/**
 * Auto-point an entire psalm block (HTML string).
 * Strips existing strong/em, then re-applies pointing using `pointSegment`.
 */
export function autoPointPsalm(htmlContent: string, finalePreps: number): string {
  const plain = htmlContent
    .replace(/<\/?(strong|em)[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, '\u00a0');

  return plain.split('\n').map(line => {
    if (!line.trim()) return line;
    const out: string[] = [];
    let pos = 0;
    while (pos <= line.length) {
      const fi = line.indexOf('†', pos);
      const mi = line.indexOf('*', pos);
      const next = fi < 0 && mi < 0 ? -1 : fi < 0 ? mi : mi < 0 ? fi : Math.min(fi, mi);
      if (next < 0) {
        const seg = line.substring(pos);
        out.push(seg.trim() ? pointSegment(seg, finalePreps) : seg);
        break;
      }
      const marker = line[next];
      const seg = line.substring(pos, next);
      out.push(seg.trim() ? pointSegment(seg, marker === '†' ? 0 : 1) : seg);
      out.push(marker);
      pos = next + 1;
    }
    return out.join('');
  }).join('\n');
}

// ── Syllable editor types ─────────────────────────────────────────────────────

export type SegItem2 = { type: 'word'; sylls: string[] } | { type: 'gap'; text: string };

export interface ParsedSeg2 {
  items: SegItem2[];
  marker: '†' | '*' | null;
}

export interface ParsedLine2 {
  segs: ParsedSeg2[];
  isEmpty: boolean;
  rawEmpty: string;
}

// ── Psalm line parsing & serialization ───────────────────────────────────────

export function parsePsalmToLines(htmlContent: string): ParsedLine2[] {
  const plain = htmlContent
    .replace(/<\/?(strong|em)[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, '\u00a0').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return plain.split('\n').map(rawLine => {
    if (!rawLine.trim()) return { segs: [], isEmpty: true, rawEmpty: rawLine };
    const parts = rawLine.split(/(†|\*)/);
    const segs: ParsedSeg2[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const segText = parts[i] || '';
      const marker = (parts[i + 1] as '†' | '*') ?? null;
      const items: SegItem2[] = [];
      segText.split(/([a-zA-ZÀ-ÖØ-öø-ÿ'-]+)/u).forEach(wp => {
        if (!wp) return;
        if (/^[a-zA-ZÀ-ÖØ-öø-ÿ'-]/u.test(wp)) items.push({ type: 'word', sylls: syllabify(wp) });
        else items.push({ type: 'gap', text: wp });
      });
      segs.push({ items, marker });
    }
    return { segs, isEmpty: false, rawEmpty: '' };
  });
}

export function serializePsalmFromAccents(
  lines: ParsedLine2[],
  accents: Map<string, number>,
  finalePreps: number,
): string {
  return lines.map((line, li) => {
    if (line.isEmpty) return line.rawEmpty;
    return line.segs.map((seg, si) => {
      const accentIdx = accents.get(`${li}-${si}`) ?? -1;
      const numPreps = seg.marker === '†' ? 0 : seg.marker === '*' ? 1 : finalePreps;
      let syllCount = 0;
      let result = '';
      for (const item of seg.items) {
        if (item.type === 'gap') { result += item.text; continue; }
        for (const syll of item.sylls) {
          const idx = syllCount++;
          if (idx === accentIdx) result += `<strong>${syll}</strong>`;
          else if (accentIdx >= 0 && idx >= accentIdx - numPreps && idx < accentIdx) result += `<em>${syll}</em>`;
          else result += syll;
        }
      }
      return result + (seg.marker ?? '');
    }).join('');
  }).join('\n');
}

export function detectAccentsFromHtml(html: string, lines: ParsedLine2[]): Map<string, number> {
  const accents = new Map<string, number>();
  const rawLines = html.replace(/<br\s*\/?>/gi, '\n').split('\n');
  rawLines.forEach((rawLine, li) => {
    if (li >= lines.length || lines[li].isEmpty) return;
    const line = lines[li];
    const parts = rawLine.split(/(†|\*)/);
    for (let pi = 0, si = 0; pi < parts.length; pi += 2, si++) {
      if (si >= line.segs.length) break;
      const segHtml = parts[pi] || '';
      const strongIdx = segHtml.indexOf('<strong');
      if (strongIdx < 0) continue;
      const beforeText = segHtml.substring(0, strongIdx).replace(/<[^>]+>/g, '');
      let syllsBefore = 0;
      beforeText.split(/([a-zA-ZÀ-ÖØ-öø-ÿ'-]+)/u).forEach(wp => {
        if (/^[a-zA-ZÀ-ÖØ-öø-ÿ'-]/u.test(wp)) syllsBefore += syllabify(wp).length;
      });
      const totalSylls = line.segs[si].items.reduce((s, it) => s + (it.type === 'word' ? it.sylls.length : 0), 0);
      if (syllsBefore < totalSylls) accents.set(`${li}-${si}`, syllsBefore);
    }
  });
  return accents;
}
