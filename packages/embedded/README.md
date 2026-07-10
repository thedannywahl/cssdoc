# @cssdoc/embedded

Read [cssdoc](https://cssdoc.dev)-annotated CSS out of the host files where it lives embedded:

- **JS/TS tagged templates** — `` styled.button`…` ``, `` css`…` ``, Lit `` css`…` ``, `keyframes`, `createGlobalStyle`.
- **HTML-like `<style>` blocks** — `.html`, `.vue` (including `<style scoped>`), `.svelte`, `.astro`.
- **Markdown/MDX code fences** — ` ```css ` … ` ``` `.

## How it works

The core is a **projection**: `projectCss(source)` returns a character-for-character CSS mask of the
source — same length and newlines, with the embedded-CSS regions and any `/** … */` doc comment kept
verbatim, everything else blanked, and JS `${…}` interpolations masked. Because the projection shares
every offset, line, and column with the source, the rest of cssdoc (parsing, linting, spans,
diagnostics) works unchanged and points back at the right place in the original file.

```ts
import { parseCssDocsFromSource, lintCssDocsFromSource, projectCss } from "@cssdoc/embedded";

const records = parseCssDocsFromSource(vueSource, { host: "html" });
const problems = lintCssDocsFromSource(tsxSource, { filename: "Button.tsx" });
```

`host` defaults to `"auto"` (chosen from `filename`, or every scanner when there's no hint).

## Not covered

Object-syntax CSS-in-JS (Emotion object styles, JSS, vanilla-extract `style({})`) isn't CSS text and
carries no `/** */` comments, so it's out of scope. In styled-components the base class is generated
rather than written as a selector, so selector-derived facts are thin there — the authored tags
(`@component`, `@modifier`, `@part`, …) carry the model.
