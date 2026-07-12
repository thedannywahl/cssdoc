import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCssDocs } from "@cssdoc/core";
import { Ajv } from "ajv";
import { expect, test } from "vite-plus/test";
import { cssDocSchema, renderJson, writeJson } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @cssstate loading — Awaiting a response.
 * @tokens --r — The corner radius token.
 * @usage Import the sheet and apply the class.
 * @compat Uses :state(); needs a recent browser.
 * @related link — A textual action.
 */
.button { border-radius: var(--r); }
.button.-color-secondary { color: blue; }
.button:state(loading) { opacity: 0.5; }
@property --button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }
@keyframes spin { to { rotate: 360deg; } }
`;

test("renderJson produces valid JSON of the model", () => {
  const entries = parseCssDocs(CSS);
  const parsed = JSON.parse(renderJson(entries));
  const button = parsed.find((e: { name: string }) => e.name === "button");
  expect(button).toBeDefined();
  // cssPropertiesConsumed is now an array of { name, description? } objects.
  expect(button.cssPropertiesConsumed).toContainEqual({
    name: "--r",
    description: "The corner radius token.",
  });
  expect(button.usage).toBe("Import the sheet and apply the class.");
  expect(button.compat).toEqual(["Uses :state(); needs a recent browser."]);
  expect(button.related).toEqual([{ name: "link", description: "A textual action." }]);
});

test('lang: "js" extracts and emits records from a tagged template', () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-json-js-"));
  const ts = `import styled from "styled-components";
/**
 * @component button
 * @summary The primary action control.
 */
const Button = styled.button\`color: red;\`;`;
  const result = writeJson({ css: ts, lang: "js", outDir });
  const model = JSON.parse(readFileSync(result.modelPath, "utf8"));
  expect(model).toHaveLength(1);
  expect(model[0]).toMatchObject({ name: "button", summary: "The primary action control." });
});

test("the shipped JSON Schema validates the model output (schema stays in step with the model)", () => {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(cssDocSchema);
  const entries = parseCssDocs(CSS);
  const ok = validate(JSON.parse(JSON.stringify(entries)));
  if (!ok) console.error(validate.errors);
  expect(ok).toBe(true);
});

test("writeJson writes the model, per-record files, an index, and the schema", () => {
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-json-"));
  const result = writeJson({ css: CSS, outDir, perRecord: true, schema: true });

  expect(JSON.parse(readFileSync(result.modelPath, "utf8"))).toHaveLength(1);
  expect(result.recordPaths).toHaveLength(1);
  const index = JSON.parse(readFileSync(result.indexPath!, "utf8"));
  expect(index[0]).toMatchObject({ name: "button", kind: "component" });
  expect(JSON.parse(readFileSync(result.schemaPath!, "utf8")).$id).toContain("model.schema.json");
});
