# @cssdoc

![cssdoc: A documentation toolchain for plain CSS — TSDoc, for CSS.](https://cssdoc.dev/og.png)

A framework-agnostic documentation toolchain for plain CSS — TSDoc, for CSS. Parse a doc-comment
grammar plus the CSS AST into a serializable model, then emit whatever you like on top — the way the
`@microsoft/tsdoc` family and TypeDoc split a parser, a config loader, and a set of emitters/plugins.

## Packages

Three tiers — a model, host-agnostic providers over it, and thin adapters — mirroring how TypeScript
and the CSS/HTML language services share one core.

### Model & config

| Package                                   | Path                 | What it is                                                                                                                             |
| ----------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cssdoc/core`](packages/core)           | `packages/core`      | The parser + model. A formal grammar (grammarkdown) and an expansive tag vocabulary that documents the modern CSSOM surface AST-first. |
| [`@cssdoc/regex`](packages/regex)         | `packages/regex`     | Shared CSS and cssdoc regex patterns and character primitives.                                                                         |
| [`@cssdoc/config`](packages/config)       | `packages/config`    | Loads a `cssdoc.json` config file (custom tags, `extends`). Like `@microsoft/tsdoc-config`.                                            |
| [`@cssdoc/index`](packages/index)         | `packages/index`     | A queryable semantic index over the model, plus the `Usage` abstraction and source spans.                                              |
| [`@cssdoc/providers`](packages/providers) | `packages/providers` | Host-agnostic aspect providers: diagnostics, completions, hover, and definitions.                                                      |
| [`@cssdoc/lint-core`](packages/lint-core) | `packages/lint-core` | Author-side doc-hygiene rules, as a façade over the providers.                                                                         |

### Emitters

| Package                                 | Path                | What it is                                                   |
| --------------------------------------- | ------------------- | ------------------------------------------------------------ |
| [`@cssdoc/markdown`](emitters/markdown) | `emitters/markdown` | Markdown pages + a sidebar (typedoc-vitepress-compatible).   |
| [`@cssdoc/html`](emitters/html)         | `emitters/html`     | Standalone, self-contained HTML pages + an index.            |
| [`@cssdoc/json`](emitters/json)         | `emitters/json`     | Structured JSON output + the model's JSON Schema.            |
| [`@cssdoc/llms`](emitters/llms)         | `emitters/llms`     | An `llms.txt`-style, token-efficient digest for LLM context. |

### Generators (standard interchange)

| Package                                                       | Path                            | What it is                                                             |
| ------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| [`@cssdoc/vscode-custom-data`](generators/vscode-custom-data) | `generators/vscode-custom-data` | VS Code `css`/`html` custom data for built-in editor completions.      |
| [`@cssdoc/cem`](generators/cem)                               | `generators/cem`                | A Custom Elements Manifest (`cssProperties`, `cssParts`, `cssStates`). |
| [`@cssdoc/dtcg`](generators/dtcg)                             | `generators/dtcg`               | Custom properties as W3C Design Tokens (DTCG).                         |

### Integrations

| Package                                              | Path                      | What it is                                                                                                                                                           |
| ---------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cssdoc/typedoc`](plugins/typedoc)                 | `plugins/typedoc`         | TypeDoc plugin: emits CSS reference pages alongside a TS API-docs build.                                                                                             |
| [`@cssdoc/stylelint-plugin`](plugins/stylelint)      | `plugins/stylelint`       | Stylelint rules for doc-comment hygiene. The supported path for oxc-based toolchains (oxlint has no CSS language — see [Linting](https://cssdoc.dev/guide/linting)). |
| [`@cssdoc/eslint-plugin`](plugins/eslint)            | `plugins/eslint`          | ESLint rules: doc-comment hygiene (`@eslint/css`, ESLint-only) and consumer-side class-usage (JSX + HTML; the JSX half also runs under oxlint's `jsPlugins`).        |
| [`@cssdoc/cli`](packages/cli)                        | `packages/cli`            | A host-agnostic `cssdoc lint` command — no ESLint or Stylelint required.                                                                                             |
| [`@cssdoc/language-server`](servers/language-server) | `servers/language-server` | An editor-agnostic LSP: completion, hover, definition, and deprecation quick-fixes.                                                                                  |
| [`cssdoc-vscode`](servers/vscode)                    | `servers/vscode`          | A thin VS Code extension that runs the language server.                                                                                                              |
| [`cssdoc for Zed`](servers/zed)                      | `servers/zed`             | A Zed language-server extension in development.                                                                                                                      |

## Develop

```sh
vp install        # install dependencies
vp run -r build   # build every package
vp run check      # format + lint + type-check + schema check
vp run type-check # run tsc across every workspace project
vp run -r test    # run every package's tests
vp run check:publish # check each package with publint and ATTW
```

Package configs merge shared lint, format, and library pack settings from `vite.config.base.ts`.
Source modules use ESM. The extension's css-tree shim retains `require` because esbuild resolves it
to the dependency's CommonJS implementation for the bundled server.
Package commands remain in each package's `vite.config.ts` as Vite tasks. The remaining
`package.json` scripts bridge the install-time `prepare` and publish-time `prepublishOnly` lifecycle
hooks to those tasks.
The extension's Lit example is type-checked, not exempted from safety rules. Browser examples use
their own DOM-enabled TypeScript project; the extension's type-check task checks both that project
and the Node project without adding browser globals to the latter.

Import sorting groups Node built-ins, external packages (including `@cssdoc/*`), internal aliases and
subpath imports, relative imports, styles, and unknown imports, in that order. Imports within each
group are sorted together, including type imports. Side-effect imports retain their relative order,
but other imports can move around them. Separate a file-level comment from imports with a blank line
so sorting doesn't move it with an import. Generated files with byte-exact checks remain owned by
their generators.

Style linting follows the formatter's import order and preserves authored ordering in catalogs,
schemas, and fixtures. It permits concise single-line guards but requires braces for multiline
control flow. Combine nested guards when they have no intervening work or alternate branches, and
group adjacent collection writes when argument evaluation doesn't depend on earlier writes.
Keep separate variable declarations separate: `one-var` uses `never`, not its default compound
declaration mandate. Destructuring and multi-binding loop initializers remain valid.
Tests import `test` from Vitest explicitly, including inside `describe`, and use strict boolean assertions where intended;
fixtures may include literal template placeholders and unsafe URLs.

Restriction linting permits parser increments and bit flags, explicit `undefined`, and framework
default exports. It checks parameter reassignment and use before initialization, permits `void`
statements for intentionally unawaited work, and allows console output in tests and build scripts.
Errors and warnings can be logged elsewhere.
Explicit `undefined` arguments and returns remain valid for optional inputs, mocks, and parser
continuation paths. The native undefined-removal rule can't exempt returns independently, so it stays
off to preserve the return-consistency policy.
CLI failure paths set `process.exitCode` and skip further work instead of forcing an immediate exit,
so their output can drain.

Promise linting prefers `await` with explicit error handling over chains, including for editor
Thenables. Event-to-promise adapters use `Promise.withResolvers` to keep listener registration and
cleanup outside promise executors. Type-only imports use top-level `import type`; mixed imports
can retain inline `type` specifiers.

Severity follows the contract, not just the rule's category. String-based timers, dynamic `Function`
construction, detached CommonJS `exports` assignments, and invalid TypeScript template interpolation
are errors. Callback timers, correctly synchronized export aliases, primitives, and explicit
serialization remain valid. Template interpolation also accepts Error, URL, and URLSearchParams from
the standard libraries or Node's declarations; a user-defined type with the same name isn't exempt.
Syntax, layout, copying, and heuristic recommendations remain warnings rather than automatic
correctness failures.

Disabled rules remain deliberate, not a waiver for existing diagnostics:

| Rules                                                                                                                                   | Why they stay off                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest hook, suite, title, and assertion-count restrictions                                                                             | Shared setup, top-level tests, descriptive titles, and data-driven assertions are valid test structures.                                                                                                                    |
| Vitest conditional test-body restriction                                                                                                | Fixture traversal needs branches; conditional tests and conditional expectations are checked separately.                                                                                                                    |
| Vitest strict-equality and truthiness preferences                                                                                       | Matchers express different contracts. Use strict Boolean matchers for Boolean assertions, and choose structural or strict equality deliberately.                                                                            |
| Vitest comparison-matcher preference                                                                                                    | Completion tests compare strings lexicographically; numeric matchers aren't equivalent.                                                                                                                                     |
| Import export-form, export-position, namespace, and Node-module restrictions                                                            | Public named APIs, framework default exports, grouped APIs, and Node entry points are intentional.                                                                                                                          |
| ESLint duplicate-import and import-order rules                                                                                          | `import/no-duplicates` and Oxfmt own these checks.                                                                                                                                                                          |
| ESLint name, comment, key, variable-order, function-form, initialization, control-flow, and size restrictions; import dependency limits | Alphabetical ordering, fixed limits, and mandatory syntax forms don't establish correctness. Preserve catalog order and choose readable parser control flow.                                                                |
| Promise callback-to-await preference                                                                                                    | A callback-shaped API doesn't necessarily offer a promise equivalent. Await is preferred where a promise or Thenable exists.                                                                                                |
| Unicorn awaited-result member and relative-URL style preferences                                                                        | Direct property access on an awaited result and explicit `./` URL prefixes are valid, useful syntax choices.                                                                                                                |
| JSDoc mandatory returns and TypeScript type tags                                                                                        | Document useful return behavior; TypeScript signatures already supply types. JavaScript's documented tags require types.                                                                                                    |
| TypeScript interface/type uniformity                                                                                                    | Interfaces support declaration merging; object aliases can provide implicit index signatures. Choose the form that fits the contract.                                                                                       |
| TypeScript `strict-void-return`                                                                                                         | TypeScript permits ignored callback results; css-tree consumes `walk.skip` from visitors typed as returning `void`.                                                                                                         |
| TypeScript `no-inferrable-types`, `explicit-function-return-type`                                                                       | Public signatures satisfy `isolatedDeclarations`; local helpers can use inference without losing the exported contract.                                                                                                     |
| TypeScript `prefer-readonly-parameter-types`                                                                                            | Parsers, builders, and framework callbacks have explicitly mutable inputs. Deep-readonly requirements would change those ownership contracts.                                                                               |
| TypeScript `no-non-null-assertion`, `no-dynamic-delete`                                                                                 | Checked parser invariants can need assertions that library types can't express; HTML sanitization removes a property selected by the node's tag.                                                                            |
| TypeScript `no-var-requires`, `ban-types`                                                                                               | The narrower require rule is deprecated and covered by `no-require-imports`; targeted function, wrapper-object, and empty-object checks replace `ban-types`.                                                                |
| Unicorn import style, nested ternaries, nested-call limits, ternary preference, and switch break placement                              | Named and namespace imports serve different APIs. Formatting and readable control flow matter more than mandatory forms or fixed nesting counts.                                                                            |
| Unicorn `no-null`, `no-array-for-each`, `no-array-sort`, `no-array-reverse`                                                             | Null belongs to JSON, LSP, and DOM contracts. Indexed callbacks and mutation of owned arrays are valid.                                                                                                                     |
| ESLint `class-methods-use-this`, Node `no-sync`                                                                                         | Instance methods can implement contracts without reading instance state. Synchronous I/O is appropriate in one-shot tools and isolated tests.                                                                               |
| Native regex invalid-pattern, empty-class, and misleading-character checks                                                              | The regexp plugin covers literals and statically resolved constructor strings. Using both would duplicate literal diagnostics.                                                                                              |
| Regexp Unicode-mode and set-operation mandates                                                                                          | Deliberate UTF-16 matching and JSON Schema patterns can't universally require `u` or `v`.                                                                                                                                   |
| Regexp named-capture, named-replacement, result-group, and lookaround preferences                                                       | Positional captures and replacement boundaries are parser contracts, not interchangeable spelling choices.                                                                                                                  |
| Regexp execution and escape preferences                                                                                                 | Typed execution checks distinguish captures from Boolean tests; native escaping checks cover ordinary JS strings too, and regexp strictness checks constructor identities.                                                  |
| Regexp grapheme, control-character, replacement-dollar, spelling, ordering, and repetition preferences                                  | Multi-character tokens, control-character validation, and literal dollars can be intentional. Preserve authored tier grouping and pattern spelling.                                                                         |
| TSDoc per-tag mandates and `restrict-tags`                                                                                              | The 56 tag-mandate rules test presence, not applicability: parameterless functions don't need `@param`, and ordinary declarations mustn't all become `@deprecated`. TSDoc syntax and `tsdoc.json` already own allowed tags. |

The retained `no-inferrable-types` exception isn't hypothetical: removing the annotation from the
exported computed schema string produces compiler error TS9010. That rule's parameter and property
options don't exempt exported variables.

Oxc linting checks invalid array callbacks, regexp arguments, comparisons, clamps, and discarded
errors. Const enums are errors because published declarations must work with isolated-module
consumers. Accumulating spreads and suspicious compound assignments remain warnings; recursive-only
parameters also warn rather than inviting an unsafe signature-changing fix. Twelve Oxc rules stay off:

| Rules                                                                                   | Why they stay off                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-async-await`, `no-optional-chaining`, `no-rest-spread-properties`, `no-barrel-file` | Modern syntax and package entry-point barrels are intentional.                                                                                                                     |
| `no-async-endpoint-handlers`, `no-this-in-exported-function`                            | There's no Express 4 host; exported callbacks can declare a receiver and be bound by their caller.                                                                                 |
| `approx-constant`, `branches-sharing-code`, `no-map-spread`                             | A decimal needn't represent a mathematical constant. Hoisting can reorder predicate side effects, and mapping borrowed elements must preserve the input.                           |
| `number-arg-out-of-range`                                                               | The installed implementation rejects valid ES2026 precision arguments up to 100 for `toFixed`, `toExponential`, and `toPrecision`. It has no range override.                       |
| `erasing-op`, `double-comparisons`                                                      | Multiplying by zero preserves signed zero and produces NaN for non-finite values. Strict equality combined with a relational comparison isn't equivalent to coercive `<=` or `>=`. |

Numeric literal casing stays formatter-owned: Oxfmt writes lowercase hexadecimal digits, while
`unicorn/number-literal-case` demands uppercase. Vue prop-count limits and component-name casing
also stay off: component APIs need different prop counts, and registration names follow their
consumers rather than a universal casing rule.

Module filenames can use kebab-case, camelCase, or PascalCase; class and component files don't need
to be renamed to match ordinary modules. Other combinations, such as snake_case, are flagged.
The filename rule ignores multi-part extensions, so test and configuration suffixes stay valid.

Switch-case braces use the rule's `avoid` mode: keep blocks for lexical declarations, and omit
redundant blocks for statements that don't need case-local scope.

Nursery linting stays off as a category. Selected rules reject unreachable loops and dead stores
and warn about invalid named imports and redundant iterator materialization. Explicitly named
snapshots remain valid: eager consumption can matter before an early-exit iterator operation.
Node ESM scripts also reject undefined names without accepting CommonJS-only globals.
TypeScript checks undefined names separately. The remaining nursery decisions are explicit:

| Rule                                  | Why it stays off                                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `import/export`                       | This implementation misreports the legal explicit-over-star export in core's full/lite barrel and misses an ambiguous-star-export fixture.                                           |
| `eslint/no-restricted-exports`        | Export-name restrictions need an actual package API policy.                                                                                                                          |
| `promise/no-return-in-finally`        | Returning a cleanup promise awaits it and propagates rejection; the return isn't unused.                                                                                             |
| `typescript/no-unnecessary-condition` | Indexed values and external APIs can be absent despite non-nullable ambient types. Don't remove runtime-safe guards.                                                                 |
| `typescript/prefer-optional-chain`    | Probes with `requireNullish` and primitive/unknown checks disabled still reported null-preserving and falsy-string returns. Keep those return values and evaluation behavior intact. |

The audit covers installed rules from the configured native plugins, including scoped Vue and JSX
checks, plus regexp, TSDoc, TSDoc-require, and Vite+'s JavaScript plugins. Native category policies
enable the non-exempt base-plugin rules. Override-only plugins need explicit rule selections; adding
a plugin to an override doesn't expand the base category policy. Every installed regexp, Vue, and
JSX-a11y rule has an explicit disposition. Root and docs-directory runs share the same Vue selections.
Recheck the installed inventory and nursery implementations
when upgrading the toolchain rather than assuming new rules fit these decisions.

JSX checks apply HTML and ARIA semantics without requiring React. They reject missing image text,
invalid roles, invalid ARIA values, and keyboard-inaccessible interactions. Parser fixtures aren't
rendered UI and are excluded from that scope. Autofocus advice ignores custom components and permits
dialog focus; explicit list roles remain valid for browser compatibility. Focusable scroll containers
don't need to be rewritten as interactive widgets. Access-key, media-caption, wording, and semantic-tag
preferences remain advice, not universal correctness guarantees.

| Native plugin        | Applicability                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Jest                 | Off: tests use Vitest, whose own plugin already checks them.                                                                                                                               |
| Next.js              | Off: no Next.js application, routes, or dependency exists here.                                                                                                                            |
| React and React-perf | Off: JSX examples demonstrate CSS usage without choosing a React runtime. Don't impose React imports, prop validation, hook rules, or allocation heuristics on framework-neutral examples. |
| JSX-a11y             | Scoped to JSX/TSX outside parser fixtures, with explicit rules and tested focus/role exceptions.                                                                                           |

Scoped exceptions preserve actual host contracts: untyped JavaScript lacks reliable safety-check
types but still gets syntax checks and documented type tags; the bundled css-tree shim is CommonJS;
LSP polling and stateful Markdown rendering need ordered awaits. Tests can contain hostile-input
fixtures and use console/environment APIs, scripts can use stdout and top-level await, deployment
configuration can read environment variables, and ambient declarations can augment globals.
These aren't exceptions for production TypeScript safety.

Type-aware linting rejects unsafe assignments, arguments, calls, member access, and returns in
TypeScript. It also checks for redundant assertions, deprecated APIs, and potentially misleading
template interpolations.
Unsafe type assertions are errors throughout the workspace. Validate external JSON and client settings
before using them; imported package metadata and correctly typed adapter APIs don't need casts.
Preserve captured cardinality digits rather than coercing them through
floating-point numbers, and replace AST nodes with correctly typed nodes instead of changing their
discriminants through casts.
Config and provider JSON are narrowed by runtime schema validation, not type assertions. ArkType
definitions in `@cssdoc/core/schema` generate the static draft-07 schemas exported by core/lite and
`@cssdoc/json`; malformed provider snapshots
produce resolution messages and don't contribute entries or cross-links.
Generic parameters must express a type relationship, not just replace a concrete parameter type.
The model's exact-type equality check needs fresh generic signatures to detect optional-field drift,
so only that check is exempt.
Use `object` for object values and `unknown` for untrusted values, not the broad `{}` type. Empty
interfaces are rejected too; non-null intersections such as `T & {}` remain valid.
Strict Boolean values don't need literal comparisons; nullable and unknown values can still use
explicit Boolean guards. The CLI normalizes Node's optional terminal flags to booleans.
Conditions can use known nullable primitive or object values, but unknown inputs must be narrowed.
Predicates return booleans instead of incidental strings or collection objects. Use explicit
presence checks for indexed objects, whose types can omit runtime `undefined`.
Escape values use uppercase letters, catch parameters use `error`, and DOM
data attributes use `dataset`.
Simple array types use `T[]` or `readonly T[]`; complex element types use `Array<T>` or
`ReadonlyArray<T>` to avoid extra grouping parentheses.
Type-check failures throw `TypeError`; range failures use `RangeError`.
End-relative array access uses `at`, and index searches compare against their `-1` sentinel.
Collection conditions compare `length` or `size` explicitly against zero or the required threshold.
Copy iterables with spread; use `Array.from` when mapping during conversion or handling array-like
objects that aren't iterable.
Use logical fallbacks instead of repeating the same operand in a ternary. Keep `||` for deliberate
empty-string or zero defaults and `??` for nullish-only defaults.
Numeric reference captures already contain only decimal digits, so they use `Number` rather than
partial integer parsing. Use `structuredClone` for copies; JSON Schema tests validate the emitter's
serialized output rather than treating a JSON round-trip as a clone.
Production helpers that don't capture local state live at module scope. Test-specific helpers may
stay beside their fixtures.
The strict void-return restriction stays off: TypeScript permits ignored callback results, and
css-tree consumes traversal-control symbols from visitors typed as returning `void`. Promise
misuse and confusing void expressions have separate checks.
Public class members omit redundant `public` modifiers. Constructor parameter properties are exempt
because their modifiers can declare the properties themselves.
Callback contracts use function-property signatures so TypeScript checks parameter variance.
Class implementations keep method syntax.
Promise-returning function declarations and methods are `async`; arrow forwarders and promise
factories can return an existing promise directly without an extra async wrapper.
Use `exec` for a single regex match; global `match` calls retain their all-matches behavior.
Use `String.raw` for strings that need literal backslashes, including regex sources and Markdown
escapes. Keep ordinary escapes when they represent characters such as newlines.
Untyped JavaScript is excluded from the unsafe-boundary and interpolation checks because it lacks
reliable type information; the standalone VS Code Lit example is also excluded from the assignment,
call, and member-access checks.

The VitePress site also uses Oxlint's Vue rules. Oxlint checks Vue script blocks, not templates.

Selected `eslint-plugin-regexp` rules check native regex literals and `RegExp` constructors for
mistakes and inefficient matching. The plugin doesn't analyze `arkRegex.as` calls or the composed
strings in `@cssdoc/regex`; review and test those patterns separately. Its analysis doesn't prove
that a pattern is safe.

The TypeScript catalog is pinned to the upstream revision targeted by Vite+'s tsrs checker; a test
checks that they stay aligned. TypeDoc uses TypeScript 6 separately because of its peer dependency;
the docs and TypeDoc plugin type-check tasks use the root TypeScript compiler instead.

The root `tsdoc.json` defines cssdoc tags for TSDoc linting. Its definitions are checked against the
canonical vocabulary in `@cssdoc/spec`.
Core's package-local `tsdoc.json` extends this shared file because the TSDoc lint plugin resolves
configuration from the invoking directory, not by searching parent folders. Keep tag definitions in
the root file rather than duplicating them in package configs.

### Documenting TypeScript APIs

Write public API comments in TSDoc syntax. Start with what the API does, then describe behavior a caller
can't infer from the signature: defaults, ordering, side effects, errors, and edge cases. Use
`@param name - description` for parameters and `@returns` for a useful return description; avoid
restating the TypeScript types. Add `@throws`, `@remarks`, and runnable `@example` blocks when they
help explain the contract. Keep examples consistent with the implementation and tests.

The root lint configuration checks TSDoc syntax, requires comments on exported source declarations, and
uses Oxlint's built-in JSDoc rules to check parameter tags, modifier tags, and `@returns` descriptions.
If a function documents any parameters, all its parameters must have tags. Functions without any
parameter tags aren't checked for missing tags. The native parameter-description rule treats a lone
TSDoc hyphen as a description, so review descriptions for substance. CSS doc-comment examples use the
cssdoc grammar, which is separate from the TSDoc comments documenting the TypeScript APIs.

The [eslint-plugin-jsdoc TSDoc preset](https://github.com/gajus/eslint-plugin-jsdoc#flat-config-declarative)
is a guide, not an Oxlint preset: Oxlint implements a subset of its rules. TSDoc syntax validation and
TypeDoc's public API coverage check complement the native rules.

For JavaScript, documented `@param`, `@returns`, and `@throws` tags also require JSDoc types.

## License

MIT
