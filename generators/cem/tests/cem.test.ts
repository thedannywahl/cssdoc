import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import { toCem } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @part .icon — A leading glyph.
 * @cssstate loading — Awaiting a response.
 */
.instui-button { color: red; }
@scope (.instui-button) { :scope > .icon { width: 1em; } }
.instui-button:state(loading) { opacity: 0.5; }
@property --instui-button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }
`;

test("toCem maps each record to a declaration with cssProperties, cssParts, and cssStates", () => {
  const cem = toCem(createIndex(CSS), { path: "components.css" });
  expect(cem.schemaVersion).toBe("2.1.0");
  const decl = cem.modules[0].declarations.find((d) => d.name === "button")!;
  expect(decl.tagName).toBe("instui-button");
  expect(decl.customElement).toBe(true);
  expect(decl.cssProperties).toContainEqual({
    name: "--instui-button-radius",
    syntax: "<length>",
    default: "4px",
    description: undefined,
  });
  expect(decl.cssParts.map((p) => p.name)).toContain("icon");
  expect(decl.cssStates.map((s) => s.name)).toContain("loading");
});
