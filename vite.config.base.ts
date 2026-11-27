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
      perf: "warn",
      style: "warn",
      restriction: "warn",
      suspicious: "warn",
      nursery: "off",
    },
    options: { typeAware: true, typeCheck: true },
    plugins: ["import", "node", "promise", "vitest", "jsdoc"],
    rules: {
      // Select nursery checks individually; the category changes as rules mature.
      "eslint/no-unreachable-loop": "warn",
      "eslint/no-useless-assignment": "warn",
      "import/named": "warn",
      // Vitest supplies a default timeout; individual tests can override it when needed.
      "vitest/require-test-timeout": "off",
      // Parsers and public APIs use undefined, increments, and bit flags intentionally.
      "eslint/no-undefined": "off",
      "eslint/no-plusplus": "off",
      "eslint/no-bitwise": "off",
      // Relative imports within packages and default exports for framework entry points are intentional.
      "import/no-relative-parent-imports": "off",
      "import/no-default-export": "off",
      // Function declarations are hoisted; still check variables and classes before initialization.
      "eslint/no-use-before-define": ["warn", { functions: false }],
      // Mark intentionally unawaited operations without allowing void as a general expression.
      "eslint/no-void": ["warn", { allowAsStatement: true }],
      // Error and warning output must remain visible to users.
      "eslint/no-console": ["warn", { allow: ["warn", "error"] }],
      // Parser branches and instance-oriented APIs don't fit arbitrary complexity or static-method rules.
      "eslint/complexity": "off",
      "eslint/class-methods-use-this": "off",
      // These rules conflict with explicit test imports, precise assertions, and shared setup.
      "vitest/no-importing-vitest-globals": "off",
      "vitest/no-hooks": "off",
      "vitest/require-hook": "off",
      "vitest/prefer-expect-assertions": "off",
      "vitest/require-top-level-describe": "off",
      "vitest/max-expects": "off",
      "vitest/prefer-strict-equal": "off",
      "vitest/prefer-to-be-truthy": "off",
      "vitest/prefer-to-be-falsy": "off",
      "vitest/prefer-strict-boolean-matchers": "off",
      "vitest/prefer-comparison-matcher": "off",
      "vitest/prefer-expect-resolves": "off",
      "vitest/consistent-test-it": "off",
      "vitest/prefer-lowercase-title": "off",
      "vitest/prefer-describe-function-title": "off",
      // Named exports, grouped public APIs, Node entry points, and mixed type imports are intentional.
      "import/no-named-export": "off",
      "import/prefer-default-export": "off",
      "import/no-nodejs-modules": "off",
      "import/group-exports": "off",
      "import/exports-last": "off",
      "import/consistent-type-specifier-style": "off",
      "import/no-namespace": "off",
      "import/no-anonymous-default-export": "off",
      // Oxfmt owns import ordering; keep value and type imports separate when appropriate.
      "eslint/sort-imports": "off",
      "eslint/no-duplicate-imports": "off",
      // Catalog and fixture ordering, short parser names, numeric examples, and concise guards carry meaning.
      "eslint/sort-keys": "off",
      "eslint/sort-vars": "off",
      "eslint/one-var": "off",
      "eslint/no-magic-numbers": "off",
      "eslint/id-length": "off",
      "eslint/curly": ["warn", "multi-line"],
      "eslint/capitalized-comments": "off",
      "eslint/prefer-destructuring": [
        "warn",
        {
          VariableDeclarator: { array: false, object: true },
          AssignmentExpression: { array: false, object: false },
        },
      ],
      "eslint/new-cap": ["warn", { capIsNewExceptions: ["Rule", "Declaration"] }],
      // Pick the clearest control flow and declaration form for each case.
      "eslint/no-ternary": "off",
      "eslint/no-nested-ternary": "off",
      "eslint/no-continue": "off",
      "eslint/func-style": "off",
      "eslint/init-declarations": "off",
      // Synchronous I/O is appropriate in build tools and isolated tests.
      "node/no-sync": "off",
      // Promise chains and callbacks also bridge event-based and Thenable APIs.
      "promise/prefer-await-to-then": "off",
      "promise/prefer-await-to-callbacks": "off",
      "promise/prefer-catch": "off",
      "promise/avoid-new": "off",
      // As with the other size limits, these don't fit parsers, generators, and tests.
      "eslint/max-statements": "off",
      "eslint/max-params": "off",
      // allow CSS sideeffect imports in vitepress
      "import/no-unassigned-import": ["warn", { allow: ["**/*.css"] }],
      // ignore cssdoc tags in jsdoc checks
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
    overrides: [
      {
        // Node ESM scripts aren't type-checked; don't grant CommonJS-only globals.
        files: ["**/*.mjs"],
        env: { "shared-node-browser": true },
        globals: { process: "readonly", Buffer: "readonly" },
        rules: { "eslint/no-undef": "warn" },
      },
      {
        // LSP smoke tests poll for state changes and send ordered document notifications.
        files: ["**/server-smoke.test.ts"],
        rules: { "eslint/no-await-in-loop": "off" },
      },
      {
        // VitePress's Markdown renderer maintains state across renders.
        files: ["**/pattern-reference.data.ts"],
        rules: { "eslint/no-await-in-loop": "off" },
      },
      {
        // Fixtures deliberately contain literal template placeholders and unsafe URLs.
        files: [
          "**/*.test.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
          "**/*.spec.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
        ],
        rules: {
          "eslint/no-template-curly-in-string": "off",
          "eslint/no-script-url": "off",
          "eslint/prefer-template": "off",
          "eslint/no-console": "off",
          "node/no-process-env": "off",
        },
      },
      {
        // The extension's bundled CommonJS shim must load this dependency with require.
        files: ["**/shims/css-tree.ts"],
        rules: { "node/global-require": "off", "import/no-commonjs": "off" },
      },
      {
        // Build and CLI entry points use stdout and top-level await.
        files: ["**/scripts/**", "**/bin/**"],
        rules: { "eslint/no-console": "off", "node/no-top-level-await": "off" },
      },
      {
        // The docs configuration reads its optional deployment base from the environment.
        files: ["**/.vitepress/config.ts"],
        rules: { "node/no-process-env": "off" },
      },
      {
        // Ambient declarations intentionally augment globals and declare external modules.
        files: ["**/*.d.ts"],
        rules: { "import/unambiguous": "off" },
      },
    ],
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
