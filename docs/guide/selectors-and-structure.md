# Selectors and structure

cssdoc reads selectors to identify a record's base and CSS members. Use the examples here to
handle explicit selectors, relate records, and describe layouts with more than one valid shape.
See [Doc-comment tags](/guide/doc-comment-tags) for the tag vocabulary and description syntax.

## Non-class base selectors (`@selector`)

When a component's base isn't a plain class — it's an attribute selector, an ID, a compound selector,
or a shadow-DOM host — use `@selector` to tell cssdoc what the root element looks like:

```css
/**
 * @component x-banner
 * @summary A dismissible announcement banner (shadow DOM web component).
 * @selector :host
 */
:host {
  display: block;
}
```

Without `@selector`, cssdoc looks for a bare single-class rule that matches the record name or ends
with it. For `@component button`, `.app-button` takes precedence over an earlier `.helper` rule.
If no class matches the name, cssdoc uses the first bare class. With no bare class it falls back to
the record name with a leading dot. An explicit `@selector` skips inference.

| Form                     | Example                                           |
| ------------------------ | ------------------------------------------------- |
| Class (inferred anyway)  | `@selector .my-button`                            |
| Attribute                | `@selector [data-slot="action"]`                  |
| Compound attribute       | `@selector [data-slot="action"][aria-hidden="x"]` |
| ID                       | `@selector #dismiss`                              |
| Shadow host              | `@selector :host`                                 |
| Shadow host with context | `@selector :host-context(.dark-theme)`            |

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

## Deprecating a modifier

Mark a modifier deprecated inline and point at its replacement with `{@link}`:

```css
/**
 * @component alert
 * @modifier alert--error — @deprecated {@link alert--danger}
 * @modifier alert--danger — Destructive or irreversible actions.
 */
.alert {
  padding: 1rem;
}
.alert--danger {
  color: red;
}
.alert--error {
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
 * @modifier progress-circle--animate — @interaction Toggled by JS while the ring's
 *   growth animation runs.
 */
.progress-circle {
  display: inline-block;
}
```

## Documenting a modifier's effect on a descendant record

A modifier sometimes changes how a _different, already-documented_ record renders — a `table`'s
`table--stacked` modifier can change how `table-cell` renders (adding a generated label via
`::before`), through a rule that lives in `table-cell`'s own stylesheet
(`.table--stacked .table-cell::before {…}`). Nothing on `table`'s side would otherwise point a
reader at that effect. Mark it inline with `@affects <component>.<target> — <desc>`, the same pattern as
`@interaction`/`@global`:

```css
/**
 * @component table
 * @modifier table--stacked — @affects table-cell.before —
 *   Adds a generated label via ::before.
 */
.table {
  display: grid;
}

/* Stack the table's cells vertically. */
.table--stacked {
  grid-template-columns: 1fr;
}

/** @component table-cell */
.table-cell {
  padding: 0.5rem;
}

.table--stacked .table-cell::before {
  content: attr(data-label);
}
```

`<target>` names a part, pseudo-element, or state on `<component>` — it isn't validated against that
record's own members (only that `<component>` itself is a documented record), so it works for a target
declared with any tag. Emitters render an "Affects" note on the modifier row, cross-linking to
`<component>`'s page when resolvable.

`name-not-in-css` also accepts the modifier's selector being defined in `<component>`'s own CSS instead
of this record's — so a modifier that has _no_ rule of its own (its whole effect is a descendant rule
like `.table-row.-hover:hover {…}` in `table-row`'s stylesheet) isn't flagged as drift.

## Declaring family membership with `@memberOf`

`@structure` documents _containment_ — a fixed position inside one parent's own tree, discovered by
nesting a rule inside another record's `@structure` body. `@related` is a loose, undirected "see also"
cross-reference, and doesn't feed the Subcomponents section at all. `@memberOf` sits between the two: it
declares a record is part of another record's family — cross-linking into that parent's Subcomponents
section — without requiring the member to be nested in the parent's own `@structure` at all. Use it when
a sub-component doesn't have one fixed position (a table's row/cell classes can plausibly be reused
outside a table), or when it lives in a different file/sheet than its parent.

```css
/** @component table */
.table {
  width: 100%;
}

/**
 * @component table-cell
 * @summary A table data cell.
 * @memberOf table
 */
.table-cell {
}
```

A trailing `private` keyword — named after TypeScript's own scoping keyword, "only usable within the
declaring scope" — marks the member as **never valid standalone or under a different parent**:

```css
/**
 * @component side-nav-bar
 * @structure
 * .side-nav-bar {
 *   .side-nav-bar-item {}
 * }
 */
.side-nav-bar {
  display: grid;
}

/**
 * @component side-nav-bar-item
 * @summary One navigation entry in a side nav rail.
 * @memberOf side-nav-bar private
 */
.side-nav-bar-item {
}
```

`private` is independent of `@sealed`/`@noextend` — those constrain whether a record's _own_ API surface
can be extended; `private` constrains _where the record may appear at all_. A record can be both.

A dotted `@component` name (`menu.item`) implies `@memberOf` its immediate parent automatically — writing
`@component menu.item` alone is equivalent to `@component menu.item` + `@memberOf menu`. An explicit
`@memberOf` still wins if it names a different parent.

### Declaring members from the parent's side with `@members`

`@memberOf` is authored on the child. When a set of members doesn't share a dotted name with their
parent (so there's nothing to infer from), the parent can declare them directly instead:

```css
/**
 * @component tabs
 * @summary A tabbed panel.
 * @members tab, panel
 */
.tabs {
  display: grid;
}

/** @component tab */
.tab {
  cursor: pointer;
}

/** @component panel */
.panel {
  padding: 1rem;
}
```

Each name is validated the same way `@memberOf`'s parent reference is — it must be a documented record,
or linting flags it. `@members` and `@memberOf` both feed the same Subcomponents section; a member
doesn't need to declare `@memberOf` back for `@members` to pick it up.

Use the repeatable [`@member` tag](/guide/doc-comment-tags#declaring-individual-members) to declare
one member per line, including a member marked `private`.

## Structure trees

```css
/**
 * @component tabs
 * @summary A tabbed panel.
 * @remarks Roving-tabindex keyboard nav; one panel visible at a time.
 * @modifier tabs--quiet — Lower-emphasis controls.
 * @part .list — Holds the tab buttons.
 * @part .tab — A single tab.
 * @part .panel — Displays the active tab's content.
 * @cssstate [data-state="selected"] — The active tab.
 * @structure
 * .tabs {
 *   .list {
 *     .tab {}
 *   }
 *   .panel {}
 * }
 * @a11y Tabs use roving tabindex; panels are labelled by their tab.
 * @stage beta
 */
.tabs {
  display: grid;
}
.tabs--quiet {
  gap: 0.25rem;
}
.tabs .list {
  display: flex;
}
.tabs .tab {
  padding: 0.5rem;
}
.tabs .tab[data-state="selected"] {
  font-weight: bold;
}
.tabs .panel {
  padding: 1rem;
}
```

With [`render.structureView`](/guide/config-reference#sections-and-structure-views) set to `"text"`,
the generated Structure section shows this tree:

```text
.tabs
  .list
    .tab
  .panel
```

[`@structure`](/guide/grammar#production-structuretag) uses nested CSS. Each rule's selector
is an element, and the rules nested inside it are its children. Selectors can express
relationships between parts with `:has()`, `:is()`, selector lists, and `:not()`. For example,
replace the tabs record's `@structure` block with the one below to require a tab in the list.

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
  `:one-or-more` (1..n), with `:opt` and `:more` as shorthands. A bare `:max-<n>` bounds `:many` to 0..N
  (e.g. `:max-2`), and a chained `:one-or-more:max-<n>` (or `:more:max-<n>`) bounds `:one-or-more` to
  1..N. No marker means the child is **required** (present when the component is used). It's a pseudo
  (not a `/* … */` comment) because `@structure`
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
 * @component progress-display
 * @selector progress
 * @structure
 * @variant wrapped {
 *   label { progress {} }
 * }
 * @variant labelled {
 *   label {}
 *   progress {}
 * }
 */
progress {
  width: 100%;
}
```

Each variant is validated independently against the component's own known classes (parts, modifiers,
slots, sibling components) — an unknown class in one variant is flagged even if the others are clean.
By default the rendered Structure section shows one combined diagram with a labelled subgraph per
variant; set `render.structureVariantView: "sections"` in `cssdoc.json` for separate `### Variant: <name>`
subsections instead.

A `@variant` block can also nest inside a parent node's body, one level below the top — that's a local
choice at _one child position_, not a whole-tree alternation: the rest of the tree stays fixed, and only
that position is filled by exactly one of the alternatives. Useful when one slot holds either a single
element or a wrapper around several:

```css
/** @component button */
.button {
  padding: 0.5rem;
}

/**
 * @component action-row
 * @slot — The row's content.
 * @part .button-group — Groups related actions.
 * @structure
 * .action-row {
 *   slot {}
 *   @variant single {
 *     @component button:optional {}
 *   }
 *   @variant group {
 *     .button-group:optional {
 *       @component button:one-or-more:max-2 {}
 *     }
 *   }
 * }
 */
.action-row {
  display: flex;
}
.action-row .button-group {
  display: flex;
  gap: 0.25rem;
}
```

Here `.action-row` always has its content slot, then either a single optional button or an optional
`.button-group` wrapper holding one to two buttons — never both, and never a button-group with more than
two. Nested `@variant` renders the same way top-level `@variant` does — a labelled subgraph per
alternative in the diagram, a grouped sub-list in the text tree — just local to that position instead of
wrapping the whole diagram.

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

## Composition

Use `@component` and `@structure` for a page shell or other composition. See
[Document composition](/guide/layouts) for a complete example. In a `@structure`, a bare component class such as `.site-header`
can refer to a documented record. To select by record kind and ID, use a typed reference such as
`@component site-header {}`. Keep node selectors focused on the elements and components in the
layout. Document their variants and states in the corresponding records.

Use a single-selector `:is()` to show that the same element carries two classes. For example,
`.toolbar:is(.site-header)` describes a toolbar that also carries the site header class. To show
alternative component types at one position, use a selector list. A cardinality marker at the end
of a list applies to the whole position, as in `.table-cell, .table-row-header:one-or-more`.

Attach a profile name to a typed reference, for example
`@component site-header (--desktop-header) {}`, to identify a breakpoint-specific composition.
Declare the profile with `@custom-media` or use
[`compileCustomMediaDeclarations`](/reference/@cssdoc/core/functions/compileCustomMediaDeclarations)
in your build.
