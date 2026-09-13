/**
 * Plain JavaScript on purpose. Next transpiles a `next.config.ts` on every
 * start — `next start` in production included — and it does that with the SWC
 * native binding, which maps 32MB of compiler into the server and opens one
 * Tokio worker thread per core (32 of them on this box) that never compile
 * anything again. `next.config.js` and `.mjs` are looked for before `.ts`, so
 * keeping this file in JavaScript keeps the compiler out of the running
 * server. The JSDoc type below gives editors the checking the TS annotation
 * used to.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    // psalmtone.js uses implicit global var declarations that break
    // when webpack bundles/minifies in strict mode. Load it as an
    // external so Node.js require() loads the raw file at runtime.
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : []),
      ({ request }, callback) => {
        if (request && request.includes('psalmtone.js')) {
          return callback(null, 'commonjs ' + path.resolve(dirname, 'psalmtone.js'));
        }
        callback();
      },
    ];
    return config;
  },
};

export default nextConfig;
