/**
 * lypsautierant-strip.ts
 *
 * The inverse of the engine's HTML rendering. Split out from the engine so
 * that client components can import it without pulling in the generated
 * rule tables, which are several thousand lines.
 */

/**
 * Recover the plain psalm text from HTML this module produced.
 *
 * Necessary because the mark glyphs are real text nodes: stripping tags
 * naively turns "of" with a '+' under it into the word "of+", and pointing
 * that again compounds the damage every time the user changes mode.
 *
 * Mediant asterisks and flex daggers are kept, so pointing the result again
 * reproduces the same verse structure rather than re-inferring it — which
 * makes re-pointing idempotent and preserves any structure the user corrected
 * by hand. Verse numbers are not printed any more, so there are none to keep;
 * a lyps-verse span left in a block pointed before that change unwraps to its
 * bare number here and parseLine drops it on the next pass.
 */
export function stripLypsautierantHtml(html: string): string {
  return html
    // Marks carry no text of their own.
    .replace(/<span class="lyps-mk"[^>]*>[\s\S]*?<\/span>/g, '')
    .replace(/<span class="lyps-rule">\s*<\/span>/g, '')
    // These do, and it is text worth keeping.
    .replace(/<span class="lyps-(?:verse|star|divider)">([\s\S]*?)<\/span>/g, '$1')
    .replace(/<sup class="lyps-flex">([\s\S]*?)<\/sup>/g, '$1')
    // Unwrap the syllable wrappers, then anything else left over.
    .replace(/<\/?span[^>]*>/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // Collapse the spaces the removed marks and wrappers leave behind,
    // without touching the line structure the roles depend on.
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}
