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

Colours ship as a base theme that follows the editor's light/dark theme, so it works out of the box.
Override any token by styling its class: `.cm-cssdoc-tag`, `.cm-cssdoc-modifier`, `.cm-cssdoc-part`,
`.cm-cssdoc-property`, `.cm-cssdoc-link`, `.cm-cssdoc-punct`.

## What it highlights

| Token                 | Example                                      | Class                |
| --------------------- | -------------------------------------------- | -------------------- |
| Block and inline tags | `@component`, `@modifier`, `@a11y`, `@link`  | `cm-cssdoc-tag`      |
| Modifier name         | `-orientation-vertical` after `@modifier`    | `cm-cssdoc-modifier` |
| Part and slot names   | `.list` after `@part`, `label` after `@slot` | `cm-cssdoc-part`     |
| Custom properties     | `--tabs-gap`                                 | `cm-cssdoc-property` |
| Inline link text      | the target inside `{@link …}`                | `cm-cssdoc-link`     |
| Braces                | `{` and `}` around an inline tag             | `cm-cssdoc-punct`    |
