import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import { cssCustomData, htmlCustomData, writeVscodeCustomData } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 */
.instui-button { color: red; }
.instui-button.-color-secondary { color: blue; }
@property --instui-button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }
`;

const index = createIndex(CSS);

test("cssCustomData lists declared custom properties", () => {
  const data = cssCustomData(index);
  expect(data.version).toBe(1.1);
  expect(data.properties).toContainEqual({
    name: "--instui-button-radius",
    description: "syntax: `<length>`",
  });
});

test("htmlCustomData exposes component classes and modifiers as class values", () => {
  const data = htmlCustomData(index);
  const values = data.globalAttributes[0].values.map((v) => v.name);
  expect(data.globalAttributes[0].name).toBe("class");
  expect(values).toEqual(expect.arrayContaining(["instui-button", "-color-secondary"]));
});

test("writeVscodeCustomData writes both files", () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-vsc-"));
  const { cssPath, htmlPath } = writeVscodeCustomData({ index, outDir });
  expect(JSON.parse(readFileSync(cssPath, "utf8")).properties.length).toBeGreaterThan(0);
  expect(JSON.parse(readFileSync(htmlPath, "utf8")).globalAttributes[0].name).toBe("class");
});
