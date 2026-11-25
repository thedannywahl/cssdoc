import { resolve } from "node:path";
import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { CSSDOC_TAG_NAMES } from "./packages/spec/src/index.ts";

export const baseConfig: UserConfig = defineConfig({
  // Root and package runs resolve Vite+ through different workspace dependencies.
  test: { fsModuleCachePath: resolve(process.cwd(), "node_modules/.vitest-cache") },
  lint: {
    options: { typeAware: true, typeCheck: true },
    plugins: ["import", "node", "promise", "vitest", "jsdoc"],
    rules: { "jsdoc/check-tag-names": ["warn", { definedTags: [...CSSDOC_TAG_NAMES] }] },
  },
  fmt: {},
});

export const libraryConfig: UserConfig = mergeConfig(baseConfig, {
  pack: { deps: { resolveDepSubpath: true }, dts: true, exports: true },
});
