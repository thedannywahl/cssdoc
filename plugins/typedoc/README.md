# @cssdoc/typedoc

A [TypeDoc](https://typedoc.org) plugin that makes CSS docs ride along with a TS API-docs build. After
TypeDoc renders, it emits CSS reference pages (via [`@cssdoc/markdown`](../../emitters/markdown)) into
the output directory and merges them into `typedoc-sidebar.json` — so the CSS reference themes
identically and sits in the same navigation.

## Install

```sh
npm i -D @cssdoc/typedoc typedoc typedoc-plugin-markdown
```

## Setup

```jsonc
// typedoc.json
{
  "plugin": ["typedoc-plugin-markdown", "typedoc-vitepress-theme", "@cssdoc/typedoc"],
  "cssdocCss": ["../packages/ui/dist/components.css"],
  "cssdocOut": "css",
  "cssdocLabel": "CSS",
  "cssdocBaseHref": "/api/css/",
}
```

| Option           | Meaning                                                        |
| ---------------- | -------------------------------------------------------------- |
| `cssdocCss`      | CSS source file paths whose doc comments become the reference. |
| `cssdocOut`      | Output subdirectory for the CSS pages (default `css`).         |
| `cssdocLabel`    | Sidebar section label (default `CSS`).                         |
| `cssdocBaseHref` | Link prefix for the pages/sidebar (default `<cssdocOut>/`).    |

## Programmatic use

For finer control (e.g. injecting a token `resolveToken` hook), call `emitCssApi` directly from your
own build script:

```ts
import { emitCssApi } from "@cssdoc/typedoc";

emitCssApi({
  outputDirectory: "docs/api",
  css: ["dist/components.css"],
  baseHref: "/api/css/",
  resolveToken: (name) => myTokenIndex.get(name),
});
```

The `@demo` block-tag rewriter is a separate, generic TypeDoc plugin — it has nothing to do with CSS
and is not part of this package.

## License

MIT
