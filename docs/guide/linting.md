# Linting

cssdoc ships three kinds of lint checks over the same rule core: **author-side** hygiene (is the CSS
documented?), **registered-property value** checks (do values match a property's `@property` syntax?),
and **consumer-side** usage (do the classes you apply exist?).

## Stylelint or ESLint — which one?

`cssdoc/valid-doc-comments` (the CSS doc-hygiene rule) runs identically under both hosts — the
[conformance suite](https://github.com/thedannywahl/cssdoc/tree/main/plugins/eslint/tests/conformance.test.ts)
asserts the Stylelint and ESLint adapters report the same `(rule, line, message)` diagnostics for the
same `(css, cssdoc.jsonc)` input, including nested-scope config (a rule off-list, `providers`,
`structureIgnore`, `extends`). Picking one over the other is a host choice, not a coverage trade-off —
**except** for one structural constraint:

- **`@cssdoc/eslint-plugin`'s `valid-doc-comments` requires ESLint _and_ `@eslint/css`.** It runs on the
  `@eslint/css` language, and oxlint's [`jsPlugins` API](https://oxc.rs/docs/guide/usage/linter/js-plugins.html#api-support)
  explicitly doesn't support custom file formats/parsers — oxlint has no CSS language of its own. So this
  rule has **no oxc-native path at all**; that's structural, not a missing feature that might land later.
- **`@cssdoc/stylelint-plugin` is the supported path for oxc-based toolchains** (oxlint, Vite+,
  Biome-adjacent stacks). Stylelint is an independent binary and coexists fine alongside `oxlint`/`vp
check` — you don't lose oxlint for your JS/TS linting by adding it just for CSS doc hygiene.
- **`cssdoc/valid-class-usage` is a separate rule** with different portability: its JS/JSX half is plain
  ESTree work (no custom parser, no type information) and **does load under oxlint's `jsPlugins`
  bridge**, byte-identical to its ESLint diagnostics (see
  [`plugins/eslint/tests/oxlint.test.ts`](https://github.com/thedannywahl/cssdoc/tree/main/plugins/eslint/tests/oxlint.test.ts)).
  Its HTML half doesn't — oxlint has no HTML language, so the `@html-eslint/parser`-driven visitor never
  fires under it. See [`@cssdoc/eslint-plugin`'s README](https://github.com/thedannywahl/cssdoc/tree/main/plugins/eslint#running-under-oxlint)
  for the `.oxlintrc.json` shape.

So a toolchain standardized on oxc drops `@cssdoc/eslint-plugin` for CSS doc hygiene (there's no
alternative — add Stylelint alongside oxlint for that one job), but keeps `valid-class-usage`'s JS/JSX
checks running through oxlint itself.

A toolchain with neither linter (or one that just wants doc-hygiene checks with nothing else installed)
can reach the same rules with no host at all: see [`@cssdoc/cli`](https://github.com/thedannywahl/cssdoc/tree/main/packages/cli)'s
`cssdoc lint`.

## Stylelint — doc-comment hygiene

[`@cssdoc/stylelint-plugin`](https://www.npmjs.com/package/@cssdoc/stylelint-plugin) checks your
stylesheet's own docs.

```sh
npm i -D @cssdoc/stylelint-plugin stylelint
```

```js
// stylelint.config.js
export default {
  plugins: ["@cssdoc/stylelint-plugin"],
  rules: {
    "cssdoc/valid-doc-comments": true,
    // or with per-rule toggles:
    // "cssdoc/valid-doc-comments": [true, { rules: { "missing-summary": false } }],
  },
};
```

It reports the hygiene rules — `missing-summary`, `undocumented-modifier`, `undocumented-part`,
`undocumented-css-part`, `deprecated-requires-canonical`, `name-not-in-css`,
`duplicate-record-id`, `duplicate-record-id-cross-kind`, `structure-unknown-selector`,
`structure-unknown-record`, `structure-ambiguous-record`, `unknown-annotation-ref`,
`readonly-redefinition`, and `sealed-reset-value` — plus the registered-property value rules below.

`name-not-in-css` has five deliberate allowances:

- A **deprecated alias** (`@modifier -x — @deprecated {@link -y}`) is a legacy name intentionally gone from the CSS and is exempt.
- An **`@interaction`-flagged modifier** (`@modifier -x — @interaction …`) is a JS-toggled hook with no CSS declarations of its own, and is exempt.
- A **`*` wildcard** name (`@modifier -icon-*`) documents a family — satisfied by a literal instance (`.-icon-foo`) or a `class` attribute selector with its real operator semantics (`[class*="-icon-"]` contains, `[class$="…"]` suffix, `[class~="…"]` exact word; `[class^="…"]` does not count).
- Parts using **non-class selectors** (`@part [data-layout="x"]`, `@part #root`, `@part :host`) are matched against the selector text as an exact substring search, so `@part [data-layout="lightboxBlank"]` is satisfied when `[data-layout="lightboxBlank"]` appears anywhere in the component's CSS selectors.
- An **`@affects <component>.<target>`-flagged modifier** is also satisfied when the selector is defined in `<component>`'s own CSS, not just the modifier's own record — the rule the modifier describes can live entirely in the descendant's stylesheet.

Parts defined only in **nested CSS rules** (e.g., `@part .item` where `.item { }` is nested inside the component's outer rule) are also recognized — cssdoc now recurses into nested rule blocks when building the selector text index.

## ESLint — doc hygiene and class usage

[`@cssdoc/eslint-plugin`](https://www.npmjs.com/package/@cssdoc/eslint-plugin) offers two rules:

- **`cssdoc/valid-doc-comments`** — the same hygiene checks, on the `@eslint/css` language.
- **`cssdoc/valid-class-usage`** — validates the classes your **HTML and JSX** apply against the
  documented surface: it finds the base component among an element's classes and checks each chained
  `-modifier`, flagging unknown and deprecated ones, and applies `@element` constraints via
  `disallowed-element` when a component is used on a host tag outside the documented allow-list.

```sh
npm i -D @cssdoc/eslint-plugin eslint @eslint/css
npm i -D @html-eslint/parser   # for class-usage on HTML
```

```js
// eslint.config.js
import cssdoc from "@cssdoc/eslint-plugin";
import html from "@html-eslint/parser";

export default [
  ...cssdoc.configs.recommended, // .css doc hygiene
  {
    files: ["**/*.jsx", "**/*.tsx"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { cssdoc },
    rules: { "cssdoc/valid-class-usage": ["warn", { css: ["dist/components.css"] }] },
  },
  {
    files: ["**/*.html"],
    languageOptions: { parser: html },
    plugins: { cssdoc },
    rules: { "cssdoc/valid-class-usage": ["warn", { css: ["dist/components.css"] }] },
  },
];
```

A `-modifier` on an element with no documented component among its classes is left alone, so unrelated
utility classes never trip the rule.

```jsx
// ✗ "-bogus" is not a documented modifier of "button"
<button className="button -bogus" />

// ✗ "-variant-old" is deprecated — use ".-color-secondary"
<button className="button -variant-old" />
```

## Registered-property value checks

When a custom property is registered with an [`@property`](https://developer.mozilla.org/en-US/docs/Web/CSS/@property)
rule, its `syntax` descriptor is a real grammar. cssdoc matches values against it and flags mismatches
via three rules, all part of `cssdoc/valid-doc-comments` (Stylelint and ESLint) and surfaced live for
CSS files by the editor extension:

- **`invalid-default-value`** — the `initial-value` (or an authored `@defaultValue`) doesn't match the
  declared `syntax`.
- **`invalid-property-value`** — an assignment `--name: value` doesn't match the property's `syntax`.
- **`invalid-fallback-value`** — a `var(--name, fallback)` fallback doesn't match the property's `syntax`.

```css
@property --gap {
  syntax: "<length>";
  inherits: false;
  initial-value: 4px;
}

.card {
  --gap: 8px; /* ✓ */
  --gap: red; /* ✗ invalid-property-value — expected <length> */
  padding: var(--gap, 1rem); /* ✓ */
  margin: var(--gap, teal); /* ✗ invalid-fallback-value — expected <length> */
}
```

Values that can't be checked statically are never flagged: universal syntax (`*`), runtime
substitutions (`var()`, `env()`), and the CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`).

## Suppressing diagnostics

Silence a cssdoc diagnostic inline with a CSS comment directive — the same idea as
`eslint-disable` / `stylelint-disable`. Because they're CSS comments, they ride along in embedded CSS
too (a `<style>` block, a tagged template).

```css
/* cssdoc-disable */ /* off from here to the end of the file (or the next enable) */
/* cssdoc-enable */ /* back on */
/* cssdoc-disable undocumented-modifier */ /* just one rule (space- or comma-separated for several) */

.button {
  /* cssdoc-disable-line unknown-modifier */
  /* cssdoc-disable-next-line */
}
```

With no rule names a directive covers every rule; name one or more to scope it. A
`/* cssdoc-expect-error [rules] */` asserts a problem on the next line — if none is reported, cssdoc
raises `cssdoc-directive` (an unused expectation, like an unused `@ts-expect-error`).

Any directive can carry a trailing ` - <reason>` explaining why it's there — handy for reviews and
future readers. The reason is free text after a space-hyphen-space; it never counts as a rule name.

```css
/* cssdoc-disable-line missing-summary - generated file, documented upstream */
```
