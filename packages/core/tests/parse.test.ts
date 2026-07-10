import { expect, test } from "vite-plus/test";
import { CssDocConfiguration, CssDocTagDefinition, parseCssDocs, toMermaid } from "../src/index.ts";
import { parseDocComment, parseStructure } from "../src/grammar.ts";

// A fixture mirroring the real generated output: authored @component doc comments delimit records; the
// modifiers / parts / tokens / deprecations are all things the parser must derive from the CSS itself.
const FIXTURE = `
/* InstUI component styles (@pantoken/components) — prefix: instui */

/**
 * @component button
 * @summary The primary action control.
 * @modifier -color-secondary — A lower-emphasis action.
 * @demo self:button
 */
.button {
  background: var(--color-background-interactive-action-primary-base);
}
.button.-color-secondary {
  background: var(--color-background-interactive-action-secondary-base);
}
.button.-size-sm { font-size: 0.75rem; }
.button.-size-small { font-size: 0.75rem; }

/**
 * @component badge
 * @summary A small count or status dot.
 */
.badge-wrapper { position: relative; }
.badge { background: var(--component-badge-color-primary); }
.badge.-color-danger { background: var(--color-background-danger); }
/* @deprecated → use .-color-danger */
.badge.-variant-error { background: var(--color-background-danger); }

/**
 * @component menu
 */
.menu { min-width: 10rem; }
@scope (.menu) {
  :scope > .item { padding: 0.5rem; }
  :scope > .separator { height: 1px; }
}

/**
 * @component progress-circle
 */
@property --value { syntax: "<number>"; inherits: true; initial-value: 0; }
.progress-circle { --value: 0; }
`;

test("splits records on @component and extracts the base class + summary + demo", () => {
  const model = parseCssDocs(FIXTURE);
  const names = model.map((e) => e.name);
  expect(names).toEqual(["button", "badge", "menu", "progress-circle"]);

  const button = model.find((e) => e.name === "button")!;
  expect(button.className).toBe(".button");
  expect(button.summary).toBe("The primary action control.");
  expect(button.demo).toBe("self:button");
});

test("modifiers are AST-extracted, prop/value split, and annotated with @modifier prose (rscss)", () => {
  const button = parseCssDocs(FIXTURE, { modifierConvention: "rscss" }).find(
    (e) => e.name === "button",
  )!;
  const secondary = button.modifiers.find((m) => m.name === "-color-secondary")!;
  expect(secondary.prop).toBe("color");
  expect(secondary.value).toBe("secondary");
  expect(secondary.description).toBe("A lower-emphasis action.");
  // Both the short and long size spellings surface (withSizeAliases twins).
  expect(button.modifiers.map((m) => m.name)).toEqual(
    expect.arrayContaining(["-color-secondary", "-size-sm", "-size-small"]),
  );
});

test("deprecated-alias comment links the alias modifier to its canonical (rscss)", () => {
  const badge = parseCssDocs(FIXTURE, { modifierConvention: "rscss" }).find(
    (e) => e.name === "badge",
  )!;
  // The base class is the one ending in the record name, not the first bare sibling (.badge-wrapper).
  expect(badge.className).toBe(".badge");
  const alias = badge.modifiers.find((m) => m.name === "-variant-error")!;
  expect(alias.deprecated?.canonical).toBe("-color-danger");
});

test("an authored `@deprecated {@link -x}` sets the modifier's canonical", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component alert\n * @modifier -variant-error — @deprecated {@link -color-danger}\n */\n` +
      `.alert.-variant-error { color: red; }`,
    { modifierConvention: "rscss" },
  );
  const alias = comp.modifiers.find((m) => m.name === "-variant-error")!;
  expect(alias.deprecated?.canonical).toBe("-color-danger");
});

const CONVENTION_FIXTURE = `
/**
 * @component card
 * @summary A surface.
 */
.card { display: block; }
.card--featured { box-shadow: 0 0 1px; }
.card.is-loading { opacity: 0.5; }
.card.featured { border: 1px solid; }
.card[data-variant="ghost"] { background: none; }
.card[data-loading] { opacity: 0.5; }
@scope (.card) {
  :scope .title { font-weight: 700; }
}
`;

test("the default convention is BEM (suffix --), and parts never overlap modifiers", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE).find((e) => e.name === "card")!;
  const featured = card.modifiers.find((m) => m.name === "card--featured")!;
  expect(featured.prop).toBe("featured");
  expect(featured.value).toBeUndefined();
  // Only the BEM modifier is extracted; the chained/attribute ones are not, under the default.
  expect(card.modifiers.map((m) => m.name)).toEqual(["card--featured"]);
  expect(card.parts.map((p) => p.name)).toEqual(["title"]);
});

test("bare/OOCSS convention: any chained class is a modifier, distinct from descendant parts", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, { modifierConvention: "bare" }).find(
    (e) => e.name === "card",
  )!;
  expect(card.modifiers.map((m) => m.name).sort()).toEqual(["featured", "is-loading"]);
  expect(card.parts.map((p) => p.name)).toEqual(["title"]);
});

test("attribute (CUBE) convention: data attributes map to prop/value; parts unaffected", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, {
    modifierConvention: { structure: "attribute", separator: "data-" },
  }).find((e) => e.name === "card")!;
  const variant = card.modifiers.find((m) => m.name === 'data-variant="ghost"')!;
  expect(variant.prop).toBe("variant");
  expect(variant.value).toBe("ghost");
  const loading = card.modifiers.find((m) => m.name === "data-loading")!;
  expect(loading.prop).toBe("loading");
  expect(loading.value).toBeUndefined();
  expect(card.parts.map((p) => p.name)).toEqual(["title"]);
});

test("a separator array matches several chained prefixes (is-/has-)", () => {
  const css =
    `/**\n * @component card\n */\n.card {}\n` +
    `.card.is-open {}\n.card.has-icon {}\n.card.featured {}`;
  const [card] = parseCssDocs(css, {
    modifierConvention: { structure: "chained", separator: ["is-", "has-"] },
  });
  // Only the is-/has- prefixed classes are modifiers; `.featured` is neither.
  expect(card.modifiers.map((m) => m.name).sort()).toEqual(["has-icon", "is-open"]);
  expect(card.modifiers.find((m) => m.name === "is-open")?.prop).toBe("open");
});

test("a custom is- convention picks up state classes", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, {
    modifierConvention: { structure: "chained", separator: "is-" },
  }).find((e) => e.name === "card")!;
  expect(card.modifiers.map((m) => m.name)).toEqual(["is-loading"]);
  expect(card.modifiers[0].prop).toBe("loading");
});

test("BEM elements (.block__element) are recorded as parts, distinct from modifiers", () => {
  const [tabs] = parseCssDocs(
    `/**\n * @component tabs\n */\n` +
      `.tabs {}\n.tabs__list {}\n.tabs__tab {}\n.tabs--vertical {}`,
  );
  expect(tabs.modifiers.map((m) => m.name)).toEqual(["tabs--vertical"]);
  expect(tabs.parts.map((p) => p.name).sort()).toEqual(["tabs__list", "tabs__tab"]);
});

test("statePrefixes route chained classes to states, excluding them from modifiers", () => {
  const card = parseCssDocs(CONVENTION_FIXTURE, {
    modifierConvention: { structure: "chained", separator: "", statePrefixes: ["is-"] },
  }).find((e) => e.name === "card")!;
  expect(card.states.map((s) => s.name)).toContain("is-loading");
  expect(card.modifiers.map((m) => m.name)).not.toContain("is-loading");
  // A non-state chained class is still a modifier.
  expect(card.modifiers.map((m) => m.name)).toContain("featured");
});

test("BEM: authored @modifier merges, and {@link} canonical needs no dash", () => {
  const [card] = parseCssDocs(
    `/**\n * @component card\n * @modifier card--featured — A promoted card.\n` +
      ` * @modifier card--old — @deprecated {@link card--featured}\n */\n` +
      `.card { color: red; }\n.card--featured { color: blue; }\n.card--old { color: green; }`,
  );
  const featured = card.modifiers.find((m) => m.name === "card--featured")!;
  expect(featured.description).toBe("A promoted card.");
  const old = card.modifiers.find((m) => m.name === "card--old")!;
  expect(old.deprecated?.canonical).toBe("card--featured");
});

test("parts come from scoped child selectors; consumed + declared custom properties are captured", () => {
  const model = parseCssDocs(FIXTURE);
  const menu = model.find((e) => e.name === "menu")!;
  expect(menu.parts.map((p) => p.name)).toEqual(["item", "separator"]);

  const button = model.find((e) => e.name === "button")!;
  expect(button.cssPropertiesConsumed).toContain(
    "--color-background-interactive-action-secondary-base",
  );

  const circle = model.find((e) => e.name === "progress-circle")!;
  // Declared custom properties now carry the full @property registration (syntax, inherits, default).
  expect(circle.cssPropertiesDeclared).toEqual([
    { name: "--value", syntax: "<number>", inherits: true, defaultValue: "0" },
  ]);
});

test("parseDocComment reads the grammar, ignoring unknown tags and comment framing", () => {
  const doc = parseDocComment(`/**
 * @component alert
 * @summary An inline message.
 * @modifier -color-info — Informational.
 * @modifier -render-icon — @deprecated Use the \`-icon-<name>\` glyph form.
 * @cssproperty --pantoken-alert-icon-bg <color> — The glyph fill.
 * @bogus this tag is ignored
 */`);
  expect(doc.component).toBe("alert");
  expect(doc.summary).toBe("An inline message.");
  expect(doc.modifiers.get("-color-info")).toEqual({ description: "Informational." });
  expect(doc.modifiers.get("-render-icon")).toEqual({
    deprecated: "Use the `-icon-<name>` glyph form.",
  });
  expect(doc.cssProperties[0]).toEqual({
    name: "--pantoken-alert-icon-bg",
    syntax: "<color>",
    description: "The glyph fill.",
  });
});

test("record-opening tags set the kind; @component defaults to component", () => {
  const [comp] = parseCssDocs(`/**\n * @component button\n */\n.button { color: red; }`);
  expect(comp.kind).toBe("component");
  const [util] = parseCssDocs(`/**\n * @utility spacing\n */\n.m-sm { margin: 0.5rem; }`);
  expect(util.kind).toBe("utility");
  const [rule] = parseCssDocs(`/**\n * @rule base\n */\nbody { margin: 0; }`);
  expect(rule.kind).toBe("rule");
  const [decl] = parseCssDocs(`/**\n * @declaration tokens\n */\n:root { --x: 1; }`);
  expect(decl.kind).toBe("declaration");
});

test("@structure parses an indented tree, and toMermaid renders it", () => {
  const tree = parseStructure(".tabs\n  .list\n    .tab\n  .panel");
  expect(tree).toEqual([
    {
      selector: ".tabs",
      children: [
        { selector: ".list", children: [{ selector: ".tab", children: [] }] },
        { selector: ".panel", children: [] },
      ],
    },
  ]);
  const mermaid = toMermaid(tree);
  expect(mermaid.startsWith("flowchart TD")).toBe(true);
  expect(mermaid).toContain(`n0[".tabs"]`);
  expect(mermaid).toContain("n0 --> n1"); // tabs → list
});

test("expansive prose tags surface on the entry (remarks, since, group, a11y, release stage)", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component switch\n * @remarks A longer explanation.\n * @since 2.1.0\n` +
      ` * @group Forms\n * @a11y Announce state changes with aria-checked.\n * @beta\n */\n` +
      `.switch { display: inline-flex; }`,
  );
  expect(entry.remarks).toBe("A longer explanation.");
  expect(entry.since).toBe("2.1.0");
  expect(entry.group).toBe("Forms");
  expect(entry.accessibility).toBe("Announce state changes with aria-checked.");
  expect(entry.releaseStage).toBe("beta");
});

test("CSSOM at-rule surfaces are AST-derived (function, keyframes, layer, media, state)", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component spinner\n * @function --spin — Rotation helper.\n */\n` +
      `@layer components;\n` +
      `@function --spin(--turns <number>) returns <angle> { result: calc(var(--turns) * 360deg); }\n` +
      `@keyframes spin { from { rotate: 0deg; } to { rotate: 360deg; } }\n` +
      `@media (prefers-reduced-motion: reduce) {\n  .spinner { animation: none; }\n}\n` +
      `.spinner:state(paused) { animation-play-state: paused; }`,
  );
  const fn = entry.functions.find((f) => f.name === "--spin")!;
  expect(fn.parameters).toEqual(["--turns"]);
  expect(fn.result).toBe("<angle>");
  expect(fn.description).toBe("Rotation helper.");
  expect(entry.animations.map((a) => a.name)).toContain("spin");
  expect(entry.layers.map((l) => l.name)).toContain("components");
  expect(entry.conditions).toContainEqual({
    type: "media",
    query: "(prefers-reduced-motion: reduce)",
    description: undefined,
  });
  expect(entry.states.map((s) => s.name)).toContain("paused");
});

test("a custom tag is captured only when registered in the configuration", () => {
  const configuration = new CssDocConfiguration();
  const token = new CssDocTagDefinition({ tagName: "@token", syntaxKind: "block" });
  configuration.addTagDefinition(token);
  const css = `/**\n * @component chip\n * @token --chip-bg\n */\n.chip { color: red; }`;

  // Unregistered: the tag is ignored (graceful degradation).
  expect(parseCssDocs(css)[0].customBlocks).toBeUndefined();
  // Registered: captured under customBlocks, keyed by tag name.
  expect(parseCssDocs(css, { configuration })[0].customBlocks).toEqual({
    token: ["--chip-bg"],
  });
});

test("setSupportForTag(false) disables a standard tag", () => {
  const configuration = new CssDocConfiguration();
  const summary = configuration.tryGetTagDefinition("summary")!;
  configuration.setSupportForTag(summary, false);
  const [entry] = parseCssDocs(
    `/**\n * @component note\n * @summary Ignored now.\n */\n.note { color: red; }`,
    { configuration },
  );
  expect(entry.summary).toBeUndefined();
});

test("a record tag added via configuration opens a record", () => {
  const configuration = new CssDocConfiguration();
  configuration.addTagDefinition(
    new CssDocTagDefinition({ tagName: "@pattern", syntaxKind: "record", recordKind: "component" }),
  );
  const [entry] = parseCssDocs(`/**\n * @pattern card\n */\n.card { display: block; }`, {
    configuration,
  });
  expect(entry?.name).toBe("card");
  expect(entry?.kind).toBe("component");
});
