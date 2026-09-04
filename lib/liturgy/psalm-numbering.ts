/**
 * Psalm numbering between the Hebrew (Masoretic) and Greek/Vulgate numbering
 * systems.
 *
 * The app addresses psalms by their Hebrew number, which is what the Liturgy
 * of the Hours and the English psalters use. The Latin psalm files in
 * jgabc-psalms/ are named by their Vulgate number, which diverges from Psalm
 * 9 onward because the Vulgate joins Hebrew 9 and 10 and splits Hebrew 147.
 *
 * There were two copies of this, and they had drifted: the copy in
 * app/api/psalm-text/route.ts was fixed to take only the leading integer,
 * the copy in lib/liturgy/office-engine.ts was not, so generating a Latin
 * office silently lost the text of every subdivided psalm. One copy now.
 */

/**
 * Hebrew psalm number → Vulgate psalm number.
 *
 * Accepts a subdivision such as "119.1-8" (see lib/types.ts and
 * propagate.ts) and reads the LEADING integer only. Stripping all non-digits
 * instead turned "119.1-8" into 11918, which fell through to the n >= 148
 * branch and named a psalm file that cannot exist — so every subdivided
 * psalm's Latin text was unreachable.
 */
export function hebrewToVulgate(psalm: number | string): number {
  const n = parseInt(String(psalm).match(/\d+/)?.[0] ?? '', 10);
  if (isNaN(n)) return 1;
  if (n <= 8) return n;
  if (n >= 10 && n <= 113) return n - 1;
  if (n === 114 || n === 115) return 113;
  if (n === 116) return 114;
  if (n >= 117 && n <= 146) return n - 1;
  if (n === 147) return 146;
  if (n >= 148) return n;
  return n;
}
