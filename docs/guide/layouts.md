# Layouts

`@layout` is for CSSOM-first composition docs: define the structure in CSS, then derive valid HTML from
that model.

This guide shows a practical flow:

1. Define reusable components in CSS docs.
2. Define one layout record with `@structure`.
3. Derive an HTML scaffold that matches the documented structure.

If you want full API details, use the TypeDoc reference. This guide stays focused on author workflow.

## Step 1: Define component records in CSS

Start with reusable pieces, not markup.

```css
/**
 * @component site-header
 * @summary Global page header with brand and primary navigation.
 * @part .brand - Brand link.
 */
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  font-weight: 700;
  text-decoration: none;
}

/**
 * @component top-nav
 * @summary Horizontal link list used in page-level navigation.
 * @part .top-nav__link - One navigation link.
 */
.top-nav {
  display: flex;
  gap: 0.75rem;
}
.top-nav__link {
  text-decoration: none;
}

/**
 * @component filter-chip
 * @summary Compact action for toggling list filters.
 * @modifier -active - Highlights the chip when selected.
 */
.filter-chip {
  border: 1px solid currentcolor;
}
.filter-chip.-active {
  font-weight: 600;
}
```

## Step 2: Define the layout record

You can author structure in two ways. Use explicit when you want full control over the docs tree. Use
implicit when the layout CSS itself already reflects the same single-root shape.

::: code-group

```css [Implicit from CSS rules]
/**
 * @layout app-shell
 * @summary Base application frame with header, content region, and footer.
 */
.app-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;

  @component site-header (--desktop-header) {
  }
  @component top-nav (--desktop-nav) {
  }

  .content-wrap {
    .side-rail {
      @component filter-chip (--desktop-filters) {
      }
    }
    .content-panel {
    }
  }

  .site-footer {
  }
}
```

```css [Explicit @structure]
/**
 * @layout app-shell
 * @summary Base application frame with header, content region, and footer.
 * @structure
 * .app-shell {
 *   @component site-header
 *   .content-wrap {
 *     .side-rail {
 *       @component filter-chip
 *     }
 *     .content-panel {}
 *   }
 *   .site-footer {}
 * }
 */
.app-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.content-wrap {
  display: grid;
  grid-template-columns: 18rem 1fr;
}
```

:::

With implicit mode, cssdoc infers the structure tree from the layout record's CSS nodes. If inference
would produce multiple roots, cssdoc drops the inferred tree so docs remain deterministic. In that
case, switch to explicit `@structure`.

At this point, CSS is the source of truth.

- Component records define reusable pieces.
- The layout record defines how those pieces compose.

## Co-located components

`@component` inside a structure node means _containment_ — the named component is a child of that
slot. Sometimes the slot element itself carries the component class directly. Use a single-selector
`:is()` pseudo to express this:

```css
/**
 * @layout tabs-layout
 * @summary A tabs layout.
 * @structure
 * .tabs-layout {
 *   .tabs-list:optional:is(.instui-card) {}
 * }
 */
.tabs-layout {
}
```

cssdoc reads `.tabs-list:optional:is(.instui-card)` as: "this slot element carries `.instui-card`
itself." The scaffold it derives is therefore:

```html
<nav class="tabs-list instui-card">…</nav>
```

…not:

```html
<nav class="tabs-list"><div class="instui-card">…</div></nav>
```

`:is()` accepts any valid single selector — a class, an element type, an ID, or an attribute
selector:

```css
* @structure
* .panel {
*   .header:is(.instui-view-header) {}
*   button:one-or-more:is(.instui-button) {}
*   nav:optional:is(#primary-nav) {}
* }
```

When the `:is()` argument resolves to a known component, cssdoc cross-links it in the Subcomponents
section the same way a nested `@component` reference does.

**Cardinality and nested nodes work the same way.** A co-located child that's inside an optional
parent is only required when the parent is present:

```css
* @structure
* .utilities:optional {
*   button:one-or-more:is(.instui-button) {}
* }
```

Reads as: if `.utilities` is present, it must contain one or more `button.instui-button` elements.

**Using `:is()` with multiple selectors** (e.g. `:is(.a, .b)`) is not co-location — cssdoc keeps
the compound verbatim and treats it as a relationship selector, just as `:has()` and `:not()` are.

## Choosing between sub-component types

Sometimes a slot holds one of several sibling components rather than a single fixed one — a table's
header row holds column headers, while its body rows hold row headers and cells. Write this as an
ordinary CSS **selector list** (comma-separated), the same way you'd write `:is(.a, .b)` — no new tag or
syntax:

```css
/**
 * @component table
 * @summary A data table.
 * @structure
 * .table {
 *   .table-head {
 *     .table-row {
 *       .table-col-header:one-or-more {}
 *     }
 *   }
 *   .table-body {
 *     .table-row:one-or-more {
 *       .table-cell, .table-row-header {}
 *     }
 *   }
 * }
 */
.table {
}
```

Every class named in the list is scanned and cross-linked independently — both `table-cell` and
`table-row-header` show up in `table`'s Subcomponents section, and the rendered text tree joins every
resolved sibling with `|` (`table-cell | table-row-header (component, 1..n)`). Since a comma-joined
selector is one CSS rule, a **shared cardinality marker goes once, at the end of the list**
(`.table-cell, .table-row-header:one-or-more`) — it applies to the whole alternation, not just the last
name.

## Step 3: Derive valid HTML from the documented structure

Once records are defined, scaffold markup that matches the structure tree.

```html
<!doctype html>
<html lang="en">
  <body>
    <div class="app-shell">
      <header class="site-header">
        <a class="brand" href="/">Acme</a>
      </header>

      <main class="content-wrap">
        <aside class="side-rail">
          <button class="filter-chip">Open</button>
        </aside>
        <section class="content-panel">...</section>
      </main>

      <footer class="site-footer">...</footer>
    </div>
  </body>
</html>
```

Because the scaffold comes from `@structure`, docs and markup stay aligned.

## Step 4: Add profiles when composition changes by breakpoint

If composition changes between breakpoints, profile the layout reference.

```css
/**
 * @component top-nav
 * @summary Primary navigation.
 */
.top-nav {
}

/**
 * @component filter-chip
 * @summary Filter action chip.
 */
.filter-chip {
}

/**
 * @layout app-shell
 * @structure
 * .app-shell {
 *   @component top-nav (--desktop-nav) {}
 *   @component filter-chip (--desktop-filters) {}
 * }
 */
.app-shell {
}
```

Then choose one of these paths:

1. Declare profiles directly with [`@custom-media`](https://developer.mozilla.org/docs/Web/CSS/@custom-media).
2. Or generate them with `compileCustomMediaDeclarations`.

::: code-group

```css [Declare with @custom-media]
@custom-media --desktop-nav (width >= 64rem);
@custom-media --desktop-filters (width >= 64rem);
```

```ts [Generate with compileCustomMediaDeclarations]
import { compileCustomMediaDeclarations } from "@cssdoc/core";

const declarations = compileCustomMediaDeclarations(css, {
  resolveValue: (profile) => {
    if (profile === "--desktop-nav") return "(width >= 64rem)";
    if (profile === "--desktop-filters") return "(width >= 64rem)";
    return true;
  },
});
```

:::

Output:

```css
@custom-media --desktop-filters (width >= 64rem);
@custom-media --desktop-nav (width >= 64rem);
```

When inline `@custom-media` declarations already exist in your CSS, `compileCustomMediaDeclarations`
finds and absorbs those values for matching profiles, so output stays aligned and deduped.

## CSSOM-first workflow

1. Start from component and layout CSS.
2. Document reusable blocks as `@component` records.
3. Add one `@layout` record per page shell.
4. Derive HTML scaffold from the `@structure` tree.
5. Add profiles only when composition changes.

## Common issues

- `structure-unknown-record`: A `@structure` reference points to a name that has no record yet.
- `structure-ambiguous-record`: An untyped reference matches more than one record kind.
- `structure-unknown-selector`: A structure selector does not map to a documented member.

If you intentionally reference external classes, add them to `structureIgnore` in `cssdoc.json`.

## Related guides

- [Authoring doc comments](/guide/authoring)
- [Configuration](/guide/config)
- [Linting](/guide/linting)
