/**
 * The editor-agnostic language service: given document text and a position, it answers completion,
 * hover, definition, diagnostics, and code-action requests over the documented CSS surface, using
 * `@cssdoc/providers` and a prebuilt `@cssdoc/index`. It uses plain LSP-shaped types (no
 * `vscode-languageserver` import), so it is fully unit-testable; `server.ts` wires it to a connection.
 *
 * @module
 */
import {
  type ClassUsage,
  type CssDocIndex,
  type SourceSpan,
  createIndex,
  cssValueSites,
} from "@cssdoc/index";
import {
  DEFAULT_RULE_SEVERITIES,
  type RuleSeverities,
  checkClassUsage,
  checkPropertyAssignments,
  checkPropertyUsage,
  completeClasses,
  completeCustomProperties,
  definitionForClass,
  definitionForCustomProperty,
  hoverForClass,
  hoverForCustomProperty,
  lintModel,
} from "@cssdoc/providers";

/** Language ids handled as CSS (the value/hygiene checks run on these). */
const CSS_LANGUAGES = new Set(["css", "scss", "less", "postcss"]);

/** A 0-based LSP position. */
export interface LspPosition {
  line: number;
  character: number;
}
/** An LSP range. */
export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}
/** A completion item. */
export interface LspCompletion {
  label: string;
  detail?: string;
  documentation?: string;
  deprecated?: boolean;
}
/** Hover content. */
export interface LspHover {
  contents: string;
}
/** A definition location (uri from the index's file). */
export interface LspLocation {
  uri?: string;
  range: LspRange;
}
/** A diagnostic; `data.replace` carries a quick-fix replacement when available. */
export interface LspDiagnostic {
  range: LspRange;
  message: string;
  severity: 1 | 2;
  code?: string;
  data?: { replace?: string };
}
/** A code action (a single-edit quick fix). */
export interface LspCodeAction {
  title: string;
  edit: { range: LspRange; newText: string };
}

function offsetAt(text: string, position: LspPosition): number {
  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i < position.line && i < lines.length; i++) offset += lines[i].length + 1;
  return offset + position.character;
}

function positionAt(text: string, offset: number): LspPosition {
  const upto = text.slice(0, offset).split("\n");
  return { line: upto.length - 1, character: upto[upto.length - 1].length };
}

function rangeOf(text: string, start: number, end: number): LspRange {
  return { start: positionAt(text, start), end: positionAt(text, end) };
}

/** Convert a 1-based PostCSS {@link SourceSpan} to a 0-based LSP range. */
function spanToRange(span: SourceSpan): LspRange {
  return {
    start: {
      line: Math.max(0, span.start.line - 1),
      character: Math.max(0, span.start.column - 1),
    },
    end: { line: Math.max(0, span.end.line - 1), character: Math.max(0, span.end.column - 1) },
  };
}

interface AttrToken {
  token: string;
  start: number;
  end: number;
}
interface ClassAttr {
  tokens: string[];
  members: AttrToken[];
  valueStart: number;
  valueEnd: number;
}

const CLASS_ATTR_RE = /\b(?:class|className)\s*=\s*\{?\s*(["'])((?:(?!\1)[\s\S])*)\1/gu;

/** Every `class`/`className` attribute value in the text, with per-token offsets. */
function classAttributes(text: string): ClassAttr[] {
  const attrs: ClassAttr[] = [];
  for (const m of text.matchAll(CLASS_ATTR_RE)) {
    const value = m[2];
    const valueStart = (m.index ?? 0) + m[0].length - value.length - 1;
    const members: AttrToken[] = [];
    for (const t of value.matchAll(/\S+/gu)) {
      const start = valueStart + (t.index ?? 0);
      members.push({ token: t[0], start, end: start + t[0].length });
    }
    attrs.push({
      tokens: members.map((x) => x.token),
      members,
      valueStart,
      valueEnd: valueStart + value.length,
    });
  }
  return attrs;
}

/** The `--custom-property` under `offset`, if any. */
function propertyAt(
  text: string,
  offset: number,
): { name: string; start: number; end: number } | undefined {
  for (const m of text.matchAll(/--[\w-]+/gu)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (offset >= start && offset <= end) return { name: m[0], start, end };
  }
  return undefined;
}

/** The class attribute containing `offset`, if the cursor is inside one's value. */
function classAttrAt(text: string, offset: number): ClassAttr | undefined {
  return classAttributes(text).find((a) => offset >= a.valueStart && offset <= a.valueEnd);
}

/** The language service. Construct with the component index (rebuild it when the CSS changes). */
export class CssDocLanguageService {
  constructor(
    private index: CssDocIndex,
    private severities: RuleSeverities = DEFAULT_RULE_SEVERITIES,
  ) {}

  /** Replace the component index (e.g. after the CSS files change). */
  setIndex(index: CssDocIndex): void {
    this.index = index;
  }

  /** Set the per-rule severities (e.g. loaded from a `cssdoc.json`). */
  setRuleSeverities(severities: RuleSeverities): void {
    this.severities = severities;
  }

  /** Completions at a position: `var(--…)` custom properties, or classes/modifiers in a class attribute. */
  completions(text: string, position: LspPosition): LspCompletion[] {
    const offset = offsetAt(text, position);
    const before = text.slice(0, offset);
    if (/var\(\s*(--[\w-]*)$/u.test(before)) {
      return completeCustomProperties(this.index).map(toCompletion);
    }
    const attr = classAttrAt(text, offset);
    if (attr) {
      const base = attr.tokens.find((t) => this.index.componentForClass(t));
      return completeClasses(base, this.index).map(toCompletion);
    }
    return [];
  }

  /** Hover at a position: a custom property, or a class token in a class attribute. */
  hover(text: string, position: LspPosition): LspHover | undefined {
    const offset = offsetAt(text, position);
    const prop = propertyAt(text, offset);
    if (prop) {
      const h = hoverForCustomProperty(prop.name, this.index);
      if (h) return { contents: h.contents };
    }
    const token = this.classTokenAt(text, offset);
    if (token) {
      const h = hoverForClass(token.base ?? token.token, token.token, this.index);
      if (h) return { contents: h.contents };
    }
    return undefined;
  }

  /** Definition at a position: the CSS rule for a class token or a custom property. */
  definition(text: string, position: LspPosition): LspLocation | undefined {
    const offset = offsetAt(text, position);
    const prop = propertyAt(text, offset);
    if (prop) return this.toLocation(definitionForCustomProperty(prop.name, this.index));
    const token = this.classTokenAt(text, offset);
    if (token) {
      return this.toLocation(
        definitionForClass(token.base ?? token.token, token.token, this.index),
      );
    }
    return undefined;
  }

  /**
   * Diagnostics for a document. For CSS the stylesheet is linted in place (doc-comment hygiene plus the
   * registered-property value checks); for other languages, class-attribute usage is checked against
   * the configured index.
   */
  diagnostics(text: string, languageId?: string): LspDiagnostic[] {
    if (languageId && CSS_LANGUAGES.has(languageId)) return this.cssDiagnostics(text);
    const out: LspDiagnostic[] = [];
    for (const { usage, start, end } of this.modifierUsages(text)) {
      const diags = checkClassUsage([usage], this.index, this.severities);
      for (const d of diags) {
        const canonical = usage.base
          ? this.index.deprecationOf(usage.base, usage.token)?.canonical
          : undefined;
        out.push({
          range: rangeOf(text, start, end),
          message: d.message,
          severity: d.severity === "error" ? 1 : 2,
          code: d.rule,
          ...(d.rule === "deprecated-modifier" && canonical
            ? { data: { replace: canonical } }
            : {}),
        });
      }
    }
    return out;
  }

  /**
   * The modifier-usage candidates in a host document, each with its source span. For class conventions
   * these are class tokens inside `class`/`className`; for the `attribute` convention they are
   * convention-matching attributes on an element that also carries a documented component class.
   */
  private modifierUsages(text: string): { usage: ClassUsage; start: number; end: number }[] {
    const matcher = this.index.matcher;
    const results: { usage: ClassUsage; start: number; end: number }[] = [];

    if (matcher.convention.structure === "attribute") {
      for (const tag of text.matchAll(/<[a-zA-Z][\w-]*(?:\s[^<>]*?)?\/?>/gu)) {
        const tagStart = tag.index ?? 0;
        const attrs = [...tag[0].matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)];
        const tokens: string[] = [];
        for (const a of attrs) {
          if (a[1] === "class" || a[1] === "className") {
            tokens.push(...(a[2] ?? a[3] ?? "").split(/\s+/u).filter(Boolean));
          }
        }
        const base = tokens.find((t) => this.index.componentForClass(t));
        if (!base) continue;
        for (const a of attrs) {
          if (a[1] === "class" || a[1] === "className") continue;
          const token = `${a[1]}="${a[2] ?? a[3] ?? ""}"`;
          if (!matcher.looksLikeUsage(token, base)) continue;
          const start = tagStart + (a.index ?? 0);
          results.push({ usage: { base, tokens, token }, start, end: start + a[0].length });
        }
      }
      return results;
    }

    for (const attr of classAttributes(text)) {
      const base = attr.tokens.find((t) => this.index.componentForClass(t));
      for (const member of attr.members) {
        if (!matcher.looksLikeUsage(member.token, base)) continue;
        results.push({
          usage: { base, tokens: attr.tokens, token: member.token },
          start: member.start,
          end: member.end,
        });
      }
    }
    return results;
  }

  /** Lint an open stylesheet: doc-comment hygiene and the registered-property value checks. */
  private cssDiagnostics(text: string): LspDiagnostic[] {
    const index = createIndex(text);
    const { assignments, usages } = cssValueSites(text);
    const diags = [
      ...lintModel(index, this.severities),
      ...checkPropertyAssignments(assignments, index, this.severities),
      ...checkPropertyUsage(usages, index, {}, this.severities),
    ];
    const out: LspDiagnostic[] = [];
    for (const d of diags) {
      if (!d.span) continue;
      out.push({
        range: spanToRange(d.span),
        message: d.message,
        severity: d.severity === "error" ? 1 : 2,
        code: d.rule,
      });
    }
    return out;
  }

  /** Quick fixes for the given diagnostics (replace a deprecated modifier with its canonical). */
  codeActions(diagnostics: LspDiagnostic[]): LspCodeAction[] {
    const actions: LspCodeAction[] = [];
    for (const d of diagnostics) {
      if (d.data?.replace) {
        actions.push({
          title: `Replace with ${this.index.matcher.selectorFor(d.data.replace)}`,
          edit: { range: d.range, newText: d.data.replace },
        });
      }
    }
    return actions;
  }

  private classTokenAt(text: string, offset: number): { token: string; base?: string } | undefined {
    const attr = classAttrAt(text, offset);
    if (!attr) return undefined;
    const member = attr.members.find((m) => offset >= m.start && offset <= m.end);
    if (!member) return undefined;
    const base = attr.tokens.find((t) => this.index.componentForClass(t));
    return { token: member.token, base };
  }

  private toLocation(
    location:
      | {
          file?: string;
          span: { start: { line: number; column: number }; end: { line: number; column: number } };
        }
      | undefined,
  ): LspLocation | undefined {
    if (!location) return undefined;
    return {
      uri: location.file,
      range: {
        start: { line: location.span.start.line - 1, character: location.span.start.column - 1 },
        end: { line: location.span.end.line - 1, character: location.span.end.column - 1 },
      },
    };
  }
}

function toCompletion(c: {
  label: string;
  detail?: string;
  documentation?: string;
  deprecated?: boolean;
}): LspCompletion {
  return {
    label: c.label,
    detail: c.detail,
    documentation: c.documentation,
    deprecated: c.deprecated,
  };
}
