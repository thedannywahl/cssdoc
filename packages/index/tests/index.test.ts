import { CssDocConfiguration, parseReference } from "@cssdoc/core";
import { parse as parsePostcss } from "postcss";
import { expect, test } from "vite-plus/test";

import {
  type CssDocIndex,
  type NamedMemberOccurrence,
  type SelectorMemberOccurrence,
  createIndex,
  indexFromEntries,
  memberKey,
  projectPublicModel,
  projectPrivateLinksInLookup,
  referenceVisibility,
  resolveContainerMemberReference,
  resolveMediaMemberReference,
  resolveNamedMemberReference,
  resolveRecordReference,
  resolveScopeMemberReference,
  resolveSelectorMemberReference,
  resolveSupportsMemberReference,
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

let sharedIndex: CssDocIndex;

test("public model projection removes private targets from mirrored prose without mutation", () => {
  const configuration = new CssDocConfiguration();
  configuration.setProseSettings({ mode: "markdown" });
  const index = createIndex(
    `/** @component public
 * @summary See {@link secret | **private label**}.
 * @remarks - Use {@link secret} and \`{@link secret}\`.
 * @example docs - Example {@link secret | [link](https://example.test)}
 * @example {@private} - Hidden.
 */
.public {}
/** @component secret {@private} */
.secret {}`,
    { configuration },
  );
  const original = JSON.stringify(index.entries);
  const lookup = { workspace: { complete: true, sources: [{ index }] } };
  const projected = projectPublicModel(index.entries, { lookupFor: () => lookup });
  expect(projected).toHaveLength(1);
  expect(projected[0].summary).toBe("See **private label**.");
  expect(projected[0].remarks).toBe("Use reference and `{@link secret}`.");
  expect(projected[0].examples).toEqual(["Example [link](https://example.test)"]);
  expect(projected[0].prose?.map((body) => body.text)).toEqual([
    "Use reference and `{@link secret}`.",
    "Example [link](https://example.test)",
  ]);
  expect(JSON.stringify(index.entries)).toBe(original);
  expect(JSON.stringify(projected)).not.toContain("Hidden");
  expect(JSON.stringify(projected)).not.toContain("{@link secret |");
});

test("public model projection uses the supplied context and rejects incomplete lookups", () => {
  const source = createIndex(`/** @component public
 * @remarks - {@link source("hidden.css")::component:secret | label}
 */ .public {}`);
  const secret = createIndex("/** @component secret {@private} */ .secret {}");
  const complete = {
    workspace: {
      complete: true,
      sources: [
        { index: source, sourceKey: "public.css" },
        { index: secret, sourceKey: "hidden.css" },
      ],
    },
  };
  const paths: string[] = [];
  expect(
    projectPublicModel(source.entries, {
      lookupFor: ({ path }) => {
        paths.push(path);
        return complete;
      },
    })[0].remarks,
  ).toBe("label");
  expect(paths).toContain("remarks");
  expect(() =>
    projectPublicModel(source.entries, {
      lookupFor: () => ({ workspace: { complete: false, sources: [{ index: source }] } }),
    }),
  ).toThrow(/Cannot establish reference visibility/u);
});

test("public projection uses original example and prose paths after privacy filtering", () => {
  const index = createIndex(`/** @component public
 * @example {@private} - Hidden.
 * @example - See {@link secret}.
 */ .public {}
/** @component secret {@private} */ .secret {}`);
  const lookup = { workspace: { complete: true, sources: [{ index }] } };
  const paths: string[] = [];
  const [entry] = projectPublicModel(index.entries, {
    lookupFor: ({ path }) => {
      paths.push(path);
      return lookup;
    },
  });
  expect(entry.examples).toEqual(["See reference."]);
  expect(paths).toContain("examples[1]");
  expect(paths).toContain("prose[1].text");
});

test("public projection uses each prose field's original lookup", () => {
  const receiver = createIndex(`/** @component receiver
 * @remarks - See {@link secret}.
 */ .receiver {}
/** @component secret */ .secret {}`);
  const origin = createIndex("/** @component secret {@private} */ .secret {}");
  const receiverLookup = { workspace: { complete: true, sources: [{ index: receiver }] } };
  const originLookup = { workspace: { complete: true, sources: [{ index: origin }] } };
  const [entry] = projectPublicModel([receiver.entries[0]], {
    lookupFor: ({ path }) =>
      path === "remarks" || path === "prose[0].text" ? originLookup : receiverLookup,
  });
  expect(entry.remarks).toBe("See reference.");
  expect(entry.prose?.[0].text).toBe("See reference.");
});

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

test("private-link projection resolves visibility in the original lookup context", () => {
  const privateIndex = createIndex(`/** @component secret {@private} */ .secret {}`);
  const publicIndex = createIndex(`/** @component secret */ .secret {}`);
  const lookup = {
    workspace: {
      complete: true,
      sources: [
        { index: privateIndex, sourceKey: "private.css" },
        { index: publicIndex, sourceKey: "public.css" },
      ],
    },
    providers: new Map([
      ["failed", { complete: false, sources: [{ index: privateIndex, sourceKey: "private.css" }] }],
    ]),
  };
  const resolve = (text: string) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return referenceVisibility(parsed.reference, lookup);
  };
  expect(resolve('source("private.css")::component:secret')).toBe("private");
  expect(resolve('source("public.css")::component:secret')).toBe("public");
  expect(resolve("secret")).toBe("unavailable");
  expect(resolve("missing")).toBe("unavailable");
  expect(resolve("provider(failed)::component:secret")).toBe("unavailable");
  expect(resolve('source("private.css")::component:secret#slot()')).toBe("unavailable");

  const text = [
    '{@link source("private.css")::component:secret | *Label*}',
    '{@link source("private.css")::component:secret}',
    '{@link source("public.css")::component:secret}',
    '`{@link source("private.css")::component:secret}`',
  ].join(" ");
  const projection = projectPrivateLinksInLookup(text, "markdown", lookup);
  expect(projection.unavailable).toBe(false);
  expect(projection.fragments.filter((fragment) => fragment.kind === "literal")).toEqual([
    { kind: "literal", text: "*Label*" },
    { kind: "literal", text: "reference" },
  ]);
  expect(
    projection.fragments
      .filter((fragment) => fragment.kind === "prose")
      .map((f) => f.text)
      .join(""),
  ).toContain('{@link source("public.css")::component:secret}');
  expect(projectPrivateLinksInLookup("{@link secret}", "markdown", lookup).unavailable).toBe(true);
  const incomplete = projectPrivateLinksInLookup(
    '{@link source("private.css")::component:secret | Hidden}',
    "plain",
    { workspace: { ...lookup.workspace, complete: false } },
  );
  expect(incomplete.unavailable).toBe(true);
  expect(incomplete.fragments).toEqual([
    { kind: "prose", text: '{@link source("private.css")::component:secret | Hidden}' },
  ]);
});

test("member link visibility requires a complete and uniquely resolved member", () => {
  const index = createIndex(`/** @component secret {@private} */
@scope (.secret) { @media (width > 30px) { .secret {} } }`);
  const record = index.records[0];
  const named: NamedMemberOccurrence[] = [{ kind: "slot", member: { name: "label" } }];
  const selectors: SelectorMemberOccurrence[] = [{ kind: "part", selector: ".icon" }];
  const source = {
    index,
    membersComplete: true,
    namedMemberOccurrences: new Map([[record, named]]),
    selectorMembersComplete: true,
    selectorMemberOccurrences: new Map([[record, selectors]]),
  };
  const lookup = { workspace: { complete: true, sources: [source] } };
  for (const text of [
    "secret#slot(label)",
    "secret#part(.icon)",
    "secret#scope((.secret))",
    "secret#media((width > 30px))",
  ]) {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(referenceVisibility(parsed.reference, lookup)).toBe("private");
  }
  const missing = parseReference("secret#slot(missing)");
  if (!missing.ok) throw new Error(missing.error);
  expect(referenceVisibility(missing.reference, lookup)).toBe("unavailable");
});

test("named member resolution uses CSS identifiers and preserves duplicates", () => {
  const base = createIndex("/** @component button */ .button {}").entries[0];
  const record = {
    ...base,
    shadowParts: [{ name: "label" }],
    slots: [{ name: "" }, { name: String.raw`name\ ` }],
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
    "button#slot( /* default slot */ )",
    String.raw`button#slot(name\ )`,
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

test("selector members match CSS identities against complete original occurrences", () => {
  const index = createIndex("/** @component button */ .button {}");
  const record = index.records[0];
  const span = { start: { line: 2, column: 1 }, end: { line: 2, column: 10 } };
  const occurrences: SelectorMemberOccurrence[] = [
    { kind: "modifier", selector: ".button--busy", span },
    { kind: "part", selector: '[data-slot="action"]', span },
    { kind: "part", selector: '[data-kind="Action" i]' },
    { kind: "part", selector: ":is(.icon, [data-slot='action,close'])" },
    { kind: "part", selector: ".shell > .icon" },
    { kind: "wrapper", selector: ".shell" },
    { kind: "state", selector: ":state(open)" },
    { kind: "pseudo-element", selector: "::before" },
    { kind: "pseudo-element", selector: "::É" },
    { kind: "part", selector: ".duplicate", span },
    { kind: "part", selector: ".duplicate" },
  ];
  const resolve = (
    text: string,
    selectorMemberOccurrences: ReadonlyMap<
      typeof record,
      readonly SelectorMemberOccurrence[]
    > = new Map([[record, occurrences]]),
    selectorMembersComplete = true,
  ) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveSelectorMemberReference(parsed.reference, {
      workspace: {
        complete: true,
        sources: [
          { index, sourceKey: "buttons.css", selectorMembersComplete, selectorMemberOccurrences },
        ],
      },
    });
  };
  for (const reference of [
    String.raw`button#modifier(.button--b\75 sy)`,
    "button#part([data-slot=action])",
    "button#part([data-kind=ACTION I])",
    `button#part(:is(.icon,[data-slot="action,close"]))`,
    "button#part(.shell/* gap */ > .icon)",
    "button#wrapper(.shell)",
    String.raw`button#state(:state(\6f pen))`,
    "button#pseudo-element(::BEFORE)",
  ]) {
    expect(resolve(reference)).toMatchObject({ status: "resolved" });
  }
  expect(resolve("button#modifier(.button--busy)")).toMatchObject({
    candidate: { occurrence: { span }, record: { sourceKey: "buttons.css" } },
  });
  expect(resolve("button#part(.duplicate)")).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [{ occurrence: { span } }, {}],
  });
  expect(resolve("button#part(.missing)")).toEqual({ status: "missing" });
  expect(resolve("button#pseudo-element(::é)")).toEqual({ status: "missing" });
  expect(resolve("button#part(.shell .icon)")).toEqual({ status: "missing" });
  expect(resolve("button#part(.icon, .other)")).toEqual({ status: "invalid-subject" });
  expect(resolve("button#state(:state(open hidden))")).toEqual({ status: "invalid-subject" });
  expect(resolve("button#pseudo-element(.icon)")).toEqual({ status: "invalid-subject" });
  expect(resolve("button#part(.icon)", new Map())).toMatchObject({ status: "unavailable" });
  expect(resolve("button#part(.icon)", new Map([[record, occurrences]]), false)).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("button#part(.missing)", new Map([[record, []]]))).toEqual({ status: "missing" });
  expect(resolve("button#part(svg|button)")).toMatchObject({ status: "unavailable" });
  expect(
    resolve(
      "button#part(.missing)",
      new Map([[record, [{ kind: "part", selector: ":foo(bar)" }]]]),
    ),
  ).toMatchObject({ status: "unavailable" });
});

test("scope member resolution retains nested CSS occurrences and source spans", () => {
  const css = `/** @component card */
@scope (.card) to (.end) {
  .card {}
  @scope (.inner) { .card {} }
}
@scope (.card) to (.end) { .card {} }
@scope { .card {} }
@scope (.empty) { @keyframes fade { from { opacity: 0 } } }
.card { @scope (.nested) { color: red } }
/** @component other */
@scope (.other) { .other {} }
`;
  const index = createIndex(css, { file: "cards.css" });
  const resolve = (text: string, scopeIndex = index, complete = true) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveScopeMemberReference(parsed.reference, {
      workspace: { complete, sources: [{ index: scopeIndex, sourceKey: "cards.css" }] },
    });
  };
  expect(index.records[0].scopeOccurrences?.map((scope) => scope.prelude)).toEqual([
    "(.card) to (.end)",
    "(.inner)",
    "(.card) to (.end)",
    "",
    "(.nested)",
  ]);
  expect(resolve(String.raw`card#scope((.c\61 rd) /* c */ to (.end))`)).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [
      { occurrence: { span: { start: { line: 2 } } }, record: { sourceKey: "cards.css" } },
      { occurrence: { span: { start: { line: 6 } } } },
    ],
  });
  expect(resolve("card#scope((.inner))")).toMatchObject({
    status: "resolved",
    candidate: { occurrence: { span: { start: { line: 4 } } } },
  });
  expect(resolve("card#scope((.nested))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#scope(/* omitted */)")).toMatchObject({ status: "resolved" });
  expect(resolve("card#scope((.card))")).toEqual({ status: "missing" });
  expect(resolve("card#scope((.empty))")).toEqual({ status: "missing" });
  expect(resolve("card#scope((??))")).toEqual({ status: "invalid-subject" });
  expect(resolve("card#scope((:unknown(value)))")).toMatchObject({ status: "unavailable" });
  expect(resolve("card#scope((.inner))", index, false)).toMatchObject({ status: "unavailable" });
  expect(resolve("card#scope((.inner))", indexFromEntries(index.entries))).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("card#scope((.inner))", createIndex(css, { parse: parsePostcss }))).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("other#scope((.other))")).toMatchObject({ status: "resolved" });
  const invalidSource = createIndex("/** @component card */ @scope (??) { .card {} }");
  expect(resolve("card#scope((.card))", invalidSource)).toMatchObject({ status: "unavailable" });
});

test("ordinary comments cannot steal a record's source scope occurrences", () => {
  const index = createIndex(`/* @component card */
@scope (.decoy) { .decoy {} }
/** @component card */
@scope (.card) { .card {} }
/* @component other */
@scope (.still-card) { .card {} }
/** @component other */
@scope (.other) { .other {} }`);
  expect(
    index.records.map((record) => record.scopeOccurrences?.map((scope) => scope.prelude)),
  ).toEqual([["(.card)", "(.still-card)"], ["(.other)"]]);
  expect(index.records[0].docCommentSpan?.start.line).toBe(3);
  expect(index.records[1].docCommentSpan?.start.line).toBe(7);
});

test("media members use owned source occurrences and parsed query identity", () => {
  const css = `/** @component card */
@media screen and (min-width: 40rem) {
  .card {}
  @media (orientation: landscape) { .card {} }
}
@media SCREEN and (min-width:40REM) { .card {} }
.card { @media (width > 30px) { color: red } }
@media (empty) { @keyframes fade { from { opacity: 0 } } }
@media (color), (hover) { .card {} }
@media (width: .50px) { .card {} }
@media (width: 9007199254740992px) { .card {} }
@media (width: 9007199254740993px) { .card {} }
/** @component other */
@media (color) { .other {} }`;
  const index = createIndex(css, { file: "cards.css" });
  const resolve = (text: string, scopeIndex = index, complete = true) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveMediaMemberReference(parsed.reference, {
      workspace: { complete, sources: [{ index: scopeIndex, sourceKey: "cards.css" }] },
    });
  };
  expect(index.records[0].mediaOccurrences?.map((item) => item.prelude)).toEqual([
    "screen and (min-width: 40rem)",
    "(orientation: landscape)",
    "SCREEN and (min-width:40REM)",
    "(width > 30px)",
    "(color), (hover)",
    "(width: .50px)",
    "(width: 9007199254740992px)",
    "(width: 9007199254740993px)",
  ]);
  expect(resolve(String.raw`card#media(scr\65 en and (min-width: 40rem))`)).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [
      { occurrence: { span: { start: { line: 2 } } }, record: { sourceKey: "cards.css" } },
      { occurrence: { span: { start: { line: 6 } } } },
    ],
  });
  expect(resolve("card#media((orientation: LANDSCAPE))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#media((width>30px))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#media((color), (hover))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#media((hover), (color))")).toEqual({ status: "missing" });
  expect(resolve("card#media((width>31px))")).toEqual({ status: "missing" });
  expect(resolve("card#media((empty))")).toEqual({ status: "missing" });
  expect(resolve("card#media((??))")).toEqual({ status: "invalid-subject" });
  expect(resolve("card#media((width > 1px) foo (height > 2px))")).toEqual({
    status: "invalid-subject",
  });
  expect(resolve("card#media((width > 1px) and)")).toEqual({ status: "invalid-subject" });
  expect(resolve("card#media(screen and (color) or (hover))")).toEqual({
    status: "invalid-subject",
  });
  expect(resolve("card#media(not ((width > 1px) and (height > 2px)))")).toEqual({
    status: "missing",
  });
  expect(resolve("card#media((width>.5px))")).toEqual({ status: "missing" });
  expect(resolve("card#media((width:5e-1px))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#media((width:9007199254740992px))")).toMatchObject({
    status: "resolved",
    candidate: { occurrence: { prelude: "(width: 9007199254740992px)" } },
  });
  expect(resolve("card#media((width:9007199254740993px))")).toMatchObject({
    status: "resolved",
    candidate: { occurrence: { prelude: "(width: 9007199254740993px)" } },
  });
  expect(resolve("card#media((width:calc(30px + 1px)))")).toMatchObject({ status: "unavailable" });
  expect(resolve("card#media((color))", index, false)).toMatchObject({ status: "unavailable" });
  expect(resolve("card#media((color))", indexFromEntries(index.entries))).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("card#media((color))", createIndex(css, { parse: parsePostcss }))).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("other#media((color))")).toMatchObject({ status: "resolved" });
  const equivalent = createIndex("/** @component card */ @media (width: 1.0px) { .card {} }");
  expect(resolve("card#media((width:1px))", equivalent)).toMatchObject({ status: "resolved" });
  const integer = createIndex("/** @component card */ @media (color: 1) { .card {} }");
  expect(resolve("card#media((color:1.0))", integer)).toMatchObject({ status: "unavailable" });
});

test("container members preserve occurrences, names, and complete lookup semantics", () => {
  const css = `/** @component card {@private} */
@container Layout (width > 30px) {
  .card {}
  @container (orientation: landscape) { .card {} }
}
@container Layout (WIDTH>30PX) { .card {} }
@container layout (width > 30px) { .card {} }
.card { @container (width: .50px) { color: red } }
@container (height > 1px) { @keyframes fade { from { opacity: 0 } } }
/** @component other */
@container (width > 10px) { .other {} }`;
  const index = createIndex(css, { file: "cards.css" });
  const resolve = (text: string, scopeIndex = index, complete = true) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveContainerMemberReference(parsed.reference, {
      workspace: { complete, sources: [{ index: scopeIndex, sourceKey: "cards.css" }] },
    });
  };
  expect(index.records[0].containerOccurrences?.map((item) => item.prelude)).toEqual([
    "Layout (width > 30px)",
    "(orientation: landscape)",
    "Layout (WIDTH>30PX)",
    "layout (width > 30px)",
    "(width: .50px)",
  ]);
  expect(resolve(String.raw`card#container(Lay\6f ut (width>30px))`)).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [
      { occurrence: { span: { start: { line: 2 } } }, record: { sourceKey: "cards.css" } },
      { occurrence: { span: { start: { line: 6 } } } },
    ],
  });
  expect(resolve("card#container(layout (width > 30px))")).toMatchObject({
    status: "resolved",
    candidate: { occurrence: { span: { start: { line: 7 } } } },
  });
  expect(resolve("card#container((orientation: LANDSCAPE))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#container((width: 5e-1px))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#container((height > 1px))")).toEqual({ status: "missing" });
  expect(resolve("card#container((??))")).toEqual({ status: "invalid-subject" });
  expect(resolve("card#container(none (width > 1px))")).toEqual({ status: "invalid-subject" });
  expect(resolve("card#container((width > 1px) and (height > 2px) or (color))")).toEqual({
    status: "invalid-subject",
  });
  expect(resolve("card#container(style(--theme: dark))")).toMatchObject({ status: "unavailable" });
  expect(resolve("card#container(not ((width > 1px) and (height > 2px)))")).toEqual({
    status: "missing",
  });
  expect(resolve("card#container((width: .5px))", index, false)).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("card#container((width: .5px))", indexFromEntries(index.entries))).toMatchObject({
    status: "unavailable",
  });
  expect(
    resolve("card#container((width: .5px))", createIndex(css, { parse: parsePostcss })),
  ).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("other#container((width > 10px))")).toMatchObject({ status: "resolved" });
  const unsupported = createIndex(
    "/** @component card */ @container scroll-state(stuck: top) { .card {} }",
  );
  expect(resolve("card#container((width > 1px))", unsupported)).toMatchObject({
    status: "unavailable",
  });
  const integer = createIndex("/** @component card */ @container (unknown: 1) { .card {} }");
  expect(resolve("card#container((unknown: 1.0))", integer)).toMatchObject({
    status: "unavailable",
  });
  const parsed = parseReference("card#container(layout (width > 30px))");
  if (!parsed.ok) throw new Error(parsed.error);
  expect(
    referenceVisibility(parsed.reference, {
      workspace: { complete: true, sources: [{ index, sourceKey: "cards.css" }] },
    }),
  ).toBe("private");
});

test("container style queries retain case-sensitive custom-property values", () => {
  const index = createIndex(`/** @component card */
@container style(--Theme: Dark) { .card {} }
@container STYLE(--Theme: Dark) { .card {} }`);
  const resolve = (text: string) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveContainerMemberReference(parsed.reference, {
      workspace: { complete: true, sources: [{ index }] },
    });
  };
  expect(resolve("card#container(style(--Theme: Dark))")).toMatchObject({
    status: "ambiguous",
    stage: "member",
  });
  expect(resolve("card#container(style(--Theme: dark))")).toMatchObject({ status: "unavailable" });
  expect(resolve("card#container(style(--theme: Dark))")).toMatchObject({ status: "unavailable" });
  expect(resolve("card#container(style(--Theme))")).toMatchObject({ status: "unavailable" });
});

test("nested query conditions resolve structurally without accepting malformed operators", () => {
  const index = createIndex(`/** @component card */
@media not ((width > 1px) and (height > 2px)) { .card {} }
@media NOT ((WIDTH>1PX) AND (HEIGHT>2PX)) { .card {} }
@media screen and ((color) or (hover)) { .card {} }
@container layout ((width > 1px) or (height > 2px)) { .card {} }
@supports not ((display: grid) and (width: 1px)) { .card {} }`);
  const lookup = { workspace: { complete: true, sources: [{ index, sourceKey: "card.css" }] } };
  const reference = (text: string) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.reference;
  };
  expect(
    resolveMediaMemberReference(
      reference("card#media(not ((width>1px) and (height>2px)))"),
      lookup,
    ),
  ).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [
      { occurrence: { span: { start: { line: 2 } } }, record: { sourceKey: "card.css" } },
      { occurrence: { span: { start: { line: 3 } } } },
    ],
  });
  expect(
    resolveMediaMemberReference(reference("card#media(screen and ((COLOR) OR (hover)))"), lookup),
  ).toMatchObject({
    status: "resolved",
    candidate: { occurrence: { span: { start: { line: 4 } } } },
  });
  expect(
    resolveContainerMemberReference(
      reference("card#container(layout ((WIDTH>1PX) OR (height>2px)))"),
      lookup,
    ),
  ).toMatchObject({ status: "resolved" });
  expect(
    resolveSupportsMemberReference(
      reference("card#supports(not ((DISPLAY:grid) AND (width:1.0PX)))"),
      lookup,
    ),
  ).toMatchObject({ status: "resolved" });
  expect(
    resolveSupportsMemberReference(
      reference("card#supports(not ((display:grid) and (width:1px) or (color:red)))"),
      lookup,
    ),
  ).toEqual({ status: "invalid-subject" });
  expect(resolveMediaMemberReference(reference("card#media(((width:1px) and))"), lookup)).toEqual({
    status: "invalid-subject",
  });
  expect(resolveContainerMemberReference(reference("card#container(((??)))"), lookup)).toEqual({
    status: "invalid-subject",
  });
  expect(
    resolveSupportsMemberReference(reference("card#supports((unknown future syntax))"), lookup),
  ).toMatchObject({ status: "unavailable" });
  const unknown = createIndex(`/** @component card */
@media (unknown future syntax) { .card {} }
@media (color) { .card {} }`);
  expect(
    resolveMediaMemberReference(reference("card#media((color))"), {
      workspace: { complete: true, sources: [{ index: unknown }] },
    }),
  ).toMatchObject({ status: "unavailable" });
});

test("supports members preserve occurrences without guessing value case sensitivity", () => {
  const css = `/** @component card {@private} */
@supports (display: grid) {
  .card {}
  @supports (width: 1.0PX) { .card {} }
}
@supports (DISPLAY:grid) { .card {} }
.card { @supports (font-family: MyFont) { color: red } }
@supports (color: red) { @keyframes fade { from { opacity: 0 } } }
/** @component other */
@supports (display: flex) { .other {} }`;
  const index = createIndex(css, { file: "cards.css" });
  const resolve = (text: string, scopeIndex = index, complete = true) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveSupportsMemberReference(parsed.reference, {
      workspace: { complete, sources: [{ index: scopeIndex, sourceKey: "cards.css" }] },
    });
  };
  expect(index.records[0].supportsOccurrences?.map((item) => item.prelude)).toEqual([
    "(display: grid)",
    "(width: 1.0PX)",
    "(DISPLAY:grid)",
    "(font-family: MyFont)",
  ]);
  expect(resolve(String.raw`card#supports((d\69 splay: grid))`)).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [
      { occurrence: { span: { start: { line: 2 } } }, record: { sourceKey: "cards.css" } },
      { occurrence: { span: { start: { line: 6 } } } },
    ],
  });
  expect(resolve("card#supports((width: 1px))")).toMatchObject({
    status: "resolved",
    candidate: { occurrence: { span: { start: { line: 4 } } } },
  });
  expect(resolve("card#supports((font-family: MyFont))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#supports((font-family: myfont))")).toMatchObject({ status: "unavailable" });
  expect(resolve("card#supports((display: GRID))")).toMatchObject({ status: "unavailable" });
  expect(resolve("card#supports((color: red))")).toEqual({ status: "missing" });
  expect(resolve("card#supports((??))")).toEqual({ status: "invalid-subject" });
  expect(resolve("card#supports((display: grid) foo (color: red))")).toEqual({
    status: "invalid-subject",
  });
  expect(resolve("card#supports(selector(:has(.card)))")).toEqual({ status: "missing" });
  expect(resolve("card#supports(font-tech(color-COLRv1))")).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("card#supports((unknown future syntax))")).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("card#supports(not ((display:grid) and (color:red)))")).toEqual({
    status: "missing",
  });
  expect(resolve("card#supports((display: grid))", index, false)).toMatchObject({
    status: "unavailable",
  });
  expect(resolve("card#supports((display: grid))", indexFromEntries(index.entries))).toMatchObject({
    status: "unavailable",
  });
  expect(
    resolve("card#supports((display: grid))", createIndex(css, { parse: parsePostcss })),
  ).toMatchObject({ status: "unavailable" });
  expect(resolve("other#supports((display: flex))")).toMatchObject({ status: "resolved" });
  const numeric = createIndex("/** @component card */ @supports (z-index: 1) { .card {} }");
  expect(resolve("card#supports((z-index: 1.0))", numeric)).toMatchObject({
    status: "unavailable",
  });
  const stringValue = createIndex(
    '/** @component card */ @supports (font-family: "MyFont") { .card {} }',
  );
  expect(resolve('card#supports((font-family: "myfont"))', stringValue)).toMatchObject({
    status: "unavailable",
  });
  const condition = createIndex(
    "/** @component card */ @supports (display:grid) and (width:1px) { .card {} }",
  );
  expect(resolve("card#supports((display:grid) AND (width:1.0PX))", condition)).toMatchObject({
    status: "resolved",
  });
  const unsupported = createIndex(
    "/** @component card */ @supports font-tech(color-COLRv1) { .card {} }",
  );
  expect(resolve("card#supports((display: grid))", unsupported)).toMatchObject({
    status: "unavailable",
  });
  const parsed = parseReference("card#supports((font-family: MyFont))");
  if (!parsed.ok) throw new Error(parsed.error);
  expect(
    referenceVisibility(parsed.reference, {
      workspace: { complete: true, sources: [{ index, sourceKey: "cards.css" }] },
    }),
  ).toBe("private");
});

test("supports selector functions use selector identity and preserve duplicates", () => {
  const index = createIndex(`/** @component card */
@supports selector(:has(.card > [data-kind=main])) { .card {} }
@supports SELECTOR(:HAS(.card>[data-kind="main"])) { .card {} }
@supports selector(.CARD) { .card {} }`);
  const resolve = (text: string) => {
    const parsed = parseReference(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return resolveSupportsMemberReference(parsed.reference, {
      workspace: { complete: true, sources: [{ index }] },
    });
  };
  expect(resolve("card#supports(selector(:has(.card > [data-kind=main])))")).toMatchObject({
    status: "ambiguous",
    stage: "member",
    candidates: [
      { occurrence: { span: { start: { line: 2 } } } },
      { occurrence: { span: { start: { line: 3 } } } },
    ],
  });
  expect(resolve("card#supports(selector(.CARD))")).toMatchObject({ status: "resolved" });
  expect(resolve("card#supports(selector(.card))")).toEqual({ status: "missing" });
  expect(resolve("card#supports(selector(:unknown(value)))")).toMatchObject({
    status: "unavailable",
  });
});

test("createIndex parses the model and resolves class lookups", () => {
  sharedIndex = createIndex(CSS, { file: "components.css", modifierConvention: "rscss" });
  expect(sharedIndex.componentForClass(".button")?.name).toBe("button");
  expect(sharedIndex.componentForClass("button")?.name).toBe("button"); // dot optional
  expect(sharedIndex.isModifier(".button", "-color-secondary")).toBe(true);
  expect(sharedIndex.isModifier(".button", "-nope")).toBe(false);
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
  const modSpan = sharedIndex
    .recordInfo("button")
    ?.memberSpans.get(memberKey("modifier", "-color-secondary"));
  expect(modSpan?.start.line).toBe(8); // the .button.-color-secondary rule

  const loc = sharedIndex.location("progress", memberKey("property", "--value"));
  expect(loc?.file).toBe("components.css");
  expect(loc?.span.start.line).toBe(13); // the @property rule
});

test("authored names are tracked for drift detection", () => {
  const info = sharedIndex.recordInfo("button")!;
  expect([...info.authoredModifiers]).toEqual(["-color-secondary"]);
  expect(info.selectorText).toContain(".button.-color-secondary");
});

test("authored modifier/part tag lines point at their own doc-comment line, not the whole block", () => {
  const info = sharedIndex.recordInfo("button")!;
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
  const all = sharedIndex.allCustomProperties();
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
