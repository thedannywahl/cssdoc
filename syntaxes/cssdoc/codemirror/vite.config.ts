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
      },
    },
    pack: {
      // Hand-managed exports in package.json (see the "." + "./package.json" subpaths).
      exports: false,
    },
  }),
);

export default config;
