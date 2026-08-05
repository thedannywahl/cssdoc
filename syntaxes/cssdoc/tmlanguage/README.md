# @cssdoc/tmlanguage

A pair of TextMate **injection** grammars for cssdoc:

- doc-comment tags inside CSS comments (TSDoc-style), and
- typed cssdoc record-reference at-rules in source CSS (for example `@component nav (--desktop-nav) {}`).

They layer onto host CSS scopes, so cssdoc tags and refs light up wherever CSS is highlighted,
including CSS embedded in HTML `<style>`.

It highlights the record and block tags (`@component`, `@modifier`, `@part`, `@cssproperty`, …), the
release modifiers (`@alpha`, `@beta`, `@public`, …), inline tags (`{@link}`, `{@inheritDoc}`,
`{@label}`), and custom properties (`--foo`).

## Use with Shiki or VitePress

The default export is a Shiki `LanguageRegistration` with `injectTo` already set, so registering it makes
every CSS block pick up the highlighting:

```ts
// .vitepress/config.ts
import cssdoc, { cssdocAtRules } from "@cssdoc/tmlanguage";

export default {
  markdown: {
    languages: [cssdoc, cssdocAtRules],
  },
};
```

## Use in a VS Code extension

Reference the raw grammars from `contributes.grammars` and inject them into CSS:

```json
{
  "contributes": {
    "grammars": [
      {
        "scopeName": "documentation.cssdoc",
        "path": "./cssdoc.injection.tmLanguage.json",
        "injectTo": ["source.css"]
      },
      {
        "scopeName": "source.css.cssdoc.atrules",
        "path": "./cssdoc.atrules.injection.tmLanguage.json",
        "injectTo": ["source.css"]
      }
    ]
  }
}
```

The raw files are published at:

- `@cssdoc/tmlanguage/cssdoc.injection.tmLanguage.json`
- `@cssdoc/tmlanguage/cssdoc.atrules.injection.tmLanguage.json`
