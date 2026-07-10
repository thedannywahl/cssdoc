import { expect, test } from "vite-plus/test";
import {
  extractCssBlocks,
  lintCssDocsFromSource,
  parseCssDocsFromSource,
  projectCss,
  scanClassUsages,
} from "../src/index.ts";

const JS = `import styled from "styled-components";

/**
 * @component button
 * @summary The primary action.
 * @modifier button--primary — High-emphasis.
 */
const Button = styled.button\`
  color: \${(p) => p.color};
  &.primary { font-weight: 600; }
\`;

// a decoy: css inside a comment and a string must not be extracted
const s = "css\`.nope {}\`";
`;

const VUE = `<template><button class="btn" /></template>
<script setup>const x = 1;</script>
<style scoped>
/**
 * @component btn
 * @summary A button.
 */
.btn { color: red; }
</style>
`;

const MD = `# Title

Some prose.

\`\`\`css
/**
 * @component card
 * @summary A surface.
 */
.card { color: red; }
\`\`\`
`;

test("the projection preserves length and newlines exactly", () => {
  const p = projectCss(JS, { host: "js" });
  expect(p.length).toBe(JS.length);
  expect(p.split("\n").length).toBe(JS.split("\n").length);
});

test("a tagged template is kept, the surrounding JS is blanked, and the doc comment above it survives", () => {
  const p = projectCss(JS, { host: "js" });
  expect(p).toContain("&.primary { font-weight: 600; }"); // block content kept
  expect(p).toContain("@component button"); // doc comment above `const Button = styled…` preserved
  expect(p).not.toContain("styled.button"); // the JS tag/expression is blanked
  expect(p).not.toContain("import styled");
});

test("a ${…} interpolation is masked so the block still parses", () => {
  const p = projectCss(JS, { host: "js" });
  expect(p).not.toContain("p.color"); // interpolation body masked
  expect(p).toContain("color: aaaaaaaaaaaaaa"); // masked to a same-length ident run
});

test("`css` inside a JS string or comment is not extracted", () => {
  const blocks = extractCssBlocks(JS, { host: "js" });
  expect(blocks).toHaveLength(1); // only the real styled.button template
  expect(blocks[0].css).toContain("&.primary");
});

test("parseCssDocsFromSource reads a JS tagged template, a Vue <style scoped>, and a Markdown fence", () => {
  expect(parseCssDocsFromSource(JS, { host: "js" }).map((e) => e.name)).toEqual(["button"]);
  const vue = parseCssDocsFromSource(VUE, { host: "html" });
  expect(vue.map((e) => e.name)).toEqual(["btn"]);
  const md = parseCssDocsFromSource(MD, { host: "markdown" });
  expect(md.map((e) => e.name)).toEqual(["card"]);
});

test("host auto-detects from the filename", () => {
  expect(parseCssDocsFromSource(VUE, { filename: "Button.vue" }).map((e) => e.name)).toEqual([
    "btn",
  ]);
  expect(parseCssDocsFromSource(JS, { filename: "Button.tsx" }).map((e) => e.name)).toEqual([
    "button",
  ]);
});

test("lint violations carry absolute source lines", () => {
  // `btn` has no @modifier issues but its Vue block sits deep in the file; a missing summary would
  // report at the @component line. Here we assert the line maps into the <style> region, not line 1.
  const bare = `<style>
/**
 * @component gadget
 */
.gadget {}
</style>`;
  const v = lintCssDocsFromSource(bare, { host: "html" });
  const summary = v.find((d) => d.rule === "missing-summary");
  expect(summary?.record).toBe("gadget");
  expect(summary?.line).toBeGreaterThan(1); // absolute in the source, inside the <style> block
});

test("a malformed source yields [] rather than throwing", () => {
  expect(parseCssDocsFromSource("<style>.a { color:", { host: "html" })).toEqual([]);
});

test("scanClassUsages reads class tokens from HTML, JSX, Vue, and Svelte, per element", () => {
  const toks = (src: string) => scanClassUsages(src).flatMap((s) => s.tokens.map((t) => t.token));
  // HTML / static
  expect(toks(`<div class="btn btn--primary"></div>`)).toEqual(["btn", "btn--primary"]);
  // JSX className string + brace-with-literal
  expect(toks(`<button className="btn btn--lg" />`)).toEqual(["btn", "btn--lg"]);
  expect(toks(`<button className={clsx("btn", "btn--lg")} />`)).toEqual(["btn", "btn--lg"]);
  // Vue :class array of string literals
  expect(toks(`<button class="btn" :class="['btn--primary', x && 'btn--lg']" />`)).toEqual([
    "btn",
    "btn--primary",
    "btn--lg",
  ]);
  // Svelte class:name toggles a class, alongside the static class
  expect(toks(`<button class="btn" class:btn--active={on} />`)).toEqual(["btn", "btn--active"]);
});

test("scanClassUsages ignores commented-out markup (HTML and JS comments)", () => {
  const toks = (src: string) => scanClassUsages(src).flatMap((s) => s.tokens.map((t) => t.token));
  expect(toks(`<!-- <div class="tabs tabs--boxed"></div> -->`)).toEqual([]);
  expect(toks(`{/* <button className="btn btn--x" /> */}`)).toEqual([]);
  // A real element beside a commented one is still read; a URL with // isn't mistaken for a comment.
  expect(toks(`<a href="http://x" class="tabs" /> <!-- <b class="tabs--gone"/> -->`)).toEqual([
    "tabs",
  ]);
});

test("scanClassUsages reports accurate offsets", () => {
  const src = `<div class="btn btn--x"></div>`;
  const [site] = scanClassUsages(src);
  const mod = site.tokens.find((t) => t.token === "btn--x")!;
  expect(src.slice(mod.start, mod.end)).toBe("btn--x");
});

test('a <style lang="scss"> block parses through the SCSS dialect', () => {
  const vue = `<style lang="scss">
$brand: #06c;
/**
 * @component card
 * @summary A surface.
 */
.card {
  // a scss line comment
  color: $brand;
  &.card--featured { box-shadow: 0 1px 4px; }
}
</style>`;
  const records = parseCssDocsFromSource(vue, { host: "html" });
  expect(records.map((e) => e.name)).toEqual(["card"]);
});
