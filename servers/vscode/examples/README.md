# cssdoc Playground Examples

Interactive examples demonstrating cssdoc's capabilities. These files show how to author CSS documentation using the `@cssdoc` framework. Use the VS Code extension with the language server to explore the interactive features.

## Quick Start

Press **F5** in the `servers/vscode` project ("Run cssdoc extension") — it builds the extension and opens this folder in a new Extension Development Host with the extension loaded.

The playground is **clean by default** — no warnings on open. Each file has inline `TRY` notes explaining what to experiment with.

## Example Files

### **components.css** — Classic BEM Examples

The original documented source with BEM modifiers, parts, custom properties, and states.

**What it shows:**

- BEM modifier syntax: `.button--secondary`, `.card__header`
- Component structure with `@structure`
- Deprecated modifiers with canonical links
- Custom properties (`@cssproperty`)

---

### **multi-example.ts** — Multi-Label Examples ✨

Demonstrates the new multi-example feature with labeled examples.

**What it shows:**

- Using `@example Label: description` syntax to organize multiple use cases
- Three components: alert, badge, button with varied examples
- Example filtering via `cssdoc.jsonc` configuration
- How examples appear differently in different output surfaces

**Features to try:**

- Hover any component class (`.alert`, `.badge`, `.button`)
  - See all labeled examples in the hover tooltip
  - Each example shows with its label for context
- Delete an `@example` line
  - An "incomplete-example" diagnostic appears
  - Hover the diagnostic to see the problem
- Delete the `@summary` tag on `.alert`
  - A "missing-summary" diagnostic appears
- In `cssdoc.jsonc`, modify `exampleFilters.markdown`
  - Remove an example label (e.g., "With Icon")
  - Examples are filtered per output surface

---

### **rscss-convention.ts** — RSCSS Modifier Convention ✨

Showcases the RSCSS modifier convention with prop/value splitting.

**What it shows:**

- RSCSS class syntax: `.component.-prop-value`
- Chained modifier notation (`.form-field.-size-large.-variant-outline`)
- Prop/value splitting in the modifier parser
- How the same AST-first approach works with different naming schemes

**Configuration:**
To use RSCSS convention on these components:

```jsonc
// cssdoc.jsonc
{
  "modifierConvention": "rscss",
}
```

**Features to try:**

- Hover `.form-field` class
  - See modifiers split into prop/value: "size=small", "size=large", etc.
- Hover a chained modifier (e.g., `.form-field.-size-large`)
  - Details card shows the parsed prop and value
- Try this selector in a rule:
  ```css
  .form-field.-size-small.-variant-outline {
    /* ... */
  }
  ```
  - Both modifiers are recognized independently
- Delete a `@modifier` description
  - "undocumented-modifier" diagnostic appears

---

### **styles.ts** — CSS-in-JS Examples

Shows how cssdoc works with CSS-in-JS tagged templates.

**What it shows:**

- Using `@example` in CSS-in-JS contexts
- Blending TSDoc (`@param`, `@returns`) and cssdoc (`@component`) in one comment
- Multiple examples for function-generated stylesheets
- Ref annotations for inline documentation

**Features to try:**

- Hover `.chip` class
  - See multiple labeled examples in the tooltip
- Hover the `@ref 1` comment in the badge CSS
  - See the referenced description
- Add a new `@modifier badge--danger — Dangerous action`
  - Completion suggests the modifier
  - Add `.badge--danger { color: red; }` to match it
- Delete an `@example` label
  - Diagnostic flags the incomplete example

---

### **switch.ts** — Shadow DOM Parts & States

Demonstrates web component documentation with labeled examples.

**What it shows:**

- `@csspart` documentation for shadow DOM parts
- `@cssstate` documentation for custom states (`:state(...)`)
- Multiple labeled examples showing different component states
- Proper documentation for web components

**Features to try:**

- Hover `<x-switch>`
  - See all examples: "Off State", "On State", "Styled Parts", etc.
- Hover `.switch` class
  - Details show parts and states
- Remove the `@csspart track` description
  - "undocumented-css-part" diagnostic appears
- Try using `::part()` in a style rule:
  ```css
  x-switch::part(track) {
    background: coral;
  }
  ```
  - If not documented, an "undocumented-css-part" warning appears

---

### **cssdoc.jsonc** — Configuration

Configuration file controlling parser behavior and output filtering.

**Key settings:**

- **`modifierConvention`** — How modifiers are spelled ("bem", "rscss", or "bare")
- **`exampleFilters`** — Which examples appear on each output surface
  - `markdown` — Examples shown in Markdown API docs
  - `html` — Examples in standalone HTML output
  - `json` — Examples in JSON schema export
  - Use labels to include specific examples, or `"*"` for all
- **`rules`** — Severity of doc-comment diagnostics

---

## Interactive Exploration Guide

### 1. **Discover Completions**

- Position cursor after `@` in a comment
  - Language server shows available tags
  - Try `@component`, `@modifier`, `@example`, etc.
- After a tag name, see syntax completions
  - `@modifier button--` suggests modifiers from selectors
  - `@csspart ` suggests parts from selectors

### 2. **Hover for Details**

- Hover any component class (`.alert`, `.button`, etc.)
  - See full documentation card
  - Scroll through all labeled examples
  - View modifiers, states, and references
- Hover a modifier class (`.button--primary`)
  - See just that modifier's documentation

### 3. **Understand Diagnostics**

- Hover any warning/error squiggle
  - Understand what the problem is
  - See the rule name (e.g., "undocumented-modifier")
- Fix issues by adding missing tags or selectors
  - Diagnostic disappears when fixed

### 4. **Consumer-Side Exploration** (`index.html`, `App.jsx`)

| Action                                                    | Expect                                      |
| --------------------------------------------------------- | ------------------------------------------- |
| Hover a class like `button--secondary`                    | its summary + docs                          |
| Go to Definition (F12) on a class                         | jumps to the rule in `components.css`       |
| Type a space inside `class="button …"`                    | completion lists the component's modifiers  |
| Change a modifier to something undocumented (`button--x`) | `unknown-modifier`                          |
| Use the deprecated `button--ghost`                        | `deprecated-modifier` + a replace quick-fix |

### 5. **Author-Side Validation**

| Edit                                                       | Expect                          |
| ---------------------------------------------------------- | ------------------------------- |
| Delete a `@summary` line                                   | `missing-summary`               |
| Remove the `— description` after a `@modifier`             | `undocumented-modifier`         |
| Remove the `— description` after a `@part`                 | `undocumented-part`             |
| Remove the `— description` after a `@csspart`              | `undocumented-css-part`         |
| Delete the `{@link …}` from the deprecated `button--ghost` | `deprecated-requires-canonical` |
| Point an `@structure` selector at an undefined class       | `structure-unknown-selector`    |
| Delete an `@example` label or content                      | `incomplete-example`            |

---

## Common Patterns

### Complete Component Documentation

```typescript
const css = String.raw;

export const myComponent = css`
  /**
   * @component my-component
   * @summary A brief description of the component.
   * @modifier my-component--variant — What this variant does.
   * @ref 1. An inline note or explanation.
   * @example Basic: Default usage
   * <div class="my-component">Content</div>
   * @example With Variant: Styled variation
   * <div class="my-component my-component--variant">Content</div>
   */
  .my-component {
    /* ... */
  }
  .my-component--variant {
    /* ... */
  }
`;
```

### Web Component (Lit)

```typescript
/**
 * @component x-widget
 * @summary A web component widget.
 * @csspart root — The main container.
 * @cssstate :state(open) — Expanded state.
 * @example Closed: Default state
 * <x-widget></x-widget>
 * @example Open: Expanded state
 * <x-widget class="open"></x-widget>
 */
export class Widget extends LitElement {
  // ...
}
```

### RSCSS Modifiers

```css
/**
 * @component form-field
 * @modifier form-field.-size-small — Compact field
 * @modifier form-field.-size-large — Spacious field
 * @example Sizes: Small to large
 * <input class="form-field -size-small"/>
 * <input class="form-field -size-large"/>
 */
```

---

## Notes

- Only `/**` doc blocks are parsed as records. Plain comments — including the `TRY` notes — are ignored,
  so mentioning a tag like `@component` in a note is harmless.
- Syntax highlighting and language features work in CSS, SCSS, Less, HTML, Vue, Svelte, Astro, Markdown,
  and JS/TS (both `className` usage and CSS-in-JS authoring).
- Multi-example support (the `@example Label:` syntax) is a new feature; the parser is backward-compatible
  with unlabeled examples.

---

## Resources

- **[cssdoc Documentation](https://cssdoc.dev)** — Full guide and reference
- **[Authoring Guide](https://cssdoc.dev/guide/authoring)** — How to write cssdoc comments
- **[Configuration Guide](https://cssdoc.dev/guide/config)** — All config options
- **[Editor Tooling Guide](https://cssdoc.dev/guide/editor)** — IDE features and shortcuts

---

## Tips & Tricks

1. **Multiple examples** — Use labels to organize: `@example Basic:`, `@example Advanced:`, etc.
2. **Example filtering** — Configure `exampleFilters` to show different examples per platform
3. **Props in RSCSS** — The `propValueSeparator` lets you split `.form--size-large` into prop=`size`, value=`large`
4. **States vs modifiers** — Use `@cssstate` for `:state()` and pseudo-classes, `@modifier` for class-based variations
5. **Refs** — Use `@ref N.` to annotate inline comments: `padding: 1em; /* @ref 1 */` then document with `@ref 1. ...`
