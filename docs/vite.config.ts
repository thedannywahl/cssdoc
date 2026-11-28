import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { baseConfig, docsLint } from "../vite.config.base.ts";

const config: UserConfig = mergeConfig(
  baseConfig,
  defineConfig({
    lint: docsLint,
    run: {
      tasks: {
        "lint:markdown": {
          command:
            'vp exec eslint --config eslint.config.mjs --max-warnings 0 "**/*.md" && markdownlint-cli2 --config .markdownlint-cli2.jsonc',
          cache: false,
        },
        "docs:api": { command: "typedoc", cache: false },
        "type-check":
          "node ../node_modules/typescript/bin/tsc --noEmit -p .vitepress/tsconfig.json && node ../node_modules/typescript/bin/tsc --noEmit -p tsconfig.typedoc.json",
        "docs:dev": {
          command: "node scripts/copy-schema.mjs && typedoc && vitepress dev",
          cache: false,
        },
        "docs:build": {
          command: "node scripts/copy-schema.mjs && typedoc && vitepress build",
          cache: false,
        },
        "docs:preview": { command: "vitepress preview", cache: false },
      },
    },
  }),
);

export default config;
