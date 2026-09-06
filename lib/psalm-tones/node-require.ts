/**
 * A CommonJS `require` that works in both places this code runs.
 *
 * psalmtone.js is loaded as a raw CommonJS file rather than bundled: it uses
 * implicit global declarations that webpack's strict-mode output breaks (the
 * `oTags` variable inside `syllable()`), so it has to reach the real Node
 * loader. Under Next that means `eval("require")`, which webpack leaves
 * alone. Under `node --test` the modules are ESM and there is no `require`
 * in scope at all, so `eval("require")` throws.
 *
 * It used to be `eval("require")` alone, inside a try/catch that fell back to
 * a cruder syllabifier. The tests therefore ran against a psalm tone engine
 * that could not syllabify Latin — it tagged whole words — and could not see
 * psalmtone.js, so nothing they asserted about the pointing was true of the
 * running app.
 */
import { createRequire } from 'node:module';
import path from 'node:path';

export const nodeRequire: NodeRequire = (() => {
  try {
    // eslint-disable-next-line no-eval
    const r = eval('require');
    if (typeof r === 'function') return r as NodeRequire;
  } catch {
    /* ESM scope: fall through */
  }
  return createRequire(path.join(process.cwd(), 'index.js'));
})();
