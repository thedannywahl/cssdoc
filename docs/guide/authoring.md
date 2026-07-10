# Authoring doc comments

A cssdoc comment is a `/** … */` block above a component's rules. The vocabulary is modeled on TSDoc's
Block / Modifier / Inline kinds, plus a **record** kind that opens a documented record. It adopts the
Custom Elements Manifest names (`@cssproperty`, `@csspart`, `@cssstate`) where they exist.

Unknown tags are ignored, so the grammar degrades gracefully. The formal grammar lives in
`@cssdoc/spec`'s `grammar/CssDoc.grammarkdown`.

## Record tags

One of these opens a record and picks its kind. `@name` is an alias for `@component`.

| Tag                              | Kind          |
| -------------------------------- | ------------- |
| `@component <id>` / `@name <id>` | `component`   |
| `@utility <id>`                  | `utility`     |
| `@rule <id>`                     | `rule`        |
| `@declaration <id>`              | `declaration` |

## Prose tags

| Tag                                  | Meaning                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------- |
| `@summary <text>`                    | One-line intro.                                                             |
| `@remarks <text>`                    | Extended description.                                                       |
| `@privateRemarks <text>`             | Internal-only notes (emitters may omit).                                    |
| `@class <selector>`                  | An explicit base class (otherwise inferred from the first bare-class rule). |
| `@since <version>`                   | Version introduced.                                                         |
| `@group <name>` / `@category <name>` | Documentation grouping.                                                     |
| `@example <code>`                    | A verbatim example block.                                                   |
| `@see <ref>`                         | A cross-reference.                                                          |
| `@deprecated <text>`                 | Marks the record deprecated, with replacement guidance.                     |

## The CSS surface

Most of these are **derived from the CSS** — the tag only adds prose. cssdoc reads the selectors and
at-rules; you don't have to list what's already there.

The `@modifier` example below uses the default **BEM** convention (`.base--x`). cssdoc supports other
modifier conventions (rscss, CUBE, OOCSS, and more) — see [Modifier conventions](/guide/modifier-conventions).

| Tag                                                    | Documents                                                 | Derived from           |
| ------------------------------------------------------ | --------------------------------------------------------- | ---------------------- |
| `@modifier <x> — <desc>`                               | A modifier on the base class                              | modifier selectors     |
| `@part` / `@csspart .<x> — <desc>`                     | A sub-element part                                        | scoped child selectors |
| `@cssstate <x> — <desc>`                               | A component state                                         | `:state(x)` selectors  |
| `@slot <x> — <desc>`                                   | A named slot                                              | authored (CEM)         |
| `@cssproperty` / `@property --<x> [<syntax>] — <desc>` | A registered custom property                              | `@property` at-rules   |
| `@function --<x> — <desc>`                             | A CSS custom function                                     | `@function` at-rules   |
| `@keyframes` / `@animation <x> — <desc>`               | An exposed animation                                      | `@keyframes` at-rules  |
| `@layer <x> — <desc>`                                  | A cascade layer                                           | `@layer` at-rules      |
| `@container` / `@supports` / `@media <query> — <desc>` | A conditional block                                       | those at-rules         |
| `@a11y` / `@accessibility <text>`                      | Accessibility guidance                                    | authored               |
| `@structure`                                           | An indentation-nested HTML tree                           | authored               |
| `@demo <spec>`                                         | An embeddable demo (`self:button`, `stackblitz:…`, a URL) | authored               |
| `@defaultValue <value>`                                | The default of the preceding `@cssproperty`               | authored               |

## Modifier (flag) tags

Presence sets the record's release stage: `@alpha`, `@beta`, `@experimental`, `@internal`, `@public`.

## Inline tags

Inside prose: `{@link <ref>}`, `{@inheritDoc <ref>}`, `{@label <id>}`. A reference targets a modifier
(`-x`), a part (`.x`), or a record name.

## Deprecating a modifier

Mark a modifier deprecated inline and point at its replacement with `{@link}`:

```css
/**
 * @component alert
 * @modifier -variant-error — @deprecated {@link -color-danger}
 */
.alert.-color-danger {
  color: red;
}
.alert.-variant-error {
  color: red;
}
```

The deprecation and its canonical replacement flow into the model — and into the lint rules and the
editor's replace-with-canonical quick-fix.

## A fuller example

```css
/**
 * @component tabs
 * @summary A tabbed panel.
 * @remarks Roving-tabindex keyboard nav; one panel visible at a time.
 * @modifier -variant-secondary — Lower-emphasis chrome.
 * @part .tab — A single tab.
 * @cssstate selected — The active tab.
 * @structure
 *   .tabs
 *     .list
 *       .tab
 *     .panel
 * @a11y Tabs use roving tabindex; panels are labelled by their tab.
 * @beta
 */
.tabs {
  display: grid;
}
```
