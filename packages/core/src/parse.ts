/**
 * The PostCSS-based parser: turn a CSS string into a {@link CssDocEntry}[] documentation model.
 *
 * It is AST-first — the machine facts (base class, modifiers, parts, consumed/declared custom
 * properties, custom functions, animations, cascade layers, conditional-support blocks, states, and
 * deprecated-alias links) are derived from the actual selectors and at-rules, so they can't drift from
 * the shipping CSS. Authored `/** … *\/` doc comments (parsed by {@link parseDocComment}) supply only
 * prose (summaries, descriptions) and demo/see links, and delimit one component from the next.
 *
 * @module
 */
import postcss, { type ChildNode } from "postcss";
import { HTML_ELEMENT_GROUPS, HTML_ELEMENT_NAMES } from "@cssdoc/spec";
import { CssDocConfiguration, type InlineCommentMode } from "./configuration.ts";
import {
  deriveSelectorName,
  parseDocComment,
  recordNameOf,
  stripCommentFraming,
  type ParsedDoc,
} from "./grammar.ts";
import { ModifierMatcher, resolveModifierConvention } from "./modifier.ts";
import type {
  CssAnimation,
  CssCondition,
  CssDocEntry,
  CssElementConstraints,
  CssElementProfile,
  CssFunction,
  CssLayer,
  CssModifier,
  CssPart,
  CssPropertyDeclared,
  CssPseudoElement,
  CssSource,
  CssState,
  StructureNode,
  CssTokenConsumed,
  ParseOptions,
} from "./model.ts";

/** Matches a `var(--name` reference; group 1 is the custom-property name. */
const VAR_RE = /var\(\s*(--[\w-]+)/gu;

/**
 * A documented CSS class name (without the leading dot): a letter or `_` start — any case — then word
 * characters or hyphens. CSS idents may also start with `-`/escapes/non-ASCII, but a `-`-led class is a
 * bare modifier here (`.-secondary`), and an unescaped ident can't start with a digit — so those are
 * intentionally excluded. Accepting UPPERCASE (not just `a-z`) is what lets a PascalCase or
 * namespaced/prefixed base class (`.Button`, `.PFX-badge`) be recognized as the component's class rather
 * than silently mis-inferred to the bare `@name`. Used for base-class inference and the scoped-part scan.
 */
const CLASS_IDENT = String.raw`[A-Za-z_][\w-]*`;
/** Every class reference in a selector (name captured, dot dropped) — for the scoped-part scan. */
const CLASS_REF_RE = new RegExp(String.raw`\.(${CLASS_IDENT})`, "gu");
/** A selector that is exactly one class — the base-class inference candidate filter. */
const SINGLE_CLASS_RE = new RegExp(String.raw`^\.${CLASS_IDENT}$`, "u");
const RECORD_REF_NAME_RE = /^[a-zA-Z][\w-]*$/u;
const RECORD_REF_PROFILE_RE = /^:\s*([\w-]+)$/u;
const RECORD_REF_TYPED_RE = /^([\w-]+)(?::([\w-]+))?$/u;
const RECORD_REF_CUSTOM_MEDIA_RE = /^\(\s*(--[\w-]+)\s*\)$/u;
const RECORD_REF_TYPED_CUSTOM_MEDIA_RE = /^([\w-]+)\s+\(\s*(--[\w-]+)\s*\)$/u;
const RECORD_REF_KINDS = new Set(["component", "name", "utility", "rule", "declaration", "layout"]);
const ELEMENT_TAG_RE = /^<?\s*([a-z][a-z0-9-]*)\s*>?$/u;
const STRUCT_CARDINALITY: Record<string, NonNullable<StructureNode["cardinality"]>> = {
  optional: "optional",
  opt: "optional",
  many: "many",
  "one-or-more": "one-or-more",
  more: "one-or-more",
};
const STRUCT_CARD_RE = /:(optional|opt|one-or-more|more|many)\s*$/u;
const STRUCT_COLOC_RE = /:is\(\s*([^,)]+?)\s*\)/u;
// A curated allow-list of ARIA/data-* attributes that reflect element *state* (not identity or
// labeling) — avoids false positives on incidental attribute selectors like `[data-testid]`.
const ATTR_STATE_RE =
  /\[\s*(aria-[\w-]+|data-state)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[\w-]+)\s*\]/gu;
// The same shape, anchored to the whole (authored) token rather than scanned within a selector.
const ATTR_STATE_TAG_RE =
  /^\[\s*(aria-[\w-]+|data-state)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[\w-]+)\s*\]$/u;

const unquote = (value: string): string => value.trim().replace(/^["']|["']$/gu, "");
const sortUnique = (values: Iterable<string>): string[] =>
  [...new Set([...values].map((v) => v.toLowerCase()))].sort((a, b) => a.localeCompare(b));

function normalizeStructureAtRuleRef(name: string, params: string): string | undefined {
  if (name.includes(":")) {
    if (params.trim()) return undefined;
    const [record, profile] = name.split(":", 2);
    if (!RECORD_REF_NAME_RE.test(record) || !profile || !RECORD_REF_NAME_RE.test(profile)) {
      return undefined;
    }
    return `@${record}:${profile}`;
  }
  if (!RECORD_REF_NAME_RE.test(name)) return undefined;
  const trimmed = params.trim();
  if (RECORD_REF_KINDS.has(name)) {
    const typedMedia = trimmed.match(RECORD_REF_TYPED_CUSTOM_MEDIA_RE);
    if (typedMedia) return `@${name} ${typedMedia[1]} (${typedMedia[2]})`;
    const typed = trimmed.match(RECORD_REF_TYPED_RE);
    if (!typed) return undefined;
    return `@${name} ${typed[1]}${typed[2] ? `:${typed[2]}` : ""}`;
  }
  if (!trimmed) return `@${name}`;
  const customMedia = trimmed.match(RECORD_REF_CUSTOM_MEDIA_RE);
  if (customMedia) return `@${name} (${customMedia[1]})`;
  const profile = trimmed.match(RECORD_REF_PROFILE_RE);
  if (!profile) return undefined;
  return `@${name}:${profile[1]}`;
}

function buildStructureFromNodes(nodes: readonly ChildNode[]): StructureNode[] {
  const out: StructureNode[] = [];
  for (const node of nodes) {
    if (node.type === "atrule" && node.name === "scope") {
      out.push({
        selector: "",
        scope: node.params.trim(),
        children: buildStructureFromNodes(node.nodes ?? []),
      });
      continue;
    }
    if (node.type === "atrule") {
      const selector = normalizeStructureAtRuleRef(node.name, node.params);
      if (!selector) continue;
      out.push({ selector, children: buildStructureFromNodes(node.nodes ?? []) });
      continue;
    }
    if (node.type !== "rule") continue;
    const rawSel = node.selector.trim();
    const coloc = rawSel.match(STRUCT_COLOC_RE);
    const withoutColoc = coloc ? rawSel.replace(STRUCT_COLOC_RE, "").trim() : rawSel;
    const card = withoutColoc.match(STRUCT_CARD_RE);
    const entry: StructureNode = {
      selector: card ? withoutColoc.slice(0, card.index).trim() : withoutColoc,
      children: buildStructureFromNodes(node.nodes ?? []),
    };
    if (card) entry.cardinality = STRUCT_CARDINALITY[card[1]];
    if (coloc) entry.colocated = coloc[1].trim();
    out.push(entry);
  }
  return out;
}

function parseElementToken(
  token: string,
):
  | { kind: "any" }
  | { kind: "group"; alias: string; members: readonly string[] }
  | { kind: "tag"; name: string }
  | undefined {
  const trimmed = token.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (trimmed === "*" || trimmed === "any") return { kind: "any" };
  const group = HTML_ELEMENT_GROUPS[trimmed];
  if (group) return { kind: "group", alias: trimmed, members: group };
  const m = trimmed.match(ELEMENT_TAG_RE);
  if (m) return { kind: "tag", name: m[1] };
  return undefined;
}

function resolveElementProfile(chunks?: string[]): CssElementProfile {
  if (!chunks?.length) {
    return {
      any: true,
      allowed: [],
      include: [],
      exclude: [],
      groups: [],
      excludedGroups: [],
    };
  }

  let any = false;
  const include = new Set<string>();
  const exclude = new Set<string>();
  const groups = new Set<string>();
  const excludedGroups = new Set<string>();
  for (const chunk of chunks) {
    for (const item of chunk.split(",")) {
      const term = item.trim();
      if (!term) continue;
      const negated = term.startsWith("!");
      const parsed = parseElementToken(negated ? term.slice(1) : term);
      if (!parsed) continue;
      if (parsed.kind === "any") {
        if (!negated) any = true;
        continue;
      }
      if (parsed.kind === "group") {
        if (negated) {
          excludedGroups.add(parsed.alias);
          for (const member of parsed.members) exclude.add(member);
        } else {
          groups.add(parsed.alias);
          for (const member of parsed.members) include.add(member);
        }
        continue;
      }
      if (negated) exclude.add(parsed.name);
      else include.add(parsed.name);
    }
  }

  const allowed = new Set<string>(any ? HTML_ELEMENT_NAMES : include);
  for (const x of exclude) allowed.delete(x);

  return {
    any,
    allowed: sortUnique(allowed),
    include: sortUnique(include),
    exclude: sortUnique(exclude),
    groups: sortUnique(groups),
    excludedGroups: sortUnique(excludedGroups),
  };
}

function resolveElementConstraints(profiles: ParsedDoc["elements"]): CssElementConstraints {
  const named: Record<string, CssElementProfile> = {};
  for (const [name, chunks] of profiles) {
    if (!name) continue;
    named[name] = resolveElementProfile(chunks);
  }
  return { default: resolveElementProfile(profiles.get("")), profiles: named };
}

interface Collected {
  className: string;
  modifiers: Map<string, CssModifier>;
  parts: Map<string, CssPart>;
  shadowParts: Map<string, CssPart>;
  pseudoElements: Map<string, CssPseudoElement>;
  states: Map<string, CssState>;
  consumed: Set<string>;
  declared: Map<string, CssPropertyDeclared>;
  functions: Map<string, CssFunction>;
  animations: Map<string, CssAnimation>;
  layers: Map<string, CssLayer>;
  conditions: CssCondition[];
  todos: string[];
  annotations: Map<number, string>;
  refs: number[];
}

/** Parse numbered legend rows (`1. ...`) from plain text. */
function parseLegendRows(text: string): Map<number, string> {
  const out = new Map<number, string>();
  let current: number | undefined;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^@[A-Za-z]/u.test(trimmed)) break;
    const marker = trimmed.match(/^(\d+)\.\s*([\s\S]*)$/u);
    if (marker) {
      current = Number.parseInt(marker[1], 10);
      out.set(current, marker[2].trim());
      continue;
    }
    if (current !== undefined) out.set(current, `${out.get(current) ?? ""}\n${trimmed}`.trim());
  }
  return out;
}

/** Parse inline refs from plain text, capturing optional prose (`@ref 1. Prevent…`). */
function parseInlineRefs(text: string): { refs: number[]; annotations: Map<number, string> } {
  const refs: number[] = [];
  const annotations = new Map<number, string>();
  for (const m of text.matchAll(/@ref\s+(\d+)\.?\s*([^\n]*)/gu)) {
    const n = Number.parseInt(m[1], 10);
    refs.push(n);
    const prose = m[2].trim();
    if (prose) annotations.set(n, prose);
  }
  return { refs, annotations };
}

/**
 * Parse explicit-gated inline legend content from `/* ... *\/` comments.
 * Escape hatch: this runs even when inline comments are globally ignored.
 */
function parseLegendFromInlineComment(text: string): {
  annotations: Map<number, string>;
  refs: number[];
} {
  const stripped = stripCommentFraming(text);
  const lines = stripped.split("\n");
  const first = lines.find((line) => line.trim().length > 0)?.trim() ?? "";
  const { refs, annotations: inlineAnnotations } = parseInlineRefs(stripped);
  if (!/^@(annotations|rule)\b/u.test(first)) return { annotations: inlineAnnotations, refs };
  const body = lines.slice(1).join("\n");
  const legendAnnotations = parseLegendRows(body);
  // Merge: legend rows take precedence; inline @ref prose fills in any gaps.
  for (const [k, v] of inlineAnnotations)
    if (!legendAnnotations.has(k)) legendAnnotations.set(k, v);
  return { annotations: legendAnnotations, refs };
}

/** Record a conditional-support block, de-duplicating by type + query. */
function addCondition(acc: Collected, condition: CssCondition): void {
  const exists = acc.conditions.some(
    (c) => c.type === condition.type && c.query === condition.query,
  );
  if (!exists) acc.conditions.push(condition);
}

/** Derive a CSS custom function from an `@function` at-rule. */
function collectFunction(node: Extract<ChildNode, { type: "atrule" }>, acc: Collected): void {
  const params = node.params.trim();
  const nameMatch = params.match(/^(--[\w-]+)/u);
  if (!nameMatch) return;
  const paren = params.match(/\(([^)]*)\)/u);
  const parameters = paren ? [...paren[1].matchAll(/(--[\w-]+)/gu)].map((m) => m[1]) : [];
  const returns = params.match(/\breturns\b\s+(.+)$/iu);
  let result = returns?.[1]?.trim();
  if (!result) {
    const resultDecl = node.nodes?.find((n) => n.type === "decl" && n.prop === "result");
    if (resultDecl && "value" in resultDecl) result = resultDecl.value.trim();
  }
  acc.functions.set(nameMatch[1], { name: nameMatch[1], parameters, result });
}

/** Extract every fact from one record's nodes into `acc`. */
function collect(
  nodes: ChildNode[],
  acc: Collected,
  matcher: ModifierMatcher,
  baseNoDot: string,
  prefixNoDot: string,
  inScope: boolean,
  inlineMode: InlineCommentMode,
): void {
  let pendingCanonical: string | undefined;
  let pendingDescription: string | undefined;

  for (const node of nodes) {
    if (node.type === "comment") {
      const legend = parseLegendFromInlineComment(node.text);
      for (const [ref, text] of legend.annotations) acc.annotations.set(ref, text);
      for (const ref of legend.refs) acc.refs.push(ref);
      const dep = node.text.match(/@deprecated.*?use\s+(\.[\w-]+|\[[^\]]*\])/u);
      if (dep) {
        pendingCanonical = matcher.normalizeMember(dep[1]);
      } else if (/(^|\s)@todo\b/u.test(node.text)) {
        // A `/* @todo … */` note — a record to-do, not a member description.
        const todo = stripCommentFraming(node.text)
          .replace(/^@todo\b[:\s]*/u, "")
          .trim();
        if (todo) acc.todos.push(todo);
      } else if (!/^\s*cssdoc-/u.test(node.text) && inlineMode !== "ignore") {
        // Any other comment is provisional prose for the next member-defining rule.
        const text = stripCommentFraming(node.text).replace(/\s+/gu, " ").trim();
        if (text) pendingDescription = text;
      }
      continue;
    }
    if (node.type === "decl") {
      for (const m of node.value.matchAll(VAR_RE)) acc.consumed.add(m[1]);
      continue;
    }
    if (node.type === "atrule") {
      if (node.name === "property") {
        const name = node.params.trim();
        const decl = (prop: string): string | undefined => {
          const d = node.nodes?.find((n) => n.type === "decl" && n.prop === prop);
          return d && "value" in d ? d.value : undefined;
        };
        const inherits = decl("inherits");
        const initial = decl("initial-value");
        const syntax = decl("syntax");
        acc.declared.set(name, {
          name,
          syntax: syntax === undefined ? undefined : unquote(syntax),
          inherits: inherits === undefined ? undefined : /^true$/iu.test(inherits.trim()),
          defaultValue: initial === undefined ? undefined : initial.trim(),
        });
      } else if (node.name === "function") {
        collectFunction(node, acc);
      } else if (node.name === "keyframes") {
        const animName = node.params.trim();
        if (animName) acc.animations.set(animName, { name: animName });
      } else if (node.name === "layer") {
        for (const raw of node.params.split(",")) {
          const layerName = raw.trim();
          if (layerName) acc.layers.set(layerName, { name: layerName });
        }
      } else if (node.name === "container") {
        const params = node.params.trim();
        let containerName: string | undefined;
        let query = params;
        if (params && !params.startsWith("(")) {
          const sp = params.indexOf(" ");
          if (sp > 0) {
            containerName = params.slice(0, sp);
            query = params.slice(sp + 1).trim();
          }
        }
        addCondition(acc, { type: "container", query, containerName });
      } else if (node.name === "supports") {
        addCondition(acc, { type: "supports", query: node.params.trim() });
      } else if (node.name === "media") {
        addCondition(acc, { type: "media", query: node.params.trim() });
      }
      if (node.nodes)
        collect(
          node.nodes,
          acc,
          matcher,
          baseNoDot,
          prefixNoDot,
          inScope || node.name === "scope",
          inlineMode,
        );
      continue;
    }
    if (node.type === "rule") {
      for (const selector of node.selector.split(",")) {
        // States, before pseudos are stripped: custom `:state(x)`, native pseudo-classes, and
        // shadow `::part(x)` parts are all read off the raw selector.
        for (const s of selector.matchAll(/:state\(\s*([\w-]+)\s*\)/gu)) {
          if (!acc.states.has(s[1])) acc.states.set(s[1], { name: s[1], kind: "custom" });
        }
        for (const ps of matcher.pseudoStatesIn(selector)) {
          if (!acc.states.has(ps.name))
            acc.states.set(ps.name, { name: ps.name, kind: "pseudo-class" });
        }
        for (const as of selector.matchAll(ATTR_STATE_RE)) {
          const attrSelector = `[${as[1]}=${as[2]}]`;
          const name = `${as[1]}=${unquote(as[2])}`;
          if (!acc.states.has(name))
            acc.states.set(name, { name, kind: "attribute", selector: attrSelector });
        }
        for (const sp of selector.matchAll(/::part\(\s*([\w-]+)\s*\)/gu)) {
          if (!acc.shadowParts.has(sp[1])) acc.shadowParts.set(sp[1], { name: sp[1] });
        }
        for (const pe of matcher.pseudoElementsIn(selector)) {
          if (!acc.pseudoElements.has(pe.name))
            acc.pseudoElements.set(pe.name, { name: pe.name, description: pendingDescription });
        }
        const bare = selector.replace(/::?[\w-]+(\([^)]*\))?/gu, ""); // drop pseudos
        const mods = matcher.modifiersIn(bare, baseNoDot);
        const modNames = new Set(mods.map((mod) => mod.name));
        for (const mod of mods) {
          const existing = acc.modifiers.get(mod.name);
          const entry: CssModifier = existing ?? {
            name: mod.name,
            prop: mod.prop,
            value: mod.value,
            ...(mod.pattern ? { pattern: true } : {}),
          };
          if (pendingCanonical) entry.deprecated = { canonical: pendingCanonical };
          if (pendingDescription && !entry.description) entry.description = pendingDescription;
          acc.modifiers.set(mod.name, entry);
        }
        // BEM-style elements (`.base__x`) are parts; `.base__x--mod` gives the element a modifier.
        for (const el of matcher.elementsIn(bare, baseNoDot)) {
          const part = acc.parts.get(el.name) ?? { name: el.name };
          if (pendingDescription && !part.description) part.description = pendingDescription;
          for (const m of el.modifiers) {
            part.modifiers ??= [];
            if (!part.modifiers.some((x) => x.name === m.name)) {
              part.modifiers.push({ name: m.name, prop: m.prop, value: m.value });
            }
          }
          acc.parts.set(el.name, part);
        }
        for (const st of matcher.statesIn(bare, baseNoDot)) {
          if (!acc.states.has(st.name)) acc.states.set(st.name, { name: st.name, kind: "class" });
        }
        if (inScope) {
          // Only derive parts from the final compound — ancestor segments are scoping context.
          const finalBare = bare.match(/([^\s>~+]+)\s*$/u)?.[1] ?? bare;
          for (const m of finalBare.matchAll(CLASS_REF_RE)) {
            const part = m[1];
            if (modNames.has(part)) continue; // a modifier, not a part
            if (prefixNoDot && part.startsWith(prefixNoDot)) continue; // a component ref, not a part
            if (!acc.parts.has(part))
              acc.parts.set(part, { name: part, description: pendingDescription });
          }
        }
      }
      for (const child of node.nodes ?? []) {
        if (child.type === "decl")
          for (const m of child.value.matchAll(VAR_RE)) acc.consumed.add(m[1]);
      }
      if (node.nodes)
        collect(node.nodes, acc, matcher, baseNoDot, prefixNoDot, inScope, inlineMode);
      pendingCanonical = undefined;
      pendingDescription = undefined;
    }
  }
}

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);

/**
 * Combine a member's authored tag prose with an inline `/* … *\/` comment, per the configured
 * {@link InlineCommentMode}. Either side may be absent; when both are present, `append`/`prepend` join
 * them (tag-first / comment-first), `replace` takes the comment, and `ignore` keeps only the tag.
 */
function combineDescription(
  mode: InlineCommentMode,
  tag: string | undefined,
  inline: string | undefined,
): string | undefined {
  if (mode === "ignore") return tag;
  if (!tag) return inline;
  if (!inline) return tag;
  if (mode === "replace") return inline;
  return mode === "prepend" ? `${inline}\n\n${tag}` : `${tag}\n\n${inline}`;
}

/** Build one entry from its record name, doc comment, and nodes. */
function buildEntry(
  name: string,
  doc: ParsedDoc,
  nodes: ChildNode[],
  matcher: ModifierMatcher,
  inlineMode: InlineCommentMode,
  source?: CssSource,
): CssDocEntry {
  // Base selector: an explicit @selector/@class wins immediately when set.
  // Otherwise infer from bare single-class rules — preferring the one ending with the record name.
  let className = doc.className ?? "";
  if (className && !SINGLE_CLASS_RE.test(className)) {
    // Non-class explicit selector (attribute, ID, :host, compound, …) — trust it as-is.
  } else if (!className) {
    const bare = nodes
      .filter((n): n is ChildNode & { selector: string } => n.type === "rule")
      .map((n) => n.selector.trim())
      .filter((sel) => SINGLE_CLASS_RE.test(sel));
    const nameEsc = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const endsWithName = new RegExp(`(?:^|-)${nameEsc}$`, "u");
    // A masked `${p}` prefix abuts the name with no `-` (`.aaaabadge`), so the boundary match above
    // misses it and would fall through to the first bare rule — a wrapper like `.aaaabadge-wrapper`.
    // Fall back to any bare class ending in the name (shortest first, so `.badge` beats `.superbadge`).
    const endsLoose = new RegExp(`${nameEsc}$`, "u");
    className =
      bare.find((sel) => endsWithName.test(sel.slice(1))) ??
      bare.filter((sel) => endsLoose.test(sel.slice(1))).sort((a, b) => a.length - b.length)[0] ??
      bare[0] ??
      "";
  }
  if (!className) className = `.${name}`;

  const acc: Collected = {
    className,
    modifiers: new Map(),
    parts: new Map(),
    shadowParts: new Map(),
    pseudoElements: new Map(),
    states: new Map(),
    consumed: new Set(),
    declared: new Map(),
    functions: new Map(),
    animations: new Map(),
    layers: new Map(),
    conditions: [],
    todos: [],
    annotations: new Map(),
    refs: [],
  };
  const baseNoDot = className.replace(/^\./u, "");
  const prefixNoDot = className.endsWith(name)
    ? className.slice(1, className.length - name.length) // ".button" − "button" → ""
    : "";
  collect(nodes, acc, matcher, baseNoDot, prefixNoDot, false, inlineMode);

  // Merge in authored prose; authored @modifier/@part entries also appear even if extraction missed.
  for (const [modName, mdoc] of doc.modifiers) {
    const existing = acc.modifiers.get(modName);
    // An authored `@deprecated {@link -x}` contributes a canonical; plain text contributes a note. Build
    // with only the defined keys so merging onto an AST-derived deprecation never clobbers with undefined.
    // A bare `@deprecated` (no note, no link) still marks the modifier deprecated — as an empty object —
    // so lint can flag that it lacks a replacement.
    const dep =
      mdoc.deprecated || mdoc.deprecatedCanonical || mdoc.deprecatedFlag
        ? {
            ...(mdoc.deprecated ? { note: mdoc.deprecated } : {}),
            ...(mdoc.deprecatedCanonical ? { canonical: mdoc.deprecatedCanonical } : {}),
          }
        : undefined;
    if (existing) {
      existing.description = combineDescription(inlineMode, mdoc.description, existing.description);
      if (dep) existing.deprecated = { ...existing.deprecated, ...dep };
      if (mdoc.interaction) existing.interaction = true;
      if (mdoc.global) existing.global = true;
    } else {
      const { prop, value } = matcher.analyze(modName);
      const modSel = doc.modifierSelectors.get(modName);
      acc.modifiers.set(modName, {
        name: modName,
        prop,
        value,
        ...(modName.includes("*") ? { pattern: true } : {}),
        description: mdoc.description,
        deprecated: dep,
        ...(modSel ? { selector: modSel } : {}),
        ...(mdoc.interaction ? { interaction: true } : {}),
        ...(mdoc.global ? { global: true } : {}),
      });
    }
  }
  for (const [part, description] of doc.parts) {
    const existing = acc.parts.get(part);
    const selector = doc.partSelectors.get(part);
    if (existing) {
      existing.description = combineDescription(
        inlineMode,
        description || undefined,
        existing.description,
      );
      if (selector && !existing.selector) existing.selector = selector;
    } else {
      acc.parts.set(part, { name: part, description, ...(selector ? { selector } : {}) });
    }
  }
  for (const [part, description] of doc.cssParts) {
    const existing = acc.shadowParts.get(part);
    if (existing) existing.description = description || existing.description;
    else acc.shadowParts.set(part, { name: part, description: description || undefined });
  }
  for (const [pseudo, description] of doc.pseudoElements) {
    const existing = acc.pseudoElements.get(pseudo);
    if (existing)
      existing.description = combineDescription(
        inlineMode,
        description || undefined,
        existing.description,
      );
    else acc.pseudoElements.set(pseudo, { name: pseudo, description: description || undefined });
  }
  for (const [rawState, description] of doc.cssStates) {
    // A `:`-prefixed authored name (`@cssstate :disabled`) is a native pseudo-class state; a bracketed
    // authored name (`@cssstate [aria-sort="ascending"]`) is an attribute-reflected state. The stored
    // name/selector for the attribute form must match the auto-derivation below (`key=unquoted-value`),
    // so an authored description and a CSS-derived usage merge into one state, not two.
    const isPseudo = rawState.startsWith(":");
    const attrMatch = rawState.match(ATTR_STATE_TAG_RE);
    const state = isPseudo
      ? rawState.slice(1)
      : attrMatch
        ? `${attrMatch[1]}=${unquote(attrMatch[2])}`
        : rawState;
    const existing = acc.states.get(state);
    if (existing) existing.description = description || existing.description;
    else
      acc.states.set(state, {
        name: state,
        kind: isPseudo ? "pseudo-class" : attrMatch ? "attribute" : "custom",
        description: description || undefined,
        ...(attrMatch ? { selector: `[${attrMatch[1]}=${attrMatch[2]}]` } : {}),
      });
  }
  for (const prop of doc.cssProperties) {
    const existing = acc.declared.get(prop.name);
    acc.declared.set(prop.name, {
      name: prop.name,
      syntax: prop.syntax ?? existing?.syntax,
      inherits: existing?.inherits,
      defaultValue: prop.defaultValue ?? existing?.defaultValue,
      description: prop.description ?? existing?.description,
    });
  }
  for (const [fnName, description] of doc.functions) {
    const existing = acc.functions.get(fnName);
    if (existing) existing.description = description || existing.description;
    else
      acc.functions.set(fnName, {
        name: fnName,
        parameters: [],
        description: description || undefined,
      });
  }
  for (const [animName, description] of doc.animations) {
    const existing = acc.animations.get(animName);
    if (existing) existing.description = description || existing.description;
    else acc.animations.set(animName, { name: animName, description: description || undefined });
  }
  for (const [layerName, description] of doc.layers) {
    const existing = acc.layers.get(layerName);
    if (existing) existing.description = description || existing.description;
    else acc.layers.set(layerName, { name: layerName, description: description || undefined });
  }
  for (const cond of doc.conditions) {
    const existing = acc.conditions.find((c) => c.type === cond.type && c.query === cond.query);
    if (existing) existing.description = cond.description || existing.description;
    else acc.conditions.push({ type: cond.type, query: cond.query, description: cond.description });
  }

  const modifiers = [...acc.modifiers.values()].sort(
    (a, b) => a.prop.localeCompare(b.prop) || (a.value ?? "").localeCompare(b.value ?? ""),
  );

  // Consumed tokens: the AST-derived set, annotated with `@tokens` prose. Authored tokens with no
  // matching `var()` are added too (a token may be consumed indirectly or set outside these rules).
  const consumedTokens = new Map<string, CssTokenConsumed>();
  for (const tokenName of acc.consumed) consumedTokens.set(tokenName, { name: tokenName });
  for (const [tokenName, description] of doc.tokens) {
    const existing = consumedTokens.get(tokenName);
    if (existing) existing.description = description || existing.description;
    else consumedTokens.set(tokenName, { name: tokenName, description: description || undefined });
  }

  // Layouts can author `@structure` explicitly, or infer it from the CSS rules under the layout block.
  const structure =
    doc.structure ??
    ((doc.kind ?? "component") === "layout"
      ? (() => {
          const inferred = buildStructureFromNodes(nodes);
          return inferred.length === 1 ? inferred : undefined;
        })()
      : undefined);

  // Attach `@wrapper` prose to the matching `@structure` node(s) by derived selector name or aliased selector.
  if (doc.wrappers.size && structure?.length) {
    const applyWrappers = (nodes: StructureNode[]): void => {
      for (const node of nodes) {
        const derivedName = deriveSelectorName(node.selector);
        // Try direct lookup by derived name; fall back to alias-based lookup via wrapperSelectors.
        const description =
          doc.wrappers.get(derivedName) ??
          (() => {
            for (const [key, sel] of doc.wrapperSelectors) {
              if (sel === node.selector) return doc.wrappers.get(key);
            }
          })();
        if (description) node.description = description;
        applyWrappers(node.children);
      }
    };
    applyWrappers(structure);
    // `structure` is only the first variant's nodes; annotate the rest too when `@variant` is used.
    for (const variant of doc.structureVariants ?? []) {
      if (variant.nodes !== structure) applyWrappers(variant.nodes);
    }
  }

  const decorators = [
    ...(doc.decorators.isReadonly ? (["readonly"] as const) : []),
    ...(doc.decorators.preventExtensions ? (["preventExtensions"] as const) : []),
    ...(doc.decorators.sealed ? (["sealed"] as const) : []),
    ...(doc.decorators.frozen ? (["frozen"] as const) : []),
  ];

  const elements = resolveElementConstraints(doc.elements);

  return {
    name,
    kind: doc.kind ?? "component",
    className,
    summary: doc.summary,
    remarks: doc.remarks,
    privateRemarks: doc.privateRemarks,
    releaseStage: doc.releaseStage,
    since: doc.since,
    group: doc.group,
    accessibility: doc.accessibility,
    modifiers,
    parts: [...acc.parts.values()]
      .sort(byName)
      .map((p) => (p.modifiers ? { ...p, modifiers: [...p.modifiers].sort(byName) } : p)),
    shadowParts: [...acc.shadowParts.values()].sort(byName),
    pseudoElements: [...acc.pseudoElements.values()].sort(byName),
    states: [...acc.states.values()].sort(byName),
    slots: [...doc.slots]
      .map(([slotName, description]) => ({
        name: slotName,
        description: description || undefined,
      }))
      .sort(byName),
    todos: [...doc.todos, ...acc.todos],
    cssPropertiesConsumed: [...consumedTokens.values()].sort(byName),
    cssPropertiesDeclared: [...acc.declared.values()].sort(byName),
    functions: [...acc.functions.values()].sort(byName),
    animations: [...acc.animations.values()].sort(byName),
    layers: [...acc.layers.values()].sort(byName),
    conditions: acc.conditions,
    examples: doc.examples,
    structure,
    structureVariants: doc.structureVariants,
    structureDescription: doc.structureDescription,
    demo: doc.demo,
    deprecated: doc.deprecated,
    see: doc.see,
    usage: doc.usage,
    annotations: [...doc.annotations, ...acc.annotations].map(([ref, text]) => ({ ref, text })),
    refs: [...doc.refs, ...acc.refs],
    decorators,
    compat: doc.compat,
    related: doc.related,
    elements,
    global: doc.global,
    ...(source ? { source } : {}),
    ...(doc.customBlocks.size > 0 ? { customBlocks: Object.fromEntries(doc.customBlocks) } : {}),
  };
}

/**
 * A cssdoc record is opened only by a JSDoc-style doc comment (its opener is `/**`) — never a plain
 * block comment. PostCSS doesn't distinguish the two, so an ordinary comment that merely mentions
 * `@component` (a TODO, a banner) would otherwise mint a phantom, summary-less record. We check the raw
 * source at the comment's offset for the `/**` opener, falling back to the leftover `*` that a `/**`
 * leaves at the start of the comment body when no offset is available.
 */
function isDocComment(node: Extract<ChildNode, { type: "comment" }>, source: string): boolean {
  const offset = node.source?.start?.offset;
  return offset === undefined ? node.text.startsWith("*") : source.startsWith("/**", offset);
}

/**
 * Parse a CSS string into a documentation model. Records are delimited by `/**` doc comments carrying a
 * record tag (`@component`/`@name` by default; override via {@link ParseOptions.isRecordBoundary});
 * everything from one boundary comment to the next belongs to that record.
 *
 * @param css - The CSS source (a generated stylesheet, with authored doc comments).
 * @param options - {@link ParseOptions}.
 * @returns One {@link CssDocEntry} per record, in document order.
 *
 * @example
 * ```ts
 * import { parseCssDocs } from "@cssdoc/core";
 *
 * const [badge] = parseCssDocs(badgeCssWithDocComments);
 * badge.modifiers.map((m) => m.name); // ["-color-danger", "-color-success", …]
 * ```
 */
export function parseCssDocs(css: string, options: ParseOptions = {}): CssDocEntry[] {
  const configuration = options.configuration ?? new CssDocConfiguration();
  const matcher = new ModifierMatcher(
    resolveModifierConvention(options.modifierConvention ?? configuration.modifierConvention),
  );
  const boundary =
    options.isRecordBoundary ?? ((text: string) => recordNameOf(text, configuration));
  const parse = options.parse ?? postcss.parse;
  const root = parse(css);
  type Record_ = { name: string; doc: ParsedDoc; nodes: ChildNode[]; source?: CssSource };
  const records: Record_[] = [];
  let current: Record_ | null = null;

  for (const node of root.nodes) {
    if (node.type === "comment" && isDocComment(node, css)) {
      const name = boundary(node.text);
      if (name) {
        const start = node.source?.start;
        const source: CssSource | undefined =
          options.fileName || start
            ? { file: options.fileName, line: start?.line, column: start?.column }
            : undefined;
        current = {
          name,
          doc: parseDocComment(node.text, configuration, parse),
          nodes: [],
          source,
        };
        records.push(current);
        continue;
      }
    }
    if (current) current.nodes.push(node);
  }

  return records.map((r) =>
    buildEntry(r.name, r.doc, r.nodes, matcher, configuration.inlineComments, r.source),
  );
}
