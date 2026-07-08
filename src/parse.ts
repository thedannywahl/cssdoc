/**
 * The PostCSS-based parser: turn a CSS string into a {@link CssDocEntry}[] documentation model.
 *
 * It is AST-first — the machine facts (base class, modifiers, parts, consumed/declared custom
 * properties, deprecated-alias links) are derived from the actual selectors and declarations, so they
 * can't drift from the shipping CSS. Authored `/** … *\/` doc comments (parsed by
 * {@link parseDocComment}) supply only prose (summaries, descriptions) and demo/see links, and delimit
 * one component from the next.
 *
 * @module
 */
import postcss, { type ChildNode } from "postcss";
import { parseDocComment, recordNameOf, type ParsedDoc } from "./grammar.ts";
import type {
  CssDocEntry,
  CssModifier,
  CssPart,
  CssPropertyDeclared,
  ParseOptions,
} from "./model.ts";

/** Matches a `var(--name` reference; group 1 is the custom-property name. */
const VAR_RE = /var\(\s*(--[\w-]+)/gu;

const unquote = (value: string): string => value.trim().replace(/^["']|["']$/gu, "");

/** Split a `-<prop>-<value>` (or boolean `-<flag>`) modifier into its prop/value segments. */
function splitModifier(name: string): { prop: string; value?: string } {
  // name like "-color-secondary" → prop "color", value "secondary"; "-condensed" → prop "condensed".
  const body = name.replace(/^-/u, "");
  const dash = body.indexOf("-");
  if (dash === -1) return { prop: body };
  return { prop: body.slice(0, dash), value: body.slice(dash + 1) };
}

interface Collected {
  className: string;
  modifiers: Map<string, CssModifier>;
  parts: Map<string, CssPart>;
  consumed: Set<string>;
  declared: Map<string, CssPropertyDeclared>;
}

/** Extract every fact from one record's nodes into `acc`. */
function collect(
  nodes: ChildNode[],
  acc: Collected,
  baseEsc: string,
  prefixNoDot: string,
  inScope: boolean,
): void {
  const modRe = new RegExp(`(?:${baseEsc}|:scope)((?:\\.-[\\w-]+)+)`, "gu");
  let pendingCanonical: string | undefined;

  for (const node of nodes) {
    if (node.type === "comment") {
      const dep = node.text.match(/@deprecated.*?use\s+\.(-[\w-]+)/u);
      if (dep) pendingCanonical = dep[1];
      continue;
    }
    if (node.type === "decl") {
      for (const m of node.value.matchAll(VAR_RE)) acc.consumed.add(m[1]);
      continue;
    }
    if (node.type === "atrule") {
      if (node.name === "property") {
        const name = node.params.trim();
        const syntaxDecl = node.nodes?.find((n) => n.type === "decl" && n.prop === "syntax");
        acc.declared.set(name, {
          name,
          syntax: syntaxDecl && "value" in syntaxDecl ? unquote(syntaxDecl.value) : undefined,
        });
      }
      if (node.nodes)
        collect(node.nodes, acc, baseEsc, prefixNoDot, inScope || node.name === "scope");
      continue;
    }
    if (node.type === "rule") {
      for (const selector of node.selector.split(",")) {
        const bare = selector.replace(/::?[\w-]+(\([^)]*\))?/gu, ""); // drop pseudos
        for (const m of bare.matchAll(modRe)) {
          for (const mod of m[1].matchAll(/\.(-[\w-]+)/gu)) {
            const modName = mod[1];
            const existing = acc.modifiers.get(modName);
            const { prop, value } = splitModifier(modName);
            const entry: CssModifier = existing ?? { name: modName, prop, value };
            if (pendingCanonical) entry.deprecated = { canonical: pendingCanonical };
            acc.modifiers.set(modName, entry);
          }
        }
        if (inScope) {
          for (const m of bare.matchAll(/\.([a-z][\w-]*)/gu)) {
            const part = m[1];
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

/** Build one entry from its record name, doc comment, and nodes. */
function buildEntry(name: string, doc: ParsedDoc, nodes: ChildNode[]): CssDocEntry {
  // Base class: an explicit @class, else a bare single-class rule — preferring the one whose name ends
  // with the record name (`.instui-badge`, not a sibling like `.instui-badge-wrapper` that happens to
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
    consumed: new Set(),
    declared: new Map(),
  };
  const baseEsc = className.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const prefixNoDot = className.endsWith(name)
    ? className.slice(1, className.length - name.length) // ".instui-button" − "button" → "instui-"
    : "";
  collect(nodes, acc, baseEsc, prefixNoDot, false);

  // Merge in authored prose; authored @modifier/@part entries also appear even if extraction missed.
  for (const [modName, mdoc] of doc.modifiers) {
    const existing = acc.modifiers.get(modName);
    // An authored `@deprecated {@link -x}` contributes a canonical; plain text contributes a note. Build
    // with only the defined keys so merging onto an AST-derived deprecation never clobbers with undefined.
    const dep =
      mdoc.deprecated || mdoc.deprecatedCanonical
        ? {
            ...(mdoc.deprecated ? { note: mdoc.deprecated } : {}),
            ...(mdoc.deprecatedCanonical ? { canonical: mdoc.deprecatedCanonical } : {}),
          }
        : undefined;
    if (existing) {
      if (mdoc.description) existing.description = mdoc.description;
      if (dep) existing.deprecated = { ...existing.deprecated, ...dep };
    } else {
      const { prop, value } = splitModifier(modName);
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
  for (const prop of doc.cssProperties) {
    const existing = acc.declared.get(prop.name);
    acc.declared.set(prop.name, {
      name: prop.name,
      syntax: prop.syntax ?? existing?.syntax,
      description: prop.description ?? existing?.description,
    });
  }

  const modifiers = [...acc.modifiers.values()].sort(
    (a, b) => a.prop.localeCompare(b.prop) || (a.value ?? "").localeCompare(b.value ?? ""),
  );
  const parts = [...acc.parts.values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    name,
    kind: doc.kind ?? "component",
    className,
    summary: doc.summary,
    modifiers,
    parts,
    cssPropertiesConsumed: [...acc.consumed].sort(),
    cssPropertiesDeclared: [...acc.declared.values()].sort((a, b) => a.name.localeCompare(b.name)),
    examples: doc.examples,
    structure: doc.structure,
    demo: doc.demo,
    deprecated: doc.deprecated,
    see: doc.see,
  };
}

/**
 * Parse a CSS string into a documentation model. Records are delimited by doc comments carrying an
 * `@component`/`@name` tag (override via {@link ParseOptions.isRecordBoundary}); everything from one
 * boundary comment to the next belongs to that record.
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
  const boundary = options.isRecordBoundary ?? recordNameOf;
  const root = postcss.parse(css);
  const records: { name: string; doc: ParsedDoc; nodes: ChildNode[] }[] = [];
  let current: { name: string; doc: ParsedDoc; nodes: ChildNode[] } | null = null;

  for (const node of root.nodes) {
    if (node.type === "comment") {
      const name = boundary(node.text);
      if (name) {
        current = { name, doc: parseDocComment(node.text), nodes: [] };
        records.push(current);
        continue;
      }
    }
    if (current) current.nodes.push(node);
  }

  return records.map((r) => buildEntry(r.name, r.doc, r.nodes));
}
