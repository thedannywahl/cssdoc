/**
 * The aspect modules. Each documented aspect contributes some of: author-side model diagnostics,
 * consumer-side usage diagnostics, completions, hover, and definitions. All six aspects the model
 * carries are represented; the component hover folds in the structure, state, and condition facts, and
 * the generators (phase 3) surface them further. `index.ts` aggregates these into the public API.
 *
 * @module
 */
import type { StructureNode } from "@cssdoc/core";
import {
  type ClassUsage,
  type CssDocIndex,
  type Location,
  type PropertyAssignment,
  type PropertyUsage,
  type RecordInfo,
  memberKey,
} from "@cssdoc/index";
import { matchesSyntax } from "./syntax.ts";
import type { Completion, Diagnostic, Hover, ResolvedNaming, UsageOptions } from "./types.ts";

const stripDot = (name: string): string => name.replace(/^\./u, "");
const warn = (d: Omit<Diagnostic, "severity">): Diagnostic => ({ ...d, severity: "warning" });

// ── record ──────────────────────────────────────────────────────────────────────────────────────

export const record = {
  model(index: CssDocIndex, naming?: ResolvedNaming): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const info of index.records) {
      if (!info.entry.summary?.trim()) {
        out.push(
          warn({
            aspect: "record",
            rule: "missing-summary",
            message: `Record "${info.entry.name}" has no @summary.`,
            record: info.entry.name,
            span: info.span,
          }),
        );
      }
      // Component base-class name case (e.g. SUIT PascalCase). Only components carry this convention.
      if (naming?.component && info.entry.kind === "component" && info.entry.className) {
        if (!naming.component.test(stripDot(info.entry.className))) {
          out.push(
            warn({
              aspect: "record",
              rule: "component-name-case",
              message: `Component class "${info.entry.className}" doesn't match the configured name case.`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        }
      }
      // Every simple class selector named in @structure should resolve to the component class or a
      // documented member — catches drift when a selector is renamed but the doc comment isn't.
      if (info.entry.structure?.length) {
        const known = new Set<string>([
          stripDot(info.entry.className),
          ...info.entry.parts.map((p) => stripDot(p.name)),
          ...info.entry.states.map((s) => s.name),
          ...info.entry.modifiers.map((m) => m.name),
        ]);
        const flat: StructureNode[] = [];
        const walk = (nodes: StructureNode[]): void => {
          for (const node of nodes) {
            flat.push(node);
            walk(node.children);
          }
        };
        walk(info.entry.structure);
        for (const node of flat) {
          const sel = node.selector.trim();
          // Only a single, simple class selector is checkable; skip compound/complex ones.
          if (!/^\.[\w-]+$/u.test(sel) || known.has(stripDot(sel))) continue;
          out.push(
            warn({
              aspect: "record",
              rule: "structure-unknown-selector",
              message: `@structure references "${sel}", which isn't the component class or a documented part.`,
              record: info.entry.name,
              span: info.span,
            }),
          );
        }
      }
    }
    return out;
  },

  completions(index: CssDocIndex): Completion[] {
    return index.entries.map((entry) => ({
      label: stripDot(entry.className),
      kind: "component" as const,
      detail: entry.kind,
      documentation: entry.summary,
      deprecated: Boolean(entry.deprecated),
    }));
  },

  hover(base: string, index: CssDocIndex): Hover | undefined {
    const entry = index.componentForClass(base);
    if (!entry) return undefined;
    const lines = [`\`${entry.className}\` — ${entry.kind}`];
    if (entry.summary) lines.push("", entry.summary);
    if (entry.remarks) lines.push("", entry.remarks);
    const facets = [
      entry.modifiers.length && `${entry.modifiers.length} modifiers`,
      entry.parts.length && `${entry.parts.length} parts`,
      entry.shadowParts.length && `${entry.shadowParts.length} shadow parts`,
      entry.states.length && `${entry.states.length} states`,
      entry.cssPropertiesDeclared.length &&
        `${entry.cssPropertiesDeclared.length} custom properties`,
      entry.functions.length && `${entry.functions.length} functions`,
      entry.conditions.length && `${entry.conditions.length} conditions`,
    ].filter(Boolean);
    if (facets.length) lines.push("", facets.join(" · "));
    if (entry.deprecated) lines.push("", `**Deprecated** — ${entry.deprecated}`);
    return { contents: lines.join("\n") };
  },

  definition(base: string, index: CssDocIndex): Location | undefined {
    const entry = index.componentForClass(base);
    return entry ? index.location(entry.name, "record") : undefined;
  },
};

// ── modifier ────────────────────────────────────────────────────────────────────────────────────

export const modifier = {
  model(index: CssDocIndex): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const info of index.records) {
      const name = info.entry.name;
      for (const m of info.entry.modifiers) {
        const sel = index.matcher.selectorFor(m.name);
        const span = info.memberSpans.get(memberKey("modifier", m.name)) ?? info.span;
        if (!m.description?.trim() && !m.deprecated) {
          out.push(
            warn({
              aspect: "modifier",
              rule: "undocumented-modifier",
              message: `Modifier "${sel}" of "${name}" has no @modifier description.`,
              record: name,
              span,
            }),
          );
        }
        if (m.deprecated && !m.deprecated.canonical && !m.deprecated.note?.trim()) {
          out.push(
            warn({
              aspect: "modifier",
              rule: "deprecated-requires-canonical",
              message: `Deprecated modifier "${sel}" of "${name}" needs a canonical replacement ({@link}) or a note.`,
              record: name,
              span,
            }),
          );
        }
      }
      for (const authored of info.authoredModifiers) {
        if (!info.selectorText.includes(index.matcher.selectorFor(authored))) {
          out.push(
            warn({
              aspect: "modifier",
              rule: "name-not-in-css",
              message: `Documented modifier "${index.matcher.selectorFor(authored)}" of "${name}" is not defined by any selector.`,
              record: name,
              span: info.span,
            }),
          );
        }
      }
    }
    return out;
  },

  classUsage(usage: ClassUsage, index: CssDocIndex): Diagnostic[] {
    if (!usage.base || !index.matcher.looksLikeUsage(usage.token, usage.base)) return [];
    const entry = index.componentForClass(usage.base);
    if (!entry) return [];
    const sel = index.matcher.selectorFor(index.matcher.normalizeMember(usage.token));
    if (!index.isModifier(usage.base, usage.token)) {
      return [
        warn({
          aspect: "modifier",
          rule: "unknown-modifier",
          message: `"${sel}" is not a documented modifier of "${entry.name}".`,
          record: entry.name,
          span: usage.loc,
        }),
      ];
    }
    const dep = index.deprecationOf(usage.base, usage.token);
    if (dep) {
      const advice = dep.canonical
        ? `use "${index.matcher.selectorFor(dep.canonical)}"`
        : (dep.note ?? "no replacement given");
      return [
        warn({
          aspect: "modifier",
          rule: "deprecated-modifier",
          message: `Modifier "${sel}" of "${entry.name}" is deprecated — ${advice}.`,
          record: entry.name,
          span: usage.loc,
        }),
      ];
    }
    return [];
  },

  completions(base: string, index: CssDocIndex): Completion[] {
    const entry = index.componentForClass(base);
    if (!entry) return [];
    return entry.modifiers.map((m) => ({
      label: m.name,
      kind: "modifier" as const,
      detail: m.prop,
      documentation: m.description,
      deprecated: Boolean(m.deprecated),
    }));
  },

  hover(base: string, token: string, index: CssDocIndex): Hover | undefined {
    const entry = index.componentForClass(base);
    const m = entry?.modifiers.find((x) => x.name === index.matcher.normalizeMember(token));
    if (!m) return undefined;
    const lines = [
      `\`${index.matcher.selectorFor(m.name)}\` — modifier of \`${entry!.className}\``,
    ];
    if (m.description) lines.push("", m.description);
    if (m.deprecated) {
      const advice = m.deprecated.canonical
        ? `use \`${index.matcher.selectorFor(m.deprecated.canonical)}\``
        : (m.deprecated.note ?? "");
      lines.push("", `**Deprecated** — ${advice}`);
    }
    return { contents: lines.join("\n") };
  },

  definition(base: string, token: string, index: CssDocIndex): Location | undefined {
    const entry = index.componentForClass(base);
    return entry
      ? index.location(entry.name, memberKey("modifier", index.matcher.normalizeMember(token)))
      : undefined;
  },
};

// ── part ────────────────────────────────────────────────────────────────────────────────────────

export const part = {
  model(index: CssDocIndex, naming?: ResolvedNaming): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const info of index.records) {
      const name = info.entry.name;
      for (const p of info.entry.parts) {
        if (!p.description?.trim()) {
          out.push(
            warn({
              aspect: "part",
              rule: "undocumented-part",
              message: `Part ".${p.name}" of "${name}" has no @part description.`,
              record: name,
              span: info.memberSpans.get(memberKey("part", p.name)) ?? info.span,
            }),
          );
        }
        if (naming?.part && !naming.part.test(p.name)) {
          out.push(
            warn({
              aspect: "part",
              rule: "part-name-case",
              message: `Part ".${p.name}" of "${name}" doesn't match the configured name case.`,
              record: name,
              span: info.memberSpans.get(memberKey("part", p.name)) ?? info.span,
            }),
          );
        }
      }
      for (const authored of info.authoredParts) {
        if (!info.selectorText.includes(`.${authored}`)) {
          out.push(
            warn({
              aspect: "part",
              rule: "name-not-in-css",
              message: `Documented part ".${authored}" of "${name}" is not defined by any selector.`,
              record: name,
              span: info.span,
            }),
          );
        }
      }
    }
    return out;
  },
};

// ── shadow parts (`::part()`) ─────────────────────────────────────────────────────────────────────

export const cssPart = {
  model(index: CssDocIndex): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const info of index.records) {
      const name = info.entry.name;
      for (const p of info.entry.shadowParts) {
        if (!p.description?.trim()) {
          out.push(
            warn({
              aspect: "css-part",
              rule: "undocumented-css-part",
              message: `Shadow part "::part(${p.name})" of "${name}" has no @csspart description.`,
              record: name,
              span: info.memberSpans.get(memberKey("shadow-part", p.name)) ?? info.span,
            }),
          );
        }
      }
    }
    return out;
  },
};

// ── custom-property ─────────────────────────────────────────────────────────────────────────────

function findProperty(
  index: CssDocIndex,
  name: string,
): { record: RecordInfo; index: number } | undefined {
  for (const rec of index.records) {
    const i = rec.entry.cssPropertiesDeclared.findIndex((p) => p.name === name);
    if (i >= 0) return { record: rec, index: i };
  }
  return undefined;
}

export const customProperty = {
  /** Author-side: a registered property's default (`initial-value`/`@defaultValue`) must match its syntax. */
  model(index: CssDocIndex): Diagnostic[] {
    const out: Diagnostic[] = [];
    for (const { property, record } of index.allCustomProperties()) {
      if (!property.syntax || property.defaultValue === undefined) continue;
      const m = matchesSyntax(property.syntax, property.defaultValue);
      if (m.skipped || m.ok) continue;
      out.push(
        warn({
          aspect: "custom-property",
          rule: "invalid-default-value",
          message: `Default \`${property.defaultValue}\` of \`${property.name}\` doesn't match its syntax \`${property.syntax}\`.`,
          record,
          span: index.location(record, memberKey("property", property.name))?.span,
        }),
      );
    }
    return out;
  },

  /** Consumer-side: an assignment `--name: value` must match the property's declared syntax. */
  assignment(a: PropertyAssignment, index: CssDocIndex): Diagnostic[] {
    const found = findProperty(index, a.name);
    if (!found) return [];
    const property = found.record.entry.cssPropertiesDeclared[found.index];
    if (!property.syntax) return [];
    const m = matchesSyntax(property.syntax, a.value);
    if (m.skipped || m.ok) return [];
    return [
      warn({
        aspect: "custom-property",
        rule: "invalid-property-value",
        message: `\`${a.value}\` doesn't match the declared syntax \`${property.syntax}\` of \`${a.name}\`.`,
        record: found.record.entry.name,
        span: a.loc,
      }),
    ];
  },

  propertyUsage(usage: PropertyUsage, index: CssDocIndex, options: UsageOptions): Diagnostic[] {
    const out: Diagnostic[] = [];
    // A `var(--x, fallback)` fallback must match --x's declared syntax.
    if (usage.fallback) {
      const found = findProperty(index, usage.name);
      const property = found?.record.entry.cssPropertiesDeclared[found.index];
      if (property?.syntax) {
        const m = matchesSyntax(property.syntax, usage.fallback);
        if (!m.skipped && !m.ok) {
          out.push(
            warn({
              aspect: "custom-property",
              rule: "invalid-fallback-value",
              message: `\`var(${usage.name}, …)\` fallback \`${usage.fallback}\` doesn't match the declared syntax \`${property.syntax}\`.`,
              span: usage.loc,
            }),
          );
        }
      }
    }
    // Unknown custom property (opt-in via prefix).
    if (
      options.propertyPrefix &&
      usage.name.startsWith(options.propertyPrefix) &&
      !findProperty(index, usage.name)
    ) {
      out.push(
        warn({
          aspect: "custom-property",
          rule: "unknown-custom-property",
          message: `\`${usage.name}\` is not a documented custom property.`,
          span: usage.loc,
        }),
      );
    }
    return out;
  },

  completions(index: CssDocIndex): Completion[] {
    return index.allCustomProperties().map(({ property }) => ({
      label: property.name,
      kind: "property" as const,
      detail: property.syntax,
      documentation: property.description,
    }));
  },

  hover(name: string, index: CssDocIndex): Hover | undefined {
    const found = findProperty(index, name);
    if (!found) return undefined;
    const p = found.record.entry.cssPropertiesDeclared[found.index];
    const lines = [`\`${p.name}\`${p.syntax ? ` — \`${p.syntax}\`` : ""}`];
    if (p.defaultValue) lines.push("", `Default: \`${p.defaultValue}\``);
    if (p.description) lines.push("", p.description);
    return { contents: lines.join("\n") };
  },

  definition(name: string, index: CssDocIndex): Location | undefined {
    const found = findProperty(index, name);
    return found ? index.location(found.record.entry.name, memberKey("property", name)) : undefined;
  },
};

// ── function ────────────────────────────────────────────────────────────────────────────────────

export const func = {
  completions(index: CssDocIndex): Completion[] {
    return index.allFunctions().map(({ fn }) => ({
      label: fn.name,
      kind: "function" as const,
      detail: fn.result
        ? `(${fn.parameters.join(", ")}) → ${fn.result}`
        : `(${fn.parameters.join(", ")})`,
      documentation: fn.description,
    }));
  },

  hover(name: string, index: CssDocIndex): Hover | undefined {
    const match = index.allFunctions().find(({ fn }) => fn.name === name);
    if (!match) return undefined;
    const { fn } = match;
    const sig = `\`${fn.name}(${fn.parameters.join(", ")})\`${fn.result ? ` → \`${fn.result}\`` : ""}`;
    return { contents: fn.description ? `${sig}\n\n${fn.description}` : sig };
  },

  definition(name: string, index: CssDocIndex): Location | undefined {
    const match = index.allFunctions().find(({ fn }) => fn.name === name);
    return match ? index.location(match.record, memberKey("function", name)) : undefined;
  },
};
