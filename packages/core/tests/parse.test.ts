import { expect, test } from "vite-plus/test";
import {
  buildCustomMediaDeclarations,
  compileCustomMediaDeclarations,
  CssDocConfiguration,
  CssDocTagDefinition,
  parseCssDocs,
  structureCustomMediaRefs,
  toMermaid,
  toMermaidVariants,
} from "../src/index.ts";
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

test("base class resolves under a masked `${p}` prefix, over a wrapper-first bare rule", () => {
  // As the projection emits it: `${p}` is masked to `aaaa`, so the name abuts the prefix with no `-`
  // (`.aaaabadge`). The base class must still be `.aaaabadge`, not the first bare rule `.aaaabadge-wrapper`.
  const src = [
    "/**",
    " * @component badge",
    " * @summary A badge.",
    " */",
    ".aaaabadge-wrapper { position: relative; }",
    ".aaaabadge { background: red; }",
  ].join("\n");
  const [badge] = parseCssDocs(src, { modifierConvention: "rscss" });
  expect(badge.className).toBe(".aaaabadge");
});

test("base class inference accepts an upper-case-led prefix / PascalCase class, not just lowercase", () => {
  // Inference used to require a lowercase-first bare class, so an upper-case namespace (`.PFX-badge`) or
  // a PascalCase class (`.Card`) was skipped and it fell back to the bare `@name` — silently producing a
  // className that no longer matched the CSS (and a wrong prefix for modifier derivation).
  const prefixed = [
    "/**",
    " * @component badge",
    " * @summary A badge.",
    " * @modifier -color-danger — Danger.",
    " */",
    ".PFX-badge { background: gray; }",
    ".PFX-badge.-color-danger { background: red; }",
  ].join("\n");
  const [badge] = parseCssDocs(prefixed, { modifierConvention: "rscss" });
  expect(badge.className).toBe(".PFX-badge");
  // The `PFX-` prefix boundary is honoured, so the chained class is still the `-color-danger` modifier.
  expect(badge.modifiers.map((m) => m.name)).toContain("-color-danger");

  // A single PascalCase class resolves to itself (previously mis-inferred to `.card`).
  const pascal = [
    "/**",
    " * @component card",
    " * @summary A card.",
    " */",
    ".Card { display: block; }",
  ].join("\n");
  const [card] = parseCssDocs(pascal);
  expect(card.className).toBe(".Card");
});

test("@selector sets className to any CSS selector and @class is an accepted alias", () => {
  const attr = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @summary A dismissible banner.",
      ' * @selector [data-slot="action"][aria-disabled="true"]',
      " */",
    ].join("\n"),
  );
  expect(attr[0].className).toBe('[data-slot="action"][aria-disabled="true"]');

  const id = parseCssDocs(
    ["/**", " * @component root", " * @summary Root.", " * @selector #app", " */"].join("\n"),
  );
  expect(id[0].className).toBe("#app");

  const host = parseCssDocs(
    ["/**", " * @component my-button", " * @summary A button.", " * @selector :host", " */"].join(
      "\n",
    ),
  );
  expect(host[0].className).toBe(":host");

  // @class is a deprecated alias for @selector — same behaviour.
  const legacy = parseCssDocs(
    ["/**", " * @component my-badge", " * @summary A badge.", " * @class .my-badge", " */"].join(
      "\n",
    ),
  );
  expect(legacy[0].className).toBe(".my-badge");
});

test("@part derives name from selector type and stores selector on the part when non-class", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @summary A dismissible banner.",
      ' * @part [data-slot="action"] — The action area.',
      " * @part #dismiss — The dismiss button.",
      " * @part :host — The shadow host.",
      " * @part .content — The message body.",
      ' * @part [data-slot="action"] cta — Aliased.',
      " */",
    ].join("\n"),
  );

  // Attribute selector: derived name is the first attribute key; selector stored on part.
  const attrPart = entry.parts.find((p) => p.name === "data-slot");
  expect(attrPart).toBeDefined();
  expect(attrPart!.selector).toBe('[data-slot="action"]');

  // ID selector: name strips #; selector stored.
  const idPart = entry.parts.find((p) => p.name === "dismiss");
  expect(idPart?.selector).toBe("#dismiss");

  // :host: name is "host"; selector stored.
  const hostPart = entry.parts.find((p) => p.name === "host");
  expect(hostPart?.selector).toBe(":host");

  // Class selector: name strips dot; no selector stored (falls back to .content).
  const classPart = entry.parts.find((p) => p.name === "content");
  expect(classPart?.selector).toBeUndefined();

  // Alias overrides derived name; selector still stored.
  const aliasPart = entry.parts.find((p) => p.name === "cta");
  expect(aliasPart?.selector).toBe('[data-slot="action"]');
  expect(aliasPart?.description).toBe("Aliased.");
});

test("@part with descendant chain: full selector stored, alias or final-compound names the part", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      ' * @part [class$="-section"] > ._inner > .label poll-label — The poll label.',
      ' * @part [class$="-section"] > ._inner — No alias; name from final compound.',
      " */",
    ].join("\n"),
  );

  // Alias form: full chain stored as selector, alias is the name.
  const aliased = entry.parts.find((p) => p.name === "poll-label");
  expect(aliased).toBeDefined();
  expect(aliased!.selector).toBe('[class$="-section"] > ._inner > .label');
  expect(aliased!.description).toBe("The poll label.");

  // No-alias form: name derived from final compound (._inner → _inner).
  const noAlias = entry.parts.find((p) => p.name === "_inner");
  expect(noAlias).toBeDefined();
  expect(noAlias!.selector).toBe('[class$="-section"] > ._inner');

  // No spurious part named "class" from the attribute key of the chain's first segment.
  expect(entry.parts.find((p) => p.name === "class")).toBeUndefined();
});

test("inScope scan only derives parts from the final compound of a descendant chain", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component menu",
      " * @summary A menu.",
      " */",
      ".menu {}",
      "@scope (.menu) {",
      "  :scope > .group > .item { padding: 0.5rem; }",
      "}",
    ].join("\n"),
  );
  // .item is the final compound — it is a part.
  expect(entry.parts.map((p) => p.name)).toContain("item");
  // .group is an intermediate scoping ancestor — it must NOT become a spurious part.
  expect(entry.parts.map((p) => p.name)).not.toContain("group");
});

test("@modifier derives key from selector: attribute stores inner content, ID/host strip prefix", () => {
  // @modifier handles the same selector forms as @part for authoring consistency. The stored key
  // matches what the AST extractor produces for each convention (inner content for attribute).
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      ' * @modifier [data-size="compact"] — Compressed layout.',
      " * @modifier #dismiss — Dismiss-button active state.",
      " * @modifier :host — Host-level modifier.",
      " * @modifier .content — A class modifier.",
      " * @modifier -without-action — Flag: no action slot.",
      " */",
    ].join("\n"),
  );

  // Attribute: key is inner content (no brackets), matching the AST convention.
  const attr = entry.modifiers.find((m) => m.name === 'data-size="compact"')!;
  expect(attr).toBeDefined();
  expect(attr.description).toBe("Compressed layout.");

  // ID: name strips #.
  const id = entry.modifiers.find((m) => m.name === "dismiss")!;
  expect(id.description).toBe("Dismiss-button active state.");

  // :host: name is "host".
  const host = entry.modifiers.find((m) => m.name === "host")!;
  expect(host.description).toBe("Host-level modifier.");

  // Class: name strips dot; no selector stored.
  const cls = entry.modifiers.find((m) => m.name === "content")!;
  expect(cls.description).toBe("A class modifier.");
  expect(cls.selector).toBeUndefined();

  // Bare name: unchanged, no selector stored.
  const bare = entry.modifiers.find((m) => m.name === "-without-action")!;
  expect(bare.description).toBe("Flag: no action slot.");
  expect(bare.selector).toBeUndefined();
});

test("@modifier with alias stores alias as key and original selector on the modifier", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      ' * @modifier [data-size="compact"] compact — Alias for the attribute modifier.',
      " */",
    ].join("\n"),
  );
  const mod = entry.modifiers.find((m) => m.name === "compact")!;
  expect(mod).toBeDefined();
  expect(mod.description).toBe("Alias for the attribute modifier.");
  expect(mod.selector).toBe('[data-size="compact"]');
});

test("@wrapper with non-class selector matches @structure node by derived name", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @wrapper #dismiss — The dismiss button wrapper.",
      " * @structure",
      " * :host {}",
      " * #dismiss:optional {}",
      " */",
      ":host {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const dismissNode = entry.structure?.find((n) => n.selector === "#dismiss");
  expect(dismissNode?.description).toBe("The dismiss button wrapper.");
});

test("@wrapper with alias matches @structure node via wrapperSelectors", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component x-banner",
      " * @wrapper #dismiss close-area — Aliased dismiss wrapper.",
      " * @structure",
      " * :host {}",
      " * #dismiss:optional {}",
      " */",
      ":host {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );
  const dismissNode = entry.structure?.find((n) => n.selector === "#dismiss");
  expect(dismissNode?.description).toBe("Aliased dismiss wrapper.");
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

test("an authored `@interaction` marker flags a JS-toggled modifier, even with no CSS rule at all", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component progress-circle\n` +
      ` * @modifier -should-animate — @interaction Toggled by JS while the ring grows.\n */\n` +
      `.progress-circle {}`,
    { modifierConvention: "rscss" },
  );
  const mod = comp.modifiers.find((m) => m.name === "-should-animate")!;
  expect(mod.interaction).toBe(true);
  expect(mod.description).toBe("Toggled by JS while the ring grows.");
});

test("an `@interaction` marker also merges onto an AST-matched modifier", () => {
  const [comp] = parseCssDocs(
    `/**\n * @component progress-circle\n` +
      ` * @modifier -should-animate — @interaction Toggled while the ring grows.\n */\n` +
      `.progress-circle {}\n.progress-circle.-should-animate {}`,
    { modifierConvention: "rscss" },
  );
  const mod = comp.modifiers.find((m) => m.name === "-should-animate")!;
  expect(mod.interaction).toBe(true);
});

test("@structure parses @scope at-rules as scope-boundary StructureNodes", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component menu",
      " * @summary A menu.",
      " * @structure",
      " * @scope (.menu) {",
      " *   :scope > .item {}",
      " * }",
      " */",
      ".menu {}",
    ].join("\n"),
    { modifierConvention: "rscss" },
  );

  expect(entry.structure).toHaveLength(1);
  const scopeNode = entry.structure![0];
  expect(scopeNode.scope).toBe("(.menu)");
  expect(scopeNode.selector).toBe("");
  expect(scopeNode.children).toHaveLength(1);
  expect(scopeNode.children[0].selector).toBe(":scope > .item");
});

test("@structure @variant blocks split into structureVariants, with structure holding the first for back-compat", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component progress",
      " * @summary An upload progress control.",
      " * @structure",
      " * @variant wrapped {",
      " *   label {",
      " *     progress {}",
      " *   }",
      " * }",
      " * @variant labelled {",
      " *   label {}",
      " *   progress {}",
      " * }",
      " */",
      ".progress {}",
    ].join("\n"),
  );

  expect(entry.structureVariants).toHaveLength(2);
  expect(entry.structureVariants![0].name).toBe("wrapped");
  expect(entry.structureVariants![0].nodes[0].selector).toBe("label");
  expect(entry.structureVariants![0].nodes[0].children[0].selector).toBe("progress");
  expect(entry.structureVariants![1].name).toBe("labelled");
  expect(entry.structureVariants![1].nodes).toHaveLength(2);

  // Back-compat: `structure` is the first variant's nodes only.
  expect(entry.structure).toBe(entry.structureVariants![0].nodes);
});

test("@structure without @variant leaves structureVariants undefined", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component tabs",
      " * @summary Tabs.",
      " * @structure",
      " * .tabs {}",
      " */",
      ".tabs {}",
    ].join("\n"),
  );

  expect(entry.structureVariants).toBeUndefined();
  expect(entry.structure).toHaveLength(1);
});

test("@structure @variant: an unlabeled @variant block is a variant with no name", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component progress",
      " * @summary An upload progress control.",
      " * @structure",
      " * @variant {",
      " *   .modern {}",
      " * }",
      " * @variant labelled {",
      " *   .legacy {}",
      " * }",
      " */",
      ".progress {}",
    ].join("\n"),
  );

  expect(entry.structureVariants).toHaveLength(2);
  expect(entry.structureVariants![0].name).toBeUndefined();
  expect(entry.structureVariants![0].nodes[0].selector).toBe(".modern");
  expect(entry.structureVariants![1].name).toBe("labelled");
});

test("toMermaidVariants renders each variant as a labelled subgraph, falling back to positional names", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component progress",
      " * @summary An upload progress control.",
      " * @structure",
      " * @variant {",
      " *   .modern {}",
      " * }",
      " * @variant labelled {",
      " *   .legacy {}",
      " * }",
      " */",
      ".progress {}",
    ].join("\n"),
  );

  const mermaid = toMermaidVariants(entry.structureVariants!);
  expect(mermaid.startsWith("flowchart TD")).toBe(true);
  expect(mermaid).toContain(`subgraph sg0 ["Variant 1"]`);
  expect(mermaid).toContain(`"labelled"]`);
  expect(mermaid).toContain(`".modern"]:::cssdoc-root`);
  expect(mermaid).toContain(`".legacy"]:::cssdoc-root`);
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

test("inlineComments: ignore still parses explicit-gated inline legends (@annotations/@rule)", () => {
  const cfg = new CssDocConfiguration();
  cfg.setInlineComments("ignore");
  const [card] = parseCssDocs(
    [
      "/**",
      " * @component card",
      " * @summary A card.",
      " * @ref 2",
      " */",
      ".card {}",
      "/* @annotations",
      "1. Reserved for future use",
      "2. Focus ring must be visible",
      "*/",
      ".card.-x {}",
      "/* @rule",
      "3. Legacy reset path",
      "@ref 3",
      "*/",
      ".card.-y {}",
      "/* Plain comment ignored for prose. */",
      ".card.-z {}",
    ].join("\n"),
    { configuration: cfg, modifierConvention: "rscss" },
  );
  expect(card.annotations).toEqual([
    { ref: 1, text: "Reserved for future use" },
    { ref: 2, text: "Focus ring must be visible" },
    { ref: 3, text: "Legacy reset path" },
  ]);
  expect(card.refs).toEqual([2, 3]);
  expect(card.modifiers.find((m) => m.name === "-z")?.description).toBeUndefined();
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

test("parseDocComment parses @annotations, @ref, and record decorators", () => {
  const doc = parseDocComment(`/**
 * @component card
 * @annotations
 * 1. Prevent shrinking
 * Continuation line.
 * 2. Full bleed artwork
 * @ref 1.
 * @ref 2
 * @readonly
 * @preventExtensions
 * @sealed
 * @frozen
 */`);
  expect([...doc.annotations]).toEqual([
    [1, "Prevent shrinking\nContinuation line."],
    [2, "Full bleed artwork"],
  ]);
  expect(doc.refs).toEqual([1, 2]);
  expect(doc.decorators).toEqual({
    isReadonly: true,
    preventExtensions: true,
    sealed: true,
    frozen: true,
  });
});

test("parseCssDocs surfaces annotations, refs, and decorators on entries", () => {
  const [entry] = parseCssDocs(`/**
 * @component card
 * @annotations
 * 1. Prevent shrinking
 * @ref 1
 * @readonly
 * @noextend
 */
.card {}`);
  expect(entry.annotations).toEqual([{ ref: 1, text: "Prevent shrinking" }]);
  expect(entry.refs).toEqual([1]);
  expect(entry.decorators).toEqual(["readonly", "preventExtensions"]);
});

test("@ref with inline prose stores the annotation without @annotations block", () => {
  const [entry] = parseCssDocs(`/**
 * @component card
 * @ref 1. Prevent shrinking when used in a flex row.
 * @ref 2. Focus ring must remain visible.
 */
.card {}`);
  expect(entry.refs).toEqual([1, 2]);
  expect(entry.annotations).toEqual([
    { ref: 1, text: "Prevent shrinking when used in a flex row." },
    { ref: 2, text: "Focus ring must remain visible." },
  ]);
});

test("@ref inline prose and @annotations block merge; block row wins on collision", () => {
  const [entry] = parseCssDocs(`/**
 * @component card
 * @annotations
 * 1. Block prose wins.
 * @ref 1. Inline prose ignored for ref 1.
 * @ref 2. Inline prose kept for ref 2.
 */
.card {}`);
  expect(entry.annotations).toEqual([
    { ref: 1, text: "Block prose wins." },
    { ref: 2, text: "Inline prose kept for ref 2." },
  ]);
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
  const [layout] = parseCssDocs(`/**\n * @layout template\n */\n.wrapper {}`);
  expect(layout.kind).toBe("layout");
});

test("@structure keeps record references authored as CSS at-rules", () => {
  const tree = parseStructure(
    ".wrapper {\n  @nav:primary {}\n  @nav (--nav) {}\n  @component top-navigation:primary {}\n  @component top-navigation (--top-nav) {}\n}",
    postcss.parse,
  );
  expect(tree).toEqual([
    {
      selector: ".wrapper",
      children: [
        { selector: "@nav:primary", children: [] },
        { selector: "@nav (--nav)", children: [] },
        { selector: "@component top-navigation:primary", children: [] },
        { selector: "@component top-navigation (--top-nav)", children: [] },
      ],
    },
  ]);
});

test("@structure record refs do not redefine the record", () => {
  const [layout] = parseCssDocs(
    [
      "/**",
      " * @layout app-shell",
      " * @summary App shell layout.",
      " * @structure",
      " * .app-shell {",
      " *   @component top-nav {}",
      " *   @component filter-chip {}",
      " * }",
      " */",
      ".app-shell {}",
    ].join("\n"),
  );

  expect(layout.name).toBe("app-shell");
  expect(layout.kind).toBe("layout");
  expect(layout.summary).toBe("App shell layout.");
  expect(layout.structure).toEqual([
    {
      selector: ".app-shell",
      children: [
        { selector: "@component top-nav", children: [] },
        { selector: "@component filter-chip", children: [] },
      ],
    },
  ]);
});

test("@element resolves implicit any, explicit any, and negation", () => {
  const [implicit] = parseCssDocs(`/**\n * @component top-navigation\n */\n.topNav {}`);
  expect(implicit.elements?.default.any).toBe(true);
  expect(implicit.elements?.default.allowed).toEqual([]);

  const [explicitAny] = parseCssDocs(
    `/**\n * @component top-navigation\n * @element any\n */\n.topNav {}`,
  );
  expect(explicitAny.elements?.default.any).toBe(true);

  const [explicitStar] = parseCssDocs(
    `/**\n * @component top-navigation\n * @element *\n */\n.topNav {}`,
  );
  expect(explicitStar.elements?.default.any).toBe(true);

  const [constrained] = parseCssDocs(
    `/**\n * @component top-navigation\n * @element <nav>, <div>, !<div>\n */\n.topNav {}`,
  );
  expect(constrained.elements?.default.any).toBe(false);
  expect(constrained.elements?.default.include).toEqual(["div", "nav"]);
  expect(constrained.elements?.default.exclude).toEqual(["div"]);
  expect(constrained.elements?.default.allowed).toEqual(["nav"]);
});

test("@element supports named profiles and MDN-style groups", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component top-navigation",
      " * @element forms, !<input>",
      " * @element nav: any, !sectioning-root, !<form>",
      " */",
      ".topNav {}",
    ].join("\n"),
  );
  expect(entry.elements?.default.groups).toEqual(["forms"]);
  expect(entry.elements?.default.allowed).toContain("button");
  expect(entry.elements?.default.allowed).not.toContain("input");
  expect(entry.elements?.profiles.nav.any).toBe(true);
  expect(entry.elements?.profiles.nav.excludedGroups).toEqual(["sectioning-root"]);
  expect(entry.elements?.profiles.nav.allowed).toContain("html");
  expect(entry.elements?.profiles.nav.allowed).not.toContain("body");
  expect(entry.elements?.profiles.nav.allowed).not.toContain("form");
});

test("layout infers structure from rules below when @structure is absent", () => {
  const [layout] = parseCssDocs(
    [
      "/**",
      " * @layout template",
      " * @summary The base template.",
      " */",
      "html {",
      "  body {",
      "    .wrapper {",
      "      @nav (--nav) {}",
      "    }",
      "  }",
      "}",
    ].join("\n"),
  );
  expect(layout.kind).toBe("layout");
  expect(layout.structure?.[0]?.selector).toBe("html");
  expect(layout.structure?.[0]?.children[0]?.selector).toBe("body");
  expect(layout.structure?.[0]?.children[0]?.children[0]?.selector).toBe(".wrapper");
  expect(layout.structure?.[0]?.children[0]?.children[0]?.children[0]?.selector).toBe(
    "@nav (--nav)",
  );
});

test("layout explicit @structure wins over implicit structure inference", () => {
  const [layout] = parseCssDocs(
    [
      "/**",
      " * @layout template",
      " * @summary The default layout.",
      " * @structure",
      " * .manual { .x {} }",
      " */",
      "html { body { .wrapper {} } }",
    ].join("\n"),
  );
  expect(layout.structure).toEqual([
    { selector: ".manual", children: [{ selector: ".x", children: [] }] },
  ]);
});

test("structureCustomMediaRefs: collects custom-media profile references", () => {
  const entries = parseCssDocs(
    [
      "/**",
      " * @layout app-shell",
      " * @structure",
      " * .app-shell {",
      " *   @nav (--nav) {}",
      " *   @component nav (--top-nav) {}",
      " * }",
      " */",
      ".app-shell {}",
      "",
      "/**",
      " * @component nav",
      " */",
      ".nav {}",
    ].join("\n"),
  );

  expect(structureCustomMediaRefs(entries)).toEqual([
    {
      sourceRecord: "app-shell",
      sourceKind: "layout",
      selector: "@nav (--nav)",
      record: "nav",
      recordKind: undefined,
      profile: "--nav",
    },
    {
      sourceRecord: "app-shell",
      sourceKind: "layout",
      selector: "@component nav (--top-nav)",
      record: "nav",
      recordKind: "component",
      profile: "--top-nav",
    },
  ]);
});

test("buildCustomMediaDeclarations: emits deduped @custom-media declarations", () => {
  const entries = parseCssDocs(
    [
      "/**",
      " * @layout app-shell",
      " * @structure",
      " * .app-shell {",
      " *   @nav (--nav) {}",
      " *   @component nav (--top-nav) {}",
      " * }",
      " */",
      ".app-shell {}",
      "",
      "/**",
      " * @component header",
      " * @structure",
      " * .header {",
      " *   @nav (--nav) {}",
      " * }",
      " */",
      ".header {}",
      "",
      "/**",
      " * @component nav",
      " */",
      ".nav {}",
    ].join("\n"),
  );

  expect(buildCustomMediaDeclarations(entries)).toBe(
    "@custom-media --nav true;\n@custom-media --top-nav true;\n",
  );
});

test("buildCustomMediaDeclarations: uses resolveValue output", () => {
  const entries = parseCssDocs(
    [
      "/**",
      " * @layout app-shell",
      " * @structure",
      " * .app-shell {",
      " *   @component nav (--top-nav) {}",
      " * }",
      " */",
      ".app-shell {}",
      "",
      "/**",
      " * @component nav",
      " */",
      ".nav {}",
    ].join("\n"),
  );

  expect(
    buildCustomMediaDeclarations(entries, {
      resolveValue: (profile) => (profile === "--top-nav" ? "(width >= 64rem)" : true),
    }),
  ).toBe("@custom-media --top-nav (width >= 64rem);\n");
});

test("compileCustomMediaDeclarations: compiles declarations directly from CSS", () => {
  const css = [
    "/**",
    " * @layout app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @nav (--nav) {}",
    " *   @component nav (--top-nav) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component nav",
    " */",
    ".nav {}",
  ].join("\n");

  expect(compileCustomMediaDeclarations(css)).toBe(
    "@custom-media --nav true;\n@custom-media --top-nav true;\n",
  );
});

test("compileCustomMediaDeclarations: passes parse and resolver options", () => {
  const css = [
    "/**",
    " * @layout app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @component nav (--top-nav) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component nav",
    " */",
    ".nav {}",
  ].join("\n");

  expect(
    compileCustomMediaDeclarations(css, {
      resolveValue: (profile) => (profile === "--top-nav" ? "(width >= 64rem)" : true),
      modifierConvention: "rscss",
    }),
  ).toBe("@custom-media --top-nav (width >= 64rem);\n");
});

test("compileCustomMediaDeclarations: absorbs inline @custom-media declarations", () => {
  const css = [
    "@custom-media --desktop-nav (width >= 64rem);",
    "@custom-media --desktop-filters (width >= 64rem);",
    "",
    "/**",
    " * @layout app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @component top-nav (--desktop-nav) {}",
    " *   @component filter-chip (--desktop-filters) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component top-nav",
    " */",
    ".top-nav {}",
    "",
    "/**",
    " * @component filter-chip",
    " */",
    ".filter-chip {}",
  ].join("\n");

  expect(compileCustomMediaDeclarations(css)).toBe(
    "@custom-media --desktop-filters (width >= 64rem);\n@custom-media --desktop-nav (width >= 64rem);\n",
  );
});

test("compileCustomMediaDeclarations: resolver overrides absorbed inline declarations", () => {
  const css = [
    "@custom-media --desktop-nav (width >= 48rem);",
    "",
    "/**",
    " * @layout app-shell",
    " * @structure",
    " * .app-shell {",
    " *   @component top-nav (--desktop-nav) {}",
    " * }",
    " */",
    ".app-shell {}",
    "",
    "/**",
    " * @component top-nav",
    " */",
    ".top-nav {}",
  ].join("\n");

  expect(
    compileCustomMediaDeclarations(css, {
      resolveValue: (profile) => (profile === "--desktop-nav" ? "(width >= 64rem)" : undefined),
    }),
  ).toBe("@custom-media --desktop-nav (width >= 64rem);\n");
});

test("layout implicit structure is discarded when multiple top-level roots are present", () => {
  const [layout] = parseCssDocs(
    ["/**", " * @layout template", " */", "html {}", "main {}"].join("\n"),
  );
  expect(layout.structure).toBeUndefined();
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

test("toMermaid renders a co-located node as a component node with a compound label", () => {
  const tree = parseStructure(".shell {\n  .tabs-list:is(.pfx-card):optional {}\n}", postcss.parse);
  const mermaid = toMermaid(tree, {
    self: "shell",
    resolveComponent: (c) =>
      c === "pfx-card" ? { name: "card", href: "/api/card.md" } : undefined,
  });
  expect(mermaid).toContain(".tabs-list + card");
  expect(mermaid).toContain("cssdoc-component");
  expect(mermaid).toMatch(/click n\d+ "\/api\/card\.md"/u);
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

test("@structure :is(.<class>) extracts a co-located component class from the selector", () => {
  const basic = parseStructure(".tabs-list:is(.pfx-card) {}", postcss.parse);
  expect(basic).toEqual([{ selector: ".tabs-list", colocated: ".pfx-card", children: [] }]);

  // Both orderings of cardinality + co-location produce the same result.
  const cardFirst = parseStructure(".tabs-list:optional:is(.pfx-card) {}", postcss.parse);
  expect(cardFirst).toEqual([
    { selector: ".tabs-list", cardinality: "optional", colocated: ".pfx-card", children: [] },
  ]);
  const colocFirst = parseStructure(".tabs-list:is(.pfx-card):optional {}", postcss.parse);
  expect(colocFirst).toEqual([
    { selector: ".tabs-list", cardinality: "optional", colocated: ".pfx-card", children: [] },
  ]);

  // Element selector.
  const elem = parseStructure("button:one-or-more:is(.pfx-button) {}", postcss.parse);
  expect(elem).toEqual([
    { selector: "button", cardinality: "one-or-more", colocated: ".pfx-button", children: [] },
  ]);

  // Bare element type in :is() (co-locating an element-typed component).
  const elemType = parseStructure(".wrapper:is(nav) {}", postcss.parse);
  expect(elemType).toEqual([{ selector: ".wrapper", colocated: "nav", children: [] }]);

  // ID selector in :is().
  const id = parseStructure(".wrapper:is(#dialog) {}", postcss.parse);
  expect(id).toEqual([{ selector: ".wrapper", colocated: "#dialog", children: [] }]);

  // Attribute selector in :is().
  const attr = parseStructure('.wrapper:is([data-role="card"]) {}', postcss.parse);
  expect(attr).toEqual([{ selector: ".wrapper", colocated: '[data-role="card"]', children: [] }]);

  // Complex compound: attribute + class + co-location + cardinality.
  const complex = parseStructure(
    'slot[name="trailing"].trailing-content:is(.pfx-card):optional {}',
    postcss.parse,
  );
  expect(complex).toEqual([
    {
      selector: 'slot[name="trailing"].trailing-content',
      cardinality: "optional",
      colocated: ".pfx-card",
      children: [],
    },
  ]);

  // Multi-selector :is() is NOT treated as co-location — stays verbatim, no colocated set.
  const multi = parseStructure(".foo:is(.a, .b) {}", postcss.parse);
  expect(multi[0].selector).toBe(".foo:is(.a, .b)");
  expect(multi[0].colocated).toBeUndefined();
});

test("layout implicit structure handles :is() co-location the same as explicit @structure", () => {
  const [layout] = parseCssDocs(
    [
      "/**",
      " * @layout shell",
      " * @summary A shell.",
      " */",
      ".shell {",
      "  .utilities:optional { button:one-or-more:is(.pfx-button) {} }",
      "}",
    ].join("\n"),
  );
  const utilNode = layout.structure?.[0]?.children[0];
  expect(utilNode?.selector).toBe(".utilities");
  expect(utilNode?.cardinality).toBe("optional");
  const btnNode = utilNode?.children[0];
  expect(btnNode?.selector).toBe("button");
  expect(btnNode?.cardinality).toBe("one-or-more");
  expect(btnNode?.colocated).toBe(".pfx-button");
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

test("multiline @remarks and @accessibility preserve newlines through the parser", () => {
  const [entry] = parseCssDocs(
    [
      "/**",
      " * @component wrapper",
      " * @remarks",
      " * ✅ Use when:",
      " * - Building a full product page",
      " * - The page uses GlobalNav",
      " * @accessibility",
      " * Guidance:",
      " * - Map the main area to a landmark",
      " * - Give the nav a label",
      " */",
      ".wrapper {}",
    ].join("\n"),
  );
  expect(entry.remarks).toBe(
    "✅ Use when:\n- Building a full product page\n- The page uses GlobalNav",
  );
  expect(entry.accessibility).toBe(
    "Guidance:\n- Map the main area to a landmark\n- Give the nav a label",
  );
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

test("attribute-reflected cssstate is derived from CSS and merges with authored prose", () => {
  const [entry] = parseCssDocs(
    `/**\n * @component col-header\n * @cssstate [aria-sort="ascending"] — Column sorted ascending.\n */\n` +
      `.col-header {}\n.col-header[aria-sort="ascending"] { color: blue; }\n` +
      `.col-header[aria-sort="descending"] { color: red; }\n` +
      `.col-header[data-testid="x"] { outline: none; }`,
  );
  const asc = entry.states.find((s) => s.name === "aria-sort=ascending");
  expect(asc?.kind).toBe("attribute");
  expect(asc?.selector).toBe('[aria-sort="ascending"]');
  expect(asc?.description).toBe("Column sorted ascending.");
  // Derived purely from CSS (no authored tag) still becomes a documented state.
  const desc = entry.states.find((s) => s.name === "aria-sort=descending");
  expect(desc?.kind).toBe("attribute");
  expect(desc?.description).toBeUndefined();
  // Not on the ARIA/data-state allow-list — not auto-derived as a state.
  expect(entry.states.some((s) => s.name.startsWith("data-testid"))).toBe(false);
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
