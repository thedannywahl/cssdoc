# Component styleguide

cssdoc reads documented CSS from fenced `css` code blocks (the Markdown embedded host), so a
styleguide or design-system doc lints the very examples it shows.

The `alert` component:

```css
/**
 * @component alert
 * @summary A prominent message banner.
 * @modifier alert--error — A critical message.
 * @modifier alert--success — A positive confirmation.
 */
.alert {
  padding: 0.75em 1em;
  border-radius: 4px;
}
.alert--error {
  background: #fdecea;
  color: #c0392b;
}
.alert--success {
  background: #eafaf1;
  color: #27ae60;
}
```

TRY: delete the `@summary` line inside the fence — a `missing-summary` warning appears on `.alert`,
right there in the code block. Only fenced `css`/`scss`/`less` blocks are read; prose and other
languages are ignored.
