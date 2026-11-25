import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { libraryConfig } from "../../vite.config.base.ts";
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
        attw: "node ../../scripts/check-package-types.mjs",
      },
    },
    pack: {
      // Two entries: the full barrel and the parse-free `./lite` subpath (no postcss). `exports: true`
      // writes both into package.json `exports`.
      entry: ["src/index.ts", "src/lite.ts"],
    },
  }),
);

export default config;
