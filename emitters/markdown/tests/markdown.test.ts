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
