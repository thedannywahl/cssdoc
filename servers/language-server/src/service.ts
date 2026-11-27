/**
 * The editor-agnostic language service: given document text and a position, it answers completion,
 * hover, definition, diagnostics, and code-action requests over the documented CSS surface, using
 * `@cssdoc/providers` and a prebuilt `@cssdoc/index`. It uses plain LSP-shaped types (no
 * `vscode-languageserver` import), so it is fully unit-testable; `server.ts` wires it to a connection.
 *
 * @module
 */
import { isAbsolute, relative, sep } from "node:path";
import { CssDocConfiguration, type ExampleFilter, parseDocComment } from "@cssdoc/core";
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import {
  ALPHA_SOURCE,
  ALPHANUMERIC_EXTENDED_SOURCE,
  AT_SOURCE,
  ASTERISK_SOURCE,
  BRACE_OPEN_SOURCE,
  CSS_CLASS_ATTRIBUTE_SELECTOR,
  CSSDOC_BASE_CLASS_NAME_SOURCE,
  CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE,
  COMMENT_START_SOURCE,
  COMMENT_END_SOURCE,
  COMMENT_END_TEXT,
  COMMENT_LINE_PREFIX,
  DOC_COMMENT_START_SOURCE,
  DOC_COMMENT_START_TEXT,
  DASH_SOURCE,
  DIGIT_SOURCE,
  DOUBLE_DASH_SOURCE,
  DOT_CHAR,
  DOT_SOURCE,
  EQUALS_CHAR,
  FORWARD_SLASH_CHAR,
  GREATER_THAN_CHAR,
  HTML_LIKE_CLASS_ATTRIBUTE_NAME_SOURCE,
  HTML_LIKE_TAG_NAME_SOURCE,
  HTML_QUOTED_ATTRIBUTE,
  LESS_THAN_CHAR,
  LINE_ENDING_SOURCE,
  PAREN_OPEN_SOURCE,
  QUOTE_DOUBLE_CHAR,
  QUOTE_SINGLE_CHAR,
  WORD_BOUNDARY_SOURCE,
  escapeRegex,
  toRegExp,
} from "@cssdoc/regex";
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
  type HoverPresentation,
  type HoverSectionOrder,
  type HoverSections,
  type NamingRules,
  type ResolvedNaming,
  type RuleOptions,
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
  highlightDocComment,
  lintModel,
  resolveNaming,
  selectorDefines,
} from "@cssdoc/providers";

/** Language ids handled as CSS (the value/hygiene checks run on these). */
const CSS_LANGUAGES = new Set(["css", "scss", "less", "postcss"]);
const containsPath = (root: string, path: string): boolean => {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};
const ANNOTATION_MARKER = arkRegex.as(
  String.raw`^(${DIGIT_SOURCE}+)${DOT_SOURCE}\s*([\s\S]*)$`,
  "u",
);
const DOC_COMMENT: Regex = arkRegex.as(
  `${DOC_COMMENT_START_SOURCE}[\\s\\S]*?${COMMENT_END_SOURCE}`,
  "gu",
);
const SEMANTIC_DOC_COMMENT: Regex = arkRegex.as(
  `${DOC_COMMENT_START_SOURCE}[\\s\\S]*?(?:${COMMENT_END_SOURCE}|$)`,
  "gu",
);
const COMMENT_OPENING: Regex = arkRegex.as(`^${COMMENT_START_SOURCE}${ASTERISK_SOURCE}?`);
const COMMENT_CLOSING: Regex = arkRegex.as(`${COMMENT_END_SOURCE}$`);
const ANNOTATIONS_TAG = arkRegex.as(String.raw`^\s*${AT_SOURCE}annotations\b`, "u");
const COMMENT_TAG = arkRegex.as(String.raw`^\s*${AT_SOURCE}${ALPHA_SOURCE}`, "u");
const ANNOTATION_REF = arkRegex.as(
  String.raw`${AT_SOURCE}ref\s+(${DIGIT_SOURCE}+)${DOT_SOURCE}?`,
  "gu",
);
const NON_WHITESPACE = arkRegex.as(String.raw`\S+`, "gu");
const COMPLETION_TAG = arkRegex.as(
  String.raw`(?:^|[\s*])${AT_SOURCE}${ALPHANUMERIC_EXTENDED_SOURCE}*$`,
  "u",
);
const COMPLETION_TAG_SUFFIX = arkRegex.as(String.raw`^${ALPHANUMERIC_EXTENDED_SOURCE}*`, "u");
const COMPLETION_VAR = arkRegex.as(
  String.raw`var${PAREN_OPEN_SOURCE}\s*(${DOUBLE_DASH_SOURCE}${ALPHANUMERIC_EXTENDED_SOURCE}*)$`,
  "u",
);
const SEMANTIC_TAG = arkRegex.as(
  String.raw`${AT_SOURCE}(${ALPHANUMERIC_EXTENDED_SOURCE}+)(?:\s+([^\s][^*]*?))?(?=\s*(?:\*|$))`,
  "gu",
);

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
  /** Zero-based line number. */
  line: number;
  /** Zero-based UTF-16 code-unit offset within the line. */
  character: number;
}
/** An LSP range. */
export interface LspRange {
  /** Inclusive start position. */
  start: LspPosition;
  /** Exclusive end position. */
  end: LspPosition;
}
/** A completion item. */
export interface LspCompletion {
  /** Label shown in the completion list. */
  label: string;
  /** LSP completion kind, when known. */
  kind?: 14;
  /** Additional completion detail, when available. */
  detail?: string;
  /** Documentation shown with the completion, when available. */
  documentation?: string;
  /** Whether the suggested item is deprecated. */
  deprecated?: boolean;
  /** Text used to order the completion, when supplied. */
  sortText?: string;
  /** Text and range to replace when the completion is accepted. */
  textEdit?: {
    /** Range replaced by the completion. */
    range: LspRange;
    /** Text inserted in place of the range. */
    newText: string;
  };
}
/** Hover content. */
export interface LspHover {
  /** Markdown content shown on hover. */
  contents: string;
}
/** A definition location (uri from the index's file). */
export interface LspLocation {
  /** Document URI, when available from the index. */
  uri?: string;
  /** Range of the definition. */
  range: LspRange;
}
/** A diagnostic; `data.replace` carries a quick-fix replacement when available. */
export interface LspDiagnostic {
  /** Range where the issue was found. */
  range: LspRange;
  /** Human-readable issue description. */
  message: string;
  /** LSP severity: 1 for an error, 2 for a warning. */
  severity: 1 | 2;
  /** Rule identifier, when available. */
  code?: string;
  /** Additional data used to create a quick fix. */
  data?: {
    /** Replacement text for the diagnostic range, when a fix is available. */
    replace?: string;
  };
}
/** A code action (a single-edit quick fix). */
export interface LspCodeAction {
  /** Label shown for the action. */
  title: string;
  /** Edit applied to the current document. */
  edit: {
    /** Range replaced by the edit. */
    range: LspRange;
    /** Replacement text. */
    newText: string;
  };
}
/** A semantic token: position, length, token type, and modifiers. */
export interface LspSemanticToken {
  /** Zero-based line number. */
  line: number;
  /** Zero-based UTF-16 code-unit offset within the line. */
  startCharacter: number;
  /** Token length in UTF-16 code units. */
  length: number;
  /** Token type index in the server's legend. */
  tokenType: number;
  /** Bit set of modifier indexes in the server's legend. */
  tokenModifiers: number;
}
/** An inlay hint: label and position in the document. */
export interface LspInlayHint {
  /** Position where the hint appears. */
  position: LspPosition;
  /** Label displayed for the hint. */
  label: string;
  /** LSP hint kind: 1 for type, 2 for parameter. */
  kind?: 1 | 2; // 1 = type, 2 = parameter
  /** Additional information shown on hover, when available. */
  tooltip?: string;
}

function offsetAt(text: string, position: LspPosition): number {
  const lines = text.split("\n");
  let offset = 0;
  for (let i = 0; i < position.line && i < lines.length; i++) offset += lines[i].length + 1;
  return offset + position.character;
}

function positionAt(text: string, offset: number): LspPosition {
  const LINE_ENDING: Regex = arkRegex.as(LINE_ENDING_SOURCE, "gu");
  const upto = text.slice(0, offset).split(LINE_ENDING);
  return { line: upto.length - 1, character: upto[upto.length - 1].length };
}

function rangeOf(text: string, start: number, end: number): LspRange {
  return { start: positionAt(text, start), end: positionAt(text, end) };
}

function spanFromOffsets(text: string, start: number, end: number): SourceSpan {
  const s = positionAt(text, start);
  const e = positionAt(text, end);
  return {
    start: { line: s.line + 1, column: s.character + 1 },
    end: { line: e.line + 1, column: e.character + 1 },
  };
}

/** Hover for `@ref` inside a doc comment, resolved against local `@annotations`. */
function refHoverAt(
  text: string,
  offset: number,
  configuration?: CssDocConfiguration,
  presentation: HoverPresentation = "vscode",
): LspHover | undefined {
  const fallbackLegend = (raw: string): Map<number, string> => {
    const out = new Map<number, string>();
    const body = raw
      .replace(COMMENT_OPENING, "")
      .replace(COMMENT_CLOSING, "")
      .split("\n")
      .map((line) => line.replace(COMMENT_LINE_PREFIX, ""));
    const at = body.findIndex((line) => ANNOTATIONS_TAG.test(line));
    if (at < 0) return out;
    let current: number | undefined;
    for (const line of body.slice(at + 1)) {
      if (COMMENT_TAG.exec(line) !== null) break;
      const trimmed = line.trim();
      if (!trimmed) continue;
      const marker = trimmed.match(ANNOTATION_MARKER);
      if (marker) {
        current = Number.parseInt(marker[1], 10);
        out.set(current, marker[2].trim());
        continue;
      }
      if (current !== undefined) out.set(current, `${out.get(current) ?? ""}\n${trimmed}`.trim());
    }
    return out;
  };

  const comments = text.matchAll(DOC_COMMENT);
  for (const block of comments) {
    const start = block.index ?? 0;
    const end = start + block[0].length;
    if (offset < start || offset > end) continue;
    const local = offset - start;
    const doc = parseDocComment(block[0], configuration ?? new CssDocConfiguration());
    const annotations =
      (doc as { annotations?: Map<number, string> }).annotations instanceof Map
        ? (doc as { annotations: Map<number, string> }).annotations
        : fallbackLegend(block[0]);
    for (const ref of block[0].matchAll(ANNOTATION_REF)) {
      const refStart = ref.index ?? 0;
      const refEnd = refStart + ref[0].length;
      if (local < refStart || local > refEnd) continue;
      const value = Number.parseInt(ref[1], 10);
      const annotation = annotations.get(value);
      if (!annotation) return undefined;
      return {
        contents: `${presentation === "vscode" ? "$(symbol-numeric) " : ""}@ref ${value}\n\n${annotation}`,
      };
    }
  }
  return undefined;
}

function safeCreateIndex(text: string, options: Parameters<typeof createIndex>[1]): CssDocIndex {
  try {
    return createIndex(text, options);
  } catch {
    return createIndex("", options);
  }
}

/**
 * Restore a masked interpolation in a diagnostic message. `projected` is the CSS the linter saw
 * (interpolations blanked to filler); `source` is the original document. Since the projection is
 * character-for-character with the source, the token at `projected.indexOf(maskedName)` occupies the
 * same offsets in `source`, where it still reads `${…}`. No-op when there's nothing masked (direct CSS,
 * or the token isn't found).
 */
function unmask(
  message: string,
  maskedName: string | undefined,
  projected: string,
  source: string,
): string {
  if (!maskedName || source === projected) return message;
  const at = projected.indexOf(maskedName);
  if (at < 0) return message;
  const original = source.slice(at, at + maskedName.length);
  return original === maskedName ? message : message.split(maskedName).join(original);
}

/**
 * Restore every masked interpolation in generated content (a hover card). Unlike {@link unmask}, which
 * targets one known token, this rewrites all of them: the projection only differs from the source
 * inside `${…}` masks, so any identifier token in `projected` that doesn't match `source` at the same
 * offset was masked, and the equal-length source slice is its original form (e.g. `aaaaalert` →
 * `${p}alert`). No-op for a real stylesheet, where `source === projected`.
 */
function unmaskContent(content: string, projected: string, source: string): string {
  if (source === projected) return content;
  const IDENTIFIER: Regex = arkRegex.as(CSSDOC_BASE_CLASS_NAME_SOURCE, "gu");
  let out = content;
  const done = new Set<string>();
  for (const m of projected.matchAll(IDENTIFIER)) {
    const token = m[0];
    if (done.has(token)) continue;
    const original = source.slice(m.index, m.index + token.length);
    if (original !== token) {
      done.add(token);
      out = out.split(token).join(original);
    }
  }
  return out;
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

const CLASS_ATTR = arkRegex.as(
  String.raw`${WORD_BOUNDARY_SOURCE}${HTML_LIKE_CLASS_ATTRIBUTE_NAME_SOURCE}\s*${EQUALS_CHAR}\s*${BRACE_OPEN_SOURCE}?\s*([${QUOTE_DOUBLE_CHAR}${QUOTE_SINGLE_CHAR}])((?:(?!\1)[\s\S])*)\1`,
  "gu",
);
const ATTRIBUTE_USAGE_TAG = arkRegex.as(
  String.raw`${LESS_THAN_CHAR}(${HTML_LIKE_TAG_NAME_SOURCE})([^${LESS_THAN_CHAR}${GREATER_THAN_CHAR}]*?)${FORWARD_SLASH_CHAR}?${GREATER_THAN_CHAR}`,
  "gu",
);
const QUOTED_ATTRIBUTE = toRegExp(HTML_QUOTED_ATTRIBUTE);

/** Every `class`/`className` attribute value in the text, with per-token offsets. */
function classAttributes(text: string): ClassAttr[] {
  const attrs: ClassAttr[] = [];
  for (const m of text.matchAll(CLASS_ATTR)) {
    const value = m[2];
    const valueStart = (m.index ?? 0) + m[0].length - value.length - 1;
    const members: AttrToken[] = [];
    for (const t of value.matchAll(NON_WHITESPACE)) {
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
  const CUSTOM_PROPERTY: Regex = arkRegex.as(CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE, "gu");
  for (const m of text.matchAll(CUSTOM_PROPERTY)) {
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

const stripLeadingDot = (s: string): string => (s.startsWith(DOT_CHAR) ? s.slice(1) : s);

const CSS_CLASS_TOKEN: Regex = arkRegex.as(
  `(?<!${DIGIT_SOURCE})${DOT_SOURCE}(${DASH_SOURCE}?${ALPHANUMERIC_EXTENDED_SOURCE}+)`,
  "gu",
);

/** The CSS class name under `offset` in a stylesheet — a `.name` selector token — else undefined. The
 *  `(?<!\d)` guard keeps decimals like `0.5em` from looking like a `.5em` class. */
function cssClassTokenAt(text: string, offset: number): string | undefined {
  for (const m of text.matchAll(CSS_CLASS_TOKEN)) {
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
    .toSorted(
      (a, b) => stripLeadingDot(b.className).length - stripLeadingDot(a.className).length,
    )[0];
  return owner ? { base: stripLeadingDot(owner.className), token } : undefined;
}

const CLASS_ATTR_SELECTOR = toRegExp(CSS_CLASS_ATTRIBUTE_SELECTOR);

/** The `[class OP="value"]` attribute selector under `offset` (its operator, value, and start), if any. */
function cssClassAttrSelectorAt(
  text: string,
  offset: number,
): { op: string; value: string; start: number } | undefined {
  for (const m of text.matchAll(CLASS_ATTR_SELECTOR)) {
    if (m[4] !== undefined) continue;
    const start = m.index ?? 0;
    if (offset >= start && offset <= start + m[0].length) {
      return { op: m[1], value: m[2] ?? m[3] ?? "", start };
    }
  }
  return undefined;
}

/** The first documented component class in the selector segment ending at `before` (its base class). */
function baseComponentInSelector(
  text: string,
  before: number,
  index: CssDocIndex,
): string | undefined {
  const boundary = Math.max(
    text.lastIndexOf("{", before),
    text.lastIndexOf("}", before),
    text.lastIndexOf(";", before),
    text.lastIndexOf(",", before),
    text.lastIndexOf("\n", before),
  );
  const segment = text.slice(boundary + 1, before);
  for (const m of segment.matchAll(CSS_CLASS_TOKEN)) {
    if (index.componentForClass(m[1])) return m[1];
  }
  return undefined;
}

/**
 * A class token that isn't a member of `perFile`'s component but names a sibling component in `project`
 * — mask-aware: the reference wears this file's own prefix (e.g. the projected `aaaa` for `${p}`), so
 * stripping it should leave a known component name. Returns that sibling's own base class (in `project`).
 */
function siblingComponentClass(
  token: string,
  perFile: CssDocIndex,
  project: CssDocIndex,
): string | undefined {
  for (const e of perFile.entries) {
    if (e.kind !== "component" || !e.className) continue;
    const own = stripLeadingDot(e.className);
    const prefix = e.name && own.endsWith(e.name) ? own.slice(0, own.length - e.name.length) : "";
    if (prefix === "" || !token.startsWith(prefix)) continue;
    const name = token.slice(prefix.length);
    const target = project.entries.find((pe) => pe.kind === "component" && pe.name === name);
    if (target?.className) return stripLeadingDot(target.className);
  }
  return undefined;
}

/**
 * One config scope: a documented-CSS index plus the `cssdoc.json` settings that govern it. A workspace
 * may have several (e.g. a monorepo with a `cssdoc.json` per package, each with its own convention).
 */
export interface ConfigScope {
  /** The directory of the governing `cssdoc.json` (`""` for the default/no-config scope). */
  dir: string;
  /** Workspace folder containing this scope, when one was provided by the client. */
  workspaceRoot?: string;
  /** The configuration (for rebuilding a CSS-doc index from unsaved editor text). */
  configuration?: CssDocConfiguration;
  index: CssDocIndex;
  /** Source indexes retaining each file’s URI and local spans, loaded only for definition requests. */
  definitionIndexes?: () => Iterable<CssDocIndex>;
  /**
   * The index used for sibling/cross-component recognition — this scope's own records plus any declared
   * `providers`' components. Defaults to {@link ConfigScope.index}. (Kept separate from `index` so the
   * value graph for `var()` resolution stays on the real, span-carrying scope index.)
   */
  siblingIndex?: CssDocIndex;
  /** A provider component's doc-page URL, from its `baseHref` (for cross-links). */
  providerHref?: (className: string) => string | undefined;
  severities: RuleSeverities;
  /** Resolve rule severities for a document path, including file overrides. */
  severitiesForFile?: (path: string) => RuleSeverities;
  ruleOptions?: RuleOptions;
  naming: ResolvedNaming;
  /** Class names exempt from the `structure-unknown-selector` rule. */
  structureIgnore?: readonly string[];
}

/** The language service. Construct with the component index (rebuild it when the CSS changes). */
export class CssDocLanguageService {
  private scopes: ConfigScope[];
  private readonly outsideWorkspace: ConfigScope = {
    dir: "",
    index: createIndex(""),
    severities: DEFAULT_RULE_SEVERITIES,
    naming: {},
  };
  /** How much a component hover card shows (`cssdoc.hover.detail`). */
  private hoverDetail: HoverDetail = "full";
  /** Per-section visibility for the `custom` hover detail (`cssdoc.hover.sections`). */
  private hoverSections: HoverSections = {};
  /** Section render order for the component hover card (`cssdoc.hover.sectionOrder`). */
  private hoverSectionOrder: HoverSectionOrder | undefined;
  private hoverPresentation: HoverPresentation = "vscode";

  constructor(index: CssDocIndex, severities: RuleSeverities = DEFAULT_RULE_SEVERITIES) {
    this.scopes = [{ dir: "", index, severities, naming: {}, ruleOptions: undefined }];
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

  /** Select the presentation used for hovers. */
  setHoverPresentation(presentation: HoverPresentation): void {
    this.hoverPresentation = presentation;
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

  private workspaceScopes(path?: string): ConfigScope[] {
    if (!path) return this.scopes;
    const roots = this.scopes
      .map((scope) => scope.workspaceRoot)
      .filter((root): root is string => !!root && containsPath(root, path))
      .toSorted((a, b) => b.length - a.length);
    if (roots.length) {
      return this.scopes.filter(
        (scope) => !scope.workspaceRoot || scope.workspaceRoot === roots[0],
      );
    }
    if (!this.scopes.some((scope) => scope.workspaceRoot)) return this.scopes;
    const shared = this.scopes.filter((scope) => !scope.workspaceRoot);
    return shared.length ? shared : [this.outsideWorkspace];
  }

  /** The scope governing `path` — the deepest `cssdoc.json` dir containing it, else the default. */
  private scopeForPath(path?: string): ConfigScope {
    let best: ConfigScope | undefined;
    const scopes = this.workspaceScopes(path);
    if (path) {
      for (const s of scopes) {
        if (s.dir && containsPath(s.dir, path)) {
          if (!best || s.dir.length > best.dir.length) best = s;
        }
      }
    }
    return best ?? scopes.find((s) => !s.dir) ?? scopes[0];
  }

  /**
   * The scopes to resolve `text` against: the workspace scopes, plus — for a host document — an in-file
   * scope built from its own embedded CSS. So a component defined in a document's `<style>` block (or a
   * Vue SFC) is available to that same document's markup for hover, completion, definition, and usage
   * checks, not just components from the workspace's `.css` files.
   */
  private scopesFor(text: string, path?: string, languageId?: string): ConfigScope[] {
    const host = detectEmbeddedHost(path) ?? hostForLanguageId(languageId);
    const scopes = this.workspaceScopes(path);
    if (!host) return scopes;
    const govern = this.scopeForPath(path);
    const parse = resolveParser(projectionDialect(text, { host }));
    return [
      ...scopes,
      {
        ...govern,
        index: safeCreateIndex(projectCss(text, { host }), {
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
    const open = before.lastIndexOf(DOC_COMMENT_START_TEXT);
    if (open !== -1 && open > before.lastIndexOf(COMMENT_END_TEXT) && COMPLETION_TAG.test(before)) {
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
        const tagStart = before.lastIndexOf("@");
        const tagEnd = offset + (COMPLETION_TAG_SUFFIX.exec(text.slice(offset))?.[0].length ?? 0);
        const range = rangeOf(text, tagStart, tagEnd);
        return config.supportedTagDefinitions
          .filter((t) => (seen.has(t.tagName) ? false : seen.add(t.tagName)))
          .map((t) => ({
            label: t.tagName,
            kind: 14 as const,
            detail: `${t.syntaxKind} tag`,
            documentation: t.description,
            textEdit: { range, newText: t.tagName },
          }));
      }
    }

    const scopes = this.scopesFor(text, path);
    if (COMPLETION_VAR.exec(before) !== null) {
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
      const governing = this.scopeForPath(path);
      const scope =
        this.scopeForBase(tokens, scopes) ??
        (tokens.some((token) => governing.siblingIndex?.componentForClass(token))
          ? governing
          : undefined) ??
        governing;
      const index = scope.siblingIndex ?? scope.index;
      const base = tokens.find((token) => index.componentForClass(token));
      return completeClasses(base, index).map(toCompletion);
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
   * `css` template, or a Markdown CSS code fence — resolved against the projected CSS, which shares the
   * source's offsets), and over a class *usage* (`class`/`className`, `clsx(…)`, Vue `:class`, Svelte
   * `class:name`).
   */
  hover(
    text: string,
    position: LspPosition,
    path?: string,
    languageId?: string,
    exampleFilter?: ExampleFilter | null,
  ): LspHover | undefined {
    const offset = offsetAt(text, position);
    const refHover = refHoverAt(
      text,
      offset,
      this.scopeForPath(path).configuration,
      this.hoverPresentation,
    );
    if (refHover) return refHover;

    // The governing scope supplies two indexes: `project` (the value graph for `var()` resolution and
    // this scope's own components) and `siblings` (that plus any declared providers' components, for
    // cross-component resolution).
    const governing = this.scopeForPath(path);
    const project = governing.index;
    const siblings = governing.siblingIndex ?? governing.index;

    // Authoring a stylesheet directly.
    if (languageId && CSS_LANGUAGES.has(languageId)) {
      return this.authoringHover(
        text,
        offset,
        path,
        resolveParser(dialectForFilename(path)),
        text,
        project,
        siblings,
        exampleFilter,
      );
    }
    // Authoring embedded CSS in a host document — run the same resolution over the projected CSS,
    // passing the original text so masked `${…}` interpolations are restored in the card.
    const host = detectEmbeddedHost(path) ?? hostForLanguageId(languageId);
    if (host) {
      const parse = resolveParser(projectionDialect(text, { host }));
      const h = this.authoringHover(
        projectCss(text, { host }),
        offset,
        path,
        parse,
        text,
        project,
        siblings,
        exampleFilter,
      );
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
    const classScopes = governing.siblingIndex
      ? [...scopes, { ...governing, index: governing.siblingIndex }]
      : scopes;
    const token = this.usageTokenAt(text, offset, classScopes);
    if (token) {
      const scope = this.scopeForBase([token.base ?? token.token], classScopes) ?? governing;
      const h = hoverForClass(
        token.base ?? token.token,
        token.token,
        scope.index,
        this.hoverDetail,
        this.hoverSections,
        this.hoverSectionOrder,
        exampleFilter,
        this.hoverPresentation,
      );
      if (h) return { contents: h.contents };
    }
    return undefined;
  }

  /**
   * An authoring hover over CSS `text`: the custom property or selector under `offset`, resolved against
   * a fresh index of that CSS (the file's own model, so unsaved edits are reflected). `project` is the
   * governing scope index — it supplies the value graph for `var()` resolution and the sibling
   * components a reference may point at (both live in other sheets the per-file index can't see).
   */
  private authoringHover(
    text: string,
    offset: number,
    path?: string,
    parse?: CssParse,
    source: string = text,
    project?: CssDocIndex,
    siblings?: CssDocIndex,
    exampleFilter?: ExampleFilter | null,
  ): LspHover | undefined {
    let index: CssDocIndex;
    try {
      index = createIndex(text, {
        configuration: this.scopeForPath(path).configuration,
        parse: parse ?? resolveParser(dialectForFilename(path)),
      });
    } catch {
      return undefined;
    }
    // Restore any `${…}` the projection masked (a no-op for a real stylesheet, where source === text).
    const card = (contents: string): LspHover => ({
      contents: unmaskContent(contents, text, source),
    });
    const clsCard = (base: string, token: string, idx: CssDocIndex): LspHover | undefined => {
      const h = hoverForClass(
        base,
        token,
        idx,
        this.hoverDetail,
        this.hoverSections,
        this.hoverSectionOrder,
        exampleFilter,
        this.hoverPresentation,
      );
      return h ? card(h.contents) : undefined;
    };

    // A custom property (`var(--…)` or a `--x:` declaration): the card resolves the value chain against
    // the project index, so `var(--a)` → `--a: var(--b)` → … reads through to a literal.
    const prop = propertyAt(text, offset);
    if (prop) {
      const h = hoverForCustomProperty(prop.name, index, project ?? index);
      if (h) return card(h.contents);
    }

    // A `[class*="-icon-"]` (or `~=`/`$=`) attribute selector resolves to the family modifier it defines
    // on the base component in the same selector.
    const attr = cssClassAttrSelectorAt(text, offset);
    if (attr) {
      const base = baseComponentInSelector(text, attr.start, index);
      const entry = base ? index.componentForClass(base) : undefined;
      if (base && entry) {
        const sel = `[class${attr.op}="${attr.value}"]`;
        const mod = entry.modifiers.find((m) => selectorDefines(sel, `.${m.name}`));
        if (mod) {
          const h = clsCard(base, mod.name, index);
          if (h) return h;
        }
      }
    }

    const cls = cssClassTokenAt(text, offset);
    if (cls) {
      const resolved = resolveCssClass(cls, index);
      if (resolved) return clsCard(resolved.base, resolved.token, index);
      // A class defined elsewhere in the scope or in a declared provider — the consumer writes the
      // real class, so a direct lookup against the sibling/provider index resolves it to its card.
      const external = siblings && resolveCssClass(cls, siblings);
      if (external) {
        const h = hoverForClass(
          external.base,
          external.token,
          siblings,
          this.hoverDetail,
          this.hoverSections,
          this.hoverSectionOrder,
          exampleFilter,
          this.hoverPresentation,
        );
        if (h) return { contents: h.contents };
      }
      // A prefixed sibling from the same package (an embedded `${p}` masked reference).
      const sibling = project && siblingComponentClass(cls, index, project);
      if (sibling) {
        const h = hoverForClass(
          sibling,
          sibling,
          project,
          this.hoverDetail,
          this.hoverSections,
          this.hoverSectionOrder,
          exampleFilter,
          this.hoverPresentation,
        );
        if (h) return { contents: h.contents };
      }
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
        for (const index of scope.definitionIndexes?.() ?? [scope.index]) {
          const loc = definitionForCustomProperty(prop.name, index);
          if (loc) return this.toLocation(loc);
        }
      }
      return undefined;
    }
    const token = this.usageTokenAt(text, offset, scopes);
    if (token) {
      const scope =
        this.scopeForBase([token.base ?? token.token], scopes) ?? this.scopeForPath(path);
      for (const index of scope.definitionIndexes?.() ?? [scope.index]) {
        const loc = definitionForClass(token.base ?? token.token, token.token, index);
        if (loc) return this.toLocation(loc);
      }
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
    let index: CssDocIndex;
    try {
      index = createIndex(text, {
        file: path,
        configuration: this.scopeForPath(path).configuration,
        parse: parse ?? resolveParser(dialectForFilename(path)),
      });
    } catch {
      return undefined;
    }
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
      // Pass the original text as `source` so masked interpolations are restored in messages.
      out.push(...this.cssDiagnostics(projectCss(text, { host }), path, parse, text));
    }
    // Consumer usage: check against every scope's index — the workspace scopes plus the document's own
    // embedded components (see `scopesFor`) — deduping identical diagnostics from any overlap. Use
    // `siblingIndex` (providers merged in) so a `@global` modifier documented on a provider's record
    // (e.g. a spacing utility) resolves against a component from this scope's own files.
    const seen = new Set<string>();
    for (const scope of this.scopesFor(text, path, languageId)) {
      const usageIndex = scope.siblingIndex ?? scope.index;
      const severities = path
        ? (scope.severitiesForFile?.(path) ?? scope.severities)
        : scope.severities;
      for (const { usage, start, end } of this.modifierUsages(text, scope)) {
        for (const d of checkClassUsage([usage], usageIndex, severities)) {
          const key = `${start}:${end}:${d.rule}:${d.message}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const canonical = usage.base
            ? usageIndex.deprecationOf(usage.base, usage.token)?.canonical
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
    // Providers' components count as documented bases too, so a component only reachable via a
    // `providers` entry (not this scope's own auto-detected files) is still recognized.
    const usageIndex = scope.siblingIndex ?? scope.index;
    const { matcher } = usageIndex;
    const results: { usage: ClassUsage; start: number; end: number }[] = [];

    if (matcher.convention.structure === "attribute") {
      for (const tag of text.matchAll(ATTRIBUTE_USAGE_TAG)) {
        const tagStart = tag.index ?? 0;
        const attrs = [...tag[0].matchAll(QUOTED_ATTRIBUTE)];
        const tokens: string[] = [];
        const classTokens: { token: string; start: number; end: number }[] = [];
        const elementName = tag[1].toLowerCase();
        for (const a of attrs) {
          if (a[1] === "class" || a[1] === "className") {
            const raw = a[2] ?? a[3] ?? "";
            const rawStart = tagStart + (a.index ?? 0) + a[0].length - 1 - raw.length;
            for (const w of raw.matchAll(NON_WHITESPACE)) {
              const token = w[0];
              const start = rawStart + (w.index ?? 0);
              classTokens.push({ token, start, end: start + token.length });
              tokens.push(token);
            }
          }
        }
        const baseToken = classTokens.find((t) => usageIndex.componentForClass(t.token));
        const base = baseToken?.token;
        if (!base) continue;
        results.push({
          usage: {
            base,
            tokens,
            token: base,
            elementName,
            loc: spanFromOffsets(text, baseToken!.start, baseToken!.end),
          },
          start: baseToken!.start,
          end: baseToken!.end,
        });
        for (const a of attrs) {
          if (a[1] === "class" || a[1] === "className") continue;
          const token = `${a[1]}="${a[2] ?? a[3] ?? ""}"`;
          if (!matcher.looksLikeUsage(token, base)) continue;
          const start = tagStart + (a.index ?? 0);
          results.push({
            usage: {
              base,
              tokens,
              token,
              elementName,
              loc: spanFromOffsets(text, start, start + a[0].length),
            },
            start,
            end: start + a[0].length,
          });
        }
      }
      return results;
    }

    // One site per element — class tokens across `class`/`className`/`:class`/`class:name` (JSX, Vue,
    // Svelte, HTML). A documented component among the tokens turns the element into a checkable usage.
    for (const site of scanClassUsages(text)) {
      const tokens = site.tokens.map((t) => t.token);
      const baseToken = site.tokens.find((t) => usageIndex.componentForClass(t.token));
      const base = baseToken?.token;
      if (!base) continue; // only check elements that carry a documented component of this scope
      results.push({
        usage: {
          base,
          tokens,
          token: base,
          elementName: site.elementName,
          loc: spanFromOffsets(text, baseToken!.start, baseToken!.end),
        },
        start: baseToken!.start,
        end: baseToken!.end,
      });
      for (const member of site.tokens) {
        if (matcher.usageKind(member.token, base) === undefined) continue;
        results.push({
          usage: {
            base,
            tokens,
            token: member.token,
            elementName: site.elementName,
            loc: spanFromOffsets(text, member.start, member.end),
          },
          start: member.start,
          end: member.end,
        });
      }
    }
    return results;
  }

  /**
   * Lint an open stylesheet against its governing scope: doc hygiene + registered-property checks.
   * `source` is the original document text; it differs from `text` only for embedded hosts, where `text`
   * is the CSS projection (interpolations masked). The projection is character-for-character with the
   * source, so a diagnostic's `maskedName` — the masked class token — can be restored for display by
   * slicing `source` at the token's offset (found in `text`).
   */
  private cssDiagnostics(
    text: string,
    path?: string,
    parse?: CssParse,
    source: string = text,
  ): LspDiagnostic[] {
    try {
      const scope = this.scopeForPath(path);
      const severities = path
        ? (scope.severitiesForFile?.(path) ?? scope.severities)
        : scope.severities;
      const index = createIndex(text, { configuration: scope.configuration, parse });
      const { assignments, usages } = cssValueSites(text, { parse });
      const diags = applyDirectives(
        [
          // Pass the project-wide index so `@structure` can reference sibling components from other files.
          // Recognize this scope's own components AND any declared providers' components as siblings.
          ...lintModel(
            index,
            severities,
            scope.naming,
            scope.structureIgnore,
            scope.siblingIndex ?? scope.index,
            scope.ruleOptions,
          ),
          ...checkPropertyAssignments(assignments, index, severities),
          ...checkPropertyUsage(usages, index, {}, severities),
        ],
        text, // honor `/* cssdoc-disable … */` directives in the source
        severities["cssdoc-directive"],
      );
      const out: LspDiagnostic[] = [];
      for (const d of diags) {
        if (!d.span) continue;
        out.push({
          range: spanToRange(d.span),
          message: unmask(d.message, d.data?.maskedName, text, source),
          severity: d.severity === "error" ? 1 : 2,
          code: d.rule,
        });
      }
      return out;
    } catch {
      return [];
    }
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

  /**
   * Semantic tokens for syntax highlighting in doc comments (`@component`, `@modifier`, `@deprecated`, etc).
   * Returns encoded tokens in LSP format: each token is [line, startChar, length, tokenType, modifiers].
   */
  semanticTokens(text: string, path?: string): LspSemanticToken[] {
    const tokens: LspSemanticToken[] = [];

    // Token type indices (must match client legend)
    const tokenTypes = {
      keyword: 0, // @tags
      variable: 1, // class/property names
      type: 2, // modifier names
      comment: 3, // doc comment content
      decorator: 4, // @-prefixed tags
    };

    // Token modifier indices
    const modifiers = {
      deprecated: 0,
      modification: 1,
      optional: 2,
    };

    // Parse doc comments in CSS to find cssdoc tags
    const host = path ? detectEmbeddedHost(path) : undefined;
    const projected = host ? projectCss(text, { host }) : text;
    const configuration = this.scopeForPath(path).configuration;
    const docComments = projected.matchAll(SEMANTIC_DOC_COMMENT);
    for (const block of docComments) {
      const blockText = block[0];
      const blockStart = block.index ?? 0;
      for (const highlight of highlightDocComment(blockText, configuration)) {
        const LINE_ENDING: Regex = arkRegex.as(LINE_ENDING_SOURCE, "u");
        const line = blockText.slice(highlight.start).split(LINE_ENDING, 1)[0];
        const tagMatches = line.matchAll(SEMANTIC_TAG);
        for (const match of tagMatches) {
          if (match.index !== 0) continue;
          const tagName = match[1];
          const tagStart = blockStart + highlight.start + 1;
          const tagValue = match[2];
          const tagPosition = positionAt(text, tagStart);

          // Emit @tag token
          tokens.push({
            line: tagPosition.line,
            startCharacter: tagPosition.character,
            length: tagName.length,
            tokenType: tokenTypes.decorator,
            tokenModifiers: 0,
          });

          // Check for deprecated/modification flags
          let modifierFlags = 0;
          if (tagName === "deprecated") modifierFlags |= 1 << modifiers.deprecated;
          if (tagName === "modifier") modifierFlags |= 1 << modifiers.modification;
          if (tagName.startsWith("css")) modifierFlags |= 1 << modifiers.optional;

          // Emit value token if present
          if (tagValue) {
            const valueStart =
              blockStart + highlight.start + match[0].indexOf(tagValue, tagName.length + 1);
            const valuePosition = positionAt(text, valueStart);
            tokens.push({
              line: valuePosition.line,
              startCharacter: valuePosition.character,
              length: Math.min(tagValue.length, 50),
              tokenType: tokenTypes.variable,
              tokenModifiers: modifierFlags,
            });
          }
        }
      }
    }

    return tokens;
  }

  /**
   * Inlay hints for custom property metadata inline in CSS rules.
   * Shows property syntax, default values, and other metadata.
   */
  inlayHints(text: string, path?: string): LspInlayHint[] {
    const hints: LspInlayHint[] = [];
    const index = this.scopeForPath(path).index;

    // Show custom property metadata when used
    for (const prop of index.allCustomProperties()) {
      const propName = prop.property.name;
      // Use escaped pattern to find all property usages
      const pattern: Regex = arkRegex.as(escapeRegex(propName), "gu");
      const propMatches = text.matchAll(pattern);

      for (const match of propMatches) {
        const propStart = match.index ?? 0;
        const propPos = positionAt(text, propStart);
        const hintLabel = prop.property.syntax ? `${prop.property.syntax}` : "custom property";

        const tooltipParts: string[] = [`Property: ${propName}`, `Declared in: ${prop.record}`];
        if (prop.property.description) {
          tooltipParts.push(`Description: ${prop.property.description}`);
        }
        if (prop.property.defaultValue) {
          tooltipParts.push(`Default: ${prop.property.defaultValue}`);
        }
        if (prop.property.inherits !== undefined) {
          tooltipParts.push(`Inherits: ${prop.property.inherits ? "yes" : "no"}`);
        }

        hints.push({
          position: propPos,
          label: hintLabel,
          kind: 1, // type hint
          tooltip: tooltipParts.join("\n"),
        });
      }
    }

    return hints;
  }
}

function toCompletion(c: {
  label: string;
  detail?: string;
  documentation?: string;
  deprecated?: boolean;
  sortText?: string;
}): LspCompletion {
  return {
    label: c.label,
    detail: c.detail,
    documentation: c.documentation,
    deprecated: c.deprecated,
    sortText: c.sortText,
  };
}
