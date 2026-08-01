/**
 * The CSS doc-comment grammar — an expansive, TSDoc-shaped tag vocabulary parsed out of `/** … *\/`
 * block comments. The tags describe a CSS surface (a component's base class, modifiers, parts, custom
 * properties, functions, animations, layers, conditions, states, slots) and adopt the Custom Elements
 * Manifest names (`@cssproperty`, `@csspart`, `@cssstate`) where they exist, so the vocabulary is
 * standards-aligned.
 *
 * The grammar is specified formally in `@cssdoc/spec`'s `grammar/CssDoc.grammarkdown` (RFC-style,
 * modeling TSDoc's `DeclarationReference.grammarkdown`); the functions here are hand-written to conform
 * to those productions, and a test in `@cssdoc/spec` keeps the spec valid. Which tags are active — and which
 * custom tags to capture — is governed by a {@link CssDocConfiguration}.
 *
 * Notable tags:
 * - `@selector` — explicitly declares the component's base CSS selector when it isn't a plain class
 *   (attribute, ID, compound, `:host`). `@class` is its deprecated alias.
 * - `@part` — accepts class, attribute, ID, and `:host`/`:host-context()` selectors, with an optional
 *   alias between the selector and the ` — ` description separator.
 * - `@modifier` — accepts the same selector forms as `@part`; the stored key matches the AST-extracted
 *   modifier name (attribute inner content for attribute selectors), with an optional alias.
 * - `@wrapper` — accepts the same selector forms as `@part`; the stored key is derived the same way
 *   and matched against `@structure` nodes by {@link deriveSelectorName}.
 * - `@structure` — CSS at-rules (`@scope`, `@media`, etc.) inside the body are never treated as new
 *   tag openers; they're accumulated as CSS content.
 *
 * A block looks like:
 * ```css
 * /**
 *  * @component x-banner
 *  * @summary A dismissible announcement banner.
 *  * @selector :host
 *  * @modifier [data-size="compact"] — Compressed layout.
 *  * @part [data-slot="action"] cta — Optional call-to-action area.
 *  * @part #dismiss — The dismiss button.
 *  * @cssproperty --banner-bg <color> — Background colour.
 *  *\/
 * ```
 *
 * @module
 */
import type { ChildNode } from "postcss";
import { CssDocConfiguration } from "./configuration.ts";
import type {
  CssParse,
  CssRecordKind,
  CssRelated,
  CssReleaseStage,
  StructureNode,
} from "./model.ts";

/**
 * The record-opening tags and the {@link CssRecordKind} each selects, as the default boundary map.
 * A doc comment carrying one of these opens a new record; `@name` is an alias for `@component`. A
 * {@link CssDocConfiguration} may add more record tags.
 */
export const RECORD_TAGS: Record<string, CssRecordKind> = {
  component: "component",
  name: "component",
  utility: "utility",
  rule: "rule",
  declaration: "declaration",
};

/** A custom property documented by a `@cssproperty` tag. */
export interface DocCssProperty {
  name: string;
  syntax?: string;
  defaultValue?: string;
  description?: string;
}

/** The prose a `@modifier` tag contributes: a description and/or an inline deprecation replacement note. */
export interface DocModifier {
  description?: string;
  /** Set when the modifier carries a bare `@deprecated` (no note and no canonical link). */
  deprecatedFlag?: boolean;
  /** Free-text replacement guidance from an inline `deprecated` tag on the modifier line. */
  deprecated?: string;
  /**
   * The canonical modifier this one deprecates, from a `{@link -canonical}` in the deprecation note
   * (e.g. `@deprecated {@link -color-danger}`). Stored without its leading dot, matching the AST-derived
   * `deprecated.canonical`, so an authored alias and a generated one resolve to the same reference.
   */
  deprecatedCanonical?: string;
}

/** An authored conditional-support tag (`@container`/`@supports`/`@media`/`@responsive`). */
export interface DocCondition {
  type: "container" | "supports" | "media";
  query: string;
  description?: string;
}

/** The structured content extracted from one doc-comment block. */
export interface ParsedDoc {
  /** `@component`/`@utility`/`@rule`/`@declaration`/`@name` — the record name. Marks a record boundary. */
  component?: string;
  /** The record kind chosen by the opening tag (`component` unless `@utility`/`@rule`/`@declaration`). */
  kind?: CssRecordKind;
  /** `@selector` / `@class` — an explicit base CSS selector (any valid simple selector; otherwise inferred from the CSS). */
  className?: string;
  /** `@summary` — one-line intro. */
  summary?: string;
  /** `@remarks` — extended prose. */
  remarks?: string;
  /** `@privateRemarks` — internal-only prose. */
  privateRemarks?: string;
  /** `@since` — version introduced. */
  since?: string;
  /** `@group`/`@category` — a documentation group. */
  group?: string;
  /** `@a11y`/`@accessibility` — accessibility guidance. */
  accessibility?: string;
  /** The release stage from a modifier flag tag (`@alpha`/`@beta`/…). */
  releaseStage?: CssReleaseStage;
  /** `@modifier` prose, keyed by the derived modifier name (e.g. `-color-secondary`, `data-variant="ghost"`). */
  modifiers: Map<string, DocModifier>;
  /**
   * The original CSS selector for each `@modifier`, keyed by the derived name.
   * Set only for non-class modifiers (attribute, ID, `:host`). Class modifiers omit the entry.
   */
  modifierSelectors: Map<string, string>;
  /** `@part` descriptions, keyed by the derived part name (e.g. `item`, `data-layout`). */
  parts: Map<string, string>;
  /**
   * The original CSS selector for each `@part`, keyed by the derived name.
   * Set only for non-class parts (attribute, ID, `:host`). Class parts omit the entry;
   * callers reconstruct the selector as `.${name}` when absent.
   */
  partSelectors: Map<string, string>;
  /** `@tokens` descriptions, keyed by custom-property name (e.g. `--color-primary`). */
  tokens: Map<string, string>;
  /** `@csspart` descriptions (shadow-DOM `::part()`), keyed by the bare part name (e.g. `header`). */
  cssParts: Map<string, string>;
  /** `@pseudo` descriptions (native pseudo-elements), keyed by the bare name (e.g. `before`). */
  pseudoElements: Map<string, string>;
  /** `@wrapper` descriptions, keyed by the derived selector name (e.g. `badge-wrapper`, `data-slot`). */
  wrappers: Map<string, string>;
  /**
   * The original CSS selector for each `@wrapper`, keyed by the derived name.
   * Set only for non-class wrappers (attribute, ID, `:host`). Class wrappers omit the entry.
   */
  wrapperSelectors: Map<string, string>;
  /** `@todo` notes (internal development notes). */
  todos: string[];
  /** `@cssproperty` declarations. */
  cssProperties: DocCssProperty[];
  /** `@cssstate` descriptions, keyed by state name. */
  cssStates: Map<string, string>;
  /** `@slot` descriptions, keyed by slot name (empty string for the default slot). */
  slots: Map<string, string>;
  /** `@function` descriptions, keyed by function name (e.g. `--negate`). */
  functions: Map<string, string>;
  /** `@keyframes`/`@animation` descriptions, keyed by animation name. */
  animations: Map<string, string>;
  /** `@layer` descriptions, keyed by layer name. */
  layers: Map<string, string>;
  /** `@container`/`@supports`/`@media`/`@responsive` authored conditions. */
  conditions: DocCondition[];
  /** `@example` blocks. */
  examples: string[];
  /** `@structure` — the nested-CSS body, parsed into a selector tree by {@link parseStructure}. */
  structure?: StructureNode[];
  /** An optional prose description leading the `@structure` body. */
  structureDescription?: string;
  /** The `<replacement>` argument from a `@deprecated` tag. */
  deprecated?: string;
  /** `@demo <spec>`. */
  demo?: string;
  /** `@see <ref>` entries. */
  see: string[];
  /** `@usage` prose — how to include the stylesheet / use the component. */
  usage?: string;
  /** `@compat` browser-support / feature-compatibility notes. */
  compat: string[];
  /** `@related` component cross-references. */
  related: CssRelated[];
  /** Content of registered custom (block) tags, keyed by tag name without its `@`. */
  customBlocks: Map<string, string[]>;
}

/**
 * Derive a short human-readable name from any CSS simple selector — the key used to store and look up
 * `@part`, `@wrapper`, and similar tags keyed by element identity rather than full modifier expression.
 */
export function deriveSelectorName(sel: string): string {
  if (sel.startsWith(".")) return sel.slice(1);
  if (sel.startsWith("#")) return sel.slice(1);
  if (sel.startsWith(":host")) return "host";
  const attrKey = sel.match(/^\[([^=\s~^$*|[\]]+)/u)?.[1];
  if (attrKey) return attrKey;
  return sel.replace(/^\W+/u, "") || sel;
}

/**
 * Derive the modifier key from a CSS selector token — the form that matches AST-extracted modifier names.
 * Class and bare names strip the leading dot; attribute selectors strip outer brackets (inner content
 * is the convention-normalized form); IDs and `:host` strip their prefix.
 */
function deriveModifierKey(sel: string): string {
  if (sel.startsWith(".")) return sel.slice(1);
  if (sel.startsWith("#")) return sel.slice(1);
  if (sel.startsWith(":host")) return "host";
  if (sel.startsWith("[") && sel.endsWith("]")) return sel.slice(1, -1);
  return sel;
}

/** Split a tag's argument into `head` (a selector/name/token) and `description` on ` — ` or ` - `. */
function splitDesc(rest: string): { head: string; description?: string } {
  const m = rest.match(/^(\S+)\s+(?:—|-{1,2})\s+(.*)$/u);
  if (m) return { head: m[1], description: m[2].trim() };
  return { head: rest.trim() || rest };
}

/** Split any argument into `query` (everything before the first ` — `/` - `) and `description`. */
function splitQuery(rest: string): { query: string; description?: string } {
  const m = rest.match(/^([\s\S]*?)\s+(?:—|-{1,2})\s+([\s\S]*)$/u);
  if (m) return { query: m[1].trim(), description: m[2].trim() };
  return { query: rest.trim() };
}

/** Strip the comment framing (`/**`, `*\/`, and leading ` * `) from a raw block-comment body. */
export function stripCommentFraming(raw: string): string {
  return raw
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n")
    .trim();
}

/** Parse the inner body of a `@modifier` line's argument into a {@link DocModifier}. */
function parseModifierBody(description: string | undefined): DocModifier {
  // A description beginning `@deprecated …` marks the modifier deprecated. A `{@link -canonical}` in the
  // remainder names the modifier to use instead; any other text is the free-text note.
  const dep = description?.match(/^@deprecated\b\s*([\s\S]*)$/u);
  if (dep) {
    const rawNote = dep[1].trim();
    // A `{@link …}` canonical may be any modifier member: a class (`.card--danger`, `.-color-danger`,
    // `card--danger`) or an attribute selector (`[data-variant="ok"]`) — convention-agnostic here.
    const link = rawNote.match(/\{@link\s+(\.?[\w-]+|\[[^\]]*\])\s*\}/u);
    const canonical = link?.[1].replace(/^\./u, "").replace(/^\[/u, "").replace(/\]$/u, "");
    const note = rawNote.replace(/\{@link\s+[^}]*\}/u, "").trim();
    if (!note && !link) return { deprecatedFlag: true };
    return { deprecated: note || undefined, deprecatedCanonical: canonical };
  }
  return { description: description ?? "" };
}

/**
 * Parse a doc-comment's INNER text (already stripped of `/* *\/` framing, or a raw block — both are
 * handled) into a {@link ParsedDoc}. The `configuration` decides which tags are active and which custom
 * tags to capture; unknown or unsupported tags are ignored, so the grammar degrades gracefully.
 *
 * @param raw - The comment text (with or without `/** … *\/` framing).
 * @param configuration - The active tag configuration (defaults to the full standard vocabulary).
 * @returns The structured tags.
 */
export function parseDocComment(
  raw: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
  parse?: CssParse,
): ParsedDoc {
  // Works on either a raw `/** … *\/` block or PostCSS's already-unframed `Comment.text` (which keeps
  // the inner `*` line prefixes) — stripCommentFraming no-ops the frame removal when it's absent.
  const body = stripCommentFraming(raw);
  const doc: ParsedDoc = {
    modifiers: new Map(),
    modifierSelectors: new Map(),
    parts: new Map(),
    partSelectors: new Map(),
    tokens: new Map(),
    cssParts: new Map(),
    pseudoElements: new Map(),
    wrappers: new Map(),
    wrapperSelectors: new Map(),
    todos: [],
    cssProperties: [],
    cssStates: new Map(),
    slots: new Map(),
    functions: new Map(),
    animations: new Map(),
    layers: new Map(),
    conditions: [],
    examples: [],
    see: [],
    compat: [],
    related: [],
    customBlocks: new Map(),
  };

  // Group lines into tag blocks (the TagList / BlockTag productions): a line starting with `@tag` opens
  // a block that continues until the next `@tag`. CSS at-rules (e.g. @scope, @media) inside a
  // @structure block are NOT treated as new tag openers — they're part of the CSS content.
  const blocks: string[] = [];
  let inStructureBlock = false;
  for (const line of body.split("\n")) {
    const tagMatch = line.match(/^\s*@([a-zA-Z][\w-]*)/u);
    if (tagMatch) {
      const isKnownTag = configuration.tryGetTagDefinition(tagMatch[1]) !== undefined;
      if (isKnownTag) {
        blocks.push(line.trim());
        inStructureBlock = tagMatch[1] === "structure";
      } else if (inStructureBlock) {
        // CSS at-rule inside @structure body — keep it in the structure block.
        if (blocks.length) blocks[blocks.length - 1] += `\n${line}`;
      } else {
        // Unknown tag outside @structure — own block so the existing skip logic handles it.
        blocks.push(line.trim());
      }
    } else if (blocks.length) {
      blocks[blocks.length - 1] += `\n${line}`;
    }
  }

  for (const block of blocks) {
    const m = block.match(/^@([a-zA-Z][\w-]*)\s*([\s\S]*)$/u);
    if (!m) continue;
    const tagName = m[1];
    const rest = m[2].trim();
    const definition = configuration.tryGetTagDefinition(tagName);
    if (!definition || !configuration.isTagSupported(definition)) continue;

    if (definition.syntaxKind === "record") {
      doc.component = rest.split(/\s/u)[0];
      doc.kind = definition.recordKind;
      continue;
    }
    if (definition.syntaxKind === "modifier") {
      doc.releaseStage = definition.canonicalName as CssReleaseStage;
      continue;
    }
    if (definition.syntaxKind === "inline") continue; // inline tags live inside descriptions

    applyBlockTag(doc, definition.canonicalName, definition.tagNameWithoutAt, rest, parse);
  }
  return doc;
}

/** Apply one supported block tag (resolved to its canonical name) to the accumulating {@link ParsedDoc}. */
function applyBlockTag(
  doc: ParsedDoc,
  canonical: string,
  tagName: string,
  rest: string,
  parse?: CssParse,
): void {
  switch (canonical) {
    case "selector":
      // Match a full selector token: consecutive bracket groups, :host(-context(…)), or a plain \S+ token.
      doc.className = rest.match(/^((?:\[(?:[^\]"']|"[^"]*"|'[^']*')*\]|[^\s[]+)+)/u)?.[1] ?? "";
      break;
    case "summary":
      doc.summary = rest.replace(/\s+/gu, " ").trim();
      break;
    case "remarks":
      doc.remarks = rest.trim();
      break;
    case "privateRemarks":
      doc.privateRemarks = rest.trim();
      break;
    case "todo": {
      const todo = rest.trim();
      if (todo) doc.todos.push(todo);
      break;
    }
    case "since":
      doc.since = rest.trim();
      break;
    case "group":
      doc.group = rest.trim();
      break;
    case "a11y":
      doc.accessibility = rest.trim();
      break;
    case "structure": {
      const { description, css } = splitStructureBody(rest);
      doc.structure = parseStructure(css, parse);
      if (description) doc.structureDescription = description;
      break;
    }
    case "modifier": {
      const { name: mName, selector: mSel, description: mDesc } = splitModifierArg(rest);
      doc.modifiers.set(mName, parseModifierBody(mDesc));
      // Store only when the selector is a genuine CSS token (not a bare modifier name) and non-trivially different from `.${name}`.
      if (mSel !== `.${mName}` && /^[.#[:/]/u.test(mSel)) doc.modifierSelectors.set(mName, mSel);
      break;
    }
    case "part": {
      const { name: pName, selector: pSel, description: pDesc } = splitPartArg(rest);
      doc.parts.set(pName, pDesc ?? "");
      if (pSel !== `.${pName}`) doc.partSelectors.set(pName, pSel);
      break;
    }
    case "tokens": {
      // `--name — description`; the token set is derived from the CSS, this annotates (or adds) one.
      const { head, description } = splitDesc(rest);
      doc.tokens.set(head, description ?? "");
      break;
    }
    case "csspart": {
      // A shadow-DOM `::part()` name — a bare identifier (tolerate a stray leading dot).
      const { head, description } = splitDesc(rest);
      doc.cssParts.set(head.replace(/^\./u, ""), description ?? "");
      break;
    }
    case "pseudo": {
      // A native pseudo-element, named as `::before` or `before` (tolerate the leading `::`).
      const { head, description } = splitDesc(rest);
      doc.pseudoElements.set(head.replace(/^::/u, ""), description ?? "");
      break;
    }
    case "wrapper": {
      const { name: wName, selector: wSel, description: wDesc } = splitPartArg(rest);
      doc.wrappers.set(wName, wDesc ?? "");
      if (wSel !== `.${wName}`) doc.wrapperSelectors.set(wName, wSel);
      break;
    }
    case "cssproperty": {
      // `--name [<syntax>] — description`
      const propMatch = rest.match(/^(--[\w-]+)\s*(<[^>]+>)?\s*(?:(?:—|-{1,2})\s*(.*))?$/u);
      if (propMatch) {
        doc.cssProperties.push({
          name: propMatch[1],
          syntax: propMatch[2],
          description: propMatch[3]?.trim() || undefined,
        });
      }
      break;
    }
    case "defaultValue": {
      // Attaches to the most recent @cssproperty in the same comment.
      const last = doc.cssProperties.at(-1);
      if (last) last.defaultValue = rest.trim();
      break;
    }
    case "cssstate": {
      const { head, description } = splitDesc(rest);
      doc.cssStates.set(head, description ?? "");
      break;
    }
    case "slot": {
      const { head, description } = splitDesc(rest);
      doc.slots.set(head.replace(/^\./u, ""), description ?? "");
      break;
    }
    case "function": {
      const nameMatch = rest.match(/^(--[\w-]+)/u);
      const { description } = splitDesc(rest);
      if (nameMatch) doc.functions.set(nameMatch[1], description ?? "");
      break;
    }
    case "keyframes": {
      const { head, description } = splitDesc(rest);
      doc.animations.set(head, description ?? "");
      break;
    }
    case "layer": {
      const { head, description } = splitDesc(rest);
      doc.layers.set(head, description ?? "");
      break;
    }
    case "container":
    case "supports":
    case "media": {
      const { query, description } = splitQuery(rest);
      doc.conditions.push({ type: canonical, query, description });
      break;
    }
    case "example":
      // `@example` is Markdown (prose plus fenced code). When authored inside a JS `css` template, a
      // literal fence must be written `\`\`\`` to avoid closing the template; unescape those backticks
      // here so the stored example carries real fences. (A no-op for a plain `.css` file.)
      doc.examples.push(rest.replace(/\\`/gu, "`"));
      break;
    case "deprecated":
      doc.deprecated = rest;
      break;
    case "demo":
      doc.demo = rest.split(/\s/u)[0];
      break;
    case "see":
      doc.see.push(rest);
      break;
    case "usage":
      doc.usage = rest.trim();
      break;
    case "compat":
      doc.compat.push(rest.trim());
      break;
    case "related": {
      const { head, description } = splitDesc(rest);
      doc.related.push({ name: head.replace(/^\./u, ""), description });
      break;
    }
    default: {
      // A supported custom block tag: capture its content, keyed by tag name.
      const list = doc.customBlocks.get(tagName) ?? [];
      list.push(rest);
      doc.customBlocks.set(tagName, list);
      break;
    }
  }
}

/**
 * Whether a comment's text opens a record — i.e. carries a record tag. Uses the `configuration`'s
 * record tags when given, else the default {@link RECORD_TAGS}.
 *
 * @param commentText - The comment body.
 * @param configuration - The active configuration (optional).
 * @returns The record name, or `undefined`.
 */
export function recordNameOf(
  commentText: string,
  configuration?: CssDocConfiguration,
): string | undefined {
  const tagNames = configuration
    ? configuration.supportedTagDefinitions
        .filter((d) => d.syntaxKind === "record")
        .map((d) => d.tagNameWithoutAt)
    : Object.keys(RECORD_TAGS);
  if (tagNames.length === 0) return undefined;
  const m = commentText.match(new RegExp(`@(?:${tagNames.join("|")})\\s+(\\S+)`, "u"));
  return m?.[1];
}

/**
 * Peel an optional leading prose description off a `@structure` body. The nested CSS begins at the
 * first line that opens a rule (contains `{`); any prose before it is the description. If the body
 * begins with a selector — including a multi-line selector like `.a,\n.b {` — there is no description
 * and the whole body is CSS.
 *
 * @param raw - The `@structure` body (description and/or nested CSS).
 * @returns The split `description` (when present) and the `css` to parse.
 */
/**
 * Parse a `@part` argument into its selector, derived name, and optional description.
 * Handles class (`.foo`), attribute (`[foo="bar"]`), ID (`#foo`), `:host`, `:host-context(…)`,
 * descendant chains (`A > B > C`), and an optional author alias. For chained selectors the
 * derived name comes from the final compound.
 *
 * @example `@part [data-layout="x"] container — Desc` → `{ selector: "[data-layout=\"x\"]", name: "container", description: "Desc" }`
 * @example `@part [data-layout="x"] — Desc`            → `{ selector: "[data-layout=\"x\"]", name: "data-layout", description: "Desc" }`
 * @example `@part .item — Desc`                         → `{ selector: ".item", name: "item", description: "Desc" }`
 * @example `@part A > B > C alias — Desc`               → `{ selector: "A > B > C", name: "alias", description: "Desc" }`
 * @example `@part A > B > C — Desc`                     → `{ selector: "A > B > C", name: "<derived from C>", description: "Desc" }`
 */
function splitPartArg(rest: string): { selector: string; name: string; description?: string } {
  // Split on the description separator to isolate selector+alias from description.
  const descM = rest.match(/^([\s\S]*?)\s+(?:—|-{1,2})\s+([\s\S]*)$/u);
  const selectorPlusAlias = (descM ? descM[1] : rest).trim();
  const description = descM?.[2].trim();

  // Greedy-match the last bare [\w-]+ token as a potential alias. A CSS selector segment always
  // starts with . # [ : — if the candidate selector ends with a combinator (>, ~, +) the last
  // token is the next selector segment, not an alias.
  const aliasM = selectorPlusAlias.match(/^([\s\S]+)\s+([\w-]+)$/u);
  if (aliasM && !/[>~+]\s*$/u.test(aliasM[1])) {
    return { selector: aliasM[1].trim(), name: aliasM[2], description };
  }

  // No alias — derive the name from the final compound of the (possibly chained) selector.
  const finalSeg = selectorPlusAlias.match(/([^\s>~+]+)\s*$/u)?.[1] ?? selectorPlusAlias;
  return { selector: selectorPlusAlias, name: deriveSelectorName(finalSeg), description };
}

function splitModifierArg(rest: string): { selector: string; name: string; description?: string } {
  // Grab the selector with the same bracket-aware regex as splitPartArg.
  const selMatch = rest.match(/^((?:\[(?:[^\]"']|"[^"]*"|'[^']*')*\]|[^\s[]+)+)/u);
  const selector = selMatch?.[1] ?? "";
  const after = rest.slice(selector.length).trim();

  // If `after` starts with a word (the alias) before the `—` separator, use it as the name.
  const aliasMatch = after.match(/^([\w-]+)\s+(?:—|-{1,2})\s+([\s\S]*)$/u);
  if (aliasMatch) return { selector, name: aliasMatch[1], description: aliasMatch[2].trim() };

  const descMatch = after.match(/^(?:—|-{1,2})\s+([\s\S]*)$/u);
  return { selector, name: deriveModifierKey(selector), description: descMatch?.[1].trim() };
}

function splitStructureBody(raw: string): { description?: string; css: string } {
  const lines = raw.split("\n");
  const braceLine = lines.findIndex((l) => l.includes("{"));
  if (braceLine <= 0) return { css: raw }; // no rule, or the first line already opens one
  const lead = lines.slice(0, braceLine);
  // A lead that itself begins a selector is part of a multi-line selector, not a description.
  if (/^\s*[.#:[*&>+~]/u.test(lead[0])) return { css: raw };
  const description = lead.join("\n").trim();
  return description ? { description, css: lines.slice(braceLine).join("\n") } : { css: raw };
}

/**
 * Parse a `@structure` body — nested CSS (brace-delimited rules) — into a {@link StructureNode} tree.
 * Each rule's selector becomes a node; nested rules become its children. Because a node is a real
 * compound selector, `:has()` (contains), `:is()` / selector-lists (one-of), and `:not()` (not) express
 * relationships natively. Leaf nodes are written as empty rules (`.tab {}`). A malformed body parses to
 * an empty tree rather than throwing.
 *
 * @example
 * ```
 * .tabs {
 *   .list { .tab {} }
 *   .panel {}
 * }
 * ```
 *
 * @param raw - The nested-CSS structure body.
 * @param parse - The CSS parser to build the tree with (the same one `parseCssDocs` uses, or a dialect
 *   parser). Injected so this module carries no runtime CSS-parser dependency; without it the tree is empty.
 */
// A trailing pseudo marks a child's cardinality: `:optional`/`:opt` (0..1), `:many` (0..n), or
// `:one-or-more`/`:more` (1..n). No marker means the child is present (required) when the component is
// used. A pseudo, not a `/* … *\/` comment, because `@structure` lives inside a doc comment where a
// nested comment would close it early — an unknown pseudo-class is valid selector syntax, and it's
// stripped from the stored selector here.
const CARDINALITY: Record<string, NonNullable<StructureNode["cardinality"]>> = {
  optional: "optional",
  opt: "optional",
  many: "many",
  "one-or-more": "one-or-more",
  more: "one-or-more",
};
const CARD_RE = /:(optional|opt|one-or-more|more|many)\s*$/u;

export function parseStructure(raw: string, parse?: CssParse): StructureNode[] {
  if (!parse) return []; // no parser injected → no tree (the grammar module stays parser-free)
  const build = (nodes: readonly ChildNode[]): StructureNode[] => {
    const out: StructureNode[] = [];
    for (const rule of nodes) {
      if (rule.type === "atrule" && rule.name === "scope") {
        // @scope boundary: emit a wrapper node whose children are the scoped rules.
        out.push({ selector: "", scope: rule.params.trim(), children: build(rule.nodes ?? []) });
        continue;
      }
      if (rule.type !== "rule") continue;
      const selector = rule.selector.trim();
      const card = selector.match(CARD_RE);
      const node: StructureNode = {
        selector: card ? selector.slice(0, card.index).trim() : selector,
        children: build(rule.nodes ?? []),
      };
      if (card) node.cardinality = CARDINALITY[card[1]];
      out.push(node);
    }
    return out;
  };
  try {
    return build(parse(raw).nodes);
  } catch {
    return []; // malformed structure → empty, never throws
  }
}
