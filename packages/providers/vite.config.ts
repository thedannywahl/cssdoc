import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { libraryConfig } from "../../vite.config.base.ts";

const config: UserConfig = mergeConfig(
  libraryConfig,
  defineConfig({
    pack: { entry: ["src/index.ts", "src/highlighting.ts"], exports: false },
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
  }),
);

export default config;
