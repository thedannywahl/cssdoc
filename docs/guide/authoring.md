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
| `@layout <id>`                   | `layout`      |
| `@utility <id>`                  | `utility`     |
| `@rule <id>`                     | `rule`        |
| `@declaration <id>`              | `declaration` |

## Prose tags

| Tag                                  | Meaning                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@summary <text>`                    | One-line intro.                                                                                                                                  |
| `@remarks <text>`                    | Extended description.                                                                                                                            |
| `@privateRemarks <text>`             | Internal-only notes (emitters may omit).                                                                                                         |
| `@selector <selector>`               | The component's base CSS selector when it isn't a plain class: an attribute selector, an ID, a compound selector, or `:host`/`:host-context(…)`. |
| `@class <selector>`                  | Deprecated alias for `@selector`; accepted for backward compatibility.                                                                           |
| `@since <version>`                   | Version introduced.                                                                                                                              |
| `@group <name>` / `@category <name>` | Documentation grouping.                                                                                                                          |
| `@example <markdown>`                | An example: Markdown prose plus fenced code (bare code is auto-fenced).                                                                          |
| `@see <ref>`                         | A cross-reference.                                                                                                                               |
| `@deprecated <text>`                 | Marks the record deprecated, with replacement guidance.                                                                                          |
| `@todo <text>`                       | An internal to-do note (also read from `/* @todo … */` comments).                                                                                |

## The CSS surface

Most of these are **derived from the CSS** — the tag only adds prose. cssdoc reads the selectors and
at-rules; you don't have to list what's already there.

The `@modifier` example below uses the default **BEM** convention (`.base--x`). cssdoc supports other
modifier conventions (rscss, CUBE, OOCSS, and more) — see [Modifier conventions](/guide/modifier-conventions).

| Tag                                                    | Documents                                                             | Derived from           |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------- |
| `@modifier <x> — <desc>`                               | A modifier on the base class (class / bare name)                      | modifier selectors     |
| `@modifier [attr="val"] — <desc>`                      | An attribute-selector modifier; key is the inner attribute expression | modifier selectors     |
| `@modifier #id — <desc>`                               | An ID-selector modifier; name derived by stripping `#`                | authored               |
| `@modifier <sel> <alias> — <desc>`                     | Any selector with an explicit name alias; overrides the derived name  | authored               |
| `@part .<x> — <desc>`                                  | A class-based sub-element part                                        | scoped child selectors |
| `@part [attr="val"] — <desc>`                          | An attribute-selector part; name derived as the first attribute key   | authored               |
| `@part #id — <desc>`                                   | An ID-selector part; name derived by stripping `#`                    | authored               |
| `@part :host — <desc>`                                 | The shadow host itself as a documented part                           | authored               |
| `@part <sel> <alias> — <desc>`                         | Any selector with an explicit name alias; overrides the derived name  | authored               |
| `@csspart <x> — <desc>`                                | A shadow-DOM exposed part (`::part(x)`)                               | `::part(x)` / authored |
| `@pseudo ::<x> — <desc>`                               | A native pseudo-element (`::before`, `::marker`, …)                   | `::x` selectors        |
| `@cssstate <x> — <desc>`                               | A custom `:state(x)` state                                            | `:state(x)` selectors  |
| `@cssstate :<x> — <desc>`                              | A native pseudo-class state (`:disabled`)                             | pseudo-class selectors |
| `@cssstate [attr="val"] — <desc>`                      | An attribute-reflected state (ARIA/data-*, e.g. `[aria-sort="asc"]`)  | attribute selectors    |
| `@slot <x> — <desc>`                                   | A named slot                                                          | authored (CEM)         |
| `@cssproperty` / `@property --<x> [<syntax>] — <desc>` | A registered custom property                                          | `@property` at-rules   |
| `@tokens --<x> — <desc>`                               | A consumed design token (annotates the auto-derived list)             | `var(--x)` usages      |
| `@function --<x> — <desc>`                             | A CSS custom function                                                 | `@function` at-rules   |
| `@keyframes` / `@animation <x> — <desc>`               | An exposed animation                                                  | `@keyframes` at-rules  |
| `@layer <x> — <desc>`                                  | A cascade layer                                                       | `@layer` at-rules      |
| `@container` / `@supports` / `@media <query> — <desc>` | A conditional block                                                   | those at-rules         |
| `@a11y` / `@accessibility <text>`                      | Accessibility guidance                                                | authored               |
| `@structure`                                           | A nested-CSS element tree                                             | authored               |
| `@wrapper .<x> — <desc>`                               | Prose for a class-selector wrapper node in `@structure`               | authored               |
| `@wrapper [attr="val"] — <desc>`                       | Prose for an attribute-selector wrapper node; name is the attr key    | authored               |
| `@wrapper #id — <desc>`                                | Prose for an ID-selector wrapper node                                 | authored               |
| `@wrapper :host — <desc>`                              | Prose for a `:host` wrapper node                                      | authored               |
| `@wrapper <sel> <alias> — <desc>`                      | Any selector with an explicit name alias                              | authored               |
| `@demo <spec>`                                         | An embeddable demo (`self:button`, `stackblitz:…`, a URL)             | authored               |
| `@defaultValue <value>`                                | The default of the preceding `@cssproperty`                           | authored               |
| `@usage <text>`                                        | How to include the stylesheet / use the component                     | authored               |
| `@compat <text>`                                       | A browser-support / feature-compatibility note                        | authored               |
| `@related <name> — <desc>`                             | A related component cross-reference                                   | authored               |

The `@tokens` tag annotates the auto-derived "Tokens consumed" list: cssdoc already collects every
`var(--*)` a record references, and `@tokens --x — <desc>` attaches a description (a `@tokens` entry with
no matching `var()` is added to the list too). Emitters resolve each token's type and value separately —
see the markdown emitter's `resolveToken` hook.

## Non-class base selectors (`@selector`)

When a component's base isn't a plain class — it's an attribute selector, an ID, a compound selector,
or a shadow-DOM host — use `@selector` to tell cssdoc what the root element looks like:

```css
/**
 * @component x-banner
 * @summary A dismissible announcement banner (shadow DOM web component).
 * @selector :host
 */
:host { … }
```

Without `@selector`, cssdoc infers the base from the first bare single-class rule (`.button`, `.card`,
etc.) and falls back to `.${name}` when none is found. An explicit `@selector` always wins and skips
inference. Accepted forms:

| Form                     | Example                                           |
| ------------------------ | ------------------------------------------------- |
| Class (inferred anyway)  | `@selector .my-button`                            |
| Attribute                | `@selector [data-slot="action"]`                  |
| Compound attribute       | `@selector [data-slot="action"][aria-hidden="x"]` |
| ID                       | `@selector #dismiss`                              |
| Shadow host              | `@selector :host`                                 |
| Shadow host with context | `@selector :host-context(.dark-theme)`            |

`@class` is a deprecated alias for `@selector` accepted for backward compatibility.

## Non-class `@part` selectors

Parts can reference any CSS selector, not only `.class` names. The derived name (used as the part's
key in the model) follows these rules:

| Authored tag                                 | Stored name | Stored selector                |
| -------------------------------------------- | ----------- | ------------------------------ |
| `@part .item — <desc>`                       | `item`      | _(class; selector is `.item`)_ |
| `@part [data-slot="action"] — <desc>`        | `data-slot` | `[data-slot="action"]`         |
| `@part #dismiss — <desc>`                    | `dismiss`   | `#dismiss`                     |
| `@part :host — <desc>`                       | `host`      | `:host`                        |
| `@part [data-slot="action"] action — <desc>` | `action`    | `[data-slot="action"]`         |

The last form lets you supply an **alias** (a word after the selector, before `—`) to override the
derived name. Pseudos that already have dedicated tags (`@pseudo`, `@cssstate`, `@csspart`) are
excluded; `:host` and `:host-context(…)` are the only pseudo-class forms `@part` accepts.

The `name-not-in-css` lint rule checks the stored selector (not the derived name) against the
stylesheet, so `@part [data-slot="action"]` is satisfied when the string
`[data-slot="action"]` appears anywhere in the record's CSS selectors.

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

`@layout` is a first-class record kind for composition-focused CSS surfaces. For conventions,
implicit-structure behavior, and record-reference syntax in `@structure`, see [Layouts](/guide/layouts).

## Modifier (flag) tags

Presence sets the record's release stage: `@alpha`, `@beta`, `@experimental`, `@internal`, `@public`, `@stable`.

Use `@stable` when a record is production-ready but is deployed continuously and does not carry a meaningful `@since` version.

## Annotations and refs

`@annotations` defines a numbered legend for a record — prose rows that describe specific CSS choices
by number. `@ref` cites one of those entries on the record itself.

Prose can live inline on each `@ref`, or collected up front in an `@annotations` block — both work:

::: code-group

```css [@annotations]
/**
 * @component card
 * @summary A surface container.
 * @annotations
 * 1. Prevent shrinking when used in a flex row.
 * 2. Focus ring must remain visible over all backgrounds.
 */
.card {
  flex-shrink: 0; /* @ref 1 */
  outline-offset: 2px; /* @ref 2 */
}
```

```css [@ref]
/**
 * @component card
 * @summary A surface container.
 * @ref 1. Prevent shrinking when used in a flex row.
 * @ref 2. Focus ring must remain visible over all backgrounds.
 */
.card {
  flex-shrink: 0; /* @ref 1 */
  outline-offset: 2px; /* @ref 2 */
}
```

:::

A `/* @ref N */` comment on any member rule cites the annotation inline — the legend text shows in
hover for that specific rule:

```css
/* @ref 3. Legacy reset path. */
.card.-legacy { … }
```

Annotations are internal guidance — they surface in editor hover and the JSON model. Public emitters
omit them by default; opt in with `includeAnnotations: true` on the emitter options.

## Object-model decorators

These flag tags constrain how downstream code can use or extend a record. They appear in the model's
`decorators` field and are used by documentation tooling, scaffolders, and code generators.

| Tag                                | Meaning                                            |
| ---------------------------------- | -------------------------------------------------- |
| `@sealed` / `@noextend`            | No new modifiers or parts should be added.         |
| `@frozen`                          | The record is fully immutable — no changes at all. |
| `@preventExtensions` / `@noextend` | No new named members can be added to the record.   |
| `@readonly`                        | The record's tokens may not be reassigned.         |

```css
/**
 * @component close-button
 * @summary A dismiss control with a fixed appearance.
 * @sealed
 */
.close-button { … }
```

These tags don't change CSS behavior. They are conventions for consumers: a `@sealed` component
signals that adding modifier chaining is out of scope; a `@frozen` declaration block should not be
overridden.

Public emitters omit decorators by default; opt in with `includeDecorators: true` on the emitter
options.

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

## Documenting a JS-interaction hook

Some classes are toggled by script and never carry declarations of their own (an animation trigger, a
loading flag). Mark one inline with `@interaction` — it's still validated as a documented modifier
against consumer usage, but exempt from the "isn't defined by any selector" check, so it doesn't need
an empty `{}` rule to satisfy the linter:

```css
/**
 * @component progress-circle
 * @modifier -should-animate — @interaction Toggled by JS while the ring's growth animation runs.
 */
.progress-circle {
  /* … */
}
```

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
- **Scope boundary** — a `@scope (…) { … }` at-rule wraps its children in a named scope group. The
  scope prelude is used as a label in both the Mermaid diagram (a subgraph) and the text tree.

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

Using `@scope` inside `@structure`:

```css
/**
 * @structure
 * @scope (.menu) {
 *   :scope > .item {}
 *   :scope > .separator:optional {}
 * }
 */
```

CSS at-rules whose names are not cssdoc tags (`@scope`, `@media`, `@layer`, etc.) are treated as CSS
content within `@structure` and are never mis-read as new doc-comment tag blocks.

### Alternative structures (`@variant`)

Some elements have more than one valid DOM shape, and only one applies at a time — e.g. a `<progress>`
wrapped inside its `<label>`, or a `<label for>` pointing at a sibling `<progress id>`. `@structure`'s
tree has a single root, so express "pick one of these" with a top-level `@variant <name>? { … }` block
per alternative — the name is optional (an unlabeled `@variant` renders as "Variant N"):

```css
/**
 * @structure
 * @variant wrapped {
 *   label { progress {} }
 * }
 * @variant labelled {
 *   label {}
 *   progress {}
 * }
 */
```

Each variant is validated independently against the component's own known classes (parts, modifiers,
slots, sibling components) — an unknown class in one variant is flagged even if the others are clean.
By default the rendered Structure section shows one combined diagram with a labelled subgraph per
variant; set `render.structureVariantView: "sections"` in `cssdoc.json` for separate `### Variant: <name>`
subsections instead. `@variant` is only recognized at the top level of `@structure` — a nested
occurrence is inert CSS content, like any other unrecognized at-rule.

Every remaining class named in an `@structure` selector should resolve to the component class, a
documented member, or another documented component; otherwise `structure-unknown-selector` warns.
Exempt other externals (utilities) with `structureIgnore` in `cssdoc.json`.

### Optional-ancestor wrappers

Sometimes the notable structure is an _optional ancestor_ — a wrapper the component sits inside. Root
the tree at the wrapper and mark it `:opt`; because the component's own class appears beneath it, cssdoc
recognizes the wrapper as a valid ancestor (no `structureIgnore`), and the diagram carries the `0..1` on
the root. `@wrapper` adds prose to a wrapper node the same way `@modifier` annotates a modifier.

`@wrapper` accepts the same selector forms as `@part` and `@modifier` — class, attribute, ID, and
`:host` — with an optional alias:

```css
/**
 * @slot — The target being badged.
 * @wrapper .badge-wrapper — Optional; anchors the badge over a target.
 * @structure
 * .badge-wrapper:opt {
 *   slot {}
 *   .badge {}
 * }
 */
```

When the wrapper node isn't a plain class, use the appropriate selector form:

```css
/**
 * @wrapper #dismiss — Dismiss trigger; present when the banner is dismissible.
 * @wrapper [data-slot="action"] — Optional call-to-action area.
 * @structure
 * :host {
 *   #dismiss:optional {}
 *   [data-slot="action"]:optional {}
 * }
 */
```

An alias (`@wrapper <sel> <alias> — <desc>`) overrides the derived name while the original selector
is used for matching against the structure node.
