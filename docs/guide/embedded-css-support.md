# Embedded CSS support

[Document embedded CSS](/guide/embedded-css) shows how to get started with a Vue file.

| CSS source                                         | File extensions                                              | Emitter options                        | Lint or editor setup                                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tagged templates such as styled-components and Lit | `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts`, `.cts` | `lang: "js"`                           | Include the host files in your editor scan. For Stylelint, use `postcss-styled-syntax` and put doc comments inside the template.                               |
| Style blocks                                       | `.html`, `.htm`, `.vue`, `.svelte`, `.astro`                 | `lang: "html"`                         | Put doc comments inside the style block. Include host files in your editor scan, or configure a Stylelint syntax for the host, such as `postcss-html` for Vue. |
| Fenced CSS                                         | `.md`, `.mdx`, `.markdown`                                   | `lang: "markdown"`                     | Include the Markdown files in your editor scan and write doc comments inside the CSS fence.                                                                    |
| Standalone SCSS or Less                            | `.scss`, `.less`                                             | `dialect: "scss"` or `dialect: "less"` | Include these stylesheets in your editor scan, or configure a Stylelint syntax for the dialect.                                                                |

SCSS and Less also work in supported style blocks with a `lang` attribute. For the editor's
scan settings, see [Set up your editor](/guide/editor). cssdoc extracts CSS text from these hosts.
Object styles, indented Sass, and Stylus are outside the supported syntax.

## Extraction

[`parseCssDocsFromSource`](/reference/@cssdoc/embedded/functions/parseCssDocsFromSource) uses
the filename to select a scanner. When calling an emitter, pass the host or dialect from the
table above. If you parse directly, use [`@cssdoc/dialects`](/reference/@cssdoc/dialects/)
to select a parser. cssdoc reads CSS selectors and properties in those files. It skips preprocessor
constructs such as mixins and masks JavaScript interpolations.
Parsing or linting errors from the projected CSS are reported to the caller rather than returned as
an empty result.

In styled-components, the base class is generated, so authored tags supply details cssdoc cannot
infer from the template. If JSDoc tooling reads a cssdoc comment above the JavaScript declaration,
move the comment inside the template or allow the cssdoc tags in your JSDoc or TSDoc configuration.
Inside a template, escape backticks in fenced `@example` blocks so they survive extraction.

### Emit docs from SCSS in a Vue file

In `Card.vue`, put the doc comment inside the SCSS block:

```vue
<template>
  <article class="card">Account details</article>
</template>

<style lang="scss" scoped>
$card-padding: 1rem;

/**
 * @component card
 * @summary Groups account details.
 */
.card {
  // Keep the card padding in one place.
  padding: $card-padding;
}
</style>
```

Use `lang: "html"` to extract the style block. cssdoc reads `lang="scss"` on the tag and
selects the SCSS parser. If you move the contents of that block to `card.scss`, use
`dialect: "scss"` for the standalone file.

::: code-group

```js [Vue file]
import { readFileSync } from "node:fs";
import { buildCssApi } from "@cssdoc/markdown";

buildCssApi({
  css: readFileSync("Card.vue", "utf8"),
  lang: "html",
  outDir: "generated/css",
});
```

```js [Standalone SCSS]
import { readFileSync } from "node:fs";
import { buildCssApi } from "@cssdoc/markdown";

buildCssApi({
  css: readFileSync("card.scss", "utf8"),
  dialect: "scss",
  outDir: "generated/css",
});
```

:::

Either version writes `generated/css/card.md` with the card's summary.

## Linting

Stylelint needs a custom syntax for the host file. Use `postcss-html` for Vue or HTML style blocks
and `postcss-styled-syntax` for styled templates. Set `customSyntax` for the matching file pattern
in the Stylelint config. Put doc comments inside the styles so the custom syntax passes them to
Stylelint. The [language server](/guide/editor) can also read comments above supported declarations.

### Place comments in styled-components

Put the comment **inside** the template to share it with Stylelint. cssdoc's parser and language
server also recognize the same comment immediately above the declaration.

::: code-group

```tsx [Inside the template]
import styled from "styled-components";

export const Notice = styled.aside`
  /**
   * @component notice
   * @summary Highlights a short message.
   */
  padding: 1rem;
`;
```

```tsx [Above the declaration]
import styled from "styled-components";

/**
 * @component notice
 * @summary Highlights a short message.
 */
export const Notice = styled.aside`
  padding: 1rem;
`;
```

:::

With `postcss-styled-syntax` installed, add a matching override to your
[Stylelint config](/guide/linting#add-cssdoc-to-stylelint):

```js
export default {
  plugins: ["@cssdoc/stylelint-plugin"],
  rules: { "cssdoc/valid-doc-comments": true },
  overrides: [{ files: ["**/*.tsx"], customSyntax: "postcss-styled-syntax" }],
};
```

Stylelint receives the comment inside the template. For the comment above the declaration,
use cssdoc's embedded parser or the language server.

### Check class usage

The language server checks static class names in HTML, JSX, Vue, and Svelte. It can read strings
inside common dynamic bindings, but skips computed class names. See
[class usage checks](/guide/lint-reference#class-usage) for linter support.
