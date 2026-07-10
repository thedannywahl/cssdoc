import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import {
  checkClassUsage,
  completeClasses,
  completeCustomProperties,
  definitionForClass,
  hoverForClass,
  lintModel,
  resolveRuleSeverities,
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

const index = createIndex(CSS, { file: "components.css", modifierConvention: "rscss" });

test("lintModel reports author-side hygiene (chip missing summary, -size-sm undocumented)", () => {
  const rules = lintModel(index).map((d) => `${d.record}:${d.rule}`);
  expect(rules).toContain("chip:missing-summary");
  expect(rules).toContain("button:undocumented-modifier"); // -size-sm
});

test("structure-unknown-selector flags a @structure reference that isn't the class or a part", () => {
  // `.tablet` is renamed but @structure still says `.tabs`; `.list` is a real part, so it's fine.
  const css = `/**
 * @component tabs
 * @summary Tabs.
 * @part .list — The row.
 * @structure
 *   .tabs
 *     .list
 */
.tablet {}
@scope (.tablet) { :scope .list {} }`;
  const rules = lintModel(createIndex(css)).map((d) => d.rule);
  expect(rules).toContain("structure-unknown-selector");
  // The intact example (class matches structure root) does not flag it.
  const clean = `/**
 * @component tabs
 * @summary Tabs.
 * @part .list — The row.
 * @structure
 *   .tabs
 *     .list
 */
.tabs {}
@scope (.tabs) { :scope .list {} }`;
  expect(lintModel(createIndex(clean)).map((d) => d.rule)).not.toContain(
    "structure-unknown-selector",
  );
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

test("rule severities: unknown-modifier defaults to warn (BEM), and is off/error configurable", () => {
  const bem = createIndex(
    `/**\n * @component card\n * @summary A surface.\n */\n.card { color: red; }\n.card--featured { color: blue; }`,
  );
  const usage = [{ base: "card", tokens: ["card", "card--danger"], token: "card--danger" }];

  // Default: the undocumented BEM modifier warns.
  const def = checkClassUsage(usage, bem);
  expect(def.find((d) => d.rule === "unknown-modifier")?.severity).toBe("warning");

  // off → silenced entirely.
  expect(checkClassUsage(usage, bem, resolveRuleSeverities({ "unknown-modifier": "off" }))).toEqual(
    [],
  );

  // error → upgraded.
  const errored = checkClassUsage(
    usage,
    bem,
    resolveRuleSeverities({ "unknown-modifier": "error" }),
  );
  expect(errored.find((d) => d.rule === "unknown-modifier")?.severity).toBe("error");

  // An unrelated class on an unknown base is never a candidate.
  expect(checkClassUsage([{ base: undefined, tokens: ["mt-4"], token: "mt-4" }], bem)).toEqual([]);
});
