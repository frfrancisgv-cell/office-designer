/**
 * Installs the resolver hook for `npm test`. See scripts/ts-resolve.mjs.
 */
import { register } from 'node:module';

register('./ts-resolve.mjs', import.meta.url);
