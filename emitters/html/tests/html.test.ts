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
 * @modifier -color-secondary — A lower-emphasis action.
 */
.button { color: red; }
.button.-color-secondary { color: blue; }
`;

test("renderPage produces a standalone, escaped HTML document", () => {
  const [button] = parseCssDocs(CSS);
  const html = renderPage(button!);
  expect(html.startsWith("<!doctype html>")).toBe(true);
  expect(html).toContain("<style>"); // self-contained styling
  expect(html).toContain('<link rel="icon" href="data:image/svg+xml;base64,'); // embedded favicon
  expect(html).toContain("<code>.button</code>");
  expect(html).toContain("<h2>Modifiers</h2>");
  expect(html).toContain(".-color-secondary");
});

test("renderPage escapes HTML-unsafe prose", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component x\n * @summary A <b> & "y" tag.\n */\n.x { color: red; }`,
  );
  const html = renderPage(entry!);
  expect(html).toContain("A &lt;b&gt; &amp; &quot;y&quot; tag.");
  expect(html).not.toContain("A <b> &");
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

test("renderIndex uses a custom title", () => {
  expect(renderIndex(parseCssDocs(CSS), { title: "InstUI CSS" })).toContain("<h1>InstUI CSS</h1>");
});
