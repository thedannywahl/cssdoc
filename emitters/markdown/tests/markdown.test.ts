import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCssDocs } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import { buildCssApi, buildSidebar, renderEntry } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @demo self:button
 */
.button { background: var(--color-bg); }
.button.-color-secondary { background: var(--color-bg-secondary); }

/**
 * @utility spacing
 * @summary Margin helpers.
 */
.m-sm { margin: var(--spacing-sm); }
`;

test("renderEntry renders a title, summary, demo fence, and a modifiers table", () => {
  const [button] = parseCssDocs(CSS);
  const md = renderEntry(button!);
  expect(md).toContain("# button");
  expect(md).toContain("`.button`");
  expect(md).toContain("The primary action control.");
  expect(md).toContain("```demo\nself:button\n```");
  expect(md).toContain("## Modifiers");
  expect(md).toContain("`.-color-secondary`");
});

test("renderEntry uses the resolveToken hook for the Tokens consumed table", () => {
  const [button] = parseCssDocs(CSS);
  const md = renderEntry(button!, {
    resolveToken: (name) =>
      name === "--color-bg" ? { syntax: "<color>", value: "#fff" } : undefined,
  });
  expect(md).toContain("## Tokens consumed");
  expect(md).toContain("| Token | Type | Value |");
  expect(md).toContain("`--color-bg`");
  expect(md).toContain("`<color>`");
  expect(md).toContain("`#fff`");
});

const RICH_CSS = `
/**
 * @component card
 * @summary A surface container.
 * @tokens --color-bg — The surface background.
 * @tokens --color-fg-indirect — Set on the element by script.
 * @usage Include the sheet, then apply the class.
 * @compat Uses \`@scope\`; needs a recent browser.
 * @compat Anchor positioning is progressively enhanced.
 * @related button — The action inside a card.
 */
.card { background: var(--color-bg); color: var(--color-fg); }
`;

test("Tokens consumed gains a Description column from @tokens, and unions non-var() tokens", () => {
  const [card] = parseCssDocs(RICH_CSS);
  const md = renderEntry(card!, {
    resolveToken: (name) =>
      name === "--color-bg" ? { syntax: "<color>", value: "#fff" } : undefined,
  });
  expect(md).toContain("| Token | Type | Value | Description |");
  expect(md).toContain("The surface background.");
  // A token declared only via @tokens (never seen in var()) is still listed.
  expect(md).toContain("`--color-fg-indirect`");
  expect(md).toContain("Set on the element by script.");
});

test("without resolveToken, consumed tokens render as bullets with their @tokens description", () => {
  const [card] = parseCssDocs(RICH_CSS);
  const md = renderEntry(card!);
  expect(md).toContain("- `--color-bg` — The surface background.");
});

test("renders Usage (with importSnippet), Browser support, and Related sections", () => {
  const [card] = parseCssDocs(RICH_CSS);
  const md = renderEntry(card!, {
    importSnippet: () => `@import "cards.css";`,
    baseHref: "./",
  });
  expect(md).toContain("## Usage");
  expect(md).toContain("Include the sheet, then apply the class.");
  expect(md).toContain('```css\n@import "cards.css";\n```');
  expect(md).toContain("## Browser support");
  expect(md).toContain("- Uses `@scope`; needs a recent browser.");
  expect(md).toContain("## Related");
  expect(md).toContain("- [button](./button.md) — The action inside a card.");
});

test("resolveSource adds a Source link to the meta line", () => {
  const [card] = parseCssDocs(RICH_CSS, { fileName: "cards.css" });
  const md = renderEntry(card!, {
    resolveSource: (entry) => ({
      href: `https://example.com/${entry.source?.file}#L${entry.source?.line}`,
      label: `${entry.source?.file}:${entry.source?.line}`,
    }),
  });
  expect(md).toContain("**Source:** [cards.css:2](https://example.com/cards.css#L2)");
});

test("sectionOrder reorders the rendered sections", () => {
  const [card] = parseCssDocs(RICH_CSS);
  const md = renderEntry(card!, { sectionOrder: ["related", "usage"] });
  // Only the listed sections render, in the given order.
  expect(md.indexOf("## Related")).toBeGreaterThan(-1);
  expect(md.indexOf("## Related")).toBeLessThan(md.indexOf("## Usage"));
  // A section dropped from the order does not render.
  expect(md).not.toContain("## Browser support");
});

test("@structure renders slot content, cardinality, and a linked Subcomponents section", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @slot — The message.",
      " * @structure",
      " * .alert {",
      " *   slot {}",
      " *   .close-button:optional {}",
      " * }",
      " */",
      ".alert {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const md = renderEntry(alert!, {
    resolveComponent: (c) =>
      c === "close-button" ? { name: "close-button", href: "./close-button.md" } : undefined,
  });
  expect(md).toContain("‹content›"); // the `slot` node reads as the content region
  // The sibling resolves to its component name, tagged + carrying the `:optional` cardinality.
  expect(md).toContain("close-button (component, 0..1)");
  expect(md).toContain("## Subcomponents");
  expect(md).toContain("- [close-button](./close-button.md)"); // derived + cross-linked
});

test("structureView selects which Structure representation(s) render (default both)", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @structure",
      " * .alert {",
      " *   slot {}",
      " * }",
      " */",
      ".alert {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const has = (md: string) => ({
    text: md.includes("```text"),
    diagram: md.includes("```mermaid"),
  });
  expect(has(renderEntry(alert!, {}))).toEqual({ text: true, diagram: true }); // default = both
  expect(has(renderEntry(alert!, { structureView: "text" }))).toEqual({
    text: true,
    diagram: false,
  });
  expect(has(renderEntry(alert!, { structureView: "diagram" }))).toEqual({
    text: false,
    diagram: true,
  });
});

test("@example: a fenced block renders as Markdown verbatim; bare code is auto-wrapped", () => {
  const fenced = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @example",
      " * Prose before.",
      " * ```html",
      ' * <div class="alert"></div>',
      " * ```",
      " */",
      ".alert {}",
    ].join("\n"),
  )[0]!;
  const md = renderEntry(fenced);
  expect(md).toContain("## Examples");
  expect(md).toContain("Prose before."); // prose survives, outside any fence
  expect(md).toContain("```html");
  expect(md).not.toContain("```html\nProse before."); // not the old whole-example wrap

  const bare = parseCssDocs(
    [
      "/**",
      " * @component b",
      " * @summary B.",
      " * @example",
      ' * <b class="b"></b>',
      " */",
      ".b {}",
    ].join("\n"),
  )[0]!;
  expect(renderEntry(bare)).toContain('```html\n<b class="b"></b>\n```'); // fence-less code gets wrapped
});

test("buildCssApi writes per-record pages, an index, and a compatible sidebar", () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-md-"));
  const result = buildCssApi({ css: CSS, outDir, baseHref: "/api/css/" });

  expect(result.entries.map((e) => e.name)).toEqual(["button", "spacing"]);
  expect(result.pages).toHaveLength(2);

  const index = readFileSync(result.indexPath, "utf8");
  expect(index).toContain("## Components");
  expect(index).toContain("[button](/api/css/button.md)");
  expect(index).toContain("## Utilities");

  const sidebar = JSON.parse(readFileSync(result.sidebarPath, "utf8"));
  expect(sidebar[0]).toEqual({ text: "Overview", link: "/api/css/" });
  expect(sidebar).toContainEqual({
    text: "Components",
    collapsed: false,
    items: [{ text: "button", link: "/api/css/button.md" }],
  });
});

test("buildSidebar groups records by kind and lists Overview first", () => {
  const entries = parseCssDocs(CSS);
  const sidebar = buildSidebar(entries, "/api/css/");
  expect(sidebar.map((s) => s.text)).toEqual(["Overview", "Components", "Utilities"]);
});
