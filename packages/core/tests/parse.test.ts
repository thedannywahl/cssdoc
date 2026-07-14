import { expect, test } from "vite-plus/test";
import { CssDocConfiguration, CssDocTagDefinition, parseCssDocs, toMermaid } from "../src/index.ts";
import postcss from "postcss";
import { parseDocComment, parseStructure } from "../src/grammar.ts";

// A fixture mirroring the real generated output: authored @component doc comments delimit records; the
// modifiers / parts / tokens / deprecations are all things the parser must derive from the CSS itself.
const FIXTURE = `
/* Component styles */

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

test("@example unescapes `\\`` so a fence authored inside a css template becomes a real fence", () => {
  // As it reaches the parser from a projected `css` template: the fence backticks are escaped.
  const src = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @example",
    " * Prose before.",
    " * \\`\\`\\`html",
    ' * <div class="alert"></div>',
    " * \\`\\`\\`",
    " */",
    ".alert {}",
  ].join("\n");
  const [alert] = parseCssDocs(src, { modifierConvention: "rscss" });
  expect(alert.examples[0]).toContain("```html");
  expect(alert.examples[0]).not.toContain("\\`"); // the escape is gone; the fence is real
  expect(alert.examples[0].startsWith("Prose before.")).toBe(true);
});

test("native pseudo-elements derive from selectors (allow-list), @pseudo adds prose, ::part stays a shadow part", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @pseudo ::before — The status bar.",
      " */",
      ".alert {}",
      ".alert::before {}",
      ".alert::after {}",
      ".alert::-webkit-scrollbar {}", // vendor: not in the allow-list → ignored
      ".alert::part(thumb) {}", // a shadow part, not a native pseudo-element
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  expect(alert.pseudoElements.map((p) => p.name)).toEqual(["after", "before"]); // sorted; vendor excluded
  expect(alert.pseudoElements.find((p) => p.name === "before")?.description).toBe(
    "The status bar.",
  );
  expect(alert.shadowParts.map((p) => p.name)).toEqual(["thumb"]); // ::part() is still a shadow part
});

test("an inline /* */ comment above a rule becomes the modifier's description (default append)", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " */",
      ".alert {}",
      "/* Opt out of the default elevation. */",
      ".alert.-without-shadow {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  expect(alert.modifiers.find((m) => m.name === "-without-shadow")?.description).toBe(
    "Opt out of the default elevation.",
  );
});

test("inlineComments mode controls how an inline comment combines with @modifier prose", () => {
  const css = [
    "/**",
    " * @component alert",
    " * @summary An alert.",
    " * @modifier -x — Tag prose.",
    " */",
    ".alert {}",
    "/* Inline note. */",
    ".alert.-x {}",
  ].join("\n");
  const desc = (mode: "append" | "prepend" | "replace" | "ignore") => {
    const cfg = new CssDocConfiguration();
    cfg.setModifierConvention("rscss");
    cfg.setInlineComments(mode);
    return parseCssDocs(css, { configuration: cfg })[0]!.modifiers.find((m) => m.name === "-x")
      ?.description;
  };
  expect(desc("append")).toBe("Tag prose.\n\nInline note.");
  expect(desc("prepend")).toBe("Inline note.\n\nTag prose.");
  expect(desc("replace")).toBe("Inline note.");
  expect(desc("ignore")).toBe("Tag prose.");
});

test("@todo (block tag + inline comment) collects record to-dos, distinct from descriptions", () => {
  const [alert] = parseCssDocs(
    [
      "/**",
      " * @component alert",
      " * @summary An alert.",
      " * @todo migrate to logical properties",
      " */",
      "/* Describes nothing — the base rule defines no member. */",
      ".alert {}",
      "/* @todo make -x responsive */",
      ".alert.-x {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  expect(alert.todos).toEqual(["migrate to logical properties", "make -x responsive"]);
  // A `@todo` comment is a note, not the member's description; the base-rule comment attaches to nothing.
  expect(alert.modifiers.find((m) => m.name === "-x")?.description).toBeUndefined();
});

test("@structure optional-ancestor wrapper: root cardinality + @wrapper prose, in the model and mermaid", () => {
  const [badge] = parseCssDocs(
    [
      "/**",
      " * @component badge",
      " * @summary A small status dot.",
      " * @slot — The target being badged.",
      " * @wrapper .badge-wrapper — Optional; anchors the badge over a target.",
      " * @structure",
      " * .badge-wrapper:opt {",
      " *   slot {}",
      " *   .badge {}",
      " * }",
      " */",
      ".badge {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const [root] = badge!.structure!;
  expect(root.selector).toBe(".badge-wrapper");
  expect(root.cardinality).toBe("optional");
  expect(root.description).toBe("Optional; anchors the badge over a target."); // @wrapper prose
  // Mermaid: a root has no incoming edge, so its cardinality rides the label, and the @wrapper prose
  // trails it (matching the text tree).
  expect(toMermaid(badge!.structure!, { self: "badge" })).toContain(
    ".badge-wrapper (0..1) — Optional; anchors the badge over a target.",
  );
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

test("a class attribute selector on the base derives a `*` family modifier (rscss)", () => {
  const [alert] = parseCssDocs(
    `/**\n * @component alert\n */\n.alert {}\n.alert[class*="-icon-"] { background: var(--g); }`,
    { modifierConvention: "rscss" },
  );
  const icon = alert.modifiers.find((m) => m.name === "-icon-*")!;
  expect(icon).toMatchObject({ name: "-icon-*", prop: "icon", pattern: true });
});

test("an authored @modifier merges with the AST-derived family (one entry, with prose)", () => {
  const [alert] = parseCssDocs(
    `/**\n * @component alert\n * @modifier -icon-* — Swap the glyph.\n */\n` +
      `.alert {}\n.alert[class*="-icon-"] {}`,
    { modifierConvention: "rscss" },
  );
  const families = alert.modifiers.filter((m) => m.name === "-icon-*");
  expect(families).toHaveLength(1);
  expect(families[0]).toMatchObject({ pattern: true, description: "Swap the glyph." });
});

test("attribute-family derivation respects the operator and ignores non-modifier values", () => {
  const fam = (rule: string) =>
    parseCssDocs(`/**\n * @component c\n */\n.c {}\n${rule}`, {
      modifierConvention: "rscss",
    })[0].modifiers.map((m) => m.name);
  expect(fam('.c[class$="-icon"] {}')).toEqual(["*-icon"]); // ends-with → suffix family
  expect(fam('.c[class~="-icon-x"] {}')).toEqual(["-icon-x"]); // exact word → concrete
  expect(fam('.c[class^="-icon-"] {}')).toEqual([]); // ^= anchors to the base class → not a modifier
  expect(fam('.c[class*="grid"] {}')).toEqual([]); // value isn't a chained modifier (no `-` prefix)
  expect(fam('.c[class*="-"] {}')).toEqual([]); // no literal core beyond the separator
});

test("a BEM element's own modifier (.block__element--mod) nests on the part", () => {
  const [tabs] = parseCssDocs(
    `/**\n * @component tabs\n */\n.tabs {}\n.tabs__tab {}\n.tabs__tab--active { font-weight: 700; }`,
  );
  const tab = tabs.parts.find((p) => p.name === "tabs__tab")!;
  expect(tab.modifiers?.map((m) => ({ name: m.name, prop: m.prop }))).toEqual([
    { name: "tabs__tab--active", prop: "active" },
  ]);
  // The element name is not polluted by the modifier tail.
  expect(tabs.parts.map((p) => p.name)).not.toContain("tabs__tab--active");
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
  expect(button.cssPropertiesConsumed.map((t) => t.name)).toContain(
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
 * @cssproperty --alert-icon-bg <color> — The glyph fill.
 * @bogus this tag is ignored
 */`);
  expect(doc.component).toBe("alert");
  expect(doc.summary).toBe("An inline message.");
  expect(doc.modifiers.get("-color-info")).toEqual({ description: "Informational." });
  expect(doc.modifiers.get("-render-icon")).toEqual({
    deprecated: "Use the `-icon-<name>` glyph form.",
  });
  expect(doc.cssProperties[0]).toEqual({
    name: "--alert-icon-bg",
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

test("@structure parses nested CSS into a tree, and toMermaid renders it", () => {
  const tree = parseStructure(
    ".tabs {\n  .list {\n    .tab {}\n  }\n  .panel {}\n}",
    postcss.parse,
  );
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
  expect(mermaid).toContain(`n0[".tabs"]:::cssdoc-root`); // root → rectangle
  expect(mermaid).toContain(`n1(".list"):::cssdoc-part`); // part → rounded
  expect(mermaid).toContain("n0 --> n1"); // tabs → list (required)
  expect(mermaid).toContain("classDef cssdoc-root");
});

test("toMermaid shapes/classes each node by kind, with cardinality on the edge", () => {
  const tree = parseStructure(
    '.alert {\n  slot {}\n  slot[name="icon"] {}\n  .body {}\n  .tag:many {}\n  .item:more {}\n  .close-button:optional {}\n}',
    postcss.parse,
  );
  // A `resolveComponent` marks `.close-button` as a sibling component (linked); `.body`/`.tag` are parts.
  const mermaid = toMermaid(tree, {
    self: "alert",
    resolveComponent: (c) =>
      c === "close-button" ? { name: "close-button", href: "/api/css/close-button.md" } : undefined,
  });
  // Slots → parallelogram, ‹content› / ‹content: name›.
  expect(mermaid).toContain(`[/"‹content›"/]:::cssdoc-slot`);
  expect(mermaid).toContain(`[/"‹content: icon›"/]:::cssdoc-slot`);
  // Sibling component → stadium, labelled by component name, with a click link.
  expect(mermaid).toContain(`(["close-button"]):::cssdoc-component`);
  expect(mermaid).toMatch(/click n\d+ "\/api\/css\/close-button\.md"/u);
  // Plain part → rounded.
  expect(mermaid).toContain(`(".body"):::cssdoc-part`);
  // Cardinality rides the edge: many `0..n`, one-or-more `1..n`, optional dashed `0..1`.
  expect(mermaid).toMatch(/n0 -->\|0\.\.n\| n\d+/u); // .tag:many
  expect(mermaid).toMatch(/n0 -->\|1\.\.n\| n\d+/u); // .item:more
  expect(mermaid).toMatch(/n0 -\.->\|0\.\.1\| n\d+/u); // .close-button:optional
});

test("@structure cardinality pseudos (full + `:opt`/`:more` shorthands) parse and strip", () => {
  const tree = parseStructure(
    ".alert {\n  slot {}\n  .close-button:optional {}\n  .icon:opt {}\n  .item:one-or-more {}\n  .tag:more {}\n  .badge:many {}\n  .body {}\n}",
    postcss.parse,
  );
  const [alert] = tree;
  const card = Object.fromEntries(alert.children.map((c) => [c.selector, c.cardinality]));
  expect(card).toEqual({
    slot: undefined, // no marker → required (present when used)
    ".close-button": "optional",
    ".icon": "optional", // `:opt` shorthand
    ".item": "one-or-more",
    ".tag": "one-or-more", // `:more` shorthand
    ".badge": "many",
    ".body": undefined,
  });
});

test("@structure captures an optional leading description without disturbing the tree", () => {
  const [withDesc] = parseCssDocs(
    `/**\n * @component tabs\n * @summary Tabs.\n` +
      ` * @structure How the parts nest.\n * .tabs {\n *   .panel {}\n * }\n */\n.tabs {}`,
  );
  expect(withDesc.structureDescription).toBe("How the parts nest.");
  expect(withDesc.structure).toEqual([
    { selector: ".tabs", children: [{ selector: ".panel", children: [] }] },
  ]);
  // A body that opens with a selector has no description.
  const [noDesc] = parseCssDocs(
    `/**\n * @component tabs\n * @summary Tabs.\n * @structure\n * .tabs {\n *   .panel {}\n * }\n */\n.tabs {}`,
  );
  expect(noDesc.structureDescription).toBeUndefined();
  expect(noDesc.structure).toHaveLength(1);
});

test("@structure keeps compound selectors verbatim and never throws on a malformed body", () => {
  // A compound node — `:has()`/`:is()`/`:not()` express relationships between parts.
  const compound = parseStructure(".tabs {\n  .list:has(.tab) {}\n}", postcss.parse);
  expect(compound).toEqual([
    {
      selector: ".tabs",
      children: [{ selector: ".list:has(.tab)", children: [] }],
    },
  ]);
  // A malformed (unclosed) body parses to an empty tree rather than throwing.
  expect(parseStructure(".tabs {\n  .list {", postcss.parse)).toEqual([]);
  // With no parser injected, the tree is empty (the grammar module carries no CSS-parser dependency).
  expect(parseStructure(".tabs {\n  .panel {}\n}")).toEqual([]);
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

test("shadow parts and pseudo-class states are captured distinctly from class parts and :state()", () => {
  const [sw] = parseCssDocs(
    `/**\n * @component switch\n * @part .track — The rail.\n * @csspart thumb — The knob.\n */\n` +
      `.switch {}\n@scope (.switch) { :scope .track {} }\n` +
      `.switch::part(thumb) {}\n.switch:disabled {}\n.switch:state(on) {}`,
  );
  // Class-based `@part` → parts; shadow `@csspart` / `::part()` → shadowParts (no longer aliased).
  expect(sw.parts.map((p) => p.name)).toEqual(["track"]);
  expect(sw.shadowParts.map((p) => p.name)).toEqual(["thumb"]);
  expect(sw.shadowParts[0].description).toBe("The knob.");
  // `:disabled` is a pseudo-class state; `:state(on)` is a custom state.
  expect(sw.states.find((s) => s.name === "disabled")?.kind).toBe("pseudo-class");
  expect(sw.states.find((s) => s.name === "on")?.kind).toBe("custom");
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

test("only /** doc comments open records — a plain comment mentioning @component is ignored", () => {
  const css = [
    "/* TODO: revisit the @component button spacing */",
    "/**",
    " * @component button",
    " * @summary The primary action control.",
    " */",
    ".button { color: red; }",
    "/* banner: @component ghost must NOT become a record */",
    ".button--secondary { color: blue; }",
  ].join("\n");
  const entries = parseCssDocs(css);
  expect(entries.map((e) => e.name)).toEqual(["button"]);
  // The button record still owns its modifier, even though a plain comment sits between the rules.
  expect(entries[0]?.modifiers.map((m) => m.name)).toContain("button--secondary");
});

test("@tokens annotates an AST-discovered token and unions a token not found via var()", () => {
  const css = [
    "/**",
    " * @component card",
    " * @tokens --color-bg — The surface background.",
    " * @tokens --color-fg-indirect — Set on the element by script.",
    " */",
    ".card { background: var(--color-bg); color: var(--color-fg); }",
  ].join("\n");
  const [card] = parseCssDocs(css);
  const consumed = card!.cssPropertiesConsumed;
  const byName = new Map(consumed.map((t) => [t.name, t.description]));
  // AST-discovered var() tokens are present; the authored one carries its description.
  expect(byName.get("--color-bg")).toBe("The surface background.");
  // A var() token with no @tokens prose is present without a description.
  expect(byName.has("--color-fg")).toBe(true);
  expect(byName.get("--color-fg")).toBeUndefined();
  // A @tokens-declared token never seen in var() is unioned in.
  expect(byName.get("--color-fg-indirect")).toBe("Set on the element by script.");
});

test("@usage, @compat, and @related populate their fields", () => {
  const css = [
    "/**",
    " * @component card",
    " * @usage Include the sheet, then apply the class.",
    " * @compat Uses @scope.",
    " * @compat Anchor positioning enhanced.",
    " * @related button — The action inside a card.",
    " * @related dialog",
    " */",
    ".card { color: red; }",
  ].join("\n");
  const [card] = parseCssDocs(css);
  expect(card!.usage).toBe("Include the sheet, then apply the class.");
  expect(card!.compat).toEqual(["Uses @scope.", "Anchor positioning enhanced."]);
  expect(card!.related).toEqual([
    { name: "button", description: "The action inside a card." },
    { name: "dialog", description: undefined },
  ]);
});

test("entry.source records line/column, and file when fileName is supplied", () => {
  const css = ["", "/**", " * @component card", " */", ".card { color: red; }"].join("\n");
  const [withFile] = parseCssDocs(css, { fileName: "cards.css" });
  expect(withFile!.source).toEqual({ file: "cards.css", line: 2, column: 1 });

  const [withoutFile] = parseCssDocs(css);
  expect(withoutFile!.source?.file).toBeUndefined();
  expect(withoutFile!.source?.line).toBe(2);
});
