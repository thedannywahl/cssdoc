import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { TYPEDOC_SIDEBAR_FILE, emitCssApi, mergeCssSidebar } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 */
.instui-button { color: red; }
`;

test("mergeCssSidebar appends a CSS section and replaces a prior one with the same label", () => {
  const existing = [{ text: "Modules", items: [{ text: "core", link: "/api/core.md" }] }];
  const cssItems = [{ text: "Overview", link: "/api/css/" }];
  const merged = mergeCssSidebar(existing, "CSS", cssItems);
  expect(merged).toEqual([
    { text: "Modules", items: [{ text: "core", link: "/api/core.md" }] },
    { text: "CSS", collapsed: false, items: cssItems },
  ]);
  // Re-merging replaces the prior CSS section rather than duplicating it.
  const remerged = mergeCssSidebar(merged, "CSS", [{ text: "Overview", link: "/x/" }]);
  expect(remerged.filter((i) => i.text === "CSS")).toHaveLength(1);
});

test("emitCssApi renders CSS pages and merges them into an existing typedoc-sidebar.json", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-td-"));
  const cssPath = join(out, "components.css");
  writeFileSync(cssPath, CSS);
  // A stub of what typedoc-plugin-markdown / typedoc-vitepress-theme write.
  writeFileSync(
    join(out, TYPEDOC_SIDEBAR_FILE),
    JSON.stringify([{ text: "Modules", items: [] }], null, 2),
  );

  const result = emitCssApi({
    outputDirectory: out,
    css: [cssPath],
    baseHref: "/api/css/",
  });

  expect(result.sidebarMerged).toBe(true);
  expect(existsSync(join(out, "css", "button.md"))).toBe(true);
  expect(existsSync(join(out, "css", "index.md"))).toBe(true);

  const sidebar = JSON.parse(readFileSync(join(out, TYPEDOC_SIDEBAR_FILE), "utf8"));
  const cssSection = sidebar.find((i: { text: string }) => i.text === "CSS");
  expect(cssSection).toBeDefined();
  expect(cssSection.items[0]).toEqual({ text: "Overview", link: "/api/css/" });
});

test("emitCssApi still emits pages when no typedoc-sidebar.json is present", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-td-"));
  const cssPath = join(out, "c.css");
  writeFileSync(cssPath, CSS);
  const result = emitCssApi({ outputDirectory: out, css: [cssPath] });
  expect(result.sidebarMerged).toBe(false);
  expect(existsSync(join(out, "css", "button.md"))).toBe(true);
});
