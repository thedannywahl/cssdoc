import { resolve } from "node:path";

import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { CSSDOC_TAG_NAMES } from "./packages/spec/src/index.ts";

export const baseConfig: UserConfig = defineConfig({
  // Root and package runs resolve Vite+ through different workspace dependencies.
  test: { fsModuleCachePath: resolve(process.cwd(), "node_modules/.vitest-cache") },
  lint: {
    categories: {
      correctness: "error",
      pedantic: "warn",
      perf: "off",
      style: "off",
      restriction: "off",
      suspicious: "warn",
      nursery: "off",
    },
    options: { typeAware: true, typeCheck: true },
    plugins: ["import", "node", "promise", "vitest", "jsdoc"],
    rules: {
      /* allow CSS sideeffect imports in vitepress */
      "import/no-unassigned-import": ["warn", { allow: ["**/*.css"] }],
      /* ignore cssdoc tags in jsdoc checks */
      "jsdoc/check-tag-names": ["error", { definedTags: [...CSSDOC_TAG_NAMES] }],
      // TSDoc uses TypeScript types and asks for return descriptions when useful, not on every function.
      "jsdoc/require-param": ["warn", { ignoreWhenAllParamsMissing: true }],
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-type": "off",
      "jsdoc/require-throws-type": "off",
      // Fixture traversal and data-driven assertions legitimately use branches and loops.
      "vitest/no-conditional-in-test": "off",
      // Inline comments often explain individual fixture values or parser branches.
      "eslint/no-inline-comments": "off",
      // Catalogs, grammars, and parser control flow don't fit fixed size and nesting limits.
      "eslint/max-classes-per-file": "off",
      "eslint/max-depth": "off",
      "eslint/max-lines": "off",
      "eslint/max-lines-per-function": "off",
      "import/max-dependencies": "off",
    },
  },
  fmt: {
    sortImports: {
      groups: [
        "builtin",
        "external",
        ["internal", "subpath"],
        ["parent", "sibling", "index"],
        "style",
        "unknown",
      ],
      sortSideEffects: false,
    },
  },
});

export const libraryConfig: UserConfig = mergeConfig(baseConfig, {
  pack: { deps: { resolveDepSubpath: true }, dts: true, exports: true },
});
