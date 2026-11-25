# Document composition

Use `@component` and `@structure` to show which elements and components belong in a page shell. Start
with one reusable component and one layout that contains it.

## Describe the layout in CSS

Save this as `shell.css`:

```css
/**
 * @component site-header
 * @summary Contains the site name and navigation.
 */
.site-header {
  padding: 1rem;
}

/**
 * @component app-shell
 * @summary Places a site header above the main content.
 * @structure
 * .app-shell {
 *   .site-header {}
 *   main {}
 * }
 */
.app-shell {
  display: grid;
  grid-template-rows: auto 1fr;
}
```

Inside `@structure`, nested rules represent parent and child elements. `.site-header` refers to the
documented component by its base class. `main` names the element that holds the page content.

## Write markup that follows the structure

```html
<div class="app-shell">
  <header class="site-header">Acme</header>
  <main>Page content</main>
</div>
```

[Generate documentation](/guide/emitters) with `shell.css` as the input. In `app-shell.md`, look for
the Structure section and the link to the site header.

For layouts with multiple valid shapes, see [alternative structures](/guide/selectors-and-structure#alternative-structures-variant).
For profile names and explicit component references, see the [composition reference](/guide/selectors-and-structure#composition).
