import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CssDocConfigFile } from "@cssdoc/config";
import { expect, test } from "vite-plus/test";

import { TYPEDOC_SIDEBAR_FILE, emitCssApi, mergeCssSidebar } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 */
.button { color: red; }
`;

function cssSidebarItems(path: string): unknown[] {
  const sidebar: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(sidebar)) throw new Error("Expected a sidebar array");
  const entries: unknown[] = sidebar;
  const css = entries.find(
    (entry): entry is { text: unknown } =>
      typeof entry === "object" && entry !== null && "text" in entry && entry.text === "CSS",
  );
  if (!css || !("items" in css) || !Array.isArray(css.items)) {
    throw new Error("Expected CSS sidebar items");
  }
  return css.items;
}

test("emitCssApi forwards the configured Markdown example filter and honors an explicit override", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-typedoc-examples-"));
  const cssPath = join(out, "button.css");
  const configPath = join(out, "cssdoc.json");
  writeFileSync(
    cssPath,
    `
/** @component button
 * @example labels=[docs, demo]
 * <button>Shared</button>
 * @example labels=[a11y]
 * <button>Audit fixture</button>
 * @example
 * <button>Unlabeled</button>
 */
.button {}
`,
  );
  writeFileSync(
    configPath,
    JSON.stringify({
      render: { exampleFilters: { markdown: { labels: ["docs"] } } },
    }),
  );
  const options = {
    outputDirectory: out,
    css: [cssPath],
    configFile: CssDocConfigFile.loadFile(configPath),
  };
  const [page] = emitCssApi(options).pages;
  const markdown = readFileSync(page, "utf8");
  expect(markdown).toContain("<button>Shared</button>");
  expect(markdown).toContain("<button>Unlabeled</button>");
  expect(markdown).not.toContain("Audit fixture");
  expect(markdown).not.toContain("labels=[");
  emitCssApi({ ...options, exampleFilter: null });
  expect(readFileSync(page, "utf8")).toContain("Audit fixture");
  emitCssApi({ ...options, exampleFilter: { labels: [], includeUnlabeled: false } });
  expect(readFileSync(page, "utf8")).not.toContain("## Examples");
});

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

  const cssItems = cssSidebarItems(join(out, TYPEDOC_SIDEBAR_FILE));
  expect(cssItems[0]).toEqual({ text: "Overview", link: "/api/css/" });
});

test("emitCssApi still emits pages when no typedoc-sidebar.json is present", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-td-"));
  const cssPath = join(out, "c.css");
  writeFileSync(cssPath, CSS);
  const result = emitCssApi({ outputDirectory: out, css: [cssPath] });
  expect(result.sidebarMerged).toBe(false);
  expect(existsSync(join(out, "css", "button.md"))).toBe(true);
});

test("emitCssApi forwards includeInternal from explicit options and config", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-typedoc-visibility-"));
  const cssPath = join(out, "visibility.css");
  const configPath = join(out, "cssdoc.json");
  writeFileSync(
    cssPath,
    `/** @component public-card */\n.public-card {}\n` +
      `/** @component author-note\n * @visibility internal\n */\n.author-note {}`,
  );
  writeFileSync(configPath, JSON.stringify({ render: { includeInternal: true } }));
  const options = { outputDirectory: out, css: [cssPath] };

  emitCssApi(options);
  expect(existsSync(join(out, "css", "author-note.md"))).toBe(false);

  emitCssApi({ ...options, configFile: CssDocConfigFile.loadFile(configPath) });
  expect(existsSync(join(out, "css", "author-note.md"))).toBe(true);

  emitCssApi({
    ...options,
    includeInternal: false,
    configFile: CssDocConfigFile.loadFile(configPath),
  });
  expect(existsSync(join(out, "css", "author-note.md"))).toBe(false);
});

const DEPRECATED_CSS = `
/**
 * @component box
 * @summary A layout box.
 * @modifier -variant-old — @deprecated {@link -variant-new}
 */
.box.-variant-new {}
.box.-variant-old {}
`;

test("emitCssApi forwards classNames to the renderer so deprecation markers get styleable spans", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-td-"));
  const cssPath = join(out, "box.css");
  writeFileSync(cssPath, DEPRECATED_CSS);

  emitCssApi({
    outputDirectory: out,
    css: [cssPath],
    classNames: { deprecated: "vendor-pill -color-warning" },
  });

  const page = readFileSync(join(out, "css", "box.md"), "utf8");
  expect(page).toContain('<span class="vendor-pill -color-warning">Deprecated</span> — ');
});

const GROUP_CSS = `
/**
 * @component button
 * @summary Primary action.
 */
.button {}

/**
 * @utility stacking
 * @group Plugins
 * @summary Depth utilities.
 */
.stacking {}
`;

test("emitCssApi forwards groups so the CSS sidebar orders custom groups", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-td-"));
  const cssPath = join(out, "g.css");
  writeFileSync(cssPath, GROUP_CSS);
  writeFileSync(
    join(out, TYPEDOC_SIDEBAR_FILE),
    JSON.stringify([{ text: "Modules", items: [] }], null, 2),
  );

  emitCssApi({ outputDirectory: out, css: [cssPath], baseHref: "/api/css/", groups: ["Plugins"] });

  const cssItems = cssSidebarItems(join(out, TYPEDOC_SIDEBAR_FILE));
  // Without forwarding, `groups` would no-op and Plugins would sort after Components (default order).
  expect(
    cssItems.map((item) => {
      if (typeof item !== "object" || item === null || !("text" in item)) {
        throw new Error("Expected a labeled sidebar item");
      }
      return item.text;
    }),
  ).toEqual(["Overview", "Plugins", "Components"]);
});

const VARIANT_CSS = `
/**
 * @component progress
 * @summary An upload progress control.
 * @structure
 * @variant wrapped {
 *   label { progress {} }
 * }
 * @variant labelled {
 *   label {}
 *   progress {}
 * }
 */
.progress {}
`;

test("emitCssApi forwards structureVariantView so @variant blocks render as labelled sections", () => {
  const out = mkdtempSync(join(tmpdir(), "cssdoc-td-"));
  const cssPath = join(out, "progress.css");
  writeFileSync(cssPath, VARIANT_CSS);

  emitCssApi({ outputDirectory: out, css: [cssPath], structureVariantView: "sections" });

  const page = readFileSync(join(out, "css", "progress.md"), "utf8");
  // Without forwarding, `structureVariantView` would no-op and default to the combined-diagram view.
  expect(page).toContain("### Variant: wrapped");
  expect(page).toContain("### Variant: labelled");
});
