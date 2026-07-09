---
layout: home
hero:
  name: cssdoc
  text: TSDoc, for CSS
  tagline: Document plain CSS with structured comments — parse them plus the CSS AST into a model, then emit docs, catch drift and misuse, and get editor IntelliSense.
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
features:
  - icon:
      light: /edit-light.svg
      dark: /edit-dark.svg
    title: Author with a grammar
    details: A small, TSDoc-shaped comment vocabulary — @component, @modifier, @cssproperty, @csspart, and more — with the machine facts derived from the selectors so they can't drift.
  - icon:
      light: /send-light.svg
      dark: /send-dark.svg
    title: Emit anywhere
    details: One model, many outputs — Markdown, standalone HTML, JSON (with a schema), and an llms.txt digest — plus VS Code custom data, a Custom Elements Manifest, and W3C Design Tokens.
  - icon:
      light: /search-light.svg
      dark: /search-dark.svg
    title: Catch drift and misuse
    details: Stylelint and ESLint rules flag undocumented or drifted docs, and validate the classes and modifiers your HTML or JSX actually applies.
  - icon:
      light: /brain-light.svg
      dark: /brain-dark.svg
    title: Editor IntelliSense
    details: A language server brings completion, hover, go-to-definition, and deprecation quick-fixes to any LSP editor — with a VS Code extension included.
---
