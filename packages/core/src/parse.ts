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
import { CssDocConfiguration } from "./configuration.ts";
import { parseDocComment, recordNameOf, type ParsedDoc } from "./grammar.ts";
import { ModifierMatcher, resolveModifierConvention } from "./modifier.ts";
import type {
  CssAnimation,
  CssCondition,
  CssDocEntry,
  CssFunction,
  CssLayer,
  CssModifier,
  CssPart,
  CssPropertyDeclared,
  CssState,
  ParseOptions,
} from "./model.ts";

/** Matches a `var(--name` reference; group 1 is the custom-property name. */
const VAR_RE = /var\(\s*(--[\w-]+)/gu;

const unquote = (value: string): string => value.trim().replace(/^["']|["']$/gu, "");

interface Collected {
  className: string;
  modifiers: Map<string, CssModifier>;
  parts: Map<string, CssPart>;
  states: Map<string, CssState>;
  consumed: Set<string>;
  declared: Map<string, CssPropertyDeclared>;
  functions: Map<string, CssFunction>;
  animations: Map<string, CssAnimation>;
  layers: Map<string, CssLayer>;
  conditions: CssCondition[];
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
): void {
  let pendingCanonical: string | undefined;

  for (const node of nodes) {
    if (node.type === "comment") {
      const dep = node.text.match(/@deprecated.*?use\s+(\.[\w-]+|\[[^\]]*\])/u);
      if (dep) pendingCanonical = matcher.normalizeMember(dep[1]);
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
        collect(node.nodes, acc, matcher, baseNoDot, prefixNoDot, inScope || node.name === "scope");
      continue;
    }
    if (node.type === "rule") {
      for (const selector of node.selector.split(",")) {
        // Custom states via the CSSOM `:state()` pseudo-class.
        for (const s of selector.matchAll(/:state\(\s*([\w-]+)\s*\)/gu)) {
          if (!acc.states.has(s[1])) acc.states.set(s[1], { name: s[1] });
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
          };
          if (pendingCanonical) entry.deprecated = { canonical: pendingCanonical };
          acc.modifiers.set(mod.name, entry);
        }
        if (inScope) {
          for (const m of bare.matchAll(/\.([a-z][\w-]*)/gu)) {
            const part = m[1];
            if (modNames.has(part)) continue; // a modifier, not a part
            if (prefixNoDot && part.startsWith(prefixNoDot)) continue; // a component ref, not a part
            if (!acc.parts.has(part)) acc.parts.set(part, { name: part });
          }
        }
      }
      for (const child of node.nodes ?? []) {
        if (child.type === "decl")
          for (const m of child.value.matchAll(VAR_RE)) acc.consumed.add(m[1]);
      }
      pendingCanonical = undefined;
    }
  }
}

const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name);

/** Build one entry from its record name, doc comment, and nodes. */
function buildEntry(
  name: string,
  doc: ParsedDoc,
  nodes: ChildNode[],
  matcher: ModifierMatcher,
): CssDocEntry {
  // Base class: an explicit @class, else a bare single-class rule — preferring the one whose name ends
  // with the record name (`.badge`, not a sibling like `.badge-wrapper` that happens to
  // appear first).
  let className = doc.className ?? "";
  if (!className) {
    const bare = nodes
      .filter((n): n is ChildNode & { selector: string } => n.type === "rule")
      .map((n) => n.selector.trim())
      .filter((sel) => /^\.[a-z][\w-]*$/u.test(sel));
    const nameEsc = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const endsWithName = new RegExp(`(?:^|-)${nameEsc}$`, "u");
    className = bare.find((sel) => endsWithName.test(sel.slice(1))) ?? bare[0] ?? "";
  }
  if (!className) className = `.${name}`;

  const acc: Collected = {
    className,
    modifiers: new Map(),
    parts: new Map(),
    states: new Map(),
    consumed: new Set(),
    declared: new Map(),
    functions: new Map(),
    animations: new Map(),
    layers: new Map(),
    conditions: [],
  };
  const baseNoDot = className.replace(/^\./u, "");
  const prefixNoDot = className.endsWith(name)
    ? className.slice(1, className.length - name.length) // ".button" − "button" → ""
    : "";
  collect(nodes, acc, matcher, baseNoDot, prefixNoDot, false);

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
      if (mdoc.description) existing.description = mdoc.description;
      if (dep) existing.deprecated = { ...existing.deprecated, ...dep };
    } else {
      const { prop, value } = matcher.analyze(modName);
      acc.modifiers.set(modName, {
        name: modName,
        prop,
        value,
        description: mdoc.description,
        deprecated: dep,
      });
    }
  }
  for (const [part, description] of doc.parts) {
    const existing = acc.parts.get(part);
    if (existing) existing.description = description || existing.description;
    else acc.parts.set(part, { name: part, description });
  }
  for (const [state, description] of doc.cssStates) {
    const existing = acc.states.get(state);
    if (existing) existing.description = description || existing.description;
    else acc.states.set(state, { name: state, description: description || undefined });
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
    parts: [...acc.parts.values()].sort(byName),
    states: [...acc.states.values()].sort(byName),
    slots: [...doc.slots]
      .map(([slotName, description]) => ({
        name: slotName,
        description: description || undefined,
      }))
      .sort(byName),
    cssPropertiesConsumed: [...acc.consumed].sort(),
    cssPropertiesDeclared: [...acc.declared.values()].sort(byName),
    functions: [...acc.functions.values()].sort(byName),
    animations: [...acc.animations.values()].sort(byName),
    layers: [...acc.layers.values()].sort(byName),
    conditions: acc.conditions,
    examples: doc.examples,
    structure: doc.structure,
    demo: doc.demo,
    deprecated: doc.deprecated,
    see: doc.see,
    ...(doc.customBlocks.size > 0 ? { customBlocks: Object.fromEntries(doc.customBlocks) } : {}),
  };
}

/**
 * Parse a CSS string into a documentation model. Records are delimited by doc comments carrying a
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
  const root = postcss.parse(css);
  const records: { name: string; doc: ParsedDoc; nodes: ChildNode[] }[] = [];
  let current: { name: string; doc: ParsedDoc; nodes: ChildNode[] } | null = null;

  for (const node of root.nodes) {
    if (node.type === "comment") {
      const name = boundary(node.text);
      if (name) {
        current = { name, doc: parseDocComment(node.text, configuration), nodes: [] };
        records.push(current);
        continue;
      }
    }
    if (current) current.nodes.push(node);
  }

  return records.map((r) => buildEntry(r.name, r.doc, r.nodes, matcher));
}
