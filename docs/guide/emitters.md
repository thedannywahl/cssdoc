# Generate documentation

Turn the `button.css` from [Document a component](/guide/authoring) into a Markdown page and an
index. You can open the generated files locally or include them in a docs site.

## Build Markdown pages

```sh
npm install -D @cssdoc/markdown
```

Save this as `build-css-docs.mjs` next to `button.css`:

```js
import { readFileSync } from "node:fs";
import { buildCssApi } from "@cssdoc/markdown";

buildCssApi({
  css: readFileSync("button.css", "utf8"),
  outDir: "generated/css",
});
```

Run `node build-css-docs.mjs` from that directory and open `generated/css/button.md`. Look for
the button summary, the quiet modifier, and the description of `--button-radius`. The build also
writes `index.md` and `css-sidebar.json`.

Use a dedicated output folder so the build can remove generated pages for deleted records.

## Choose another output

| I want to…                                                 | Use                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| Publish pages I can open directly in a browser             | [HTML](/reference/@cssdoc/html/functions/buildHtml)      |
| Pass the full data model to a script or another build step | [JSON](/reference/@cssdoc/json/functions/writeJson)      |
| Give a language model a condensed description of the CSS   | [llms.txt](/reference/@cssdoc/llms/functions/writeLlms)  |
| Add CSS pages to an existing TypeDoc site                  | [Publish alongside TypeDoc](/guide/publish-with-typedoc) |
| Feed another tool a standard file format                   | [Export to other tools](/guide/generators)               |

HTML navigation links accept relative URLs, HTTP(S), and `mailto:`. Unsafe destinations render as
unlinked text.

## Select examples for your docs

If a stylesheet uses `@example docs -` to mark examples for publication, set
`render.exampleFilters.markdown` to `{ "labels": ["docs"], "includeUnlabeled": false }` in
`cssdoc.json` for TypeDoc. When calling `buildCssApi` directly, pass the same filter as
`exampleFilter`. See [example filtering](/guide/config-reference#example-filtering) for the
matching rules and the other output surfaces.
