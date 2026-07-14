import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import {
  checkClassUsage,
  completeClasses,
  completeCustomProperties,
  definitionForClass,
  hoverForClass,
  hoverForCustomProperty,
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

test("structure-unknown-selector flags a @structure class that isn't a documented member", () => {
  // `.bogus` chained on `.list` is neither the class nor a part; the whole compound is validated.
  const css = `/**
 * @component tabs
 * @summary Tabs.
 * @part .list — The row.
 * @structure
 * .tabs {
 *   .list.bogus {}
 * }
 */
.tabs {}
@scope (.tabs) { :scope .list {} }`;
  expect(lintModel(createIndex(css)).map((d) => d.rule)).toContain("structure-unknown-selector");
  // The intact tree (every class is the component or a documented part) does not flag it.
  const clean = `/**
 * @component tabs
 * @summary Tabs.
 * @part .list — The row.
 * @structure
 * .tabs {
 *   .list {}
 * }
 */
.tabs {}
@scope (.tabs) { :scope .list {} }`;
  expect(lintModel(createIndex(clean)).map((d) => d.rule)).not.toContain(
    "structure-unknown-selector",
  );
});

test("structure-unknown-selector accepts a sibling component as a child, still flags unknowns", () => {
  const css = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @slot — The message.",
    " * @structure",
    " * .alert {",
    " *   slot {}",
    " *   .close-button {}",
    " *   .bogus {}",
    " * }",
    " */",
    ".alert {}",
    "/**",
    " * @component close-button",
    " * @summary A dismiss control.",
    " */",
    ".close-button {}",
  ].join("\n");
  const structureWarnings = lintModel(createIndex(css)).filter(
    (d) => d.rule === "structure-unknown-selector",
  );
  // `.close-button` is a documented sibling component → not flagged; `slot` is ignored; `.bogus` flags.
  expect(structureWarnings).toHaveLength(1);
  expect(structureWarnings[0].message).toContain(".bogus");
});

test("the hover Structure block carries @wrapper prose as a trailing comment", () => {
  const idx = createIndex(
    [
      "/**",
      " * @component badge",
      " * @summary A badge.",
      " * @slot — target",
      " * @wrapper .badge-wrapper — Optional; anchors the badge over a target.",
      " * @structure",
      " * .badge-wrapper:opt { slot {} .badge {} }",
      " */",
      ".badge {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const card = hoverForClass("badge", "badge", idx, "full")?.contents ?? "";
  expect(card).toContain(".badge-wrapper { /* Optional; anchors the badge over a target. */");
});

test("structure-unknown-selector accepts an optional-ancestor wrapper root (self below it), else flags", () => {
  const rule = (css: string) =>
    lintModel(createIndex(css, { modifierConvention: "rscss" }))
      .filter((d) => d.rule === "structure-unknown-selector")
      .map((d) => d.message);
  // Rooted at an ancestor wrapper with the component's own class beneath it → the wrapper is valid.
  const ok = [
    "/**",
    " * @component badge",
    " * @summary A badge.",
    " * @slot — target",
    " * @structure",
    " * .badge-wrapper:opt { slot {} .badge {} }",
    " */",
    ".badge {}",
  ].join("\n");
  expect(rule(ok)).toEqual([]);
  // A non-self root with no self beneath it is still an unknown selector.
  const bad = [
    "/**",
    " * @component badge",
    " * @summary A badge.",
    " * @structure",
    " * .mystery-wrapper { .thing {} }",
    " */",
    ".badge {}",
  ].join("\n");
  expect(rule(bad).join(" ")).toContain(".mystery-wrapper");
});

test("hover shows a To do section (@todo) and an inline-comment modifier description", () => {
  const idx = createIndex(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @todo drop the legacy fallback",
      " */",
      ".alert {}",
      "/* Removes the elevation shadow. */",
      ".alert.-without-shadow {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const card = hoverForClass("alert", "alert", idx, "full")?.contents ?? "";
  expect(card).toContain("To do");
  expect(card).toContain("drop the legacy fallback");
  // The inline `/* … */` comment reaches the modifier's own hover.
  const mod = hoverForClass("alert", "-without-shadow", idx)?.contents ?? "";
  expect(mod).toContain("Removes the elevation shadow.");
});

test("hoverForCustomProperty resolves the var() chain and shows the terminal value", () => {
  const idx = createIndex(
    [
      "/**",
      " * @component c",
      " * @summary s",
      " */",
      ".c { color: var(--info-border); }",
      ":root { --info-border: var(--stroke-info); --stroke-info: #0770a3; }",
    ].join("\n"),
  );
  const h = hoverForCustomProperty("--info-border", idx)?.contents ?? "";
  expect(h).toContain("`var(--stroke-info)`"); // the declared value
  expect(h).toContain("Resolves to: `#0770a3`"); // followed through to a literal
});

test("hoverForClass: a fenced @example renders as Markdown verbatim (prose + code)", () => {
  const idx = createIndex(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @example",
      " * Prose before.",
      " * ```html",
      ' * <div class="alert"></div>',
      " * ```",
      " */",
      ".alert {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const h = hoverForClass("alert", "alert", idx, "full")?.contents ?? "";
  expect(h).toContain("Prose before.");
  expect(h).toContain("```html");
  expect(h).not.toContain("```html\nProse before."); // prose isn't swallowed into a code fence
});

test("hoverForClass: an empty sectionOrder falls back to the default order (not a blank card)", () => {
  // The `cssdoc.hover.sectionOrder` setting defaults to `[]`; empty must mean "default order", not
  // "drop every section" (which collapsed the card to just its header line).
  const full = hoverForClass("button", "button", index, "full", {}, undefined)?.contents ?? "";
  const empty = hoverForClass("button", "button", index, "full", {}, [])?.contents ?? "";
  expect(empty).toBe(full);
  expect(empty).toContain("Modifiers"); // sections render, not just `.button · component`
});

test("structure-unknown-selector resolves a cross-file sibling via siblingIndex, across prefixes", () => {
  // The linted file only knows `alert` (masked prefix `aaaa`, as an embedded `${p}` projects). The
  // sibling `close-button` lives in another file and carries a *different* prefix (`instui-`).
  const alert = createIndex(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @structure",
      " * .aaaaalert {",
      " *   .aaaaclose-button {}",
      " *   .aaaabogus {}",
      " * }",
      " */",
      ".aaaaalert {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const project = createIndex(
    "/**\n * @component close-button\n * @summary A dismiss control.\n */\n.instui-close-button {}",
    { modifierConvention: "rscss" },
  );

  // Without the project index, the per-file lint can't see the sibling → both classes flag.
  const alone = lintModel(alert)
    .filter((d) => d.rule === "structure-unknown-selector")
    .map((d) => d.data?.maskedName);
  expect(alone).toEqual(["aaaaclose-button", "aaaabogus"]);

  // With it, `.aaaaclose-button` resolves (prefix `aaaa` stripped → `close-button`, a known component
  // name); `.aaaabogus` still flags and carries the masked class for the editor to restore.
  const withProject = lintModel(alert, undefined, undefined, undefined, project).filter(
    (d) => d.rule === "structure-unknown-selector",
  );
  expect(withProject).toHaveLength(1);
  expect(withProject[0].data?.maskedName).toBe("aaaabogus");
});

test("structure-unknown-selector is order-independent, checks inner :has() targets, and honors structureIgnore", () => {
  const doc = (nodeSelector: string) => `/**
 * @component tabs
 * @summary Tabs.
 * @part .list — The row.
 * @part .tab — A tab.
 * @structure
 * .tabs {
 *   ${nodeSelector} {}
 * }
 */
.tabs {}
@scope (.tabs) { :scope .list, :scope .tab {} }`;
  const flags = (nodeSelector: string, structureIgnore?: string[]) =>
    lintModel(createIndex(doc(nodeSelector)), undefined, undefined, structureIgnore)
      .map((d) => d.rule)
      .filter((r) => r === "structure-unknown-selector");

  // A documented compound is clean regardless of class order (a sorter may reorder them).
  expect(flags(".list.tab")).toEqual([]);
  expect(flags(".tab.list")).toEqual([]);
  // An inner :has() target is validated too.
  expect(flags(".list:has(.bogus)")).toEqual(["structure-unknown-selector"]);
  // structureIgnore exempts an external class (literal or glob).
  expect(flags(".list.util-grid")).toEqual(["structure-unknown-selector"]);
  expect(flags(".list.util-grid", ["util-*"])).toEqual([]);
});

test("undocumented-css-part flags a @csspart without a description", () => {
  const css = `/**
 * @component switch
 * @summary A toggle.
 * @csspart thumb
 */
.switch {}
.switch::part(thumb) {}`;
  const rules = lintModel(createIndex(css)).map((d) => d.rule);
  expect(rules).toContain("undocumented-css-part");
  // A described shadow part does not flag.
  const ok = `/**
 * @component switch
 * @summary A toggle.
 * @csspart thumb — The knob.
 */
.switch {}
.switch::part(thumb) {}`;
  expect(lintModel(createIndex(ok)).map((d) => d.rule)).not.toContain("undocumented-css-part");
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

test("a concrete usage resolves to a `*` family modifier (AST-derived from a [class*] selector)", () => {
  const css = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @modifier -legacy-icon-* — @deprecated {@link -icon-*}",
    " */",
    ".alert {}",
    '.alert[class*="-icon-"] { background: var(--g); }',
    '.alert[class*="-legacy-icon-"] {}',
  ].join("\n");
  const idx = createIndex(css, { modifierConvention: "rscss" });
  // A concrete instance of the AST-derived `-icon-*` family is known → no unknown-modifier.
  expect(
    checkClassUsage(
      [{ base: "alert", tokens: ["alert", "-icon-arrow"], token: "-icon-arrow" }],
      idx,
    ).map((d) => d.rule),
  ).toEqual([]);
  // A concrete instance of a deprecated family is flagged deprecated.
  expect(
    checkClassUsage(
      [{ base: "alert", tokens: ["alert", "-legacy-icon-star"], token: "-legacy-icon-star" }],
      idx,
    ).map((d) => d.rule),
  ).toContain("deprecated-modifier");
});

test("checkClassUsage flags unknown element and state classes, not documented ones", () => {
  const css = `/**
 * @component card
 * @summary A surface.
 */
.card {}
.card__title {}
.card__title--active {}
.card.is-open {}`;
  const conv = {
    structure: "suffix" as const,
    separator: "--",
    elementSeparator: "__",
    statePrefixes: ["is-"],
  };
  const idx = createIndex(css, { modifierConvention: conv });
  const rules = (token: string) =>
    checkClassUsage([{ base: "card", tokens: ["card", token], token }], idx).map((d) => d.rule);
  expect(rules("card__title")).toEqual([]); // documented element part
  expect(rules("card__title--active")).toEqual([]); // documented element modifier
  expect(rules("card__bogus")).toEqual(["unknown-part"]);
  expect(rules("is-open")).toEqual([]); // documented state
  expect(rules("is-frobbed")).toEqual(["unknown-state"]);
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

test("component hover card: full renders every present facet, compact shows counts", () => {
  const css = [
    "/**",
    " * @component button",
    " * @summary The primary action control.",
    " * @a11y Give icon-only buttons an aria-label.",
    " * @modifier button--secondary — A lower-emphasis action.",
    " * @modifier button--ghost — @deprecated {@link button--secondary}",
    " * @part .button__icon — A leading glyph.",
    " * @cssproperty --button-radius — The corner radius.",
    " * @defaultValue 4px",
    " * @example",
    ' * <button class="button">Save</button>',
    " */",
    ".button {}",
    ".button--secondary {}",
    ".button--ghost {}",
    ".button__icon {}",
    '@property --button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }',
  ].join("\n");
  const idx = createIndex(css); // BEM default
  const full = hoverForClass("button", "button", idx, "full")?.contents ?? "";
  // Markdown structure with codicons; names get symbol-category colour spans, descriptions stay prose.
  expect(full).toContain(
    '$(symbol-class) <code style="color:var(--vscode-symbolIcon-classForeground);">.button</code>',
  );
  expect(full).toContain("**$(symbol-property) Modifiers**");
  expect(full).toContain(
    '- <code style="color:var(--vscode-symbolIcon-fieldForeground);">.button--secondary</code> — A lower-emphasis action.',
  );
  expect(full).toContain("**$(symbol-field) Parts**");
  // The `<length>` syntax links out to its MDN reference page.
  expect(full).toContain(
    '- <code style="color:var(--vscode-symbolIcon-variableForeground);">--button-radius</code>: [`<length>`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length) (default `4px`) — The corner radius.',
  );
  // Accessibility renders; a deprecated modifier gets the themed HTML accent.
  expect(full).toContain("$(accessibility) Give icon-only buttons an aria-label.");
  expect(full).toContain(
    '<span style="color:var(--vscode-editorWarning-foreground);">deprecated</span>',
  );
  // Only genuine code is fenced — the @example, language-sniffed to html.
  expect(full).toContain("**$(book) Example**");
  expect(full).toContain('```html\n<button class="button">Save</button>\n```');

  const compact = hoverForClass("button", "button", idx, "compact")?.contents ?? "";
  expect(compact).not.toContain("Modifiers**");
  expect(compact).toContain("2 modifiers");
});

test("hover custom detail: per-section on/off/auto", () => {
  const css = [
    "/**",
    " * @component button",
    " * @summary The primary action control.",
    " * @modifier button--secondary — A lower-emphasis action.",
    " * @part .button__icon — A leading glyph.",
    " */",
    ".button {}",
    ".button--secondary {}",
    ".button__icon {}",
  ].join("\n");
  const idx = createIndex(css);
  const custom =
    hoverForClass("button", "button", idx, "custom", {
      modifiers: "off", // hidden even though it has content
      see: "on", // forced on even though it's empty → placeholder
    })?.contents ?? "";
  expect(custom).not.toContain("Modifiers**"); // off
  expect(custom).toContain("**$(symbol-field) Parts**"); // auto (default) + has content
  expect(custom).toContain("**$(references) See also**\n_—_"); // on + empty → placeholder
});

test("hover sectionOrder: reorders sections and drops unlisted ones", () => {
  const css = [
    "/**",
    " * @component button",
    " * @summary The primary action control.",
    " * @a11y Give icon-only buttons an aria-label.",
    " * @modifier button--secondary — A lower-emphasis action.",
    " * @part .button__icon — A leading glyph.",
    " */",
    ".button {}",
    ".button--secondary {}",
    ".button__icon {}",
  ].join("\n");
  const idx = createIndex(css);
  const contents =
    hoverForClass("button", "button", idx, "full", undefined, ["parts", "modifiers"])?.contents ??
    "";
  // Parts renders before Modifiers (reversed from the default), and unlisted sections are dropped.
  expect(contents.indexOf("**$(symbol-field) Parts**")).toBeLessThan(
    contents.indexOf("**$(symbol-property) Modifiers**"),
  );
  expect(contents).not.toContain("$(accessibility)"); // accessibility not in the order → dropped
  // The fixed header still leads.
  expect(contents.startsWith("$(symbol-class)")).toBe(true);
});
