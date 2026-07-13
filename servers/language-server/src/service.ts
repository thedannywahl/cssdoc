/**
 * The editor-agnostic language service: given document text and a position, it answers completion,
 * hover, definition, diagnostics, and code-action requests over the documented CSS surface, using
 * `@cssdoc/providers` and a prebuilt `@cssdoc/index`. It uses plain LSP-shaped types (no
 * `vscode-languageserver` import), so it is fully unit-testable; `server.ts` wires it to a connection.
 *
 * @module
 */
import { CssDocConfiguration } from "@cssdoc/core";
import {
  type EmbeddedHost,
  detectEmbeddedHost,
  extractCssBlocks,
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
  type HoverDetail,
  type HoverSectionOrder,
  type HoverSections,
  type NamingRules,
  type ResolvedNaming,
  type RuleSeverities,
  applyDirectives,
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

const stripLeadingDot = (s: string): string => s.replace(/^\./u, "");

/** The CSS class name under `offset` in a stylesheet — a `.name` selector token — else undefined. The
 *  `(?<!\d)` guard keeps decimals like `0.5em` from looking like a `.5em` class. */
function cssClassTokenAt(text: string, offset: number): string | undefined {
  for (const m of text.matchAll(/(?<!\d)\.(-?[\w-]+)/gu)) {
    const dot = m.index ?? 0;
    if (offset >= dot && offset <= dot + m[0].length) return m[1];
  }
  return undefined;
}

/** Resolve a bare CSS class token to the component that owns it: its base, a modifier, or a member. */
function resolveCssClass(
  token: string,
  index: CssDocIndex,
): { base: string; token: string } | undefined {
  if (index.componentForClass(token)) return { base: token, token };
  const modOwner = index.entries.find((e) => index.isModifier(stripLeadingDot(e.className), token));
  if (modOwner) return { base: stripLeadingDot(modOwner.className), token };
  // A part/element/state selector — attribute it to the component whose base is the longest prefix.
  const owner = index.entries
    .filter((e) => token.startsWith(stripLeadingDot(e.className)))
    .sort((a, b) => stripLeadingDot(b.className).length - stripLeadingDot(a.className).length)[0];
  return owner ? { base: stripLeadingDot(owner.className), token } : undefined;
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
  /** How much a component hover card shows (`cssdoc.hover.detail`). */
  private hoverDetail: HoverDetail = "full";
  /** Per-section visibility for the `custom` hover detail (`cssdoc.hover.sections`). */
  private hoverSections: HoverSections = {};
  /** Section render order for the component hover card (`cssdoc.hover.sectionOrder`). */
  private hoverSectionOrder: HoverSectionOrder | undefined;

  constructor(index: CssDocIndex, severities: RuleSeverities = DEFAULT_RULE_SEVERITIES) {
    this.scopes = [{ dir: "", index, severities, naming: {} }];
  }

  /** Set the component-hover detail level (`compact` | `full` | `custom`), section map, and order. */
  setHoverDetail(
    detail: HoverDetail,
    sections: HoverSections = {},
    sectionOrder?: HoverSectionOrder,
  ): void {
    this.hoverDetail = detail;
    this.hoverSections = sections;
    this.hoverSectionOrder = sectionOrder;
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

  /**
   * The scopes to resolve `text` against: the workspace scopes, plus — for a host document — an in-file
   * scope built from its own embedded CSS. So a component defined in a document's `<style>` block (or a
   * Vue SFC) is available to that same document's markup for hover, completion, definition, and usage
   * checks, not just components from the workspace's `.css` files.
   */
  private scopesFor(text: string, path?: string, languageId?: string): ConfigScope[] {
    const host = detectEmbeddedHost(path) ?? hostForLanguageId(languageId);
    if (!host) return this.scopes;
    const govern = this.scopeForPath(path);
    const parse = resolveParser(projectionDialect(text, { host }));
    return [
      ...this.scopes,
      {
        ...govern,
        index: createIndex(projectCss(text, { host }), {
          file: path, // so go-to-definition on a single-file component lands in this file
          configuration: govern.configuration,
          parse,
        }),
      },
    ];
  }

  /** The scope whose index defines one of `tokens` as a component (which owns the referenced class). */
  private scopeForBase(
    tokens: string[],
    scopes: ConfigScope[] = this.scopes,
  ): ConfigScope | undefined {
    return scopes.find((s) => tokens.some((t) => s.index.componentForClass(t)));
  }

  /**
   * Completions at a position: cssdoc `@tags` inside a doc comment (while authoring a stylesheet),
   * `var(--…)` custom properties, or classes/modifiers in a `class`/`className` attribute.
   */
  completions(
    text: string,
    position: LspPosition,
    path?: string,
    languageId?: string,
  ): LspCompletion[] {
    const offset = offsetAt(text, position);
    const before = text.slice(0, offset);

    // Doc-tag completion: inside an unclosed `/**` block right after an `@`, while authoring CSS — a
    // stylesheet, or an embedded CSS region (a `<style>` block / `css` template / Markdown fence).
    const open = before.lastIndexOf("/**");
    if (open !== -1 && open > before.lastIndexOf("*/") && /(?:^|[\s*])@[\w-]*$/u.test(before)) {
      const host = detectEmbeddedHost(path) ?? hostForLanguageId(languageId);
      const authoring =
        (languageId && CSS_LANGUAGES.has(languageId)) ||
        (host !== undefined &&
          extractCssBlocks(text, { host }).some(
            (b) => offset >= b.start.offset && offset <= b.start.offset + b.css.length,
          ));
      if (authoring) {
        const config = this.scopeForPath(path).configuration ?? new CssDocConfiguration();
        const seen = new Set<string>();
        return config.supportedTagDefinitions
          .filter((t) => (seen.has(t.tagName) ? false : seen.add(t.tagName)))
          .map((t) => ({ label: t.tagName, detail: `${t.syntaxKind} tag` }));
      }
    }

    const scopes = this.scopesFor(text, path);
    if (/var\(\s*(--[\w-]*)$/u.test(before)) {
      const seen = new Set<string>();
      return scopes
        .flatMap((s) => completeCustomProperties(s.index))
        .filter((c) => (seen.has(c.label) ? false : seen.add(c.label)))
        .map(toCompletion);
    }
    // Class completion — in a `class`/`className` attribute, or a usage helper (`clsx(…)`, Vue
    // `:class`, Svelte `class:name`). Offer the component's modifiers when a base is already present,
    // else the components.
    const tokens = classAttrAt(text, offset)?.tokens ?? this.usageSiteAt(text, offset);
    if (tokens) {
      const scope = this.scopeForBase(tokens, scopes) ?? this.scopeForPath(path);
      const base = tokens.find((t) => scope.index.componentForClass(t));
      return completeClasses(base, scope.index).map(toCompletion);
    }
    return [];
  }

  /** The class tokens of the usage site under `offset` — for completion in `clsx(…)` / `:class` /
   *  `class:name`, where the cursor sits in a string that isn't a `class="…"` attribute. */
  private usageSiteAt(text: string, offset: number): string[] | undefined {
    for (const site of scanClassUsages(text)) {
      if (!site.tokens.length) continue;
      const min = Math.min(...site.tokens.map((t) => t.start));
      const max = Math.max(...site.tokens.map((t) => t.end));
      if (offset >= min && offset <= max) return site.tokens.map((t) => t.token);
    }
    return undefined;
  }

  /**
   * Hover at a position. Resolves to a documentation card in three places: while authoring a stylesheet
   * (a selector/property in a `.css` file), while authoring embedded CSS (inside a `<style>` block, a
   * `css` template, or a Markdown ```css fence — resolved against the projected CSS, which shares the
   * source's offsets), and over a class *usage* (`class`/`className`, `clsx(…)`, Vue `:class`, Svelte
   * `class:name`).
   */
  hover(
    text: string,
    position: LspPosition,
    path?: string,
    languageId?: string,
  ): LspHover | undefined {
    const offset = offsetAt(text, position);

    // Authoring a stylesheet directly.
    if (languageId && CSS_LANGUAGES.has(languageId)) {
      return this.authoringHover(text, offset, path, resolveParser(dialectForFilename(path)));
    }
    // Authoring embedded CSS in a host document — run the same resolution over the projected CSS.
    const host = detectEmbeddedHost(path) ?? hostForLanguageId(languageId);
    if (host) {
      const parse = resolveParser(projectionDialect(text, { host }));
      const h = this.authoringHover(projectCss(text, { host }), offset, path, parse);
      if (h) return h;
    }

    // Usage: a custom property, or a class token in markup / a class helper.
    const scopes = this.scopesFor(text, path);
    const prop = propertyAt(text, offset);
    if (prop) {
      for (const scope of scopes) {
        const h = hoverForCustomProperty(prop.name, scope.index);
        if (h) return { contents: h.contents };
      }
    }
    const token = this.usageTokenAt(text, offset, scopes);
    if (token) {
      const scope =
        this.scopeForBase([token.base ?? token.token], scopes) ?? this.scopeForPath(path);
      const h = hoverForClass(
        token.base ?? token.token,
        token.token,
        scope.index,
        this.hoverDetail,
        this.hoverSections,
        this.hoverSectionOrder,
      );
      if (h) return { contents: h.contents };
    }
    return undefined;
  }

  /**
   * An authoring hover over CSS `text`: the custom property or selector under `offset`, resolved against
   * a fresh index of that CSS (the file's own model, so unsaved edits are reflected).
   */
  private authoringHover(
    text: string,
    offset: number,
    path?: string,
    parse?: CssParse,
  ): LspHover | undefined {
    const index = createIndex(text, {
      configuration: this.scopeForPath(path).configuration,
      parse: parse ?? resolveParser(dialectForFilename(path)),
    });
    const prop = propertyAt(text, offset);
    if (prop) {
      const h = hoverForCustomProperty(prop.name, index);
      if (h) return { contents: h.contents };
    }
    const cls = cssClassTokenAt(text, offset);
    const resolved = cls ? resolveCssClass(cls, index) : undefined;
    if (resolved) {
      const h = hoverForClass(
        resolved.base,
        resolved.token,
        index,
        this.hoverDetail,
        this.hoverSections,
        this.hoverSectionOrder,
      );
      if (h) return { contents: h.contents };
    }
    return undefined;
  }

  /**
   * The class-usage token under `offset` — covers `class`/`className`, `clsx(…)` and similar helpers,
   * Vue `:class`, and Svelte `class:name`, via the same scanner the usage diagnostics use.
   */
  private usageTokenAt(
    text: string,
    offset: number,
    scopes: ConfigScope[],
  ): { token: string; base?: string } | undefined {
    for (const site of scanClassUsages(text)) {
      const member = site.tokens.find((m) => offset >= m.start && offset <= m.end);
      if (member) {
        const base = site.tokens
          .map((t) => t.token)
          .find((t) => scopes.some((s) => s.index.componentForClass(t)));
        return { token: member.token, base };
      }
    }
    return undefined;
  }

  /**
   * Definition at a position — the CSS rule for the thing under the cursor. Mirrors {@link hover}: it
   * jumps from a class *usage* (`class`/`className`, `clsx(…)`, Vue `:class`, Svelte `class:name`) to the
   * rule, and from a selector/property authored in a stylesheet or embedded CSS to its own rule.
   */
  definition(
    text: string,
    position: LspPosition,
    path?: string,
    languageId?: string,
  ): LspLocation | undefined {
    const offset = offsetAt(text, position);

    if (languageId && CSS_LANGUAGES.has(languageId)) {
      return this.authoringDefinition(text, offset, path, resolveParser(dialectForFilename(path)));
    }
    const host = detectEmbeddedHost(path) ?? hostForLanguageId(languageId);
    if (host) {
      const parse = resolveParser(projectionDialect(text, { host }));
      const d = this.authoringDefinition(projectCss(text, { host }), offset, path, parse);
      if (d) return d;
    }

    const scopes = this.scopesFor(text, path);
    const prop = propertyAt(text, offset);
    if (prop) {
      for (const scope of scopes) {
        const loc = definitionForCustomProperty(prop.name, scope.index);
        if (loc) return this.toLocation(loc);
      }
      return undefined;
    }
    const token = this.usageTokenAt(text, offset, scopes);
    if (token) {
      const scope =
        this.scopeForBase([token.base ?? token.token], scopes) ?? this.scopeForPath(path);
      return this.toLocation(
        definitionForClass(token.base ?? token.token, token.token, scope.index),
      );
    }
    return undefined;
  }

  /**
   * An authoring go-to-definition over CSS `text`: the rule for the property/selector under `offset`, in
   * the file's own model. `file: path` is set so the jump lands in this file (embedded offsets align).
   */
  private authoringDefinition(
    text: string,
    offset: number,
    path?: string,
    parse?: CssParse,
  ): LspLocation | undefined {
    const index = createIndex(text, {
      file: path,
      configuration: this.scopeForPath(path).configuration,
      parse: parse ?? resolveParser(dialectForFilename(path)),
    });
    const prop = propertyAt(text, offset);
    if (prop) {
      const loc = definitionForCustomProperty(prop.name, index);
      if (loc) return this.toLocation(loc);
    }
    const cls = cssClassTokenAt(text, offset);
    const resolved = cls ? resolveCssClass(cls, index) : undefined;
    if (resolved) return this.toLocation(definitionForClass(resolved.base, resolved.token, index));
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
    // Consumer usage: check against every scope's index — the workspace scopes plus the document's own
    // embedded components (see `scopesFor`) — deduping identical diagnostics from any overlap.
    const seen = new Set<string>();
    for (const scope of this.scopesFor(text, path, languageId)) {
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
    const diags = applyDirectives(
      [
        ...lintModel(index, scope.severities, scope.naming, scope.structureIgnore),
        ...checkPropertyAssignments(assignments, index, scope.severities),
        ...checkPropertyUsage(usages, index, {}, scope.severities),
      ],
      text, // honor `/* cssdoc-disable … */` directives in the source
    );
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
