# @cssdoc/grammarkdown-tmlanguage

A small TextMate grammar for [grammarkdown](https://github.com/rbuckton/grammarkdown) — the
ECMAScript-style grammar notation used by TSDoc and by cssdoc's own doc-comment spec
(`CssDoc.grammarkdown`). It highlights productions, the `:` / `::` / `:::` separators, backtick
terminals, `<character-class>` tokens, `U+` code points, parameter and constraint brackets, and the
`but not` / `one of` / `lookahead` / `empty` keywords.

## Use with Shiki or VitePress

The default export is a Shiki `LanguageRegistration`, so it registers directly:

```ts
// .vitepress/config.ts
import grammarkdown from "@cssdoc/grammarkdown-tmlanguage";

export default {
  markdown: {
    languages: [grammarkdown],
  },
};
```

Then tag fenced blocks with `grammarkdown`.

## Use the raw grammar

For editors or other TextMate consumers, the grammar is published as a plain file:

```js
import grammar from "@cssdoc/grammarkdown-tmlanguage/grammarkdown.tmLanguage.json" with { type: "json" };
```

Its scope name is `source.grammarkdown`.
