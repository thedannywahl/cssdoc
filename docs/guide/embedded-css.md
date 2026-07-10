# Embedded CSS

cssdoc reads doc-commented CSS wherever it lives, not just in `.css` files. The
[`@cssdoc/embedded`](https://www.npmjs.com/package/@cssdoc/embedded) package pulls it out of three
kinds of host file:

- **JS/TS tagged templates** — `` styled.button`…` ``, `` css`…` ``, Lit `` css`…` ``, `keyframes`, and `createGlobalStyle`.
- **HTML-like `<style>` blocks** — `.html`, `.vue` (including `<style scoped>`), `.svelte`, and `.astro`.
- **Markdown and MDX code fences** — ` ```css ` … ` ``` `.

## The same component, many syntaxes

The doc comment is identical everywhere — cssdoc just finds the CSS around it. In a tagged template the
comment sits above the declaration; in a `<style>` block or a fence it sits with the CSS.

::: code-group

```tsx [styled-components]
import styled from "styled-components";

/**
 * @component button
 * @summary The primary action control.
 * @modifier button--primary — High-emphasis.
 */
const Button = styled.button`
  color: black;
  &.primary {
    font-weight: 600;
  }
`;
```

```ts [Emotion]
import { css } from "@emotion/css";

/**
 * @component button
 * @summary The primary action control.
 */
const button = css`
  color: black;
`;
```

```ts [Lit]
import { css } from "lit";

/**
 * @component button
 * @summary The primary action control.
 */
const styles = css`
  .button {
    color: black;
  }
`;
```

```vue [Vue]
<template><button class="button" /></template>

<style scoped>
/**
 * @component button
 * @summary The primary action control.
 */
.button {
  color: black;
}
</style>
```

```svelte [Svelte]
<button class="button">Save</button>

<style>
/**
 * @component button
 * @summary The primary action control.
 */
.button { color: black; }
</style>
```

````md [Markdown]
```css
/**
 * @component button
 * @summary The primary action control.
 */
.button {
  color: black;
}
```
````

```css [CSS]
/**
 * @component button
 * @summary The primary action control.
 */
.button {
  color: black;
}
```

:::

## How it works

`@cssdoc/embedded` projects a host file down to CSS: it returns a character-for-character mask of the
source with the embedded-CSS regions and any `/** … */` doc comment kept in place, everything else
blanked, and JS `${…}` interpolations masked. The projection shares every offset, line, and column
with the original, so parsing, linting, diagnostics, and go-to-definition all point back at the right
spot in the source file — no coordinate math.

```ts
import { parseCssDocsFromSource, lintCssDocsFromSource } from "@cssdoc/embedded";

const records = parseCssDocsFromSource(vueSource, { filename: "Button.vue" });
const problems = lintCssDocsFromSource(tsxSource, { filename: "Button.tsx" });
```

`host` is chosen from `filename` (or you can pass it directly: `"js"`, `"html"`, or `"markdown"`). With
no hint, every scanner runs.

## Per-tool setup

### Emitters

Every emitter accepts a `lang` alongside `css`. Set it to the host language and the emitter extracts
first:

```ts
import { writeJson } from "@cssdoc/json";
writeJson({ css: readFileSync("Button.tsx", "utf8"), lang: "js", outDir: "api" });
```

### Stylelint

The stylelint plugin lints whatever your configured custom syntax exposes — use
[postcss-html](https://www.npmjs.com/package/postcss-html) for `.vue`/`.html`/`.svelte` and
[postcss-styled-syntax](https://www.npmjs.com/package/postcss-styled-syntax) for tagged templates:

```jsonc
{
  "overrides": [
    { "files": ["**/*.vue"], "customSyntax": "postcss-html" },
    { "files": ["**/*.{ts,tsx}"], "customSyntax": "postcss-styled-syntax" },
  ],
  "plugins": ["@cssdoc/stylelint-plugin"],
  "rules": { "cssdoc/valid-doc-comments": true },
}
```

One caveat: a custom syntax hands stylelint only the extracted stylesheet, so it sees comments **inside**
a `<style>` block or a template. A comment authored _above_ a `const Button = styled…` lives in code the
syntax discards — the language server and the `@cssdoc/embedded` API still see it, so prefer those when
you write comments there.

### Editor / language server

Point the language server at your host files (the VS Code extension's include globs already cover
`.vue`, `.ts`, and friends). Diagnostics, hover, completion, and go-to-definition then work in embedded
CSS, and — unlike stylelint — a doc comment above a styled-component `const` is picked up too.

## Checking class usage in templates

cssdoc also checks where a component's classes are **used**. In a host document the language server
scans each element's classes — HTML `class`, JSX `className`, Vue `:class`, and Svelte `class:name` —
and flags an undocumented modifier, part, or state (`unknown-modifier` / `unknown-part` /
`unknown-state`) on an element that carries a documented component:

```jsx
<button className="card card--typo" /> // → unknown-modifier: .card--typo
```

Dynamic bindings are read best-effort: string and template **literals** are scanned (a
`:class="['card--x']"` array, a `class:card--x` toggle, a ``className={`card--x`}`` template, and a
quoted object key like `:class="{ 'card--x': on }"`), but a computed name or an unquoted object key
(`:class="{ cardX: on }"`) isn't. (An ESLint rule for JSX usage is a possible follow-up; today this runs
in the editor via the language server.)

## Preprocessor dialects

SCSS and Less aren't plain CSS — `postcss.parse` can't read `$vars`, `@mixin`, or `//` comments. The
[`@cssdoc/dialects`](https://www.npmjs.com/package/@cssdoc/dialects) package resolves the right PostCSS
parser, which every entry point accepts as a `parse` option:

```ts
import { resolveParser, dialectForFilename } from "@cssdoc/dialects";
import { lintCssDocs } from "@cssdoc/lint-core";

const parse = resolveParser(dialectForFilename("Button.scss"));
lintCssDocs(scssSource, { parse });
```

This works for a plain `.scss`/`.less` file and for a `<style lang="scss">` block (`@cssdoc/embedded`
picks the dialect from the `lang` attribute automatically). The emitters take a `dialect` shortcut, and
the language server resolves it from the file extension and the `lang` attribute. cssdoc reads the doc
comments, class selectors, `@property` at-rules, and custom properties; dialect-only constructs
(`$vars`, `@mixin`, `@include`) are parsed but ignored.

## What's covered

| Source                                                           | Authoring doc comments     |
| ---------------------------------------------------------------- | -------------------------- |
| Tagged templates (`styled`, `css`, Lit)                          | Yes                        |
| `<style>` blocks (HTML, Vue, Svelte, Astro)                      | Yes                        |
| Markdown/MDX ` ```css ` fences                                   | Yes                        |
| SCSS / Sass / Less (files, `<style lang>`, templates)            | Yes — via a dialect parser |
| Object styles (Emotion object, JSS, vanilla-extract `style({})`) | No — not CSS text          |

## Limitations

- **Object-syntax CSS-in-JS** isn't CSS text and carries no `/** */` comments, so it's out of scope.
- **Sass's indented syntax** and **Stylus** aren't supported; write SCSS or Less.
- In **styled-components** the base class is generated rather than written as a selector, so
  selector-derived facts (parts, modifiers found in the CSS) are thin — the authored tags
  (`@component`, `@modifier`, `@part`, and the rest) carry the model. It's richer for Lit-style
  templates and `<style>` blocks that contain real class selectors.
- **Interpolations** (`${…}`) are masked, not evaluated. A region that still can't parse is skipped
  rather than throwing.
