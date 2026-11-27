import { resolve } from "node:path";

import { defineConfig, mergeConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

import { CSSDOC_TAG_NAMES } from "./packages/spec/src/index.ts";

const lintPlugins: NonNullable<NonNullable<UserConfig["lint"]>["plugins"]> = [
  "eslint",
  "import",
  "node",
  "oxc",
  "promise",
  "vitest",
  "jsdoc",
  "typescript",
  "unicorn",
];

/** Vue lint configuration for the VitePress site. */
export const docsLint: Pick<NonNullable<UserConfig["lint"]>, "plugins" | "rules"> = {
  plugins: [...lintPlugins, "vue"],
  rules: {
    // Keep prop access explicitly reactive; component prop counts and registration casing vary.
    "vue/define-props-destructuring": ["warn", { destructure: "never" }],
    "vue/max-props": "off",
    "vue/component-definition-name-casing": "off",
  },
};

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
    plugins: lintPlugins,
    jsPlugins: [{ name: "regexp", specifier: "eslint-plugin-regexp" }],
    rules: {
      "typescript/no-floating-promises": "error",
      "typescript/no-misused-promises": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-unsafe-function-type": "error",
      "typescript/no-unsafe-enum-assignment": "error",
      "typescript/no-unsafe-enum-comparison": "error",
      "eslint/no-fallthrough": "error",
      // Evaluate declaration conventions separately from assertion safety.
      "typescript/no-unnecessary-type-assertion": "warn",
      // Public members are implicit; constructor parameter properties can require an access modifier.
      "typescript/explicit-member-accessibility": [
        "warn",
        { accessibility: "no-public", overrides: { parameterProperties: "off" } },
      ],
      "typescript/no-unsafe-type-assertion": "error",
      // Falsy primitive defaults (including empty strings and zero) can be intentional.
      "typescript/prefer-nullish-coalescing": ["warn", { ignorePrimitives: true }],
      // TypeScript permits ignored callback results; css-tree also consumes walk.skip from void-typed visitors.
      "typescript/strict-void-return": "off",
      // Function properties enforce parameter variance in callback contracts; class methods are unchanged.
      "typescript/method-signature-style": ["warn", "property"],
      "typescript/no-confusing-void-expression": ["warn", { ignoreArrowShorthand: true }],
      // Interfaces support augmentation; object aliases can supply implicit index signatures.
      "typescript/consistent-type-definitions": "off",
      // Promise-owning declarations are async; concise arrow forwarders needn't wrap an existing promise.
      "typescript/promise-function-async": ["warn", { checkArrowFunctions: false }],
      "typescript/array-type": ["warn", { default: "array-simple" }],
      "typescript/prefer-regexp-exec": "warn",
      "typescript/no-explicit-any": "error",
      "typescript/consistent-return": "warn",
      "typescript/restrict-template-expressions": [
        "warn",
        { allowAny: false, allowNullish: false },
      ],
      // LSP clients may still send rootUri; the VS Code client still forwards push settings.
      "typescript/no-deprecated": [
        "warn",
        {
          allow: [
            { from: "package", package: "vscode-languageserver-protocol", name: "rootUri" },
            { from: "package", package: "vscode-languageclient", name: "configurationSection" },
          ],
        },
      ],
      "typescript/no-misused-spread": "error",
      // Ambient declarations must follow their sources into cross-package TypeScript projects.
      "typescript/triple-slash-reference": ["warn", { path: "always" }],
      "typescript/prefer-for-of": "warn",
      "typescript/no-import-type-side-effects": "error",
      "typescript/no-require-imports": "error",
      "typescript/ban-ts-comment": "error",
      "typescript/explicit-module-boundary-types": "error",
      "typescript/require-array-sort-compare": "warn",
      "typescript/prefer-includes": "warn",
      "typescript/no-base-to-string": "error",
      "typescript/non-nullable-type-assertion-style": "warn",
      "typescript/unbound-method": "error",
      "typescript/no-unnecessary-template-expression": "warn",
      "typescript/no-unnecessary-type-parameters": "warn",
      // Computed exported strings still require annotations under isolatedDeclarations.
      "typescript/no-inferrable-types": "off",
      // Parsers and framework callbacks deliberately accept and mutate shared objects.
      "typescript/prefer-readonly-parameter-types": "off",
      // Known primitive and optional values can use truthiness; unknown inputs must be narrowed.
      "typescript/strict-boolean-expressions": [
        "warn",
        {
          allowNullableBoolean: true,
          allowNullableNumber: true,
          allowNullableObject: true,
          allowNullableString: true,
        },
      ],
      // Non-null assertions express parser and test invariants where checks already establish them.
      "typescript/no-non-null-assertion": "off",
      // no-require-imports covers this deprecated, narrower rule.
      "typescript/no-var-requires": "off",
      // HTML sanitization removes a property selected from the node's tag.
      "typescript/no-dynamic-delete": "off",
      // Literal comparisons still distinguish nullable or untrusted values from strict booleans.
      "typescript/no-unnecessary-boolean-literal-compare": "warn",
      // Public boundaries have explicit types; local helpers can use inference.
      "typescript/explicit-function-return-type": "off",
      // Targeted unsafe-function, wrapper-object, and empty-object rules replace this deprecated rule.
      "typescript/ban-types": "off",
      "typescript/no-empty-object-type": "error",
      // Preserve modern syntax, package barrels, and intentional ownership boundaries.
      "oxc/no-async-await": "off",
      "oxc/no-optional-chaining": "off",
      "oxc/no-rest-spread-properties": "off",
      "oxc/no-barrel-file": "off",
      // Published const enums aren't compatible with consumers' isolated-module compilation.
      "oxc/no-const-enum": "error",
      // This heuristic doesn't know whether a decimal represents a mathematical constant.
      "oxc/approx-constant": "off",
      // The workspace has no Express 4 endpoint host.
      "oxc/no-async-endpoint-handlers": "off",
      // Exported callbacks can have an explicitly typed receiver and be bound by their consumer.
      "oxc/no-this-in-exported-function": "off",
      // Borrowed array elements mustn't become mutated just to avoid copying them.
      "oxc/no-map-spread": "off",
      // Hoisting shared branch code can change its ordering relative to predicate side effects.
      "oxc/branches-sharing-code": "off",
      // The installed rule still rejects ES2026's valid precision arguments up to 100.
      "oxc/number-arg-out-of-range": "off",
      // Multiplication by zero preserves signed zero and produces NaN for non-finite inputs.
      "oxc/erasing-op": "off",
      // Combining strict equality with a relational comparison isn't coercive <= or >=.
      "oxc/double-comparisons": "off",
      // Recursive-only parameters may preserve a public signature; don't apply the unsafe fix.
      "oxc/only-used-in-recursion": "warn",
      "unicorn/prefer-node-protocol": "error",
      "unicorn/no-accessor-recursion": "error",
      "unicorn/no-array-fill-with-reference-type": "error",
      // Review remaining syntax and scoping conventions individually, not as a blanket preset.
      "unicorn/explicit-length-check": "warn",
      // Node supports both named imports and namespaces; the choice depends on the API being grouped.
      "unicorn/import-style": "off",
      "unicorn/prefer-string-raw": "warn",
      // Formatter-grouped classifiers can be clearer than several intermediate assignments.
      "unicorn/no-nested-ternary": "off",
      // Awaited-result property access is valid and keeps request envelopes together in assertions.
      "unicorn/no-await-expression-member": "off",
      "unicorn/consistent-function-scoping": "warn",
      "unicorn/consistent-existence-index-check": "warn",
      "unicorn/no-array-callback-reference": "warn",
      // Composition depth isn't a correctness or performance bound.
      "unicorn/max-nested-calls": "off",
      "unicorn/prefer-number-coercion": "warn",
      "unicorn/prefer-at": "warn",
      "unicorn/prefer-type-error": "warn",
      "unicorn/prefer-single-call": "warn",
      // Oxfmt writes lowercase hexadecimal digits; this rule demands uppercase.
      "unicorn/number-literal-case": "off",
      // Keep class/component names and ordinary module names without permitting arbitrary casing.
      "unicorn/filename-case": [
        "warn",
        { cases: { camelCase: true, kebabCase: true, pascalCase: true } },
      ],
      // Native options can't exempt explicit returns required by the return-consistency policy.
      "unicorn/no-useless-undefined": "off",
      "unicorn/no-lonely-if": "warn",
      "unicorn/prefer-string-replace-all": "warn",
      "unicorn/prefer-structured-clone": "warn",
      "unicorn/prefer-code-point": "warn",
      "unicorn/no-useless-collection-argument": "warn",
      "unicorn/catch-error-name": "warn",
      "unicorn/escape-case": "warn",
      "unicorn/prefer-spread": "warn",
      // An explicit ./ prefix communicates that a URL is relative without changing its resolution.
      "unicorn/relative-url-style": "off",
      "unicorn/prefer-import-meta-properties": "warn",
      "unicorn/no-process-exit": "warn",
      "unicorn/prefer-set-has": "warn",
      // Choose conditional forms for readability; break placement doesn't change switch semantics.
      "unicorn/prefer-ternary": "off",
      "unicorn/switch-case-break-position": "off",
      "unicorn/prefer-dom-node-dataset": "warn",
      "unicorn/new-for-builtins": "warn",
      "unicorn/prefer-includes": "warn",
      "unicorn/prefer-array-flat": "warn",
      "unicorn/prefer-logical-operator-over-ternary": "warn",
      "unicorn/prefer-module": "warn",
      "unicorn/no-useless-spread": "warn",
      // JSON, LSP, and DOM APIs use null as part of their contracts.
      "unicorn/no-null": "off",
      // forEach is useful when the callback also needs an index.
      "unicorn/no-array-for-each": "off",
      // Case clauses only need braces when they introduce block-scoped declarations.
      "unicorn/switch-case-braces": "off",
      // Sorting an owned array in place can avoid an unnecessary copy.
      "unicorn/no-array-sort": "off",
      // Reversing an owned array in place can likewise avoid a copy.
      "unicorn/no-array-reverse": "off",
      // Check regex correctness, risky performance, and language-preserving simplifications.
      "regexp/no-contradiction-with-assertion": "error",
      "regexp/no-dupe-disjunctions": "warn",
      "regexp/no-empty-alternative": "warn",
      "regexp/no-empty-capturing-group": "warn",
      "regexp/no-empty-group": "warn",
      "regexp/no-empty-lookarounds-assertion": "error",
      "regexp/no-escape-backspace": "error",
      "regexp/no-lazy-ends": "warn",
      "regexp/no-misleading-capturing-group": "warn",
      "regexp/no-missing-g-flag": "error",
      "regexp/no-optional-assertion": "error",
      "regexp/no-potentially-useless-backreference": "warn",
      "regexp/no-super-linear-backtracking": "error",
      "regexp/no-super-linear-move": "warn",
      "regexp/no-useless-assertions": "warn",
      "regexp/no-useless-dollar-replacements": "warn",
      "regexp/strict": "warn",
      "regexp/confusing-quantifier": "warn",
      "regexp/no-dupe-characters-character-class": "warn",
      "regexp/no-empty-string-literal": "warn",
      "regexp/no-extra-lookaround-assertions": "warn",
      "regexp/no-invisible-character": "warn",
      "regexp/no-legacy-features": "warn",
      "regexp/no-non-standard-flag": "error",
      "regexp/no-obscure-range": "warn",
      "regexp/no-trivially-nested-assertion": "warn",
      "regexp/no-trivially-nested-quantifier": "warn",
      "regexp/no-unused-capturing-group": "warn",
      "regexp/no-useless-flag": "warn",
      "regexp/no-useless-lazy": "warn",
      "regexp/no-useless-quantifier": "warn",
      "regexp/no-useless-range": "warn",
      "regexp/no-useless-set-operand": "warn",
      "regexp/no-useless-string-literal": "warn",
      "regexp/no-useless-two-nums-quantifier": "warn",
      "regexp/no-zero-quantifier": "warn",
      "regexp/optimal-lookaround-quantifier": "warn",
      "regexp/optimal-quantifier-concatenation": "warn",
      "regexp/simplify-set-operations": "warn",
      // Cover statically resolved constructor patterns as well as native regex literals.
      "regexp/no-empty-character-class": "error",
      "regexp/no-invalid-regexp": "error",
      "regexp/no-misleading-unicode-character": "error",
      // The JS plugin covers literals plus resolved constructor strings; avoid duplicate diagnostics.
      "eslint/no-empty-character-class": "off",
      "eslint/no-invalid-regexp": "off",
      "eslint/no-misleading-character-class": "off",
      "regexp/no-octal": "warn",
      "regexp/no-standalone-backslash": "warn",
      "regexp/control-character-escape": "warn",
      "regexp/match-any": "warn",
      "regexp/negation": "warn",
      "regexp/no-useless-backreference": "warn",
      "regexp/no-useless-character-class": "warn",
      // Native no-useless-escape also covers ordinary JS strings; strict covers constructor identities.
      "regexp/no-useless-escape": "off",
      "regexp/no-useless-non-capturing-group": "warn",
      "regexp/prefer-character-class": "warn",
      "regexp/prefer-d": "warn",
      "regexp/prefer-plus-quantifier": "warn",
      "regexp/prefer-predefined-assertion": "warn",
      "regexp/prefer-question-quantifier": "warn",
      "regexp/prefer-range": "warn",
      "regexp/prefer-star-quantifier": "warn",
      "regexp/prefer-unicode-codepoint-escapes": "warn",
      "regexp/prefer-w": "warn",
      "regexp/sort-flags": "warn",
      "regexp/use-ignore-case": "warn",
      // UTF-16 matching and interoperable JSON Schema patterns can't universally require u or v.
      "regexp/require-unicode-regexp": "off",
      "regexp/require-unicode-sets-regexp": "off",
      "regexp/prefer-set-operation": "off",
      // Positional captures and replacement boundaries are part of the parser's public contracts.
      "regexp/prefer-named-backreference": "off",
      "regexp/prefer-named-capture-group": "off",
      "regexp/prefer-named-replacement": "off",
      "regexp/prefer-result-array-groups": "off",
      "regexp/prefer-lookaround": "off",
      // Typed exec and Boolean-expression checks already distinguish capture extraction from testing.
      "regexp/prefer-regexp-exec": "off",
      "regexp/prefer-regexp-test": "off",
      // Control characters, multi-code-point literals, and literal dollar replacements can be intentional.
      "regexp/no-control-character": "off",
      "regexp/grapheme-string-literal": "off",
      "regexp/prefer-escape-replacement-dollar-char": "off",
      // Preserve authored pattern spelling and tier grouping rather than imposing cosmetic rewrites.
      "regexp/hexadecimal-escape": "off",
      "regexp/letter-case": "off",
      "regexp/prefer-quantifier": "off",
      "regexp/sort-alternatives": "off",
      "regexp/sort-character-class-elements": "off",
      "regexp/unicode-escape": "off",
      "regexp/unicode-property": "off",
      // Select nursery checks individually; the category changes as rules mature.
      "eslint/no-unreachable-loop": "error",
      "eslint/no-useless-assignment": "error",
      "import/named": "warn",
      // Explicit exports legally shadow star exports; this rule misreports core's full/lite barrel.
      "import/export": "off",
      // Export-name bans require a package-specific API policy.
      "eslint/no-restricted-exports": "off",
      // Returning a promise from finally awaits cleanup and propagates its rejection.
      "promise/no-return-in-finally": "off",
      // TypeScript resolves TS names; the ESM JavaScript override enables this syntax-only check.
      "eslint/no-undef": "off",
      // Indexed access and external APIs can be absent even when ambient types claim otherwise.
      "typescript/no-unnecessary-condition": "off",
      "unicorn/no-useless-iterator-to-array": "warn",
      // This implementation still reports null-preserving and falsy-string returns with safe options.
      "typescript/prefer-optional-chain": "off",
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
      // Structural equality and strict equality test different contracts; choose per assertion.
      "vitest/prefer-strict-equal": "off",
      // Truthiness matchers would weaken exact Boolean assertions.
      "vitest/prefer-to-be-truthy": "off",
      "vitest/prefer-to-be-falsy": "off",
      "vitest/prefer-strict-boolean-matchers": "warn",
      // Numeric comparison matchers can't replace lexicographic sortText comparisons.
      "vitest/prefer-comparison-matcher": "off",
      "vitest/prefer-expect-resolves": "warn",
      "vitest/consistent-test-it": ["warn", { fn: "test", withinDescribe: "test" }],
      // Feature and grammar titles needn't mirror a function name or use one capitalization.
      "vitest/prefer-lowercase-title": "off",
      "vitest/prefer-describe-function-title": "off",
      // Named exports, grouped public APIs, Node entry points, and mixed type imports are intentional.
      "import/no-named-export": "off",
      "import/prefer-default-export": "off",
      "import/no-nodejs-modules": "off",
      "import/group-exports": "off",
      "import/exports-last": "off",
      "import/consistent-type-specifier-style": ["warn", "prefer-top-level-if-only-type-imports"],
      // Namespace imports can group statically referenced value APIs and their associated types.
      "import/no-namespace": "off",
      "import/no-anonymous-default-export": "warn",
      // Oxfmt owns import ordering; keep value and type imports separate when appropriate.
      "eslint/sort-imports": "off",
      // import/no-duplicates already checks this and supports separate type imports.
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
      // Await handles both native promises and editor Thenables; event callbacks remain valid.
      "promise/prefer-await-to-then": "warn",
      // Error-first callback detection isn't proof that an API has a promise equivalent.
      "promise/prefer-await-to-callbacks": "off",
      "promise/prefer-catch": "warn",
      "promise/avoid-new": "warn",
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
        // Untyped JavaScript files don't provide reliable type information for these checks.
        files: ["**/*.{js,jsx,mjs,cjs}"],
        rules: {
          // JavaScript has no TypeScript signature to supply documented types.
          "jsdoc/require-param-type": "warn",
          "jsdoc/require-returns-type": "warn",
          "jsdoc/require-throws-type": "warn",
          "typescript/no-unsafe-assignment": "off",
          "typescript/no-unsafe-argument": "off",
          "typescript/no-unsafe-call": "off",
          "typescript/no-unsafe-member-access": "off",
          "typescript/no-unsafe-return": "off",
          "typescript/restrict-template-expressions": "off",
          "typescript/strict-boolean-expressions": "off",
        },
      },
      {
        // Esbuild resolves this shim's CommonJS require to css-tree's CJS implementation.
        files: ["**/servers/vscode/src/shims/css-tree.ts", "src/shims/css-tree.ts"],
        rules: {
          "typescript/no-require-imports": "off",
          "unicorn/prefer-module": "off",
        },
      },
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
          // Keep test-specific pure helpers near their fixtures rather than spreading setup across a file.
          "unicorn/consistent-function-scoping": "off",
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
