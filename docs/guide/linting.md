# Linting

cssdoc ships three kinds of lint checks over the same rule core: **author-side** hygiene (is the CSS
documented?), **registered-property value** checks (do values match a property's `@property` syntax?),
and **consumer-side** usage (do the classes you apply exist?).

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
`deprecated-requires-canonical`, and `name-not-in-css` (a documented modifier/part that no selector
defines — drift) — plus the registered-property value rules below.

## ESLint — doc hygiene and class usage

[`@cssdoc/eslint-plugin`](https://www.npmjs.com/package/@cssdoc/eslint-plugin) offers two rules:

- **`cssdoc/valid-doc-comments`** — the same hygiene checks, on the `@eslint/css` language.
- **`cssdoc/valid-class-usage`** — validates the classes your **HTML and JSX** apply against the
  documented surface: it finds the base component among an element's classes and checks each chained
  `-modifier`, flagging unknown and deprecated ones.

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
