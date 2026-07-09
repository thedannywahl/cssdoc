import { expect, test } from "vite-plus/test";
import { type CssDocIndex, createIndex, indexFromEntries, memberKey } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 */
.button { color: red; }
.button.-color-secondary { color: blue; }

/**
 * @component progress
 */
@property --value { syntax: "<number>"; inherits: true; initial-value: 0; }
.progress { --value: 0; }
`;

let index: CssDocIndex;
test("createIndex parses the model and resolves class lookups", () => {
  index = createIndex(CSS, { file: "components.css" });
  expect(index.componentForClass(".button")?.name).toBe("button");
  expect(index.componentForClass("button")?.name).toBe("button"); // dot optional
  expect(index.isModifier(".button", "-color-secondary")).toBe(true);
  expect(index.isModifier(".button", "-nope")).toBe(false);
});

test("member and record spans are captured from the CSS", () => {
  const modSpan = index
    .recordInfo("button")
    ?.memberSpans.get(memberKey("modifier", "-color-secondary"));
  expect(modSpan?.start.line).toBe(8); // the .button.-color-secondary rule

  const loc = index.location("progress", memberKey("property", "--value"));
  expect(loc?.file).toBe("components.css");
  expect(loc?.span.start.line).toBe(13); // the @property rule
});

test("authored names are tracked for drift detection", () => {
  const info = index.recordInfo("button")!;
  expect([...info.authoredModifiers]).toEqual(["-color-secondary"]);
  expect(info.selectorText).toContain(".button.-color-secondary");
});

test("allCustomProperties pairs each property with its record", () => {
  const all = index.allCustomProperties();
  expect(all).toContainEqual({
    property: { name: "--value", syntax: "<number>", inherits: true, defaultValue: "0" },
    record: "progress",
  });
});

test("indexFromEntries works without spans (from a model snapshot)", () => {
  const snapshot = createIndex(CSS).toManifest();
  const rebuilt = indexFromEntries(snapshot.entries);
  expect(rebuilt.componentForClass(".button")?.name).toBe("button");
  expect(rebuilt.location("button")).toBeUndefined(); // no spans in a snapshot
});
