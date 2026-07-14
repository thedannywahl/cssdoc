import { expect, test } from "vite-plus/test";
import {
  CSSDOC_TAG_NAMES,
  CSSDOC_TAGS,
  cssdocTagNamesByArgument,
  cssdocTagNamesByKind,
} from "../src/index.ts";

test("every tag has a name and a kind", () => {
  for (const tag of CSSDOC_TAGS) {
    expect(tag.name).toMatch(/^[A-Za-z][A-Za-z0-9]*$/u);
    expect(["record", "block", "modifier", "inline"]).toContain(tag.kind);
  }
});

test("tag names are unique and match CSSDOC_TAG_NAMES order", () => {
  expect(CSSDOC_TAG_NAMES).toEqual(CSSDOC_TAGS.map((t) => t.name));
  expect(new Set(CSSDOC_TAG_NAMES).size).toBe(CSSDOC_TAG_NAMES.length);
});

test("every alias points at a real canonical tag of the same kind", () => {
  for (const tag of CSSDOC_TAGS) {
    if (!tag.aliasFor) continue;
    const target = CSSDOC_TAGS.find((t) => t.name === tag.aliasFor);
    expect(target, `${tag.name} aliases missing ${tag.aliasFor}`).toBeDefined();
    expect(target?.kind).toBe(tag.kind);
  }
});

test("exposes the groups grammars need", () => {
  expect(cssdocTagNamesByKind("inline")).toEqual(["link", "inheritDoc", "label"]);
  expect(cssdocTagNamesByArgument("modifier-name")).toEqual(["modifier"]);
  expect(cssdocTagNamesByArgument("part-name")).toEqual(["part", "csspart", "wrapper", "slot"]);
  expect(cssdocTagNamesByArgument("custom-property")).toEqual([
    "cssproperty",
    "property",
    "tokens",
  ]);
});

test("the new hoisted tags are registered with the expected kinds", () => {
  const byName = (name: string) => CSSDOC_TAGS.find((t) => t.name === name);
  expect(byName("tokens")).toMatchObject({
    kind: "block",
    allowMultiple: true,
    argument: "custom-property",
  });
  expect(byName("usage")).toMatchObject({ kind: "block" });
  expect(byName("compat")).toMatchObject({ kind: "block", allowMultiple: true });
  expect(byName("related")).toMatchObject({ kind: "block", allowMultiple: true });
});
