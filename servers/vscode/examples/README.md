# cssdoc extension example

A small workspace for exercising the cssdoc VS Code extension. Press **F5** in the `servers/vscode`
project ("Run cssdoc extension") — it builds the extension and opens this folder in a new Extension
Development Host with the extension loaded.

The convention is pinned to **BEM** in [`cssdoc.jsonc`](./cssdoc.jsonc), so modifiers are written
`.button--secondary`. That file spells out every option at its default value for reference — it's a
no-op you can delete. Documented CSS is auto-detected (the default `cssdoc.include` glob, `**/*.css`),
so no VS Code settings are needed.

## The files

- **[`components.css`](./components.css)** — the documented source: `button` and `card`, with modifiers
  (one deprecated), a part, a custom property, a state, and an `@structure` tree.
- **[`index.html`](./index.html)** / **[`App.jsx`](./App.jsx)** — consumers that use the classes. Hover,
  go-to-definition, completion, and usage warnings live here.
- **[`styles.ts`](./styles.ts)** — CSS-in-JS authoring: a component documented inside a `` css`…` ``
  template, linted like a `.css` file.
- **[`switch.ts`](./switch.ts)** — a Lit web component: shadow-DOM parts (`@csspart`, `::part()`) and a
  custom state (`@cssstate :state(…)`), documented inside a Lit `` css`…` `` template.
- **[`styleguide.md`](./styleguide.md)** — a Markdown doc whose fenced `css` block is linted like a
  `.css` file.

Every file is **clean by default** — no warnings on open. Each has inline `TRY` notes; the table below
collects them.

## Author-side — edit `components.css`, `styles.ts`, `switch.ts`, or `styleguide.md`

| Edit                                                       | Expect                          |
| ---------------------------------------------------------- | ------------------------------- |
| Delete a `@summary` line                                   | `missing-summary`               |
| Remove the `— description` after a `@modifier`             | `undocumented-modifier`         |
| Remove the `— description` after a `@part`                 | `undocumented-part`             |
| Remove the `— description` after a `@csspart`              | `undocumented-css-part`         |
| Delete the `{@link …}` from the deprecated `button--ghost` | `deprecated-requires-canonical` |
| Point an `@structure` selector at an undefined class       | `structure-unknown-selector`    |

## Consumer-side — edit `index.html` or `App.jsx`

| Action                                                    | Expect                                      |
| --------------------------------------------------------- | ------------------------------------------- |
| Hover a class like `button--secondary`                    | its summary + docs                          |
| Go to Definition (F12) on a class                         | jumps to the rule in `components.css`       |
| Type a space inside `class="button …"`                    | completion lists the component's modifiers  |
| Change a modifier to something undocumented (`button--x`) | `unknown-modifier`                          |
| Use the deprecated `button--ghost`                        | `deprecated-modifier` + a replace quick-fix |

Undo any edit to return to green.

## Notes

- Only `/**` doc blocks are parsed as records. Plain comments — including the `TRY` notes — are ignored,
  so mentioning a tag like `@component` in a note is harmless.
- Syntax highlighting and language features work in CSS, SCSS, Less, HTML, Vue, Svelte, Astro, Markdown,
  and JS/TS (both `className` usage and CSS-in-JS authoring).
