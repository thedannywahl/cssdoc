# Authoring doc comments

A cssdoc comment is a `/** … */` block above a component's rules. The vocabulary is modeled on TSDoc's
Block / Modifier / Inline kinds, plus a **record** kind that opens a documented record. It adopts the
Custom Elements Manifest names (`@cssproperty`, `@csspart`, `@cssstate`) where they exist.

Unknown tags are ignored, so the grammar degrades gracefully. The formal grammar lives in
`@cssdoc/spec`'s `grammar/CssDoc.grammarkdown`.

You can write these comments in a plain `.css` file or in CSS embedded in a host file — a tagged
template, a `<style>` block, or a Markdown fence. See [Embedded CSS](/guide/embedded-css).

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
| `@example <markdown>`                | An example: Markdown prose plus fenced code (bare code is auto-fenced).     |
| `@see <ref>`                         | A cross-reference.                                                          |
| `@deprecated <text>`                 | Marks the record deprecated, with replacement guidance.                     |
| `@todo <text>`                       | An internal to-do note (also read from `/* @todo … */` comments).           |

## The CSS surface

Most of these are **derived from the CSS** — the tag only adds prose. cssdoc reads the selectors and
at-rules; you don't have to list what's already there.

The `@modifier` example below uses the default **BEM** convention (`.base--x`). cssdoc supports other
modifier conventions (rscss, CUBE, OOCSS, and more) — see [Modifier conventions](/guide/modifier-conventions).

| Tag                                                    | Documents                                                 | Derived from           |
| ------------------------------------------------------ | --------------------------------------------------------- | ---------------------- |
| `@modifier <x> — <desc>`                               | A modifier on the base class                              | modifier selectors     |
| `@part .<x> — <desc>`                                  | A class-based sub-element part                            | scoped child selectors |
| `@csspart <x> — <desc>`                                | A shadow-DOM exposed part (`::part(x)`)                   | `::part(x)` / authored |
| `@pseudo ::<x> — <desc>`                               | A native pseudo-element (`::before`, `::marker`, …)       | `::x` selectors        |
| `@cssstate <x> — <desc>`                               | A custom `:state(x)` state                                | `:state(x)` selectors  |
| `@cssstate :<x> — <desc>`                              | A native pseudo-class state (`:disabled`)                 | pseudo-class selectors |
| `@slot <x> — <desc>`                                   | A named slot                                              | authored (CEM)         |
| `@cssproperty` / `@property --<x> [<syntax>] — <desc>` | A registered custom property                              | `@property` at-rules   |
| `@tokens --<x> — <desc>`                               | A consumed design token (annotates the auto-derived list) | `var(--x)` usages      |
| `@function --<x> — <desc>`                             | A CSS custom function                                     | `@function` at-rules   |
| `@keyframes` / `@animation <x> — <desc>`               | An exposed animation                                      | `@keyframes` at-rules  |
| `@layer <x> — <desc>`                                  | A cascade layer                                           | `@layer` at-rules      |
| `@container` / `@supports` / `@media <query> — <desc>` | A conditional block                                       | those at-rules         |
| `@a11y` / `@accessibility <text>`                      | Accessibility guidance                                    | authored               |
| `@structure`                                           | A nested-CSS element tree                                 | authored               |
| `@demo <spec>`                                         | An embeddable demo (`self:button`, `stackblitz:…`, a URL) | authored               |
| `@defaultValue <value>`                                | The default of the preceding `@cssproperty`               | authored               |
| `@usage <text>`                                        | How to include the stylesheet / use the component         | authored               |
| `@compat <text>`                                       | A browser-support / feature-compatibility note            | authored               |
| `@related <name> — <desc>`                             | A related component cross-reference                       | authored               |

The `@tokens` tag annotates the auto-derived "Tokens consumed" list: cssdoc already collects every
`var(--*)` a record references, and `@tokens --x — <desc>` attaches a description (a `@tokens` entry with
no matching `var()` is added to the list too). Emitters resolve each token's type and value separately —
see the markdown emitter's `resolveToken` hook.

To document a **family** of modifiers, use a `*` wildcard in the name — `@modifier -icon-* — <desc>`
(`*` matches any run of `[\w-]`). A family is a first-class modifier: it shows in the model and hover, a
concrete usage (`-icon-arrow`) resolves to it (so it isn't flagged unknown), and `name-not-in-css`
accepts it. cssdoc also **derives** a family straight from a `class` attribute selector on the base — a
`.base[class*="-icon-"]` painter yields the `-icon-*` family even before you author it, using the
operator's real semantics: `[class*="…"]` (contains) and `[class~="…"]`/`[class$="…"]` (exact word /
suffix) count, while `[class^="…"]` does not (it anchors to the base class, not a chained modifier).

cssdoc documents a **native pseudo-element** (`::before`, `::after`, `::marker`, `::selection`, and the
other standard ones) as soon as a selector styles it — `@pseudo ::before — <desc>` only adds prose.
Recognition is a curated allow-list, so vendor/experimental pseudo-elements (`::-webkit-*`) don't
become API; extend it with `pseudoElements` in the modifier convention. Shadow `::part()` stays its own
thing (`@csspart`).

## Inline comments

A plain `/* … */` comment on a member's rule describes that member — no `@modifier`/`@part`/`@pseudo`
line needed:

```css
/* Opt out of the default elevation. */
.alert.-without-shadow {
  box-shadow: none;
}
```

The comment attaches to whatever the next rule defines (a modifier, part, or pseudo-element); a comment
above the base rule or a non-member rule is ignored. When a member has **both** an inline comment and an
authored tag description, the `inlineComments` setting in `cssdoc.json` decides how they combine —
`append` (tag then comment, the default), `prepend`, `replace`, or `ignore`.

A `/* @todo … */` comment is captured as a to-do, not a description — the natural home for a
note-to-self that shouldn't read as prose. `@todo` also works as a block tag. To-dos are internal:
they surface in the editor hover but public emitters omit them, like `@privateRemarks`.

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
 * .tabs {
 *   .list {
 *     .tab {}
 *   }
 *   .panel {}
 * }
 * @a11y Tabs use roving tabindex; panels are labelled by their tab.
 * @beta
 */
.tabs {
  display: grid;
}
```

`@structure` is written as **nested CSS**: each rule's selector is an element, and the rules nested
inside it are its children. Because a node is a real selector, you can express relationships between
parts — `:has()` for "contains", `:is()` or a selector list for "one of", and `:not()` for "not":

```css
/**
 * @structure
 * .tabs {
 *   .list:has(.tab) {}
 *   .panel {}
 * }
 */
```

You can caption the tree with a leading one-line description before the CSS begins — the prose up to
the first rule is the description, and everything from the first selector on is the tree:

```css
/**
 * @structure How the parts nest in the DOM.
 * .tabs {
 *   .list { .tab {} }
 * }
 */
```

Three more things a node can express:

- **Cardinality** — a trailing pseudo on the selector: `:optional` (0..1), `:many` (0..n), or
  `:one-or-more` (1..n), with `:opt` and `:more` as shorthands. No marker means the child is **required**
  (present when the component is used). It's a pseudo (not a `/* … */` comment) because `@structure`
  lives inside a doc comment where CSS comments can't nest.
- **Content** — a `slot` node (or `slot[name="x"]`) marks where light-DOM content goes; it resolves to
  the component's default (or named) `@slot` and renders as ‹content› rather than a literal element.
- **Subcomponents** — reference another documented component by its class (`.close-button`); it's a
  valid child (no `structureIgnore` needed), is cross-linked, and populates a derived **Subcomponents**
  list. Keep such references bare — that component's own modifiers/parts live in its own docs.

```css
/**
 * @slot — The alert message.
 * @structure
 * .alert {
 *   slot {}
 *   .close-button:optional {}
 * }
 */
```

Every remaining class named in an `@structure` selector should resolve to the component class, a
documented member, or another documented component; otherwise `structure-unknown-selector` warns.
Exempt other externals (utilities) with `structureIgnore` in `cssdoc.json`.
