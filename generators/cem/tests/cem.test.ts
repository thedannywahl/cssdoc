import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import { toCem } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @part .icon — A leading glyph (class-based sub-element).
 * @csspart label — The exposed label part.
 * @cssstate loading — Awaiting a response.
 */
.button { color: red; }
@scope (.button) { :scope > .icon { width: 1em; } }
.button:state(loading) { opacity: 0.5; }
.button:disabled { opacity: 0.4; }
.button::part(label) { font-weight: 600; }
@property --button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }
`;

test("toCem maps each record to a declaration with cssProperties, cssParts, and cssStates", () => {
  const cem = toCem(createIndex(CSS), { path: "components.css" });
  expect(cem.schemaVersion).toBe("2.1.0");
  const decl = cem.modules[0].declarations.find((d) => d.name === "button")!;
  expect(decl.tagName).toBe("button");
  expect(decl.customElement).toBe(true);
  expect(decl.cssProperties).toContainEqual({
    name: "--button-radius",
    syntax: "<length>",
    default: "4px",
    description: undefined,
  });
  // CEM `cssParts` are shadow `::part()` only — the class-based `.icon` sub-element is excluded.
  expect(decl.cssParts.map((p) => p.name)).toEqual(["label"]);
  // CEM `cssStates` are custom `:state()` only — the `:disabled` pseudo-class is excluded.
  expect(decl.cssStates.map((s) => s.name)).toEqual(["loading"]);
});
