# Introduction

cssdoc is **TSDoc, for CSS**. You write structured `/** … */` doc comments above your CSS rules; cssdoc
parses those comments _plus the CSS itself_ into a serializable model, and a family of small packages
turns that model into documentation, lint rules, standard-format exports, and editor IntelliSense.

There's no modern, maintained "TypeDoc for plain CSS" — cssdoc is that missing core.

## Why it's AST-first

The doc comments supply **prose** — summaries, descriptions, demos. The **machine facts** — a
component's base class, its `-modifier` families, sub-element parts, declared and consumed custom
properties, functions, keyframes, layers, and deprecation links — are read from the actual selectors
and at-rules. Because those facts come from the CSS, your docs can't drift from what ships.

```css
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 */
.button {
  background: var(--color-bg);
}
.button.-color-secondary {
  background: var(--color-bg-secondary);
}
```

From that, cssdoc knows the component `button`, its class `.button`, the modifier
`-color-secondary` (documented) — and, from the selectors alone, any other modifiers you defined.

## What you can do with it

- **Generate documentation** — Markdown, standalone HTML, JSON, or an `llms.txt` digest.
- **Export to standards** — VS Code custom data, a Custom Elements Manifest, or W3C Design Tokens.
- **Lint** — flag undocumented or drifted docs (Stylelint/ESLint), and validate the classes your
  HTML/JSX applies against the documented surface.
- **Edit with IntelliSense** — completion, hover, go-to-definition, and deprecation quick-fixes via a
  language server (and a VS Code extension).

## How it's organized

cssdoc is a set of small, composable packages in three tiers — a parser + model, host-agnostic
providers over it, and thin adapters. You only install the ones you need. See
[Packages](/guide/packages) for the full map, or jump to [Getting started](/guide/getting-started).
