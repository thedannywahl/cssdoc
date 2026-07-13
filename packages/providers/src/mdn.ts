/**
 * MDN links for CSS value types. A `@property` `syntax` descriptor (e.g. `<color>`, `<length-percentage>`)
 * names value types that MDN documents; this maps each `<type>` to its reference page so hovers and the
 * docs playground can link them. Format-agnostic: {@link linkSyntax} takes a `renderLink` callback so
 * each caller wraps a link in its own output format (a markdown `[…](…)` for hovers, an `<a>` for HTML).
 *
 * @module
 */

// Most value types live at /Web/CSS/Reference/Values/<type>; a few have their own pages.
const MDN_URL: Record<string, string> = {
  color: "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value",
};

/** The MDN reference URL for a bare CSS value-type name (e.g. `color`, `length-percentage`). */
export function mdnUrlForType(type: string): string {
  return (
    MDN_URL[type] ?? `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/${type}`
  );
}

/**
 * Rewrite each `<type>` token in a `syntax` descriptor via `renderLink`, leaving the rest untouched.
 * `renderLink` receives the bare type name and its MDN URL and returns the replacement for `<type>`
 * (including the angle brackets). Non-`<type>` text (e.g. `|`, `+`, `#`) passes through verbatim.
 *
 * @param syntax - The `@property` syntax descriptor, e.g. `<color> | <length>`.
 * @param renderLink - Builds the replacement for one `<type>` token.
 * @returns The descriptor with each `<type>` replaced.
 */
export function linkSyntax(
  syntax: string,
  renderLink: (type: string, url: string) => string,
): string {
  return syntax.replace(/<([a-z][\w-]*)>/gu, (_m, type: string) =>
    renderLink(type, mdnUrlForType(type)),
  );
}
