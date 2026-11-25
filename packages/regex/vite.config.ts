import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { baseConfig } from "../../vite.config.base.ts";

const config: UserConfig = mergeConfig(
  baseConfig,
  defineConfig({
    pack: {
      entry: "src/index.ts",
      dts: true,
    },
    run: {
      tasks: {
        build: "vp pack",
        dev: { command: "vp pack --watch", cache: false },
        test: "vp test",
        check: "vp check",
        publint: "publint",
        "type-check": "tsc --noEmit",
      },
    },
  }),
);

export default config;
