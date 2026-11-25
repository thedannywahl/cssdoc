import { expect, test } from "vite-plus/test";
import {
  detectEmbeddedHost,
  extractCssBlocks,
  lintCssDocsFromSource,
  parseCssDocsFromSource,
  projectCss,
  scanClassUsages,
} from "../src/index.ts";

test("host detection and style language matching retain their case and offset behavior", () => {
  expect(detectEmbeddedHost("component.VUE")).toBe("html");
  expect(detectEmbeddedHost("component.vue1")).toBeUndefined();
  const [block] = extractCssBlocks("\n\n<STYLE LANG='SCSS'>.card {}</STYLE>", { host: "html" });
  expect(block.dialect).toBe("scss");
  expect(block.start.line).toBe(3);
});

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

test("custom template tags are matched literally, and an empty tag list matches nothing", () => {
  const source = "cssx`.wrong {}`; css`.right {}`; plain`.other {}`;";
  expect(extractCssBlocks(source, { host: "js", tags: ["css."] })).toEqual([]);
  expect(extractCssBlocks(source, { host: "js", tags: ["css"] }).map((block) => block.css)).toEqual(
    [".right {}"],
  );
  expect(extractCssBlocks(source, { host: "js", tags: [] })).toEqual([]);
});

test("CSS-in-JS tag scanning preserves member, call, and boundary behavior", () => {
  const source = [
    "const a = styled.button`.a {}`;",
    'const b = styled("div").attrs({ role: "button" })`.b {}`;',
    "const c = css`.c {}`;",
    "const d = keyframes`.d {}`;",
    "const e = theme.css`.ignored {}`;",
    "const f = mycss`.ignored {}`;",
    "const g = styled(foo(bar))`.ignored {}`;",
  ].join("\n");
  const blocks = extractCssBlocks(source, { host: "js" });
  expect(blocks.map((block) => block.css)).toEqual([".a {}", ".b {}", ".c {}", ".d {}"]);
  for (const block of blocks) {
    expect(source.slice(block.start.offset, block.start.offset + block.css.length)).toBe(block.css);
  }
});

test("CSS-in-JS interpolation masking preserves nested strings and template offsets", () => {
  const source = 'const x = css`a { color: ${fn({ v: "}" }, `nested ${x}`)}; }`;';
  const [block] = extractCssBlocks(source, { host: "js" });
  expect(block.css.length).toBe(source.indexOf("`;", block.start.offset) - block.start.offset);
  expect(block.css).toMatch(/^a \{ color: a+; \}$/u);
  expect(projectCss(source, { host: "js" }).length).toBe(source.length);
});

test("parseCssDocsFromSource reads a JS tagged template, a Vue <style scoped>, and a Markdown fence", () => {
  expect(parseCssDocsFromSource(JS, { host: "js" }).map((e) => e.name)).toEqual(["button"]);
  const vue = parseCssDocsFromSource(VUE, { host: "html" });
  expect(vue.map((e) => e.name)).toEqual(["btn"]);
  const md = parseCssDocsFromSource(MD, { host: "markdown" });
  expect(md.map((e) => e.name)).toEqual(["card"]);
});

test("Markdown fence scanning preserves offsets and skips non-CSS blocks between CSS blocks", () => {
  const source = "intro\n```css\n.a {}\n```\n```js\nignore\n```\n```scss\n.b {}\n```\n";
  const blocks = extractCssBlocks(source, { host: "markdown" });
  expect(blocks.map(({ css, dialect, start }) => ({ css, dialect, start }))).toEqual([
    {
      css: ".a {}\n",
      dialect: "css",
      start: { offset: source.indexOf(".a {}"), line: 3, column: 0 },
    },
    {
      css: ".b {}\n",
      dialect: "scss",
      start: { offset: source.indexOf(".b {}"), line: 9, column: 0 },
    },
  ]);
});

test("Markdown prose and non-CSS fences containing comment-like globs stay masked", () => {
  const md = `# Tooling notes

- Test files (\`__tests__/**\`) are excluded.

\`\`\`typescript
export default {
  lint: { "**/*.md": "markdownlint" },
};
\`\`\`

Exports may use \`/** @public */\` annotations.
`;
  const projected = projectCss(md, { host: "markdown" });
  expect(projected).not.toContain("__tests__/**");
  expect(projected).not.toContain("**/*.md");
  expect(projected).not.toContain("@public");
  expect(() => parseCssDocsFromSource(md, { host: "markdown" })).not.toThrow();
});

test("an unfinished JS doc comment stays masked while it is being authored", () => {
  const source = "/**\n * @";
  const projected = projectCss(source, { host: "js" });
  expect(projected).toBe("   \n    ");
  expect(() => parseCssDocsFromSource(source, { host: "js" })).not.toThrow();
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
  const v = lintCssDocsFromSource(bare, {
    host: "html",
    rules: { "missing-summary": "warn" },
  });
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

test("scanClassUsages masks `${…}` interpolations in a template literal to its static prefix", () => {
  const toks = (src: string) => scanClassUsages(src).flatMap((s) => s.tokens.map((t) => t.token));
  // Vue :class bound to a template literal — the dynamic suffix is masked, leaving the static prefix.
  expect(toks('<span :class="`-icon-${icon.name}`"></span>')).toEqual(["-icon-"]);
});

test("scanClassUsages reports accurate offsets", () => {
  const src = `<div class="btn btn--x"></div>`;
  const [site] = scanClassUsages(src);
  const mod = site.tokens.find((t) => t.token === "btn--x")!;
  expect(src.slice(mod.start, mod.end)).toBe("btn--x");
  expect(site.elementName).toBe("div");
});

test("scanClassUsages retains dotted host names, quote captures, and token offsets", () => {
  const src = `<Menu.Item className='btn btn--x' :class="'btn--y'" />`;
  const [site] = scanClassUsages(src);
  expect(site.elementName).toBe("menu.item");
  expect(site.tokens.map(({ token, start, end }) => [token, src.slice(start, end)])).toEqual([
    ["btn", "btn"],
    ["btn--x", "btn--x"],
    ["btn--y", "btn--y"],
  ]);
});

test("HTML style scanning preserves the existing prefix and comment heuristics", () => {
  const src = `<!-- <style>.ignored {}</style> --><STYLES lang='scss'>.kept {}</style>`;
  const [block] = extractCssBlocks(src, { host: "html" });
  expect(block.css).toBe(".kept {}");
  expect(block.dialect).toBe("scss");
  expect(block.start.offset).toBe(src.indexOf(".kept {}"));
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

test("a <style> written inside an HTML comment is ignored, not opened as a region", () => {
  // Regression: a lone commented `<style>` used to pair with the next real `</style>` (or run to end
  // of file), projecting the surrounding markup as CSS and silently breaking every check in the file.
  const commented = `<!-- move this into a <style> block --><div class="note">x</div>`;
  // The trailing markup must NOT be projected as CSS…
  expect(projectCss(commented, { host: "html" })).not.toContain("note");
  // …while class-usage scanning still reads the real `class="note"` usage.
  expect(scanClassUsages(commented).flatMap((s) => s.tokens.map((t) => t.token))).toContain("note");

  // A real <style> that follows such a comment still projects and parses.
  const withReal = `<!-- see the <style> below -->
<style>
/**
 * @component note
 * @summary A note.
 */
.note {}
</style>`;
  expect(parseCssDocsFromSource(withReal, { host: "html" }).map((e) => e.name)).toEqual(["note"]);
});

test("a TSDoc comment whose prose mentions @component does not produce a false record when there are no CSS templates", () => {
  // Regression: all doc comments were kept verbatim; TSDoc prose like `@component menu` tripped the
  // parser into thinking a module was being declared.
  const src = `
/** A record definition's input. */
export interface DefineInput {
  /**
   * Build the record for prefix p: a leading /** … *\\/ cssdoc doc comment followed by the CSS
   * body — for example a doc comment tagged @component menu ahead of a rule like .p-menu {}.
   */
  css: (p: string) => string;
}
`;
  expect(parseCssDocsFromSource(src, { host: "js" })).toEqual([]);
  expect(projectCss(src, { host: "js" })).not.toContain("@component");
});

test("a TSDoc comment with @component in prose between two CSS templates is not kept", () => {
  const src = `
/** @component button\n * @summary A button.\n */
const Button = styled.button\`
  .button {}
\`;

/** This is just a TS doc. For example: @component fake — this is prose, not a declaration. */
export interface Options {}

/** @component card\n * @summary A card.\n */
const Card = styled.div\`
  .card {}
\`;
`;
  const records = parseCssDocsFromSource(src, { host: "js" });
  expect(records.map((e) => e.name)).toEqual(["button", "card"]);
});
