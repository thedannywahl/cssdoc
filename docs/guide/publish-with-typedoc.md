# Publish alongside TypeDoc

Add CSS documentation to an existing TypeDoc site that uses `typedoc-plugin-markdown` and
`typedoc-vitepress-theme`. The cssdoc plugin writes Markdown pages during the TypeDoc build and
adds them to the generated sidebar.

## Add the plugin to your build

```sh
npm install -D @cssdoc/typedoc
```

Add `@cssdoc/typedoc` to the end of your plugin list. In `typedoc.json`, set `cssdocCss` to the
stylesheet you want to publish. For example, with `button.css` in the project root:

```json
{
  "plugin": ["typedoc-plugin-markdown", "typedoc-vitepress-theme", "@cssdoc/typedoc"],
  "cssdocCss": ["./button.css"],
  "cssdocBaseHref": "/api/css/"
}
```

Merge these fields into your existing TypeDoc config. Set `cssdocBaseHref` to the path where your
site serves the CSS pages. This example assumes TypeDoc output is served under `/api/`.

Run your usual TypeDoc build. In its output directory, check for `css/button.md` and a **CSS** group
in `typedoc-sidebar.json`. If you use a cssdoc config, point `cssdocConfig` at that file.
See the [TypeDoc integration reference](/reference/@cssdoc/typedoc/) for more options.
