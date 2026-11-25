import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { libraryConfig } from "../../../vite.config.base.ts";

const config: UserConfig = mergeConfig(
  libraryConfig,
  defineConfig({
    run: {
      tasks: {
        build: "vp pack",
        dev: { command: "vp pack --watch", cache: false },
        test: "vp test",
        check: "vp check",
        "type-check": "tsc --noEmit",
        publint: "publint",
        attw: "node ../../../scripts/check-package-types.mjs",
        generate: { command: "node scripts/generate.mjs", cache: false },
      },
    },
    pack: {
      // Hand-managed: we expose an extra ./cssdoc.injection.tmLanguage.json subpath that auto-exports drops.
      exports: false,
    },
  }),
);
export default config;
