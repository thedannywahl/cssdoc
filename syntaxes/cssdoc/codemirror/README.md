# @cssdoc/codemirror

A [CodeMirror 6](https://codemirror.net) extension that highlights cssdoc doc-comment tags inside CSS
comments — the way TSDoc highlights JSDoc tags. It's the CodeMirror counterpart to
[`@cssdoc/tmlanguage`](../tmlanguage) (the TextMate/Shiki grammar), sharing the same tag vocabulary.

Matches are found by walking the CSS syntax tree and scanning **comment nodes only**, so real CSS
at-rules like `@property`, `@scope`, and `@media` are never touched.

## Install

```sh
npm add @cssdoc/codemirror @codemirror/lang-css
```

## Use

```ts
import { cssdocHighlight } from "@cssdoc/codemirror";
import { css } from "@codemirror/lang-css";
import { EditorView, basicSetup } from "codemirror";

new EditorView({
  extensions: [basicSetup, css(), cssdocHighlight()],
  parent: document.body,
});
```

Pass a `CssDocConfiguration` to `cssdocHighlight(configuration)` to enable custom block tags and
respect disabled tags. Block boundaries and fenced code use the shared scanner. Inline-code and
indented-code highlighting still use the lexical fallback.

Colours ship as a base theme that follows the editor's light/dark theme, so it works out of the box.
Override any token by styling its class: `.cm-cssdoc-tag`, `.cm-cssdoc-modifier`, `.cm-cssdoc-part`,
`.cm-cssdoc-property`, `.cm-cssdoc-link`, `.cm-cssdoc-punct`, `.cm-cssdoc-record`,
`.cm-cssdoc-keyword`, or `.cm-cssdoc-rule`.

## What it highlights

| Token                 | Example                                      | Class                |
| --------------------- | -------------------------------------------- | -------------------- |
| Block and inline tags | `@component`, `@modifier`, `@a11y`, `@link`  | `cm-cssdoc-tag`      |
| Modifier name         | `-orientation-vertical` after `@modifier`    | `cm-cssdoc-modifier` |
| Part and slot names   | `.list` after `@part`, `label` after `@slot` | `cm-cssdoc-part`     |
| Custom properties     | `--tabs-gap`                                 | `cm-cssdoc-property` |
| Inline link text      | the target inside `{@link …}`                | `cm-cssdoc-link`     |
| Braces                | `{` and `}` around an inline tag             | `cm-cssdoc-punct`    |
| Record name           | `side-nav-bar` after `@memberOf`             | `cm-cssdoc-record`   |
| Membership keyword    | `private` after `@memberOf` or `@member`     | `cm-cssdoc-keyword`  |
| Suppression directive | `cssdoc-disable-next-line`                   | `cm-cssdoc-keyword`  |
| Suppressed rule       | `undocumented-modifier`                      | `cm-cssdoc-rule`     |
