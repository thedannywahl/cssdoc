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
.instui-button {
  background: var(--instui-color-background-interactive-action-primary-base);
}
.instui-button.-color-secondary {
  background: var(--instui-color-background-interactive-action-secondary-base);
}
.instui-button.-size-sm { font-size: 0.75rem; }
.instui-button.-size-small { font-size: 0.75rem; }

/**
 * @component badge
 * @summary A small count or status dot.
 */
.instui-badge-wrapper { position: relative; }
.instui-badge { background: var(--instui-component-badge-color-primary); }
.instui-badge.-color-danger { background: var(--instui-color-background-danger); }
/* @deprecated → use .-color-danger */
.instui-badge.-variant-error { background: var(--instui-color-background-danger); }

/**
 * @component menu
 */
.instui-menu { min-width: 10rem; }
@scope (.instui-menu) {
  :scope > .item { padding: 0.5rem; }
  :scope > .separator { height: 1px; }
}

/**
 * @component progress-circle
 */
@property --value { syntax: "<number>"; inherits: true; initial-value: 0; }
.instui-progress-circle { --value: 0; }
`;

test("splits records on @component and extracts the base class + summary + demo", () => {
  const model = parseCssDocs(FIXTURE);
  const names = model.map((e) => e.name);
  expect(names).toEqual(["button", "badge", "menu", "progress-circle"]);

  const button = model.find((e) => e.name === "button")!;
  expect(button.className).toBe(".instui-button");
  expect(button.summary).toBe("The primary action control.");
  expect(button.demo).toBe("self:button");
});

test("modifiers are AST-extracted, prop/value split, and annotated with @modifier prose", () => {
  const button = parseCssDocs(FIXTURE).find((e) => e.name === "button")!;
  const secondary = button.modifiers.find((m) => m.name === "-color-secondary")!;
  expect(secondary.prop).toBe("color");
  expect(secondary.value).toBe("secondary");
  expect(secondary.description).toBe("A lower-emphasis action.");
  // Both the short and long size spellings surface (withSizeAliases twins).
  expect(button.modifiers.map((m) => m.name)).toEqual(
    expect.arrayContaining(["-color-secondary", "-size-sm", "-size-small"]),
  );
});

test("deprecated-alias comment links the alias modifier to its canonical", () => {
  const badge = parseCssDocs(FIXTURE).find((e) => e.name === "badge")!;
  // The base class is the one ending in the record name, not the first bare sibling (.instui-badge-wrapper).
  expect(badge.className).toBe(".instui-badge");
  const alias = badge.modifiers.find((m) => m.name === "-variant-error")!;
  expect(alias.deprecated?.canonical).toBe("-color-danger");
});

test("an authored `@deprecated {@link -x}` sets the modifier's canonical", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component alert\n * @modifier -variant-error — @deprecated {@link -color-danger}\n */\n` +
      `.instui-alert.-variant-error { color: red; }`,
  );
  const alias = comp.modifiers.find((m) => m.name === "-variant-error")!;
  expect(alias.deprecated?.canonical).toBe("-color-danger");
});

test("parts come from scoped child selectors; consumed + declared custom properties are captured", () => {
  const model = parseCssDocs(FIXTURE);
  const menu = model.find((e) => e.name === "menu")!;
  expect(menu.parts.map((p) => p.name)).toEqual(["item", "separator"]);

  const button = model.find((e) => e.name === "button")!;
  expect(button.cssPropertiesConsumed).toContain(
    "--instui-color-background-interactive-action-secondary-base",
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
  const [comp] = parseCssDocs(`/**\n * @component button\n */\n.instui-button { color: red; }`);
  expect(comp.kind).toBe("component");
  const [util] = parseCssDocs(`/**\n * @utility spacing\n */\n.instui-m-sm { margin: 0.5rem; }`);
  expect(util.kind).toBe("utility");
  const [rule] = parseCssDocs(`/**\n * @rule base\n */\nbody { margin: 0; }`);
  expect(rule.kind).toBe("rule");
  const [decl] = parseCssDocs(`/**\n * @declaration tokens\n */\n:root { --x: 1; }`);
  expect(decl.kind).toBe("declaration");
});

test("@structure parses an indented tree, and toMermaid renders it", () => {
  const tree = parseStructure(".instui-tabs\n  .list\n    .tab\n  .panel");
  expect(tree).toEqual([
    {
      selector: ".instui-tabs",
      children: [
        { selector: ".list", children: [{ selector: ".tab", children: [] }] },
        { selector: ".panel", children: [] },
      ],
    },
  ]);
  const mermaid = toMermaid(tree);
  expect(mermaid.startsWith("flowchart TD")).toBe(true);
  expect(mermaid).toContain(`n0[".instui-tabs"]`);
  expect(mermaid).toContain("n0 --> n1"); // tabs → list
});

test("expansive prose tags surface on the entry (remarks, since, group, a11y, release stage)", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component switch\n * @remarks A longer explanation.\n * @since 2.1.0\n` +
      ` * @group Forms\n * @a11y Announce state changes with aria-checked.\n * @beta\n */\n` +
      `.instui-switch { display: inline-flex; }`,
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
      `@keyframes instui-spin { from { rotate: 0deg; } to { rotate: 360deg; } }\n` +
      `@media (prefers-reduced-motion: reduce) {\n  .instui-spinner { animation: none; }\n}\n` +
      `.instui-spinner:state(paused) { animation-play-state: paused; }`,
  );
  const fn = entry.functions.find((f) => f.name === "--spin")!;
  expect(fn.parameters).toEqual(["--turns"]);
  expect(fn.result).toBe("<angle>");
  expect(fn.description).toBe("Rotation helper.");
  expect(entry.animations.map((a) => a.name)).toContain("instui-spin");
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
  const css = `/**\n * @component chip\n * @token --instui-chip-bg\n */\n.instui-chip { color: red; }`;

  // Unregistered: the tag is ignored (graceful degradation).
  expect(parseCssDocs(css)[0].customBlocks).toBeUndefined();
  // Registered: captured under customBlocks, keyed by tag name.
  expect(parseCssDocs(css, { configuration })[0].customBlocks).toEqual({
    token: ["--instui-chip-bg"],
  });
});

test("setSupportForTag(false) disables a standard tag", () => {
  const configuration = new CssDocConfiguration();
  const summary = configuration.tryGetTagDefinition("summary")!;
  configuration.setSupportForTag(summary, false);
  const [entry] = parseCssDocs(
    `/**\n * @component note\n * @summary Ignored now.\n */\n.instui-note { color: red; }`,
    { configuration },
  );
  expect(entry.summary).toBeUndefined();
});

test("a record tag added via configuration opens a record", () => {
  const configuration = new CssDocConfiguration();
  configuration.addTagDefinition(
    new CssDocTagDefinition({ tagName: "@pattern", syntaxKind: "record", recordKind: "component" }),
  );
  const [entry] = parseCssDocs(`/**\n * @pattern card\n */\n.instui-card { display: block; }`, {
    configuration,
  });
  expect(entry?.name).toBe("card");
  expect(entry?.kind).toBe("component");
});
