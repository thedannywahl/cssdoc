import { CssDocConfiguration, parseReference } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import {
  type CssDocIndex,
  type NamedMemberOccurrence,
  createIndex,
  indexFromEntries,
  memberKey,
  resolveNamedMemberReference,
  resolveRecordReference,
} from "../src/index.ts";

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

test("reference resolution retains duplicates and distinguishes unavailable scopes", () => {
  const first = createIndex("/** @component button */ .button {}", { file: "a.css" });
  const second = createIndex("/** @component button */ .button {}", { file: "b.css" });
  const third = createIndex("/** @utility button */ .button {}", { file: "utility.css" });
  const lookup = {
    workspace: {
      complete: true,
      sources: [
        { index: first, sourceKey: "a.css" },
        { index: second, sourceKey: "b.css" },
        { index: third, sourceKey: "utility.css" },
      ],
    },
    providers: new Map([
      ["ready", { complete: true, sources: [{ index: second, sourceKey: "a.css" }] }],
      ["failed", { complete: false, sources: [{ index: first, sourceKey: "a.css" }] }],
    ]),
  };
  const resolve = (text: string) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveRecordReference(parsed.reference, lookup);
  };
  expect(resolve("button")).toMatchObject({ status: "ambiguous", candidates: [{}, {}, {}] });
  expect(resolve("utility:button")).toMatchObject({
    status: "resolved",
    candidate: { sourceKey: "utility.css", record: { entry: { kind: "utility" } } },
  });
  expect(resolve('source("b.css")::component:button')).toMatchObject({
    status: "resolved",
    candidate: { sourceKey: "b.css" },
  });
  expect(resolve('provider(ready, "a.css")::component:button')).toMatchObject({
    status: "resolved",
    candidate: { providerId: "ready", sourceKey: "a.css" },
  });
  expect(resolve("provider(failed)::component:button")).toMatchObject({
    status: "unavailable",
    candidates: [{}],
  });
  expect(resolve("provider(absent)::component:button")).toEqual({
    status: "unavailable",
    candidates: [],
  });
  expect(resolve("component:absent")).toEqual({ status: "missing" });
  expect(
    resolveRecordReference(
      { scope: { kind: "workspace" }, name: "button" },
      { workspace: { complete: false, sources: [{ index: first }] } },
    ),
  ).toMatchObject({ status: "unavailable", candidates: [{}] });
});

test("reference resolution doesn't overwrite duplicates within one index", () => {
  const base = createIndex("/** @component button */ .button {}").entries[0];
  const duplicate = indexFromEntries([base, { ...base }]);
  expect(
    resolveRecordReference(
      { scope: { kind: "workspace" }, name: "button" },
      { workspace: { complete: true, sources: [{ index: duplicate }] } },
    ),
  ).toMatchObject({ status: "ambiguous", candidates: [{}, {}] });
});

test("source-qualified resolution accounts for matching unkeyed inputs", () => {
  const keyed = createIndex("/** @component button */ .button {}");
  const unkeyed = createIndex("/** @component button */ .button {}");
  const other = createIndex("/** @component other */ .other {}");
  const reference = parseReference('source("a.css")::component:button');
  if (!reference.ok) throw new Error(reference.error);
  const resolve = (sources: { index: CssDocIndex; sourceKey?: string }[]) =>
    resolveRecordReference(reference.reference, { workspace: { complete: true, sources } });

  expect(resolve([{ index: unkeyed }])).toMatchObject({
    status: "unavailable",
    candidates: [{}],
  });
  expect(resolve([{ index: keyed, sourceKey: "a.css" }, { index: unkeyed }])).toMatchObject({
    status: "unavailable",
    candidates: [{ sourceKey: "a.css" }, {}],
  });
  expect(resolve([{ index: other }])).toEqual({ status: "missing" });
  expect(resolve([{ index: keyed, sourceKey: "a.css" }, { index: other }])).toMatchObject({
    status: "resolved",
    candidate: { sourceKey: "a.css" },
  });
  const provider = parseReference('provider(ui, "a.css")::component:button');
  if (!provider.ok) throw new Error(provider.error);
  expect(
    resolveRecordReference(provider.reference, {
      workspace: { complete: true, sources: [] },
      providers: new Map([["ui", { complete: true, sources: [{ index: unkeyed }] }]]),
    }),
  ).toMatchObject({ status: "unavailable", candidates: [{ providerId: "ui" }] });
});

test("named member resolution uses CSS identifiers and preserves duplicates", () => {
  const base = createIndex("/** @component button */ .button {}").entries[0];
  const record = {
    ...base,
    shadowParts: [{ name: "label" }],
    slots: [{ name: "" }],
    cssPropertiesDeclared: [{ name: "--accent" }],
    cssPropertiesConsumed: [{ name: "--token" }],
    functions: [{ name: "--scale", parameters: [] }],
    animations: [{ name: "fade-in" }],
    layers: [{ name: "components.forms" }],
  };
  const lookup = (complete = true) => ({
    workspace: {
      complete: true,
      sources: [{ index: indexFromEntries([record]), membersComplete: complete }],
    },
  });
  const resolve = (text: string, complete = true) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveNamedMemberReference(parsed.reference, lookup(complete));
  };
  for (const reference of [
    "button#csspart(lab\\65 l)",
    "button#slot()",
    "button#property(--accent)",
    "button#token(--token)",
    "button#function(--scale)",
    "button#keyframes(fade-in)",
    "button#layer(components.forms)",
  ]) {
    expect(resolve(reference)).toMatchObject({ status: "resolved" });
  }
  expect(resolve("button#property(accent)")).toEqual({ status: "invalid-subject" });
  expect(resolve("button#slot(two words)")).toEqual({ status: "invalid-subject" });
  expect(resolve("button#layer(components\\.forms)")).toEqual({ status: "missing" });
  expect(resolve("button#csspart(label)", false)).toMatchObject({ status: "unavailable" });
  expect(resolve("button#modifier(.button--quiet)")).toMatchObject({ status: "unavailable" });
  const duplicate = indexFromEntries([{ ...record, slots: [{ name: "" }, { name: "" }] }]);
  const parsed = parseReference("button#slot()");
  if (!parsed.ok) throw new Error(parsed.error);
  expect(
    resolveNamedMemberReference(parsed.reference, {
      workspace: { complete: true, sources: [{ index: duplicate, membersComplete: true }] },
    }),
  ).toMatchObject({ status: "ambiguous", candidates: [{}, {}] });
});

test("named member resolution uses pre-deduplication occurrences and their spans", () => {
  const index = createIndex("/** @component button */ .button {}");
  const record = index.records[0];
  const first = { start: { line: 2, column: 1 }, end: { line: 2, column: 8 } };
  const second = { start: { line: 5, column: 1 }, end: { line: 5, column: 8 } };
  const occurrences: NamedMemberOccurrence[] = [
    { kind: "slot", member: { name: "label" }, span: first },
    { kind: "slot", member: { name: "label" }, span: second },
    { kind: "csspart", member: { name: "label" }, span: second },
  ];
  const lookup = (items: ReadonlyMap<typeof record, readonly NamedMemberOccurrence[]>) => ({
    workspace: {
      complete: true,
      sources: [
        { index, sourceKey: "buttons.css", membersComplete: true, namedMemberOccurrences: items },
      ],
    },
  });
  const resolve = (text: string, items = new Map([[record, occurrences]])) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveNamedMemberReference(parsed.reference, lookup(items));
  };
  expect(resolve("button#slot(label)")).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [
      { span: first, record: { sourceKey: "buttons.css" } },
      { span: second, record: { sourceKey: "buttons.css" } },
    ],
  });
  expect(resolve("button#csspart(label)")).toMatchObject({
    status: "resolved",
    candidate: { span: second },
  });
  expect(resolve("button#slot(missing)")).toEqual({ status: "missing" });
  expect(resolve("button#slot(label)", new Map())).toMatchObject({ status: "unavailable" });
  expect(resolve("button#slot(label)", new Map([[record, []]]))).toEqual({ status: "missing" });
  expect(record.entry.slots).toEqual([]);
});

test("createIndex parses the model and resolves class lookups", () => {
  index = createIndex(CSS, { file: "components.css", modifierConvention: "rscss" });
  expect(index.componentForClass(".button")?.name).toBe("button");
  expect(index.componentForClass("button")?.name).toBe("button"); // dot optional
  expect(index.isModifier(".button", "-color-secondary")).toBe(true);
  expect(index.isModifier(".button", "-nope")).toBe(false);
});

test("record spans ignore record-shaped prose and nested structure references", () => {
  const css = [
    "/** @component card */",
    ".card {}",
    "/**",
    " * @remarks Mentions @component fake.",
    " * @structure",
    " * .card {",
    " * @component child {}",
    " * }",
    " */",
    ".card__part {}",
    "/** @component next */",
    ".next {}",
  ].join("\n");
  const result = createIndex(css);
  expect(result.recordInfo("card")?.docCommentSpan?.start.line).toBe(1);
  expect(result.recordInfo("next")?.docCommentSpan?.start.line).toBe(11);
  expect(result.recordInfo("fake")).toBeUndefined();
  expect(result.recordInfo("child")).toBeUndefined();
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

test("authored modifier/part tag lines point at their own doc-comment line, not the whole block", () => {
  const info = index.recordInfo("button")!;
  const line = info.authoredModifierLines.get("-color-secondary");
  expect(line?.start.line).toBe(5); // the `@modifier -color-secondary` line itself
  expect(line?.end.line).toBe(5);

  const css = `
/**
 * @component card
 * @part [data-layout="x"] container — The wrapping element.
 */
.card { display: block; }
`;
  const parts = createIndex(css).recordInfo("card")!.authoredPartLines;
  expect(parts.get("container")?.start.line).toBe(4);
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

test("structureVariantsFor returns the @variant blocks for a component", () => {
  const css = `
/**
 * @component progress
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
  const idx = createIndex(css);
  expect(idx.structureFor("progress")).toBeDefined();
  const variants = idx.structureVariantsFor("progress");
  expect(variants).toHaveLength(2);
  expect(variants?.[0].name).toBe("wrapped");
  expect(variants?.[1].name).toBe("labelled");
});

test("spans and lookups work for suffix (BEM) and attribute (CUBE) modifiers", () => {
  const bem = createIndex(
    `/**\n * @component card\n */\n.card {}\n.card--featured { color: red; }`,
  );
  expect(
    bem.recordInfo("card")?.memberSpans.get(memberKey("modifier", "card--featured"))?.start.line,
  ).toBe(5);
  expect(bem.isModifier("card", "card--featured")).toBe(true);

  const cube = createIndex(
    `/**\n * @component card\n */\n.card {}\n.card[data-variant="ghost"] { color: red; }`,
    {
      modifierConvention: { structure: "attribute", separator: "data-" },
    },
  );
  // Single quotes in the lookup still resolve to the double-quoted canonical name.
  expect(cube.isModifier("card", `[data-variant='ghost']`)).toBe(true);
  expect(
    cube.recordInfo("card")?.memberSpans.has(memberKey("modifier", 'data-variant="ghost"')),
  ).toBe(true);
});

test("globalPrecedence controls which definition wins when a base and a @global record share a modifier name", () => {
  const css = `
/**
 * @component button
 * @summary Button.
 * @modifier -color-secondary — A lower-emphasis action.
 */
.button {}
.button.-color-secondary {}

/**
 * @utility theme
 * @global
 * @modifier -color-secondary — @deprecated {@link -color-primary}
 */
.theme {}
.theme.-color-secondary {}
`;
  // Default ("base"): the component's own (non-deprecated) definition wins.
  const base = createIndex(css, { modifierConvention: "rscss" });
  expect(base.isModifier("button", "-color-secondary")).toBe(true);
  expect(base.deprecationOf("button", "-color-secondary")).toBeUndefined();

  // "global": the @global record's (deprecated) definition wins instead.
  const configuration = new CssDocConfiguration();
  configuration.setGlobalPrecedence("global");
  const preferGlobal = createIndex(css, { modifierConvention: "rscss", configuration });
  expect(preferGlobal.deprecationOf("button", "-color-secondary")?.canonical).toBe(
    "-color-primary",
  );
});

test("resolveCustomProperty follows the var() chain to a terminal value, cycle-safe", () => {
  const idx = createIndex(
    ":root { --a: var(--b); --b: var(--c); --c: #0770a3; --x: var(--y); --y: var(--x); }",
  );
  expect(idx.resolveCustomProperty("--a")).toEqual({ declared: "var(--b)", resolved: "#0770a3" });
  // A cycle degrades to the furthest point rather than looping.
  expect(idx.resolveCustomProperty("--x").resolved).toContain("var(");
  // A plain literal has nothing to resolve.
  expect(idx.resolveCustomProperty("--c")).toEqual({ declared: "#0770a3" });
  // `@property` initial-values seed the graph; a fallback is used when the ref is unknown.
  const idx2 = createIndex(
    '@property --p { syntax: "<color>"; inherits: false; initial-value: var(--missing, #fff); }',
  );
  expect(idx2.resolveCustomProperty("--p").resolved).toBe("#fff");
});

test("createIndex preserves same-name records across kinds", () => {
  const idx = createIndex(
    [
      "/**",
      " * @component badge",
      " * @summary A badge.",
      " */",
      ".badge {}",
      "/**",
      " * @utility badge",
      " * @summary Badge utility.",
      " */",
      ".badge-layout {}",
    ].join("\n"),
  );

  const badgeKinds = idx.records
    .filter((r) => r.entry.name === "badge")
    .map((r) => r.entry.kind)
    .sort();
  expect(badgeKinds).toEqual(["component", "utility"]);
});
