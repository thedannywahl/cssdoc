# Doc-comment tags

For a worked example, see [Document a component](/guide/authoring).

A cssdoc comment is a `/** … */` block above a record's CSS. The vocabulary is modeled on TSDoc's
Block / Modifier / Inline kinds, plus a **record** kind that opens a documented record. It adopts the
Custom Elements Manifest names (`@cssproperty`, `@csspart`, `@cssstate`) where they exist.

The parser ignores unknown tags. See the [formal grammar](/guide/grammar) for the productions
that define doc-comment syntax.

You can write these comments in a plain `.css` file or in CSS embedded in a host file — a tagged
template, a `<style>` block, or a Markdown fence. See [Embedded CSS](/guide/embedded-css).

## Tag index

| Look up                                                       | Tags and topics                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Record tags](#record-tags)                                   | `@component`, `@name`, `@utility`, `@declaration`                                  |
| [Prose tags](#prose-tags)                                     | `@summary`, `@remarks`, `@example`, `@see`, and other record metadata              |
| [CSS surface tags](#the-css-surface)                          | `@modifier`, `@part`, `@csspart`, `@cssstate`, `@cssproperty`, `@tokens`, and more |
| [Example labels](#example-labels)                             | `@example docs, demo - …`                                                          |
| [Allowed HTML elements](#allowed-html-elements)               | `@element`                                                                         |
| [Declaring individual members](#declaring-individual-members) | `@member`                                                                          |
| [Modifier annotations](#modifier-annotations)                 | `@alias`, `@deprecated`, `@interaction`, `@global`, `@affects`                     |
| [Comment formatting](#multi-line-tag-descriptions)            | Multi-line tag descriptions and Markdown                                           |
| [Inline CSS comments](#inline-comments)                       | Member descriptions and `@todo`                                                    |
| [Release stage and visibility](#release-stage-and-visibility) | `@stage`, `@visibility`                                                            |
| [Annotations and refs](#annotations-and-refs)                 | `@annotations`, `@ref`                                                             |
| [Object-model decorators](#object-model-decorators)           | `@sealed`, `@frozen`, `@preventExtensions`, `@readonly`                            |
| [Inline tags](#inline-tags)                                   | `{@link}`, `{@inheritDoc}`, `{@label}`                                             |
| [Selectors and structure](/guide/selectors-and-structure)     | `@selector`, `@structure`, `@variant`, `@wrapper`, and worked examples             |

## Record tags

One of these opens a record and picks its kind. The required `<id>` is the stable, human-readable
name used for references and generated page names; it is not the CSS selector. `@selector` separately
declares a non-class base selector when inference is insufficient. `@name` is an alias for
`@component`.

| Tag                              | Kind          |
| -------------------------------- | ------------- |
| `@component <id>` / `@name <id>` | `component`   |
| `@utility <id>`                  | `utility`     |
| `@declaration <id>`              | `declaration` |

Record kinds label the documented surface; they don't change the CSS or limit the record-level
vocabulary. Prose tags such as `@todo` can be used on any record. Surface tags such as `@part` and
`@modifier` describe matching selectors, while `@cssproperty` annotates a declared or consumed custom
property. Use `@structure` when the record describes an element composition.

```css
/** @component alert
 * @part .title — The alert heading.
 */
.alert {
}
.alert .title {
}

/** @utility visually-hidden
 * @todo Confirm the clipping values against the design system.
 */
.visually-hidden {
}

/** @component app-shell
 * @structure
 * .app-shell { header {} main {} }
 */
.app-shell {
}

/** @declaration timeout
 * @cssproperty --timeout — Maximum toast duration, in milliseconds.
 */
@property --timeout {
  syntax: "<integer>";
  inherits: false;
  initial-value: 5;
}
```

`@utility` is a reader-facing classification for single-purpose classes.
`@declaration` groups registered-property or custom-function declarations.

## Prose tags

| Tag                                  | Meaning                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@summary <text>`                    | Recommended one-line intro; optional.                                                                                                                       |
| `@remarks <text>`                    | Extended description.                                                                                                                                       |
| `@privateRemarks <text>`             | Internal-only notes (emitters may omit).                                                                                                                    |
| `@selector <selector>`               | The record's base CSS selector when it isn't inferred from a plain class: an attribute selector, an ID, a compound selector, or `:host`/`:host-context(…)`. |
| `@stage <value>`                     | Release maturity: `alpha`, `beta`, `experimental`, or `stable`.                                                                                             |
| `@visibility <value>`                | Audience: `public` (the default) or `internal`. Internal records are omitted from public emitter output by default.                                         |
| `@since <version>`                   | Version introduced.                                                                                                                                         |
| `@group <name>` / `@category <name>` | Documentation grouping.                                                                                                                                     |
| `@example <markdown>`                | An example: Markdown prose plus fenced code (bare code is auto-fenced).                                                                                     |
| `@see <ref>`                         | A cross-reference.                                                                                                                                          |
| `@deprecated <text>`                 | Marks the record deprecated, with replacement guidance.                                                                                                     |
| `@todo <text>`                       | An internal to-do note (also read from `/* @todo … */` comments).                                                                                           |

### Example labels

To label an example for different consumers, write `@example docs, demo -` on the tag line
and start the body after the divider or on the next line. Labels are lowercase letters and digits, with hyphens
between segments (for example, `a11y-fixture`). You can reuse a label on multiple examples. Labels
don't change the example's heading and aren't rendered as part of the example, but they are visible
in the JSON model.

Add `{@private}` before the divider to omit an example and its labels from public output. JSON
serialization can include private examples explicitly with `includePrivate`.

See [example filtering](/guide/config-reference#example-filtering) to choose which labels appear
in Markdown, HTML, or editor hovers.

## The CSS surface

Most of these are **derived from the CSS** — the tag only adds prose. cssdoc reads the selectors and
at-rules; you don't have to list what's already there.

The `@modifier` example below uses the default **BEM** convention (`.base--x`). cssdoc supports other
modifier conventions — see [modifier and state conventions](/guide/config-reference#modifierconvention).

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
| `@memberOf <name> [private]`                           | Declares this record a member of `<name>`'s family                    | authored               |
| `@members <name>, <name>, …`                           | Declares this record's members, from the parent's side                | authored               |

The `@tokens` tag annotates the auto-derived "Tokens consumed" list: cssdoc already collects every
`var(--*)` a record references, and `@tokens --x — <desc>` attaches a description (a `@tokens` entry with
no matching `var()` is added to the list too). Emitters resolve each token's type and value separately —
see the markdown emitter's `resolveToken` hook.

## Allowed HTML elements

Use `@element` to declare which HTML elements may carry a component's class. For example, the
`notice-dismiss` class below can be used on a `<button>`:

```css
/**
 * @component notice-dismiss
 * @summary Dismisses a notice.
 * @element button
 */
.notice-dismiss {
  cursor: pointer;
}
```

A class usage check reports [`disallowed-element`](/guide/lint-reference#disallowed-element) for a
`<div class="notice-dismiss">`. List several elements with commas, or use `any` to allow all
known HTML elements. Prefix an element or group with `!` to exclude it. A named profile starts
with its name and a colon, as in `@element compact: button, a`.
See [ElementTag](/guide/grammar#production-elementtag) for the formal syntax.

## Declaring individual members

Use `@member <name> [private]` on a parent to declare one named member per tag. The list from
`@members` and the repeatable `@member` entries combine. To use `private`, declare the matching
`@memberOf <parent> private` on the child and include the child in the parent's structure.
See [family membership](/guide/selectors-and-structure#declaring-family-membership-with-memberof)
for the relationship rules and [MemberTag](/guide/grammar#production-membertag) for the syntax.

```css
/**
 * @component tabs
 * @summary A tabbed panel.
 * @member tab
 */
.tabs {
  display: grid;
}

/** @component tab */
.tab {
  cursor: pointer;
}
```

## Modifier annotations

Add annotations after the separator in an `@modifier` description. Use `@alias` for a rename
and include its canonical target in an inline reference:

```css
/**
 * @component button
 * @summary Triggers an action.
 * @modifier button--quiet — Use for secondary actions.
 * @modifier button--subtle — @alias {@link button--quiet}
 */
.button {
  padding: 0.5rem;
}
.button--quiet {
  background: transparent;
}
```

cssdoc records `button--subtle` as an alias of `button--quiet`. Use
[`@deprecated`](/guide/selectors-and-structure#deprecating-a-modifier) to mark a deprecated
modifier, [`@interaction`](/guide/selectors-and-structure#documenting-a-js-interaction-hook)
for a script-toggled hook, and
[`@affects`](/guide/selectors-and-structure#documenting-a-modifier-s-effect-on-a-descendant-record)
to describe an effect on another record. `@global` marks a modifier for use across records.
See [ModifierAnnotationTag](/guide/grammar#production-modifierannotationtag) for the grammar and
[global precedence](/guide/config-reference#globalprecedence) for conflicts with local modifiers.

## Multi-line tag descriptions

Many tags accept a description after the `—` or `-` separator (e.g., `@modifier`, `@part`, `@cssproperty`).
When a description is too long for a single line, indent continuation lines for readability — the parser
normalizes whitespace by joining them into a single line, except where **Markdown structure is detected
and preserved**.

### Wrapping long descriptions

Continuation lines are joined with spaces unless they form Markdown list items, headers, blockquotes,
or similar structures:

```css
/**
 * @modifier -should-animate — @interaction Toggled by JS
 *   while the ring's growth animation runs.
 */
```

Parses as: `"Toggled by JS while the ring's growth animation runs."` (with `@interaction` marker extracted).

### Preserving Markdown structure

When your description contains Markdown — lists, numbered steps, paragraph breaks — it's automatically
preserved:

```css
/**
 * @remarks
 * ✅ Use when:
 * - Building a full product page
 * - The page includes GlobalNav
 *
 * ❌ Don't use when:
 * - You need a minimal sidebar
 * - You need maximum flexibility
 */
```

Parses as:

```text
✅ Use when:
- Building a full product page
- The page includes GlobalNav

❌ Don't use when:
- You need a minimal sidebar
- You need maximum flexibility
```

The blank line is preserved as a paragraph break, and each list item stays on its own line.

### Allowed continuation patterns

Continuation works on any tag that accepts a description: `@modifier`, `@part`, `@cssstate`, `@csspart`,
`@cssproperty`, `@remarks`, `@accessibility`, `@a11y`, and others. It also works on tags describing
conditions (`@container`, `@supports`, `@media`) and other constructs.

Just indent continuation lines — the existing comment format (with `*`) handles the formatting:

```css
/**
 * @cssproperty --banner-bg <color> — Background color
 *   for the banner. Accepts any valid CSS color value.
 * @modifier [data-size="compact"] — Compressed layout for
 *   space-constrained containers.
 */
```

No special syntax needed — the parser automatically detects continuation lines and joins them. This
makes long descriptions editor-friendly without breaking your code style.

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

## Release stage and visibility

Use `@stage alpha`, `@stage beta`, `@stage experimental`, or `@stage stable` to describe release
maturity. Use `@visibility internal` for records intended for author documentation; collection
emitters omit them by default and accept `includeInternal: true` to include them. Unmarked records
are public.

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

| Tag                                | Meaning                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `@sealed`                          | Protects declared properties from reset-like values such as `unset` and `initial`. |
| `@readonly`                        | Treats a property set by the record as fixed.                                      |
| `@frozen`                          | Combines the `@readonly` and `@sealed` checks.                                     |
| `@preventExtensions` / `@noextend` | Signals that downstream tools should avoid adding new properties.                  |

```css
/**
 * @component close-button
 * @summary A dismiss control with a fixed appearance.
 * @sealed
 */
.close-button {
  padding: 0.5rem;
}
```

The linter reports [`sealed-reset-value`](/guide/lint-reference#sealed-reset-value) for a
disallowed reset keyword and [`readonly-redefinition`](/guide/lint-reference#readonly-redefinition)
when a property has multiple values in a read-only record. A frozen record can trigger either
diagnostic. The browser continues to apply the CSS normally.

Public emitters omit decorators by default; opt in with `includeDecorators: true` on the emitter
options.

## Inline tags

Inside prose: `{@link <ref>}`, `{@inheritDoc <ref>}`, `{@label <id>}`. A reference targets a modifier
(`-x`), a part (`.x`), or a record name.

See [CssReference](/guide/grammar#production-cssreference) for the inline reference grammar.
