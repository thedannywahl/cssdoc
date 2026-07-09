import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import {
  checkClassUsage,
  completeClasses,
  completeCustomProperties,
  definitionForClass,
  hoverForClass,
  lintModel,
} from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @modifier -variant-old — @deprecated {@link -color-secondary}
 */
.button { color: red; }
.button.-color-secondary { color: blue; }
.button.-size-sm { font-size: small; }
.button.-variant-old { color: gray; }

/**
 * @component chip
 */
.chip { color: green; }
@property --chip-bg { syntax: "<color>"; inherits: false; }
`;

const index = createIndex(CSS, { file: "components.css" });

test("lintModel reports author-side hygiene (chip missing summary, -size-sm undocumented)", () => {
  const rules = lintModel(index).map((d) => `${d.record}:${d.rule}`);
  expect(rules).toContain("chip:missing-summary");
  expect(rules).toContain("button:undocumented-modifier"); // -size-sm
});

test("checkClassUsage flags an unknown modifier and a deprecated one", () => {
  const diagnostics = checkClassUsage(
    [
      { base: "button", tokens: ["button", "-color-danger"], token: "-color-danger" },
      { base: "button", tokens: ["button", "-variant-old"], token: "-variant-old" },
      {
        base: "button",
        tokens: ["button", "-color-secondary"],
        token: "-color-secondary",
      },
    ],
    index,
  );
  const byRule = diagnostics.map((d) => d.rule);
  expect(byRule).toContain("unknown-modifier"); // -color-danger
  expect(byRule).toContain("deprecated-modifier"); // -variant-old
  expect(byRule).not.toContain("__none__");
  const deprecated = diagnostics.find((d) => d.rule === "deprecated-modifier")!;
  expect(deprecated.message).toContain("-color-secondary"); // suggests the canonical
});

test("completions: components with no base, modifiers with a base", () => {
  const components = completeClasses(undefined, index).map((c) => c.label);
  expect(components).toEqual(expect.arrayContaining(["button", "chip"]));

  const modifiers = completeClasses("button", index);
  expect(modifiers.map((c) => c.label)).toEqual(
    expect.arrayContaining(["-color-secondary", "-size-sm", "-variant-old"]),
  );
  expect(modifiers.find((c) => c.label === "-variant-old")?.deprecated).toBe(true);
});

test("hover and definition resolve a modifier to its docs and its rule location", () => {
  const hover = hoverForClass("button", "-color-secondary", index);
  expect(hover?.contents).toContain("A lower-emphasis action.");

  const def = definitionForClass("button", "-color-secondary", index);
  expect(def?.file).toBe("components.css");
  expect(def?.span.start.line).toBe(9); // the .button.-color-secondary rule
});

test("var(--…) completions include declared custom properties", () => {
  const props = completeCustomProperties(index).map((c) => c.label);
  expect(props).toContain("--chip-bg");
});
