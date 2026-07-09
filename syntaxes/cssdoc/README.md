# @cssdoc/tmlanguage

A TextMate **injection** grammar that highlights cssdoc doc-comment tags inside CSS comments — the way
TSDoc highlights JSDoc tags inside `/** … */`. It layers onto the host CSS grammar's comment scope
(`comment.block.css`, and the SCSS/Less equivalents), so cssdoc tags light up wherever CSS is
highlighted, including CSS embedded in HTML `<style>`.

It highlights the record and block tags (`@component`, `@modifier`, `@part`, `@cssproperty`, …), the
release modifiers (`@alpha`, `@beta`, `@public`, …), inline tags (`{@link}`, `{@inheritDoc}`,
`{@label}`), and custom properties (`--foo`).

## Use with Shiki or VitePress

The default export is a Shiki `LanguageRegistration` with `injectTo` already set, so registering it makes
every CSS block pick up the highlighting:

```ts
// .vitepress/config.ts
import cssdoc from "@cssdoc/tmlanguage";

export default {
  markdown: {
    languages: [cssdoc],
  },
};
```

## Use in a VS Code extension

Reference the raw grammar from `contributes.grammars` and inject it into CSS:

```json
{
  "contributes": {
    "grammars": [
      {
        "scopeName": "documentation.cssdoc",
        "path": "./cssdoc.injection.tmLanguage.json",
        "injectTo": ["source.css"]
      }
    ]
  }
}
```

The file is published at `@cssdoc/tmlanguage/cssdoc.injection.tmLanguage.json`.
