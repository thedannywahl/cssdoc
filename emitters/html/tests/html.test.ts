import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CssDocConfiguration, parseCssDocs } from "@cssdoc/core";
import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";

import { buildHtml, renderIndex, renderPage } from "../src/index.ts";
import { renderProse } from "../src/prose.ts";

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

test("private example links project to plain legacy-example text", () => {
  const css = `/** @component visible
 * @example - See {@link component:card}.
 */ .visible {}
/** @component card {@private} */ .card {}`;
  const index = createIndex(css);
  const lookup = { workspace: { complete: true, sources: [{ index }] } };
  const html = renderPage(index.entries[0], { lookupFor: () => lookup });
  expect(html).toContain("See reference.");
  expect(html).not.toContain("component:card");
});

test("private-link labels stay escaped HTML text", () => {
  const css = `/** @component visible
 * @summary Read {@link component:card | <tag>{{secret}}}.
 */ .visible {}
/** @component card {@private} */ .card {}`;
  const index = createIndex(css);
  const lookup = { workspace: { complete: true, sources: [{ index }] } };
  const html = renderPage(index.entries[0], { lookupFor: () => lookup });
  expect(html).not.toContain("{@link");
  expect(html).not.toContain("component:card");
  expect(html).toContain("&#x3C;tag>");
  expect(html).toContain("{{secret}}");
});

test("private examples never appear in HTML output", () => {
  const [entry] = parseCssDocs(`/** @component button
 * @example docs - Visible example.
 * @example docs {@private} - Private example.
 */
.button {}`);
  const html = renderPage(entry);
  expect(html).toContain("Visible example.");
  expect(html).not.toContain("Private example.");
});

test("HTML respects prose modes for remarks and filtered examples", () => {
  const configuration = new CssDocConfiguration();
  configuration.setProseSettings({
    mode: "plain",
    remarkKinds: { usage: "markdown" },
  });
  const [entry] = parseCssDocs(
    `/** @component button
 * @remarks usage - **Rendered**
 * @example docs - **Literal** <script>
 * @example demo - **Shown**
 */
.button {}`,
    { configuration },
  );
  const html = renderPage(entry, {
    exampleFilter: { labels: ["docs"], includeUnlabeled: false },
  });
  expect(html).toContain("<strong>Rendered</strong>");
  expect(html).toContain('class="prose-plain">**Literal** &#x3C;script>');
  expect(html).not.toContain("<strong>Literal</strong>");
  expect(html).not.toContain("**Shown**");
  expect(html).not.toContain("<script>");
});

test("repeated identical remarks use the selected occurrence's mode", () => {
  const configuration = new CssDocConfiguration();
  configuration.setProseSettings({ mode: "plain", remarkKinds: { usage: "markdown" } });
  const [entry] = parseCssDocs(
    `/** @component button
 * @remarks usage - **Same**
 * @remarks note - **Same**
 * @remarks todo - Private
 */
.button {}`,
    { configuration },
  );
  const html = renderPage(entry);
  expect(html).toContain('class="prose-plain">**Same**');
  expect(html).not.toContain("<strong>Same</strong>");
  expect(html).not.toContain("Private");
});

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
  expect(html).toContain("&#x3C;button>Shared&#x3C;/button>");
  expect(html).not.toContain("Audit fixture");
  expect(entries[0].examples).toHaveLength(2);
  expect(renderPage(entries[0], { exampleFilter: { labels: [] } })).not.toContain("<h2>Examples");
});

test("renders CommonMark prose while preventing unsafe links, images, and raw HTML", () => {
  const [entry] = parseCssDocs("/** @component button */ .button {}");
  entry.remarks = [
    "**bold** [safe](https://example.com) [relative](./docs) [mail](mailto:a@example.com)",
    "[bad](javascript:alert%281%29) [network](//evil.example) [reference][bad-ref]",
    "![safe](https://example.com/image.png) ![bad](mailto:a@example.com)",
    "",
    "[bad-ref]: data:text/html,alert",
    "",
    '<script>alert("x")</script>',
  ].join("\n");
  entry.parts.push({ name: "label", description: "*Label* [bad](javascript:alert%281%29)" });
  const html = renderPage(entry);
  expect(html).toContain("<strong>bold</strong>");
  expect(html).toContain('<a href="https://example.com">safe</a>');
  expect(html).toContain('<a href="./docs">relative</a>');
  expect(html).toContain('<a href="mailto:a@example.com">mail</a>');
  expect(html).toContain('<img src="https://example.com/image.png" alt="safe">');
  expect(html).toContain("<em>Label</em>");
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('href="//evil.example');
  expect(html).not.toContain('href="data:text/html');
  expect(html).not.toContain('src="mailto:');
  expect(html).not.toContain("<script>");
  expect(html).toContain("&#x3C;script>");
});

test("sanitizes decoded control characters and image-reference URLs", () => {
  const html = renderProse(
    "[control](jav&#x09;ascript:alert) [mail][shared] ![image][shared]\n\n[shared]: mailto:a@example.com",
  );
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain('src="mailto:');
  expect(html).toContain('<a href="mailto:a@example.com">mail</a>');
});

test("sanitizes HAST without turning authored HTML into active elements", () => {
  const html = renderProse(
    "<img src=x onerror=alert(1)> <svg onload=alert(1)>\n\n```css\n.card { color: red }\n```",
  );
  expect(html).not.toContain("<img");
  expect(html).not.toContain("<svg");
  expect(html).toContain("&#x3C;img");
  expect(html).toContain('class="language-css"');
  expect(html).toContain(".card { color: red }");
});

test("escaped inline openers lose one backslash outside protected code", () => {
  const text = [
    String.raw`\{@link one} \\\{@link three} \\{@link even} ` +
      "`" +
      String.raw`\{@link inline}` +
      "`",
    "",
    String.raw`    \{@link indented}`,
    "",
    "```",
    String.raw`\{@link fenced}`,
    "```",
  ].join("\n");
  const markdown = renderProse(text);
  expect(markdown).toContain(String.raw`{@link one} \\{@link three}`);
  expect(markdown).toContain(String.raw`\{@link even}`);
  expect(markdown).toContain(String.raw`\{@link inline}`);
  expect(markdown).toContain(String.raw`\{@link indented}`);
  expect(markdown).toContain(String.raw`\{@link fenced}`);
  const plain = renderProse(text, false, "plain");
  expect(plain).toContain(String.raw`{@link one} \\{@link three}`);
  expect(plain).toContain(String.raw`\\{@link even}`);
  expect(plain).toContain(String.raw`{@link inline}`);
  expect(plain).toContain(String.raw`    {@link indented}`);
  expect(plain).toContain(String.raw`\{@link fenced}`);
});

test("renderPage produces a standalone, escaped HTML document", () => {
  const [button] = parseCssDocs(CSS);
  const html = renderPage(button);
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
  const html = renderPage(progress);
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
  const html = renderPage(row);
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
  const html = renderPage(entry);
  expect(html).toContain('A &#x3C;b> &#x26; "y" tag &#x26; &#x3C;i>"z"&#x3C;/i>.');
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
