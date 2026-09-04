/**
 * ESM resolver hook that teaches `node --test` the two import styles this
 * codebase uses but plain Node does not understand.
 *
 * Node 22 strips TypeScript types natively, so the source files run as-is;
 * what it will not do is guess a file extension or expand a tsconfig path
 * alias, because both are bundler conventions. Next.js supplies them at
 * build time. The tests do not go through Next, so they supply them here:
 *
 *   1. extensionless relative specifiers — "./lypsautierant-strip"
 *   2. the "@/*" alias from tsconfig.json, rooted at the repo
 *
 * Registered by scripts/test-register.mjs, which `npm test` passes to
 * --import. Kept separate from that file because a resolver hook runs on its
 * own thread and must not close over anything from the main one.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTS = ['.ts', '.tsx', '.mjs', '.js', '.json'];

/** Append the first extension that names a real file, if the path lacks one. */
function withExtension(absolute) {
  if (existsSync(absolute) && path.extname(absolute)) return absolute;
  for (const ext of EXTS) {
    const candidate = absolute + ext;
    if (existsSync(candidate)) return candidate;
  }
  for (const ext of EXTS) {
    const candidate = path.join(absolute, 'index' + ext);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  let base = null;

  if (specifier.startsWith('@/')) {
    base = path.join(ROOT, specifier.slice(2));
  } else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  if (base) {
    const resolved = withExtension(base);
    if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  }

  return nextResolve(specifier, context);
}
