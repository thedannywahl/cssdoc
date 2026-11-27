import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCssDocs, toJson } from "@cssdoc/core";
import { Ajv } from "ajv";
import { expect, test } from "vite-plus/test";
import { cssDocSchema, renderJson, writeJson } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @annotations
 * 1. Keep the focus ring visible.
 * @ref 1
 * @sealed
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
  expect(button.annotations).toEqual([{ ref: 1, text: "Keep the focus ring visible." }]);
  expect(button.refs).toEqual([1]);
  expect(button.decorators).toEqual(["sealed"]);
  expect(button.usage).toBe("Import the sheet and apply the class.");
  expect(button.compat).toEqual(["Uses :state(); needs a recent browser."]);
  expect(button.related).toEqual([{ name: "link", description: "A textual action." }]);
});

test("JSON output omits internal records by default and includes them on request", () => {
  const entries = parseCssDocs(`
/** @component public-card */
.public-card {}

/** @component author-note
 * @visibility internal
 */
.author-note {}
`);
  expect(JSON.parse(renderJson(entries)).map((entry: { name: string }) => entry.name)).toEqual([
    "public-card",
  ]);
  expect(
    JSON.parse(renderJson(entries, { includeInternal: true })).map(
      (entry: { name: string }) => entry.name,
    ),
  ).toEqual(["public-card", "author-note"]);
  expect(entries[1].visibility).toBe("internal");
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

test("effective prose associations survive public JSON projection and schema validation", () => {
  const entries = parseCssDocs(`/** @component button
 * @remarks - Public remarks.
 * @remarks todo - Private remarks.
 * @usage - Public usage.
 * @example {@private} - Private example.
 */
.button {}`);
  const model = JSON.parse(renderJson(entries));
  const validate = new Ajv({ allErrors: true }).compile(cssDocSchema);
  const valid = validate(model);
  if (!valid) console.error(validate.errors);
  expect(valid).toBe(true);
  expect(model[0].prose.map((body: { field?: string }) => body.field)).toEqual([
    "remarks",
    "usage",
  ]);
  expect(JSON.stringify(model)).not.toContain("Private");
});

test("the model schema rejects the removed record kind", () => {
  const entries = parseCssDocs(CSS);
  const removedKind = JSON.parse(JSON.stringify(entries));
  removedKind[0].kind = "layout";
  expect(new Ajv().compile(cssDocSchema)(removedKind)).toBe(false);
});

test("@members round-trips through JSON and validates against the schema", () => {
  const css = `
/**
 * @component tabs
 * @summary Tabs.
 * @members tab, panel
 */
.tabs {}
`;
  const entries = parseCssDocs(css);
  const parsed = JSON.parse(renderJson(entries));
  expect(parsed[0].members).toEqual(["tab", "panel"]);

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(cssDocSchema);
  const ok = validate(JSON.parse(JSON.stringify(entries)));
  if (!ok) console.error(validate.errors);
  expect(ok).toBe(true);
});

test("example labels round-trip without changing the examples string array", () => {
  const entries = parseCssDocs(`
/** @component button
 * @example Unlabeled.
 * @example labels=[docs, demo]
 * ### Primary action
 */
.button {}
`);
  const model = JSON.parse(renderJson(entries));
  expect(model[0]).toMatchObject({
    examples: ["Unlabeled.", "### Primary action"],
    exampleLabels: { 1: ["docs", "demo"] },
  });
  expect(new Ajv().compile(cssDocSchema)(model)).toBe(true);
});

test("public JSON removes private examples and reindexes public labels", () => {
  const entries = parseCssDocs(`
/** @component button
 * @example docs - First.
 * @example secret {@private} - Sensitive example.
 * @remarks todo - Private work item.
 * @summary {@private} - Private summary.
 * @example demo - Last.
 */
.button {}
`);
  const publicModel = JSON.parse(renderJson(entries));
  expect(publicModel[0].examples).toEqual(["First.", "Last."]);
  expect(publicModel[0].exampleLabels).toEqual({ 0: ["docs"], 1: ["demo"] });
  expect(JSON.stringify(publicModel)).not.toContain("Sensitive");
  expect(JSON.stringify(publicModel)).not.toContain("secret");
  expect(JSON.stringify(publicModel)).not.toContain("Private work item");
  expect(JSON.stringify(publicModel)).not.toContain("Private summary");
  expect(publicModel[0].prose.map((body: { exampleIndex?: number }) => body.exampleIndex)).toEqual([
    0, 1,
  ]);
  expect(toJson(entries)).not.toContain("Sensitive");
  expect(toJson(entries)).not.toContain("Private work item");
  expect(publicModel[0].privateExamples).toBeUndefined();
  expect(new Ajv().compile(cssDocSchema)(publicModel)).toBe(true);
  const privateModel = JSON.parse(renderJson(entries, { includePrivate: true }));
  expect(privateModel[0].examples[1]).toBe("Sensitive example.");
  expect(privateModel[0].privateExamples).toEqual([1]);
  expect(JSON.stringify(privateModel)).toContain("Private work item");
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-json-private-"));
  const output = writeJson({ entries, outDir, perRecord: true });
  expect(readFileSync(output.modelPath, "utf8")).not.toContain("Sensitive");
  expect(readFileSync(output.recordPaths[0], "utf8")).not.toContain("Sensitive");
});

test("public JSON omits legacy private remarks and to-dos without mutating the model", () => {
  const entries = parseCssDocs(`/** @component button
 * @privateRemarks Internal design detail.
 * @todo Internal work item.
 * @todo - Another internal work item.
 */
.button {}`);
  const original = JSON.stringify(entries);
  const publicJson = renderJson(entries);
  expect(publicJson).not.toContain("Internal design detail");
  expect(publicJson).not.toContain("Internal work item");
  expect(publicJson).not.toContain("Another internal work item");
  expect(toJson(entries)).not.toContain("Internal design detail");
  expect(toJson(entries)).not.toContain("Internal work item");
  expect(toJson(entries)).not.toContain("Another internal work item");
  expect(renderJson(entries, { includePrivate: true })).toContain("Internal design detail");
  expect(renderJson(entries, { includePrivate: true })).toContain("Internal work item");
  expect(renderJson(entries, { includePrivate: true })).toContain("Another internal work item");
  expect(JSON.stringify(entries)).toBe(original);
  expect(new Ajv().compile(cssDocSchema)(JSON.parse(publicJson))).toBe(true);
  const outDir = mkdtempSync(join(tmpdir(), "cssdoc-json-private-notes-"));
  const output = writeJson({ entries, outDir, perRecord: true });
  for (const path of [output.modelPath, output.recordPaths[0]]) {
    const written = readFileSync(path, "utf8");
    expect(written).not.toContain("Internal design detail");
    expect(written).not.toContain("Internal work item");
    expect(written).not.toContain("Another internal work item");
  }
});

test("record header privacy applies regardless of legacy visibility tags", () => {
  const entries = parseCssDocs(`
/** @component secret {@private} - Internal control.
 * @visibility public
 */
.secret {}
/** @component public - Mentions {@private} in prose. */
.public {}
/** @component literal {@link other | {@private} } */
.literal {}
/** @component escaped \\{@private} */
.escaped {}
`);
  expect(entries.map((entry) => [entry.name, entry.visibility])).toEqual([
    ["secret", "internal"],
    ["public", undefined],
    ["literal", undefined],
    ["escaped", undefined],
  ]);
  expect(JSON.parse(renderJson(entries)).map((entry: { name: string }) => entry.name)).toEqual([
    "public",
    "literal",
    "escaped",
  ]);
  expect(renderJson(entries, { includeInternal: true })).toContain('"name": "secret"');
});

test("structureVariants (from @variant blocks) round-trips through JSON and validates against the schema", () => {
  const VARIANT_CSS = `
/**
 * @component progress
 * @summary An upload progress control.
 * @structure
 * @variant wrapped {
 *   label { progress {} }
 * }
 * @variant labelled {
 *   label {}
 *   progress {}
 * }
 */
.progress {}
`;
  const entries = parseCssDocs(VARIANT_CSS);
  const parsed = JSON.parse(renderJson(entries));
  const progress = parsed.find((e: { name: string }) => e.name === "progress");
  expect(progress.structureVariants).toHaveLength(2);
  expect(progress.structureVariants[0].name).toBe("wrapped");
  expect(progress.structureVariants[1].name).toBe("labelled");

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(cssDocSchema);
  const ok = validate(JSON.parse(JSON.stringify(entries)));
  if (!ok) console.error(validate.errors);
  expect(ok).toBe(true);
});

test("bounded max-N cardinality and a nested @variant group round-trip through JSON and validate against the schema", () => {
  const ACTION_ROW_CSS = `
/**
 * @component action-row
 * @summary A single action, or a small group of them.
 * @structure
 * .action-row {
 *   slot {}
 *   @variant single {
 *     @component button:optional {}
 *   }
 *   @variant group {
 *     .button-group:optional {
 *       @component button:one-or-more:max-2 {}
 *     }
 *   }
 * }
 */
.action-row {}
`;
  const entries = parseCssDocs(ACTION_ROW_CSS);
  const parsed = JSON.parse(renderJson(entries));
  const row = parsed.find((e: { name: string }) => e.name === "action-row");
  const variantGroup = row.structure[0].children[1];
  expect(variantGroup.selector).toBe("");
  expect(variantGroup.variants).toHaveLength(2);
  expect(variantGroup.variants[1].nodes[0].children[0].cardinality).toBe("one-or-more-max-2");

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(cssDocSchema);
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
