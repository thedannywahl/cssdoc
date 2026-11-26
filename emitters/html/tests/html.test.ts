import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCssDocs } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import { buildHtml, renderIndex, renderPage } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @annotations
 * 1. Keyboard focus stays visible.
 * @ref 1
 * @modifier -color-secondary — A lower-emphasis action.
 */
.button { color: red; }
.button.-color-secondary { color: blue; }
`;

test("buildHtml selects examples without filtering the returned model", () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-html-examples-"));
  const css = `
/** @component button
 * @example labels=[docs, demo]
 * <button>Shared</button>
 * @example labels=[a11y]
 * <button>Audit fixture</button>
 */
.button {}
`;
  const { entries, pages } = buildHtml({ css, outDir, exampleFilter: { labels: ["demo"] } });
  const html = readFileSync(pages[0], "utf8");
  expect(html).toContain("&lt;button&gt;Shared&lt;/button&gt;");
  expect(html).not.toContain("Audit fixture");
  expect(entries[0].examples).toHaveLength(2);
  expect(renderPage(entries[0], { exampleFilter: { labels: [] } })).not.toContain("<h2>Examples");
});

test("renderPage produces a standalone, escaped HTML document", () => {
  const [button] = parseCssDocs(CSS);
  const html = renderPage(button!);
  expect(html.startsWith("<!doctype html>")).toBe(true);
  expect(html).toContain("<style>"); // self-contained styling
  expect(html).toContain('<link rel="icon" href="data:image/svg+xml;base64,'); // embedded favicon
  expect(html).toContain("<code>.button</code>");
  expect(html).toContain("<h2>Modifiers</h2>");
  expect(html).toContain(".-color-secondary");
  expect(html).toContain("<h2>Annotations</h2>");
  expect(html).toContain("Keyboard focus stays visible.");
  expect(html).toContain("<strong>Refs:</strong>");
});

test("renderPage renders each @variant block under its own labelled heading", () => {
  const [progress] = parseCssDocs(
    [
      "/**",
      " * @component progress",
      " * @summary An upload progress control.",
      " * @structure",
      " * @variant wrapped {",
      " *   label { progress {} }",
      " * }",
      " * @variant labelled {",
      " *   label {}",
      " *   progress {}",
      " * }",
      " */",
      ".progress {}",
    ].join("\n"),
  );
  const html = renderPage(progress!);
  expect(html).toContain("<h4>Variant: wrapped</h4>");
  expect(html).toContain("<h4>Variant: labelled</h4>");
});

test("renderPage lists a nested @variant group's alternatives under a '(choose one)' item", () => {
  const [row] = parseCssDocs(
    [
      "/**",
      " * @component action-row",
      " * @summary A single action, or a small group of them.",
      " * @structure",
      " * .action-row {",
      " *   @variant single {",
      " *     .action:optional {}",
      " *   }",
      " *   @variant group {",
      " *     .action-group:optional {}",
      " *   }",
      " * }",
      " */",
      ".action-row {}",
    ].join("\n"),
  );
  const html = renderPage(row!);
  expect(html).toContain("(choose one)");
  expect(html).toContain(">single<");
  expect(html).toContain(">group<");
  expect(html).toContain("<code>.action</code>");
  expect(html).toContain("<code>.action-group</code>");
});

test("renderPage escapes HTML-unsafe prose", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component x\n * @summary A <b> & "y" tag &amp; <i>"z"</i>.\n */\n.x { color: red; }`,
  );
  const html = renderPage(entry!);
  expect(html).toContain(
    "A &lt;b&gt; &amp; &quot;y&quot; tag &amp;amp; &lt;i&gt;&quot;z&quot;&lt;/i&gt;.",
  );
  expect(html).not.toContain("A <b> &");
});

test("HTML navigation links reject unsafe destinations", () => {
  const [entry] = parseCssDocs(CSS);
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://example.test/",
    "//example.test/path",
    "java\nscript:alert(1)",
    "\\\\example.test",
  ]) {
    expect(renderPage(entry, { indexHref: href })).toContain("<p>← Index</p>");
  }
  for (const href of [
    "../index.html",
    "#index",
    "https://example.test/",
    "mailto:docs@example.test",
  ]) {
    expect(renderPage(entry, { indexHref: href })).toContain(`<a href="${href}">← Index</a>`);
  }
  const index = renderIndex([{ ...entry, name: "javascript:alert(1)" }]);
  expect(index).not.toContain('href="javascript:');
  expect(index).toContain("javascript:alert(1)");
});

test("buildHtml writes a page per record and an index linking to them", () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-html-"));
  const result = buildHtml({ css: CSS, outDir });
  expect(result.pages).toHaveLength(1);
  const index = readFileSync(result.indexPath, "utf8");
  expect(index).toContain(`href="button.html"`);
  const page = readFileSync(result.pages[0], "utf8");
  expect(page).toContain(`<a href="index.html">← Index</a>`);
});

test("buildHtml omits internal records by default and includes them on request", () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-html-visibility-"));
  const css = `
/** @component public-card */
.public-card {}

/** @component author-note
 * @visibility internal
 */
.author-note {}
`;
  const result = buildHtml({ css, outDir });
  expect(result.entries.map((entry) => entry.name)).toEqual(["public-card"]);
  expect(result.pages).toHaveLength(1);
  expect(readFileSync(result.indexPath, "utf8")).not.toContain("author-note");

  const internal = buildHtml({ css, outDir, includeInternal: true });
  expect(internal.entries.map((entry) => entry.name)).toEqual(["author-note", "public-card"]);
  expect(readFileSync(join(outDir, "author-note.html"), "utf8")).toContain("internal");
});

test("renderIndex uses a custom title", () => {
  expect(renderIndex(parseCssDocs(CSS), { title: "My CSS" })).toContain("<h1>My CSS</h1>");
});
