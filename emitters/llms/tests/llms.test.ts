import { parseCssDocs } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import { renderLlms } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @modifier -variant-old — @deprecated {@link -color-secondary}
 * @part .icon — A leading glyph.
 * @cssstate loading — Awaiting a response.
 */
.button { color: red; }
.button.-color-secondary { color: blue; }
.button.-variant-old { color: gray; }
@scope (.button) { :scope > .icon { width: 1em; } }
.button:state(loading) { opacity: 0.5; }
@property --button-radius { syntax: "<length>"; inherits: false; }

/**
 * @utility spacing
 * @summary Margin helpers.
 */
.m-sm { margin: 0.5rem; }
`;

test("renders a compact per-component digest with a title and blockquote", () => {
  const out = renderLlms(parseCssDocs(CSS), { title: "InstUI CSS", intro: "Class-based styles." });
  expect(out.startsWith("# InstUI CSS\n")).toBe(true);
  expect(out).toContain("> Class-based styles.");
  expect(out).toContain("## button — `.button`");
  expect(out).toContain("The primary action control.");
});

test("summarizes each facet on one line and marks the utility kind", () => {
  const out = renderLlms(parseCssDocs(CSS));
  expect(out).toContain(
    "- Modifiers: `-color-secondary` (A lower-emphasis action.), `-variant-old` (deprecated → `-color-secondary`)",
  );
  expect(out).toContain("- Parts: `.icon` (A leading glyph.)");
  expect(out).toContain("- States: `:state(loading)`");
  expect(out).toContain("- Custom properties: `--button-radius` <length>");
  expect(out).toContain("## spacing (utility) — `.m-sm`");
});
