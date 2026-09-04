/**
 * Recovering plain psalm text from pointed HTML.
 *
 * This is the ONLY stripPointing. There used to be two exported under that
 * name — one here-equivalent copy in psalm-tone-engine.ts with the
 * lypsautierant guard, and one in psalm-tones/utils.ts without it — and the
 * UI imported the one without. Lypsautierant sets its mark glyphs as real
 * text nodes so CSS can place them under each syllable, so a naive tag strip
 * turns a pointed "of" into the literal word "of+", and re-pointing that
 * compounds the damage every time the user changes tone.
 *
 * Deliberately has no heavy imports: client components pull this in, and
 * psalm-tone-engine.ts reads psalmtone.js off disk at module scope, so that
 * module must never enter the browser bundle graph.
 */

import { stripLypsautierantHtml } from './lypsautierant-strip';

/** Strip all pointing markup and return plain text. */
export function stripPointing(text: string): string {
  if (!text) return '';

  // Lypsautierant markup needs its own inverse; see the note above.
  if (text.includes('lyps-')) return stripLypsautierantHtml(text);

  return text
    // The (?:\s[^>]*)? guard is load-bearing: "[^>]*" lets the 'b'
    // alternative swallow <br>, so this rule consumed the line breaks before
    // the rule below could turn them into newlines, and a multi-line psalm
    // came back as one run-together line. Same trick renderer.ts uses.
    .replace(/<\/?(?:strong|em|b|i)(?:\s[^>]*)?>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * True when this HTML already carries pointing from either engine.
 *
 * Used to decide whether text is safe to treat as a clean baseline. Both
 * engines mark up psalm text but in different dialects: the Gregorian tone
 * engine emits <strong>/<em>, lypsautierant emits spans classed lyps-*.
 */
export function hasPointingMarkup(html: string): boolean {
  if (!html) return false;
  return html.includes('lyps-') || /<\/?(strong|em|b|i)\b/i.test(html);
}
