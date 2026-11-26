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
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import { HTML_ELEMENT_GROUPS, HTML_ELEMENT_NAMES } from "@cssdoc/spec";
import {
  ALPHA_SOURCE,
  ALPHANUMERIC_EXTENDED_SOURCE,
  ASTERISK_CHAR,
  AT_SOURCE,
  BRACE_CLOSE_SOURCE,
  BRACE_OPEN_SOURCE,
  BRACKET_CLOSE_CHAR,
  BRACKET_CLOSE_SOURCE,
  BRACKET_OPEN_CHAR,
  BRACKET_OPEN_SOURCE,
  COLON_CHAR,
  COLON_SOURCE,
  CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE,
  CSSDOC_CUSTOM_STATE_SELECTOR,
  CSSDOC_BASE_CLASS_NAME_SOURCE,
  CSSDOC_BASE_CLASS_REFERENCE,
  CSSDOC_ELEMENT_TAG_SOURCE,
  CSSDOC_MODIFIER_REFERENCE_SOURCE,
  CSSDOC_SCANNED_PSEUDO_SELECTOR,
  CSSDOC_SHADOW_PART_SELECTOR,
  DOC_COMMENT_START_TEXT,
  DASH_SOURCE,
  DIGIT_SOURCE,
  DOT_CHAR,
  DOT_SOURCE,
  EQUALS_CHAR,
  GREATER_THAN_CHAR,
  TOKEN_CUSTOM_PROPERTY_SOURCE,
  PSEUDO_SELECTOR_FUNCTIONAL,
  PAREN_CLOSE_SOURCE,
  PAREN_OPEN_CHAR,
  PAREN_OPEN_SOURCE,
  QUOTE_DOUBLE_CHAR,
  QUOTE_SINGLE_CHAR,
  TILDE_CHAR,
  WHITESPACE_RUN,
  WORD_BOUNDARY_SOURCE,
  escapeRegex,
  toRegExp,
} from "@cssdoc/regex";
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

const WHITESPACE = toRegExp(WHITESPACE_RUN);

/**
 * Reduce an `@scope` at-rule's `params` (e.g. `(.pfx-alert)`) to a bare class name, or `undefined` for
 * anything that isn't a single simple class selector (a multi-selector or non-class prelude can't be
 * resolved to "this is the record's own base" safely, so `&`/`:scope` inside it are left unmatched).
 */
export function scopePreludeBase(params: string): string | undefined {
  const OPEN_PAREN: Regex = arkRegex.as(`^${PAREN_OPEN_SOURCE}`, "u");
  const CLOSE_PAREN: Regex = arkRegex.as(`${PAREN_CLOSE_SOURCE}$`, "u");
  const SCOPE_CLASS: Regex = arkRegex.as(`^${DOT_SOURCE}(${ALPHANUMERIC_EXTENDED_SOURCE}+)$`, "u");
  const inner = params.trim().replace(OPEN_PAREN, "").replace(CLOSE_PAREN, "").trim();
  return inner.match(SCOPE_CLASS)?.[1];
}

/**
 * Whether an `@scope`'s prelude base is the record's own base — exactly, or as the literal prefix of an
 * authored compound base selector built on it (e.g. a base of `pfx-transition.-transition-fade-entering`
 * for a prelude of `pfx-transition`). Only when this holds does `&`/`:scope` inside that `@scope` mean
 * "this record's own base" — otherwise the `@scope` belongs to a different record (commonly a parent
 * component reaching into this one as a member, or a sibling part's own scope), and `&`/`:scope` there
 * refer to THAT selector, not this record's.
 */
export function scopeMatchesBase(preludeBase: string | undefined, baseNoDot: string): boolean {
  return (
    preludeBase !== undefined &&
    (preludeBase === baseNoDot || baseNoDot.startsWith(`${preludeBase}${DOT_CHAR}`))
  );
}

/**
 * Whether a single selector branch (no commas) keeps `&`/`:scope` meaning "the same scope root" one
 * nesting level deeper — true for `&`, `&.-mod`, `&::before`, `&:hover` (chained onto the same compound,
 * no combinator); false once a combinator introduces a new compound (`& > .part`, `.part &`, …), since
 * a rule nested inside THAT one would have `&` refer to the new compound, not the original scope root.
 */
export function ampStaysAtScope(branch: string): boolean {
  const SCOPE_ROOT: Regex = arkRegex.as(`^(?:&|${COLON_SOURCE}scope)`, "u");
  // Ignore combinators inside a pseudo-class argument (e.g. `:not(a > b)`) — they don't touch this
  // selector's own structure. Uses PSEUDO_SELECTOR_FUNCTIONAL pattern to match :pseudo(...).
  const stripped = branch.replace(toRegExp(PSEUDO_SELECTOR_FUNCTIONAL), "");
  const trimmed = stripped.trim();
  if (!SCOPE_ROOT.test(trimmed)) return false;
  const rest = trimmed.replace(SCOPE_ROOT, "");
  return !SELECTOR_COMBINATOR.test(rest);
}

/** Remove `&`/`:scope` tokens from a selector fragment so they can't be mistaken for the record's base
 * by {@link ModifierMatcher}'s matchers — used when the enclosing `@scope` doesn't resolve to this
 * record's own base (see {@link scopeMatchesBase}). */
function neutralizeAmp(selector: string): string {
  const AMP: Regex = arkRegex.as("&", "gu");
  const SCOPE: Regex = arkRegex.as(`${COLON_SOURCE}scope${WORD_BOUNDARY_SOURCE}`, "gu");
  return selector.replace(AMP, "").replace(SCOPE, "");
}

/**
 * A documented CSS class name (without the leading dot): a letter or `_` start — any case — then word
 * characters or hyphens. CSS idents may also start with `-`/escapes/non-ASCII, but a `-`-led class is a
 * bare modifier here (`.-secondary`), and an unescaped ident can't start with a digit — so those are
 * intentionally excluded. Accepting UPPERCASE (not just `a-z`) is what lets a PascalCase or
 * namespaced/prefixed base class (`.Button`, `.PFX-badge`) be recognized as the component's class rather
 * than silently mis-inferred to the bare `@name`. Used for base-class inference and the scoped-part scan.
 */
/** A selector that is exactly one class — the base-class inference candidate filter. */
const SINGLE_CLASS: Regex = arkRegex.as(`^${DOT_SOURCE}${CSSDOC_BASE_CLASS_NAME_SOURCE}$`, "u");
const SELECTOR_COMBINATOR: Regex = arkRegex.as(
  String.raw`[\s${GREATER_THAN_CHAR}+${TILDE_CHAR}]`,
  "u",
);
// A curated allow-list of ARIA/data-* attributes that reflect element *state* (not identity or
// labeling) — avoids false positives on incidental attribute selectors like `[data-testid]`.
const ATTRIBUTE_STATE_SOURCE = String.raw`${BRACKET_OPEN_SOURCE}\s*(aria-${ALPHANUMERIC_EXTENDED_SOURCE}+|data-state)\s*${EQUALS_CHAR}\s*(${QUOTE_DOUBLE_CHAR}(?:[^${QUOTE_DOUBLE_CHAR}\\]|\\.)*${QUOTE_DOUBLE_CHAR}|${QUOTE_SINGLE_CHAR}(?:[^${QUOTE_SINGLE_CHAR}\\]|\\.)*${QUOTE_SINGLE_CHAR}|${ALPHANUMERIC_EXTENDED_SOURCE}+)\s*${BRACKET_CLOSE_SOURCE}`;

const unquote = (value: string): string => {
  const QUOTES: Regex = arkRegex.as(
    `^[${QUOTE_DOUBLE_CHAR}${QUOTE_SINGLE_CHAR}]|[${QUOTE_DOUBLE_CHAR}${QUOTE_SINGLE_CHAR}]$`,
    "gu",
  );
  return value.trim().replace(QUOTES, "");
};
const sortUnique = (values: Iterable<string>): string[] =>
  [...new Set([...values].map((v) => v.toLowerCase()))].toSorted((a, b) => a.localeCompare(b));

function parseElementToken(
  token: string,
):
  | { kind: "any" }
  | { kind: "group"; alias: string; members: readonly string[] }
  | { kind: "tag"; name: string }
  | undefined {
  const trimmed = token.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (trimmed === ASTERISK_CHAR || trimmed === "any") return { kind: "any" };
  const group = HTML_ELEMENT_GROUPS[trimmed];
  if (group) return { kind: "group", alias: trimmed, members: group };
  const ELEMENT_TAG: Regex = arkRegex.as(`^${CSSDOC_ELEMENT_TAG_SOURCE}$`, "u");
  const m = trimmed.match(ELEMENT_TAG);
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
  const TAG_START: Regex = arkRegex.as(`^${AT_SOURCE}${ALPHA_SOURCE}`, "u");
  const LEGEND_ROW: Regex = arkRegex.as(
    String.raw`^(${DIGIT_SOURCE}+)${DOT_SOURCE}\s*([\s\S]*)$`,
    "u",
  );
  const out = new Map<number, string>();
  let current: number | undefined;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (TAG_START.exec(trimmed) !== null) break;
    const marker = trimmed.match(LEGEND_ROW);
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
  const INLINE_REF: Regex = arkRegex.as(
    String.raw`${AT_SOURCE}ref\s+(${DIGIT_SOURCE}+)${DOT_SOURCE}?\s*([^\n]*)`,
    "gu",
  );
  const refs: number[] = [];
  const annotations = new Map<number, string>();
  for (const m of text.matchAll(INLINE_REF)) {
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
  const LEGEND_TAG: Regex = arkRegex.as(`^${AT_SOURCE}annotations${WORD_BOUNDARY_SOURCE}`, "u");
  const stripped = stripCommentFraming(text);
  const lines = stripped.split("\n");
  const first = lines.find((line) => line.trim().length > 0)?.trim() ?? "";
  const { refs, annotations: inlineAnnotations } = parseInlineRefs(stripped);
  if (!LEGEND_TAG.test(first)) return { annotations: inlineAnnotations, refs };
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
  const FUNCTION_NAME: Regex = arkRegex.as(`^(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})`, "u");
  const PARAMETERS: Regex = arkRegex.as(
    `${PAREN_OPEN_SOURCE}([^${PAREN_CLOSE_SOURCE}]*)${PAREN_CLOSE_SOURCE}`,
    "u",
  );
  const PARAMETER: Regex = arkRegex.as(`(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})`, "gu");
  const RETURNS: Regex = arkRegex.as(
    String.raw`${WORD_BOUNDARY_SOURCE}returns${WORD_BOUNDARY_SOURCE}\s+(.+)$`,
    "iu",
  );
  const params = node.params.trim();
  const nameMatch = params.match(FUNCTION_NAME);
  if (!nameMatch) return;
  const paren = params.match(PARAMETERS);
  const parameters = paren ? [...paren[1].matchAll(PARAMETER)].map((m) => m[1]) : [];
  const returns = params.match(RETURNS);
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
  // The base `&`/`:scope` currently resolve to, or `undefined` if they don't resolve to this record's
  // own base at all here (see {@link scopeMatchesBase}/{@link ampStaysAtScope}). Always `baseNoDot` or
  // `undefined` — never a third value.
  ampBase?: string,
  // Whether this record's own `baseNoDot` can EVER be the target of an `&`/`:scope` substitution. False
  // for a record whose authored `@selector` named a descendant compound (e.g. `.pfx-list > li`) that got
  // truncated to just its leading class (`.pfx-list`) — that truncated class is indistinguishable from
  // (often identical to) a PARENT record's own base, so treating `&` there as "this record's base" would
  // misattribute the parent's modifiers to this member (see `scopeMatchesBase`'s docs).
  ownScopeEligible = true,
): void {
  const VAR: Regex = arkRegex.as(
    String.raw`var${PAREN_OPEN_SOURCE}\s*(${TOKEN_CUSTOM_PROPERTY_SOURCE})`,
    "gu",
  );
  const DEPRECATED: Regex = arkRegex.as(
    String.raw`${AT_SOURCE}deprecated.*?use\s+(${DOT_SOURCE}${ALPHANUMERIC_EXTENDED_SOURCE}+|${BRACKET_OPEN_SOURCE}[^${BRACKET_CLOSE_SOURCE}]*${BRACKET_CLOSE_SOURCE})`,
    "u",
  );
  const TODO: Regex = arkRegex.as(String.raw`(^|\s)${AT_SOURCE}todo${WORD_BOUNDARY_SOURCE}`, "u");
  const TODO_PREFIX: Regex = arkRegex.as(
    String.raw`^${AT_SOURCE}todo${WORD_BOUNDARY_SOURCE}[${COLON_CHAR}\s]*`,
    "u",
  );
  const CSSDOC_DIRECTIVE: Regex = arkRegex.as(String.raw`^\s*cssdoc${DASH_SOURCE}`, "u");
  const TRUE: Regex = arkRegex.as("^true$", "iu");
  const CUSTOM_STATE = toRegExp(CSSDOC_CUSTOM_STATE_SELECTOR);
  const ATTRIBUTE_STATE: Regex = arkRegex.as(ATTRIBUTE_STATE_SOURCE, "gu");
  const SHADOW_PART = toRegExp(CSSDOC_SHADOW_PART_SELECTOR);
  const PSEUDO = toRegExp(CSSDOC_SCANNED_PSEUDO_SELECTOR);
  const FINAL_COMPOUND: Regex = arkRegex.as(
    String.raw`([^\s${GREATER_THAN_CHAR}${TILDE_CHAR}+]+)\s*$`,
    "u",
  );
  const CLASS_REF = toRegExp(CSSDOC_BASE_CLASS_REFERENCE);
  let pendingCanonical: string | undefined;
  let pendingDescription: string | undefined;

  for (const node of nodes) {
    if (node.type === "comment") {
      const legend = parseLegendFromInlineComment(node.text);
      for (const [ref, text] of legend.annotations) acc.annotations.set(ref, text);
      for (const ref of legend.refs) acc.refs.push(ref);
      const dep = node.text.match(DEPRECATED);
      if (dep) {
        pendingCanonical = matcher.normalizeMember(dep[1]);
      } else if (TODO.test(node.text)) {
        // A `/* @todo … */` note — a record to-do, not a member description.
        const todo = stripCommentFraming(node.text).replace(TODO_PREFIX, "").trim();
        if (todo) acc.todos.push(todo);
      } else if (!CSSDOC_DIRECTIVE.test(node.text) && inlineMode !== "ignore") {
        // Any other comment is provisional prose for the next member-defining rule.
        const text = stripCommentFraming(node.text).replace(WHITESPACE, " ").trim();
        if (text) pendingDescription = text;
      }
      continue;
    }
    if (node.type === "decl") {
      for (const m of node.value.matchAll(VAR)) acc.consumed.add(m[1]);
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
          inherits: inherits === undefined ? undefined : TRUE.test(inherits.trim()),
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
        if (params && !params.startsWith(PAREN_OPEN_CHAR)) {
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
          node.name === "scope"
            ? ownScopeEligible && scopeMatchesBase(scopePreludeBase(node.params), baseNoDot)
              ? baseNoDot
              : undefined
            : ampBase,
          ownScopeEligible,
        );
      continue;
    }
    if (node.type === "rule") {
      // Only let `&`/`:scope` stand in for the base here when the enclosing `@scope` actually IS this
      // record's own base — otherwise (a different component's scope, or a sibling part's own nested
      // scope) neutralize them so they can't be mistaken for it.
      const ampEnabled = ampBase === baseNoDot;
      for (const selector of node.selector.split(",")) {
        // States, before pseudos are stripped: custom `:state(x)`, native pseudo-classes, and
        // shadow `::part(x)` parts are all read off the raw selector.
        for (const s of selector.matchAll(CUSTOM_STATE)) {
          if (!acc.states.has(s[1])) acc.states.set(s[1], { name: s[1], kind: "custom" });
        }
        for (const ps of matcher.pseudoStatesIn(selector)) {
          if (!acc.states.has(ps.name))
            acc.states.set(ps.name, { name: ps.name, kind: "pseudo-class" });
        }
        for (const as of selector.matchAll(ATTRIBUTE_STATE)) {
          const attrSelector = `${BRACKET_OPEN_CHAR}${as[1]}${EQUALS_CHAR}${as[2]}${BRACKET_CLOSE_CHAR}`;
          const name = `${as[1]}${EQUALS_CHAR}${unquote(as[2])}`;
          if (!acc.states.has(name))
            acc.states.set(name, { name, kind: "attribute", selector: attrSelector });
        }
        for (const sp of selector.matchAll(SHADOW_PART)) {
          if (!acc.shadowParts.has(sp[1])) acc.shadowParts.set(sp[1], { name: sp[1] });
        }
        for (const pe of matcher.pseudoElementsIn(selector)) {
          if (!acc.pseudoElements.has(pe.name))
            acc.pseudoElements.set(pe.name, { name: pe.name, description: pendingDescription });
        }
        const bare = selector.replace(PSEUDO, ""); // drop pseudos
        const matchable = ampEnabled ? bare : neutralizeAmp(bare);
        const mods = matcher.modifiersIn(matchable, baseNoDot);
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
        for (const st of matcher.statesIn(matchable, baseNoDot)) {
          if (!acc.states.has(st.name)) acc.states.set(st.name, { name: st.name, kind: "class" });
        }
        if (inScope) {
          // Only derive parts from the final compound — ancestor segments are scoping context.
          const finalBare = bare.match(FINAL_COMPOUND)?.[1] ?? bare;
          for (const m of finalBare.matchAll(CLASS_REF)) {
            const part = m[1];
            if (modNames.has(part)) continue; // a modifier, not a part
            if (part === baseNoDot) continue; // the record's own base class, not a part of itself
            if (prefixNoDot && part.startsWith(prefixNoDot)) continue; // a component ref, not a part
            if (!acc.parts.has(part))
              acc.parts.set(part, { name: part, description: pendingDescription });
          }
        }
      }
      for (const child of node.nodes ?? []) {
        if (child.type === "decl")
          for (const m of child.value.matchAll(VAR)) acc.consumed.add(m[1]);
      }
      if (node.nodes) {
        // `&`/`:scope` keep meaning this same scope root one level deeper only while every comma branch
        // of this rule's own selector is still just the root with no combinator (see ampStaysAtScope);
        // once a combinator introduces a new compound (`& > .part`), a nested rule's `&` refers to THAT
        // compound, not this one, so we stop attributing modifiers found there to this record's base.
        const childAmpBase =
          ampEnabled && node.selector.split(",").every((branch) => ampStaysAtScope(branch))
            ? ampBase
            : undefined;
        collect(
          node.nodes,
          acc,
          matcher,
          baseNoDot,
          prefixNoDot,
          inScope,
          inlineMode,
          childAmpBase,
          ownScopeEligible,
        );
      }
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
  const ATTRIBUTE_STATE_TAG: Regex = arkRegex.as(`^${ATTRIBUTE_STATE_SOURCE}$`, "u");
  const LEADING_DOT: Regex = arkRegex.as(`^${DOT_SOURCE}`, "u");
  // Base selector: an explicit @selector wins immediately when set.
  // Otherwise infer from bare single-class rules — preferring the one ending with the record name.
  let className = doc.className ?? "";
  if (className && !SINGLE_CLASS.test(className)) {
    // Non-class explicit selector (attribute, ID, :host, compound, …) — trust it as-is.
  } else if (!className) {
    const bare = nodes
      .filter((n): n is ChildNode & { selector: string } => n.type === "rule")
      .map((n) => n.selector.trim())
      .filter((sel) => SINGLE_CLASS.test(sel));
    const nameEsc = escapeRegex(name);
    const endsWithName: Regex = arkRegex.as(`(?:^|${DASH_SOURCE})${nameEsc}$`, "u");
    // A masked `${p}` prefix abuts the name with no `-` (`.aaaabadge`), so the boundary match above
    // misses it and would fall through to the first bare rule — a wrapper like `.aaaabadge-wrapper`.
    // Fall back to any bare class ending in the name (shortest first, so `.badge` beats `.superbadge`).
    const endsLoose: Regex = arkRegex.as(`${nameEsc}$`, "u");
    className =
      bare.find((sel) => endsWithName.test(sel.slice(1))) ??
      bare
        .filter((sel) => endsLoose.test(sel.slice(1)))
        .toSorted((a, b) => a.length - b.length)[0] ??
      bare[0] ??
      "";
  }
  if (!className) className = `${DOT_CHAR}${name}`;

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
  const baseNoDot = className.replace(LEADING_DOT, "");
  const prefixNoDot = className.endsWith(name)
    ? className.slice(1, className.length - name.length) // ".button" − "button" → ""
    : "";
  // An authored `@selector` naming a descendant compound (e.g. `.pfx-list > li`) truncates to just its
  // leading class (see the `@selector` grammar case) — that truncated base is indistinguishable from
  // (often identical to) a PARENT record's own base, so `&`/`:scope` must never resolve to it here.
  const ownScopeEligible = !doc.fullSelector || !SELECTOR_COMBINATOR.test(doc.fullSelector);
  collect(
    nodes,
    acc,
    matcher,
    baseNoDot,
    prefixNoDot,
    false,
    inlineMode,
    undefined,
    ownScopeEligible,
  );

  // Merge in authored prose; authored @modifier/@part entries also appear even if extraction missed.
  for (const [modName, mdoc] of doc.modifiers) {
    const existing = acc.modifiers.get(modName);
    const parseCanonicalAndNote = (
      raw: string,
      allowBareCanonical: boolean,
    ): { canonical?: string; note?: string } => {
      const OPEN_BRACKET: Regex = arkRegex.as(`^${BRACKET_OPEN_SOURCE}`, "u");
      const CLOSE_BRACKET: Regex = arkRegex.as(`${BRACKET_CLOSE_SOURCE}$`, "u");
      const LINK: Regex = arkRegex.as(
        String.raw`${BRACE_OPEN_SOURCE}${AT_SOURCE}link\s+(${CSSDOC_MODIFIER_REFERENCE_SOURCE})\s*${BRACE_CLOSE_SOURCE}`,
        "u",
      );
      const LINK_TEXT: Regex = arkRegex.as(
        String.raw`${BRACE_OPEN_SOURCE}${AT_SOURCE}link\s+[^${BRACE_CLOSE_SOURCE}]*${BRACE_CLOSE_SOURCE}`,
        "u",
      );
      const BARE: Regex = arkRegex.as(`^(${CSSDOC_MODIFIER_REFERENCE_SOURCE})(.*)$`, "u");
      const trimmed = raw.trim();
      const normalizeCanonical = (value: string): string =>
        value.replace(LEADING_DOT, "").replace(OPEN_BRACKET, "").replace(CLOSE_BRACKET, "");
      const link = trimmed.match(LINK);
      if (link) {
        const canonical = normalizeCanonical(link[1]);
        const note = trimmed.replace(LINK_TEXT, "").trim() || undefined;
        return { canonical, note };
      }
      if (allowBareCanonical) {
        const bare = trimmed.match(BARE);
        if (bare) {
          const canonical = normalizeCanonical(bare[1]);
          const note = bare[2].trim() || undefined;
          return { canonical, note };
        }
      }
      return { note: trimmed || undefined };
    };
    const DEPRECATED_INLINE: Regex = arkRegex.as(
      String.raw`^(?:[${DASH_SOURCE}—]\s*)?${AT_SOURCE}deprecated${WORD_BOUNDARY_SOURCE}\s*([\s\S]*)$`,
      "u",
    );
    const ALIAS_INLINE: Regex = arkRegex.as(
      String.raw`^(?:[${DASH_SOURCE}—]\s*)?${AT_SOURCE}alias${WORD_BOUNDARY_SOURCE}\s*([\s\S]*)$`,
      "u",
    );
    const depInline = mdoc.description?.match(DEPRECATED_INLINE);
    const aliasInline = mdoc.description?.match(ALIAS_INLINE);
    const depInlineParsed = depInline ? parseCanonicalAndNote(depInline[1], false) : undefined;
    const aliasInlineParsed = aliasInline ? parseCanonicalAndNote(aliasInline[1], true) : undefined;
    const authoredDescription = depInline || aliasInline ? undefined : mdoc.description;
    // An authored `@deprecated {@link -x}` contributes a canonical; plain text contributes a note. Build
    // with only the defined keys so merging onto an AST-derived deprecation never clobbers with undefined.
    // A bare `@deprecated` (no note, no link) still marks the modifier deprecated — as an empty object —
    // so lint can flag that it lacks a replacement.
    const dep =
      mdoc.deprecated || mdoc.deprecatedCanonical || mdoc.deprecatedFlag || depInline
        ? {
            ...(mdoc.deprecated ? { note: mdoc.deprecated } : {}),
            ...(mdoc.deprecatedCanonical ? { canonical: mdoc.deprecatedCanonical } : {}),
            ...(depInlineParsed?.note ? { note: depInlineParsed.note } : {}),
            ...(depInlineParsed?.canonical ? { canonical: depInlineParsed.canonical } : {}),
          }
        : undefined;
    const alias =
      mdoc.alias || mdoc.aliasCanonical || aliasInline
        ? {
            ...(mdoc.alias ? { note: mdoc.alias } : {}),
            ...(mdoc.aliasCanonical ? { canonical: mdoc.aliasCanonical } : {}),
            ...(aliasInlineParsed?.note ? { note: aliasInlineParsed.note } : {}),
            ...(aliasInlineParsed?.canonical ? { canonical: aliasInlineParsed.canonical } : {}),
          }
        : undefined;
    if (existing) {
      existing.description = combineDescription(
        inlineMode,
        authoredDescription,
        existing.description,
      );
      if (dep) existing.deprecated = { ...existing.deprecated, ...dep };
      if (alias) existing.alias = { ...existing.alias, ...alias };
      if (mdoc.interaction) existing.interaction = true;
      if (mdoc.global) existing.global = true;
      if (mdoc.affects) existing.affects = [...(existing.affects ?? []), ...mdoc.affects];
    } else {
      const { prop, value } = matcher.analyze(modName);
      const modSel = doc.modifierSelectors.get(modName);
      acc.modifiers.set(modName, {
        name: modName,
        prop,
        value,
        ...(modName.includes(ASTERISK_CHAR) ? { pattern: true } : {}),
        description: authoredDescription,
        deprecated: dep,
        alias,
        ...(modSel ? { selector: modSel } : {}),
        ...(mdoc.interaction ? { interaction: true } : {}),
        ...(mdoc.global ? { global: true } : {}),
        ...(mdoc.affects ? { affects: mdoc.affects } : {}),
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
    const isPseudo = rawState.startsWith(COLON_CHAR);
    const attrMatch = rawState.match(ATTRIBUTE_STATE_TAG);
    const state = isPseudo
      ? rawState.slice(1)
      : attrMatch
        ? `${attrMatch[1]}${EQUALS_CHAR}${unquote(attrMatch[2])}`
        : rawState;
    const existing = acc.states.get(state);
    if (existing) existing.description = description || existing.description;
    else
      acc.states.set(state, {
        name: state,
        kind: isPseudo ? "pseudo-class" : attrMatch ? "attribute" : "custom",
        description: description || undefined,
        ...(attrMatch
          ? {
              selector: `${BRACKET_OPEN_CHAR}${attrMatch[1]}${EQUALS_CHAR}${attrMatch[2]}${BRACKET_CLOSE_CHAR}`,
            }
          : {}),
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

  const modifiers = [...acc.modifiers.values()].toSorted(
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

  const structure = doc.structure;

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
        // A nested `@variant` group has its alternatives in `variants`, not `children`.
        for (const variant of node.variants ?? []) applyWrappers(variant.nodes);
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

  const memberDeclsByName = new Map<string, { name: string; private: boolean }>();
  for (const name of doc.members ?? []) {
    if (!memberDeclsByName.has(name)) memberDeclsByName.set(name, { name, private: false });
  }
  for (const member of doc.memberEntries) {
    const existing = memberDeclsByName.get(member.name);
    if (existing) {
      existing.private = existing.private || member.private;
      continue;
    }
    memberDeclsByName.set(member.name, { ...member });
  }
  const memberDeclarations = [...memberDeclsByName.values()];
  const members = memberDeclarations.map((m) => m.name);

  return {
    name,
    kind: doc.kind ?? "component",
    className,
    summary: doc.summary,
    remarks: doc.remarks,
    privateRemarks: doc.privateRemarks,
    releaseStage: doc.releaseStage,
    visibility: doc.visibility,
    since: doc.since,
    group: doc.group,
    accessibility: doc.accessibility,
    modifiers,
    parts: [...acc.parts.values()]
      .toSorted(byName)
      .map((p) => (p.modifiers ? { ...p, modifiers: [...p.modifiers].toSorted(byName) } : p)),
    shadowParts: [...acc.shadowParts.values()].toSorted(byName),
    pseudoElements: [...acc.pseudoElements.values()].toSorted(byName),
    states: [...acc.states.values()].toSorted(byName),
    slots: [...doc.slots]
      .map(([slotName, description]) => ({
        name: slotName,
        description: description || undefined,
      }))
      .toSorted(byName),
    todos: [...doc.todos, ...acc.todos],
    cssPropertiesConsumed: [...consumedTokens.values()].toSorted(byName),
    cssPropertiesDeclared: [...acc.declared.values()].toSorted(byName),
    functions: [...acc.functions.values()].toSorted(byName),
    animations: [...acc.animations.values()].toSorted(byName),
    layers: [...acc.layers.values()].toSorted(byName),
    conditions: acc.conditions,
    examples: doc.examples,
    ...(doc.exampleLabels ? { exampleLabels: doc.exampleLabels } : {}),
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
    ...(doc.memberOf ? { memberOf: doc.memberOf } : {}),
    ...(members.length ? { members } : {}),
    ...(memberDeclarations.length ? { memberDeclarations } : {}),
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
  return offset === undefined
    ? node.text.startsWith(ASTERISK_CHAR)
    : source.startsWith(DOC_COMMENT_START_TEXT, offset);
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
          doc: parseDocComment(node.toString(), configuration, parse),
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
