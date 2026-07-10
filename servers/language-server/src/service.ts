/**
 * The editor-agnostic language service: given document text and a position, it answers completion,
 * hover, definition, diagnostics, and code-action requests over the documented CSS surface, using
 * `@cssdoc/providers` and a prebuilt `@cssdoc/index`. It uses plain LSP-shaped types (no
 * `vscode-languageserver` import), so it is fully unit-testable; `server.ts` wires it to a connection.
 *
 * @module
 */
import type { CssDocConfiguration } from "@cssdoc/core";
import {
  type EmbeddedHost,
  detectEmbeddedHost,
  projectCss,
  projectionDialect,
  scanClassUsages,
} from "@cssdoc/embedded";
import { type CssParse, dialectForFilename, resolveParser } from "@cssdoc/dialects";
import {
  type ClassUsage,
  type CssDocIndex,
  type SourceSpan,
  createIndex,
  cssValueSites,
} from "@cssdoc/index";
import {
  DEFAULT_RULE_SEVERITIES,
  type NamingRules,
  type ResolvedNaming,
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
  resolveNaming,
} from "@cssdoc/providers";

/** Language ids handled as CSS (the value/hygiene checks run on these). */
const CSS_LANGUAGES = new Set(["css", "scss", "less", "postcss"]);

/** Map an editor `languageId` to an embedded host, for docs whose path extension isn't decisive. */
const hostForLanguageId = (languageId?: string): EmbeddedHost | undefined => {
  switch (languageId) {
    case "javascript":
    case "javascriptreact":
    case "typescript":
    case "typescriptreact":
      return "js";
    case "html":
    case "vue":
    case "svelte":
    case "astro":
      return "html";
    case "markdown":
    case "mdx":
      return "markdown";
    default:
      return undefined;
  }
};

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

/**
 * One config scope: a documented-CSS index plus the `cssdoc.json` settings that govern it. A workspace
 * may have several (e.g. a monorepo with a `cssdoc.json` per package, each with its own convention).
 */
export interface ConfigScope {
  /** The directory of the governing `cssdoc.json` (`""` for the default/no-config scope). */
  dir: string;
  /** The configuration (for rebuilding a CSS-doc index from unsaved editor text). */
  configuration?: CssDocConfiguration;
  index: CssDocIndex;
  severities: RuleSeverities;
  naming: ResolvedNaming;
  /** Class names exempt from the `structure-unknown-selector` rule. */
  structureIgnore?: readonly string[];
}

/** The language service. Construct with the component index (rebuild it when the CSS changes). */
export class CssDocLanguageService {
  private scopes: ConfigScope[];

  constructor(index: CssDocIndex, severities: RuleSeverities = DEFAULT_RULE_SEVERITIES) {
    this.scopes = [{ dir: "", index, severities, naming: {} }];
  }

  /** Replace the component index (single-scope path; e.g. after the CSS files change). */
  setIndex(index: CssDocIndex): void {
    this.scopes = [{ ...this.scopes[0], index }];
  }

  /** Set the per-rule severities (single-scope path). */
  setRuleSeverities(severities: RuleSeverities): void {
    this.scopes[0] = { ...this.scopes[0], severities };
  }

  /** Set the name-case conventions (single-scope path). */
  setNaming(naming: NamingRules): void {
    this.scopes[0] = { ...this.scopes[0], naming: resolveNaming(naming) };
  }

  /** Replace all config scopes (multi-config path; one per governing `cssdoc.json`). */
  setScopes(scopes: ConfigScope[]): void {
    if (scopes.length) this.scopes = scopes;
  }

  /** The scope governing `path` — the deepest `cssdoc.json` dir containing it, else the default. */
  private scopeForPath(path?: string): ConfigScope {
    let best: ConfigScope | undefined;
    if (path) {
      for (const s of this.scopes) {
        const prefix = s.dir.endsWith("/") ? s.dir : `${s.dir}/`;
        if (s.dir && (path === s.dir || path.startsWith(prefix))) {
          if (!best || s.dir.length > best.dir.length) best = s;
        }
      }
    }
    return best ?? this.scopes.find((s) => !s.dir) ?? this.scopes[0];
  }

  /** The scope whose index defines one of `tokens` as a component (which owns the referenced class). */
  private scopeForBase(tokens: string[]): ConfigScope | undefined {
    return this.scopes.find((s) => tokens.some((t) => s.index.componentForClass(t)));
  }

  /** Completions at a position: `var(--…)` custom properties, or classes/modifiers in a class attribute. */
  completions(text: string, position: LspPosition, path?: string): LspCompletion[] {
    const offset = offsetAt(text, position);
    const before = text.slice(0, offset);
    if (/var\(\s*(--[\w-]*)$/u.test(before)) {
      return completeCustomProperties(this.scopeForPath(path).index).map(toCompletion);
    }
    const attr = classAttrAt(text, offset);
    if (attr) {
      const scope = this.scopeForBase(attr.tokens) ?? this.scopeForPath(path);
      const base = attr.tokens.find((t) => scope.index.componentForClass(t));
      return completeClasses(base, scope.index).map(toCompletion);
    }
    return [];
  }

  /** Hover at a position: a custom property, or a class token in a class attribute. */
  hover(text: string, position: LspPosition, path?: string): LspHover | undefined {
    const offset = offsetAt(text, position);
    const prop = propertyAt(text, offset);
    if (prop) {
      for (const scope of this.scopes) {
        const h = hoverForCustomProperty(prop.name, scope.index);
        if (h) return { contents: h.contents };
      }
    }
    const token = this.classTokenAt(text, offset);
    if (token) {
      const scope = this.scopeForBase([token.base ?? token.token]) ?? this.scopeForPath(path);
      const h = hoverForClass(token.base ?? token.token, token.token, scope.index);
      if (h) return { contents: h.contents };
    }
    return undefined;
  }

  /** Definition at a position: the CSS rule for a class token or a custom property. */
  definition(text: string, position: LspPosition, path?: string): LspLocation | undefined {
    const offset = offsetAt(text, position);
    const prop = propertyAt(text, offset);
    if (prop) {
      for (const scope of this.scopes) {
        const loc = definitionForCustomProperty(prop.name, scope.index);
        if (loc) return this.toLocation(loc);
      }
      return undefined;
    }
    const token = this.classTokenAt(text, offset);
    if (token) {
      const scope = this.scopeForBase([token.base ?? token.token]) ?? this.scopeForPath(path);
      return this.toLocation(
        definitionForClass(token.base ?? token.token, token.token, scope.index),
      );
    }
    return undefined;
  }

  /**
   * Diagnostics for a document. For CSS the stylesheet is linted in place (doc-comment hygiene plus the
   * registered-property value checks); for other languages, class-attribute usage is checked against
   * the configured index.
   */
  diagnostics(text: string, languageId?: string, path?: string): LspDiagnostic[] {
    if (languageId && CSS_LANGUAGES.has(languageId)) {
      // Direct stylesheet: pick the parser from the extension (`.scss`/`.less` → dialect parser).
      return this.cssDiagnostics(text, path, resolveParser(dialectForFilename(path)));
    }
    const out: LspDiagnostic[] = [];
    // Host documents (`.vue`/`.ts`/`.md` …) carry embedded CSS: lint the doc comments in place by
    // projecting to CSS first. The projection shares the source's offsets, so ranges land correctly.
    const host = detectEmbeddedHost(path) ?? hostForLanguageId(languageId);
    if (host) {
      const parse = resolveParser(projectionDialect(text, { host }));
      out.push(...this.cssDiagnostics(projectCss(text, { host }), path, parse));
    }
    // Consumer usage: check against every scope's index (a base class resolves in exactly the scope
    // that documents it), deduping identical diagnostics from any overlap.
    const seen = new Set<string>();
    for (const scope of this.scopes) {
      for (const { usage, start, end } of this.modifierUsages(text, scope)) {
        for (const d of checkClassUsage([usage], scope.index, scope.severities)) {
          const key = `${start}:${end}:${d.rule}:${d.message}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const canonical = usage.base
            ? scope.index.deprecationOf(usage.base, usage.token)?.canonical
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
    }
    return out;
  }

  /**
   * The modifier-usage candidates in a host document (against one scope), each with its source span.
   * For class conventions these are class tokens inside `class`/`className`; for the `attribute`
   * convention they are convention-matching attributes on an element that also carries a component.
   */
  private modifierUsages(
    text: string,
    scope: ConfigScope,
  ): { usage: ClassUsage; start: number; end: number }[] {
    const { matcher } = scope.index;
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
        const base = tokens.find((t) => scope.index.componentForClass(t));
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

    // One site per element — class tokens across `class`/`className`/`:class`/`class:name` (JSX, Vue,
    // Svelte, HTML). A documented component among the tokens turns the element into a checkable usage.
    for (const site of scanClassUsages(text)) {
      const tokens = site.tokens.map((t) => t.token);
      const base = tokens.find((t) => scope.index.componentForClass(t));
      if (!base) continue; // only check elements that carry a documented component of this scope
      for (const member of site.tokens) {
        if (matcher.usageKind(member.token, base) === undefined) continue;
        results.push({
          usage: { base, tokens, token: member.token },
          start: member.start,
          end: member.end,
        });
      }
    }
    return results;
  }

  /** Lint an open stylesheet against its governing scope: doc hygiene + registered-property checks. */
  private cssDiagnostics(text: string, path?: string, parse?: CssParse): LspDiagnostic[] {
    const scope = this.scopeForPath(path);
    const index = createIndex(text, { configuration: scope.configuration, parse });
    const { assignments, usages } = cssValueSites(text, { parse });
    const diags = [
      ...lintModel(index, scope.severities, scope.naming, scope.structureIgnore),
      ...checkPropertyAssignments(assignments, index, scope.severities),
      ...checkPropertyUsage(usages, index, {}, scope.severities),
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
  codeActions(diagnostics: LspDiagnostic[], path?: string): LspCodeAction[] {
    const { matcher } = this.scopeForPath(path).index;
    const actions: LspCodeAction[] = [];
    for (const d of diagnostics) {
      if (d.data?.replace) {
        actions.push({
          title: `Replace with ${matcher.selectorFor(d.data.replace)}`,
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
    const base = attr.tokens.find((t) => this.scopes.some((s) => s.index.componentForClass(t)));
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
