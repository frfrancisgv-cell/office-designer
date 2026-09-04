import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    extends: [...next],
    rules: {
      // Enabled so the two deliberate, commented eval() sites in
      // lib/psalm-tones/ keep live disable directives, and a third one
      // cannot slip in unnoticed.
      "no-eval": "error",
    },
  },
  {
    // Vendored/generated, not ours to lint. The scratch files the old
    // list named are gone; see .gitignore for what stays untracked.
    ignores: [
      "public/**",
      "psalmtone.js",        // vendored sourceandsummit.com library; its eval is not ours
      "vendor/**",
      "lypsautierant/**",
      "divinum-officium/**",
      "OCO/**",
    ],
  }
]);
