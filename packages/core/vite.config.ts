import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { libraryConfig } from "../../vite.config.base.ts";

const config: UserConfig = mergeConfig(
  libraryConfig,
  defineConfig({
    fmt: { ignorePatterns: ["src/generated/model-schema.ts"] },
    run: {
      tasks: {
        build: "vpx ../../scripts/sync-model-schema.ts && vp pack",
        dev: { command: "vp pack --watch", cache: false },
        test: "vp test",
        check: "vpx ../../scripts/sync-model-schema.ts --check && vp check",
        "sync:model-schema": "vpx ../../scripts/sync-model-schema.ts",
        "type-check": "tsc --noEmit",
        publint: "publint",
        attw: "node ../../scripts/check-package-types.mjs",
      },
    },
    pack: {
      // The prose subpath adds Markdown interpretation without loading postcss.
      entry: ["src/index.ts", "src/lite.ts", "src/prose.ts", "src/schema.ts"],
    },
  }),
);

export default config;
