import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { baseConfig } from "../../vite.config.base.ts";

// This package is bundled with esbuild (see the `build` task), not `vp pack`, because a VS Code
// extension must ship as a self-contained CommonJS bundle. Vite+ still handles format, lint, and
// typecheck via `vp check`.
const config: UserConfig = mergeConfig(
  baseConfig,
  defineConfig({
    // `vp run` sandboxes env vars by default (see viteplus.dev/guide/cache#environment-variables), so
    // these publish tasks must opt in to receive their PAT via `untrackedEnv` — the token isn't part
    // of the cache fingerprint. Without this, `vsce`/`ovsx` silently get no token in CI: `vsce` falls
    // back to an anonymous credential and fails auth, `ovsx` prompts interactively and the job aborts.
    run: {
      tasks: {
        build: "node scripts/build.mjs",
        check: "vp check",
        "type-check": "tsc --noEmit",
        test: "vp test",
        icon: { command: "node scripts/gen-icon.mjs", cache: false },
        package: {
          command: "vp run -t build && vsce package --no-dependencies -o cssdoc.vsix",
          cache: false,
        },
        "publish:vsce": {
          command: "vsce publish --no-dependencies --packagePath cssdoc.vsix",
          cache: {
            untrackedEnv: ["VSCE_PAT"],
          },
        },
        "publish:ovsx": {
          command: "ovsx publish cssdoc.vsix",
          cache: {
            untrackedEnv: ["OVSX_PAT"],
          },
        },
      },
    },
  }),
);

export default config;
