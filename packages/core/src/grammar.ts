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
 *   (attribute, ID, compound, `:host`).
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
import type { Regex } from "arkregex";
import { regex as arkRegex } from "arkregex";
import { CssDocConfiguration } from "./configuration.ts";
import { blockSourceRange, collectDocCommentBlocks, type DocCommentBlock } from "./blocks.ts";
import { frameCommentLines } from "./framing.ts";
import { docProseStart } from "./structure-boundaries.ts";
import { collectProse, type DocCommentProse } from "./prose-shared.ts";
import {
  cardinalityFromMatch,
  splitTrailingCardinality,
  STRUCTURE_CARDINALITY,
} from "./cardinality.ts";
import {
  DOT_CHAR,
  POUND_CHAR,
  BRACKET_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  CSSDOC_ATTRIBUTE_SELECTOR_SOURCE,
  CSSDOC_SELECTOR_TOKEN_SOURCE,
  CSSDOC_QUALIFIED_REFERENCE_SOURCE,
  CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
  CSSDOC_EXAMPLE_LABEL_SOURCE,
  CSSDOC_DESCRIPTION_SEPARATOR_SOURCE,
  CSSDOC_MODIFIER_ANNOTATION_PREFIX_SOURCE,
  CSSDOC_MODIFIER_REFERENCE_SOURCE,
  STRUCTURE_RECORD_KIND_SOURCE,
  WHITESPACE_RUN,
  toRegExp,
  MARKDOWN_ATX_HEADING_PREFIX_SOURCE,
  MARKDOWN_ORDERED_LIST_MARKER_SOURCE,
  MARKDOWN_UNORDERED_LIST_MARKER_SOURCE,
  BACKTICK_CHAR,
  GREATER_THAN_CHAR,
  ASTERISK_SOURCE,
  FORWARD_SLASH_SOURCE,
  AT_SOURCE,
  AT_CHAR,
  DOT_SOURCE,
  RECORD_REFERENCE_NAME_SOURCE,
  DIGIT_SOURCE,
  ALPHANUMERIC_EXTENDED_SOURCE,
  COLON_CHAR,
  COLON_SOURCE,
  BRACE_OPEN_CHAR,
  BRACE_OPEN_SOURCE,
  BRACE_CLOSE_SOURCE,
  BRACE_CLOSE_CHAR,
  BRACKET_OPEN_SOURCE,
  BRACKET_CLOSE_SOURCE,
  PAREN_OPEN_SOURCE,
  PAREN_CLOSE_SOURCE,
  PAREN_CLOSE_CHAR,
  WORD_BOUNDARY_SOURCE,
  SPACE_TAB_SOURCE,
  CARRIAGE_RETURN_CHAR,
  CARRIAGE_RETURN_SOURCE,
  LINE_FEED_CHAR,
  LINE_FEED_SOURCE,
  LINE_ENDING_SOURCE,
} from "@cssdoc/regex";
import type {
  CssParse,
  CssRelated,
  CssRecordKind,
  CssReleaseStage,
  CssVisibility,
  StructureNode,
  StructureVariant,
} from "./model.ts";

/** One parsed annotation legend row from an `@annotations` block. */
export interface DocAnnotation {
  ref: number;
  text: string;
}

/** Record-level object-model decorators authored on the record doc comment. */
export interface DocDecorators {
  preventExtensions: boolean;
  sealed: boolean;
  frozen: boolean;
  isReadonly: boolean;
}

const RELEASE_STAGES: readonly CssReleaseStage[] = ["alpha", "beta", "experimental", "stable"];

function isReleaseStage(value: string): value is CssReleaseStage {
  return RELEASE_STAGES.includes(value as CssReleaseStage);
}

/**
 * The record-opening tags and the {@link CssRecordKind} each selects, as the default boundary map.
 * `@name` is an alias for `@component`. A {@link CssDocConfiguration} may add more record tags.
 */
export const RECORD_TAGS: Record<string, CssRecordKind> = {
  component: "component",
  name: "component",
  utility: "utility",
  declaration: "declaration",
};

/** A custom property documented by a `@cssproperty` tag. */
export interface DocCssProperty {
  /** Custom-property name, including its `--` prefix. */
  name: string;
  /** Authored syntax descriptor, when supplied. */
  syntax?: string;
  /** Authored default value, when supplied. */
  defaultValue?: string;
  /** Authored descriptive prose, when supplied. */
  description?: string;
}

/** The prose a `@modifier` tag contributes: a description and/or an inline deprecation replacement note. */
export interface DocModifier {
  /** Authored descriptive prose, when supplied. */
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
  /** Free-text alias guidance from an inline `@alias` tag on the modifier line. */
  alias?: string;
  /** The canonical modifier this alias maps to, from `@alias {@link -canonical}` or `@alias -canonical`. */
  aliasCanonical?: string;
  /** Set from an inline `@interaction` marker — a JS-toggled class with no CSS of its own. */
  interaction?: boolean;
  /** Set from an inline `@global` marker — this modifier applies to any record (not just its parent). */
  global?: boolean;
  /** Set from an inline `@affects <component>.<target>` marker — a descendant record this modifier changes the rendering of. */
  affects?: {
    /** Name of the affected record. */
    component: string;
    /** Name of the affected part, pseudo-element, or state. */
    target: string;
    /** Optional authored explanation of the effect. */
    description?: string;
  }[];
}

/** An authored conditional-support tag (`@container`/`@supports`/`@media`/`@responsive`). */
export interface DocCondition {
  /** Condition kind; responsive tags are represented as media conditions. */
  type: "container" | "supports" | "media";
  /** The authored condition query. */
  query: string;
  /** Authored descriptive prose, when supplied. */
  description?: string;
}

/** The structured content extracted from one doc-comment block. */
export interface ParsedDoc {
  /** Authored tag blocks and their UTF-16 ranges, including unknown and disabled tags. */
  blocks: readonly DocCommentBlock[];
  /** Framing-free prose and source ranges; lite always uses plain interpretation. */
  prose: readonly DocCommentProse[];
  /** A record-opening tag's canonical name. Marks a record boundary. */
  component?: string;
  /** The record kind chosen by the opening tag. */
  kind?: CssRecordKind;
  /** `@selector` — an explicit base CSS selector (any valid simple selector; otherwise inferred from the CSS). */
  className?: string;
  /**
   * The full, untruncated `@selector` text as authored, before {@link className} truncates it to its
   * leading token (e.g. `.pfx-list > li` stays whole here even though `className` becomes `.pfx-list`).
   * Lets callers detect when an authored `@selector` names a descendant compound rather than a plain
   * base selector, without changing what `className` resolves to elsewhere.
   */
  fullSelector?: string;
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
  /** Release maturity from `@stage`. */
  releaseStage?: CssReleaseStage;
  /** Audience visibility from `@visibility`. */
  visibility?: CssVisibility;
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
  /** Raw `@element` declarations keyed by profile (`""` for default), in author order. */
  elements: Map<string, string[]>;
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
  /** Example labels keyed by zero-based index into {@link examples}. */
  exampleLabels?: Record<number, readonly string[]>;
  /** Private examples, keyed by zero-based index into {@link examples}. */
  privateExamples?: number[];
  /** Source ranges of 1.0 example bodies, keyed by example index and relative to the input comment. */
  exampleSpans?: Record<number, { start: number; end: number }>;
  /** `@structure` — the nested-CSS body, parsed into a selector tree by {@link parseStructure}. */
  structure?: StructureNode[];
  /** Alternative DOM shapes from top-level `@variant` blocks in `@structure`, when authored. */
  structureVariants?: StructureVariant[];
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
  /** Parsed `@annotations` legend rows, keyed by numeric reference index. */
  annotations: Map<number, string>;
  /** Parsed `@ref` values in author order. */
  refs: number[];
  /** Record-level object-model decorators. */
  decorators: DocDecorators;
  /** `@compat` browser-support / feature-compatibility notes. */
  compat: string[];
  /** `@related` component cross-references. */
  related: CssRelated[];
  /** `@memberOf <component> [private]`, when authored. */
  memberOf?: {
    /** Name of the containing record. */
    component: string;
    /** Whether the relationship is private. */
    private: boolean;
  };
  /** `@members <name>, <name>, …` — the inverse direction, when authored. */
  members?: string[];
  /** Repeatable `@member <name> [private]` declarations on the parent record. */
  memberEntries: {
    /** Name of the member record. */
    name: string;
    /** Whether the member is private. */
    private: boolean;
  }[];
  /** Set by a record-level `@global` tag — modifiers of this record apply to other records. */
  global?: boolean;
  /** Content of registered custom (block) tags, keyed by tag name without its `@`. */
  customBlocks: Map<string, string[]>;
}

/**
 * Derive a short human-readable name from any CSS simple selector — the key used to store and look up
 * `@part`, `@wrapper`, and similar tags keyed by element identity rather than full modifier expression.
 */
export function deriveSelectorName(sel: string): string {
  if (sel.startsWith(DOT_CHAR)) return sel.slice(1);
  if (sel.startsWith(POUND_CHAR)) return sel.slice(1);
  if (sel.startsWith(":host")) return "host";
  const SELECTOR_ATTR_KEY: Regex = arkRegex.as(String.raw`^\[([^=\s~^$*|[\]]+)`, "u");
  const attrKey = sel.match(SELECTOR_ATTR_KEY)?.[1];
  if (attrKey) return attrKey;
  const LEADING_NON_WORD: Regex = arkRegex.as(String.raw`^\W+`, "u");
  return sel.replace(LEADING_NON_WORD, "") || sel;
}

/**
 * Derive the modifier key from a CSS selector token — the form that matches AST-extracted modifier names.
 * Class and bare names strip the leading dot; attribute selectors strip outer brackets (inner content
 * is the convention-normalized form); IDs and `:host` strip their prefix.
 */
function deriveModifierKey(sel: string): string {
  if (sel.startsWith(DOT_CHAR)) return sel.slice(1);
  if (sel.startsWith(POUND_CHAR)) return sel.slice(1);
  if (sel.startsWith(":host")) return "host";
  if (sel.startsWith(BRACKET_OPEN_CHAR) && sel.endsWith(BRACKET_CLOSE_CHAR))
    return sel.slice(1, -1);
  return sel;
}

/** Split a tag's argument into `head` (a selector/name/token) and `description` on ` — ` or ` - `. */
function splitDesc(rest: string): { head: string; description?: string } {
  const DESCRIPTION: Regex = arkRegex.as(
    String.raw`^(\S+)\s+${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s+([\s\S]*)$`,
    "u",
  );
  const m = rest.match(DESCRIPTION);
  if (m) return { head: m[1], description: normalizeMultilineDescription(m[2]) };
  return { head: rest.trim() || rest };
}

/** Split any argument into `query` (everything before the first ` — `/` - `) and `description`. */
function splitQuery(rest: string): { query: string; description?: string } {
  const QUERY: Regex = arkRegex.as(
    String.raw`^([\s\S]*?)\s+${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s+([\s\S]*)$`,
    "u",
  );
  const m = rest.match(QUERY);
  if (m) return { query: m[1].trim(), description: normalizeMultilineDescription(m[2]) };
  return { query: rest.trim() };
}

/** Strip the comment framing (`/**`, `*\/`, and leading ` * `) from a raw block-comment body. */
export function stripCommentFraming(raw: string): string {
  return frameCommentLines(raw, "framed")
    .map((line) => line.text + line.ending)
    .join("")
    .trim();
}

function splitCommentLines(raw: string): string[] {
  const LINE_ENDING: Regex = arkRegex.as(
    `${CARRIAGE_RETURN_SOURCE}(?!${LINE_FEED_SOURCE})|${LINE_FEED_SOURCE}`,
    "u",
  );
  return raw.split(LINE_ENDING);
}

/** Parse the inner body of a `@modifier` line's argument into a {@link DocModifier}. */
function parseModifierBody(description: string | undefined): DocModifier {
  const normalizeCanonical = (value: string | undefined): string | undefined => {
    const LEADING_DOT: Regex = arkRegex.as(`^${DOT_SOURCE}`, "u");
    const LEADING_BRACKET: Regex = arkRegex.as(`^${BRACKET_OPEN_SOURCE}`, "u");
    const TRAILING_BRACKET: Regex = arkRegex.as(`${BRACKET_CLOSE_SOURCE}$`, "u");
    return value
      ?.replace(LEADING_DOT, "")
      .replace(LEADING_BRACKET, "")
      .replace(TRAILING_BRACKET, "");
  };

  const parseCanonicalAndNote = (
    raw: string,
    allowBareCanonical: boolean,
  ): { canonical?: string; note?: string } => {
    const trimmed = raw.trim();
    const LINK: Regex = arkRegex.as(
      String.raw`${BRACE_OPEN_SOURCE}${AT_SOURCE}link\s+(${CSSDOC_MODIFIER_REFERENCE_SOURCE})\s*${BRACE_CLOSE_SOURCE}`,
      "u",
    );
    const link = trimmed.match(LINK);
    if (link) {
      const canonical = normalizeCanonical(link[1]);
      const LINK_TEXT: Regex = arkRegex.as(
        String.raw`${BRACE_OPEN_SOURCE}${AT_SOURCE}link\s+[^${BRACE_CLOSE_CHAR}]*${BRACE_CLOSE_SOURCE}`,
        "u",
      );
      const note = trimmed.replace(LINK_TEXT, "").trim() || undefined;
      return { canonical, note };
    }
    if (allowBareCanonical) {
      const BARE: Regex = arkRegex.as(`^(${CSSDOC_MODIFIER_REFERENCE_SOURCE})(.*)$`, "u");
      const bare = trimmed.match(BARE);
      if (bare) {
        const canonical = normalizeCanonical(bare[1]);
        const note = bare[2].trim() || undefined;
        return { canonical, note };
      }
    }
    return { note: trimmed || undefined };
  };

  // A description beginning `@deprecated …` marks the modifier deprecated. A `{@link -canonical}` in the
  // remainder names the modifier to use instead; any other text is the free-text note.
  const DEPRECATED: Regex = arkRegex.as(
    String.raw`^${CSSDOC_MODIFIER_ANNOTATION_PREFIX_SOURCE}${AT_SOURCE}deprecated${WORD_BOUNDARY_SOURCE}\s*([\s\S]*)$`,
    "u",
  );
  const dep = description?.match(DEPRECATED);
  if (dep) {
    const parsed = parseCanonicalAndNote(dep[1], false);
    if (!parsed.note && !parsed.canonical) return { deprecatedFlag: true };
    return { deprecated: parsed.note, deprecatedCanonical: parsed.canonical };
  }
  // A description beginning `@alias …` maps this modifier to a canonical one while keeping both names
  // valid. The canonical may be authored as `{@link -canonical}` or `-canonical` directly.
  const ALIAS: Regex = arkRegex.as(
    String.raw`^${CSSDOC_MODIFIER_ANNOTATION_PREFIX_SOURCE}${AT_SOURCE}alias${WORD_BOUNDARY_SOURCE}\s*([\s\S]*)$`,
    "u",
  );
  const alias = description?.match(ALIAS);
  if (alias) {
    const parsed = parseCanonicalAndNote(alias[1], true);
    return { alias: parsed.note, aliasCanonical: parsed.canonical };
  }
  // A description beginning `@interaction …` marks a JS-toggled class with no CSS declarations of its
  // own (e.g. `@modifier -should-animate — @interaction Toggled while the ring grows.`); it's exempt
  // from the "documented modifier isn't defined by any selector" check.
  const INTERACTION: Regex = arkRegex.as(
    String.raw`^${AT_SOURCE}interaction${WORD_BOUNDARY_SOURCE}\s*([\s\S]*)$`,
    "u",
  );
  const inter = description?.match(INTERACTION);
  if (inter) return { description: inter[1].trim() || undefined, interaction: true };
  // A description beginning `@global …` marks this modifier as applying to any record.
  const GLOBAL: Regex = arkRegex.as(
    String.raw`^${AT_SOURCE}global${WORD_BOUNDARY_SOURCE}\s*([\s\S]*)$`,
    "u",
  );
  const glob = description?.match(GLOBAL);
  if (glob) return { description: glob[1].trim() || undefined, global: true };
  // A description beginning `@affects <component>.<target> …` names a descendant record (a part, pseudo,
  // or state on it) whose rendering this modifier changes — e.g. a `-layout-stacked` modifier on `table`
  // that changes how `table-cell` renders, via `.table.-layout-stacked .table-cell::before {…}` in
  // table-cell's own stylesheet, which otherwise has nothing on `table`'s side pointing a reader there.
  const AFFECTS_TAG: Regex = arkRegex.as(
    String.raw`^${AT_SOURCE}affects${WORD_BOUNDARY_SOURCE}\s*([\s\S]*)$`,
    "u",
  );
  const aff = description?.match(AFFECTS_TAG);
  if (aff) {
    const rest = aff[1].trim();
    const AFFECTS: Regex = arkRegex.as(
      String.raw`^([\w-]+)${DOT_SOURCE}([\w-]+)\s*(?:${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s*([\s\S]*))?$`,
      "u",
    );
    const m = rest.match(AFFECTS);
    if (m) {
      return {
        affects: [{ component: m[1], target: m[2], description: m[3]?.trim() || undefined }],
      };
    }
    return { description: rest || undefined };
  }
  return { description: description ?? "" };
}

/**
 * Parse a doc-comment's inner text or a complete block into a {@link ParsedDoc}. The `configuration`
 * decides which tags are active and which custom tags to capture. Unknown and unsupported tags
 * remain in {@link ParsedDoc.blocks} but don't populate the interpreted fields.
 *
 * @param raw - A complete doc comment or unframed text without leading comment markers.
 * @param configuration - The active tag configuration (defaults to the full standard vocabulary).
 * @param parse - An optional CSS parser used to build structure trees.
 * @returns The structured tags.
 */
export function parseDocComment(
  raw: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
  parse?: CssParse,
): ParsedDoc {
  const blocks = collectDocCommentBlocks(raw, configuration);
  const doc: ParsedDoc = {
    blocks,
    prose: collectProse(raw, blocks, configuration),
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
    elements: new Map(),
    functions: new Map(),
    animations: new Map(),
    layers: new Map(),
    conditions: [],
    examples: [],
    see: [],
    annotations: new Map(),
    refs: [],
    decorators: {
      preventExtensions: false,
      sealed: false,
      frozen: false,
      isReadonly: false,
    },
    compat: [],
    related: [],
    memberEntries: [],
    customBlocks: new Map(),
  };

  const BLOCK_HEADER: Regex = arkRegex.as(
    String.raw`^${AT_SOURCE}(${CSSDOC_BLOCK_TAG_NAME_SOURCE})${SPACE_TAB_SOURCE}*([\s\S]*)$`,
    "u",
  );
  const PRIVATE_SOURCE = `${BRACE_OPEN_SOURCE}${AT_SOURCE}private${BRACE_CLOSE_SOURCE}`;
  const PRIVATE: Regex = arkRegex.as(PRIVATE_SOURCE, "u");
  for (const [blockIndex, block] of blocks.entries()) {
    const m = block.text.match(BLOCK_HEADER);
    if (!m) continue;
    const tagName = m[1];
    const rest = m[2].trim();
    const definition = configuration.tryGetTagDefinition(tagName);
    if (!definition || !configuration.isTagSupported(definition)) continue;

    if (definition.syntaxKind === "record") {
      const WHITESPACE: Regex = arkRegex.as(String.raw`\s`, "u");
      doc.component = rest.split(WHITESPACE)[0];
      doc.kind = definition.recordKind;
      continue;
    }
    if (definition.syntaxKind === "inline") continue; // inline tags live inside descriptions

    if (definition.canonicalName === "example") {
      const FIRST_LINE_END: Regex = arkRegex.as(LINE_ENDING_SOURCE, "u");
      const firstLineEnd = block.text.search(FIRST_LINE_END);
      let firstLine = block.text.slice(0, firstLineEnd < 0 ? undefined : firstLineEnd);
      if (firstLineEnd >= 0 && firstLine.endsWith(CARRIAGE_RETURN_CHAR)) {
        firstLine = firstLine.slice(0, -1);
      }
      const proseStart = docProseStart(firstLine);
      const dividerEnd =
        proseStart === undefined
          ? undefined
          : proseStart - (firstLine[proseStart - 1] === " " ? 1 : 0);
      const header = firstLine.slice(
        tagName.length + 1,
        dividerEnd === undefined ? undefined : dividerEnd - 1,
      );
      const HEADER: Regex = arkRegex.as(
        `^${SPACE_TAB_SOURCE}*(?:(${CSSDOC_EXAMPLE_LABEL_SOURCE}(?:${SPACE_TAB_SOURCE}*,${SPACE_TAB_SOURCE}*${CSSDOC_EXAMPLE_LABEL_SOURCE})*)(?:${SPACE_TAB_SOURCE}+(${PRIVATE_SOURCE}))?|(${PRIVATE_SOURCE}))?${SPACE_TAB_SOURCE}*$`,
        "u",
      );
      const parsedHeader = HEADER.exec(header);
      if (PRIVATE.test(header)) (doc.privateExamples ??= []).push(doc.examples.length);
      if (proseStart !== undefined && parsedHeader) {
        if (parsedHeader[1]) {
          (doc.exampleLabels ??= {})[doc.examples.length] = [
            ...new Set(parsedHeader[1].split(",").map((label) => label.trim())),
          ];
        }
        let bodyEnd = block.text.length;
        if (block.text.endsWith(CARRIAGE_RETURN_CHAR)) {
          const last = blockSourceRange(block, bodyEnd - 1, bodyEnd);
          if (raw[last.end] === LINE_FEED_CHAR) bodyEnd--;
        }
        let bodyStart = proseStart;
        if (bodyStart === firstLine.length && firstLineEnd >= 0 && bodyStart < bodyEnd) {
          const ending = FIRST_LINE_END.exec(block.text.slice(bodyStart));
          if (ending?.index === 0) bodyStart += Math.min(ending[0].length, bodyEnd - bodyStart);
        }
        (doc.exampleSpans ??= {})[doc.examples.length] = blockSourceRange(
          block,
          bodyStart,
          bodyEnd,
        );
        doc.examples.push(block.text.slice(bodyStart, bodyEnd));
        continue;
      }
      const LABELS_HEADER: Regex = arkRegex.as(
        String.raw`^labels=${BRACKET_OPEN_SOURCE}(${CSSDOC_EXAMPLE_LABEL_SOURCE}(?:${SPACE_TAB_SOURCE}*,${SPACE_TAB_SOURCE}*${CSSDOC_EXAMPLE_LABEL_SOURCE})*)${BRACKET_CLOSE_SOURCE}(?:${LINE_ENDING_SOURCE}|$)`,
        "u",
      );
      const legacyHeader = LABELS_HEADER.exec(m[2]);
      if (legacyHeader) {
        (doc.exampleLabels ??= {})[doc.examples.length] = [
          ...new Set(legacyHeader[1].split(",").map((label) => label.trim())),
        ];
      }
      // Unescape Markdown fences authored inside a JS `css` template.
      const ESCAPED_BACKTICK: Regex = arkRegex.as(String.raw`\\${BACKTICK_CHAR}`, "gu");
      doc.examples.push(
        (legacyHeader ? m[2].slice(legacyHeader[0].length).trim() : rest).replace(
          ESCAPED_BACKTICK,
          BACKTICK_CHAR,
        ),
      );
      continue;
    }

    const next = blocks[blockIndex + 1]?.start ?? raw.length;
    const body = doc.prose.find(
      (prose) => prose.span.start >= block.start && prose.span.start < next,
    );
    if (body?.private) {
      if (definition.canonicalName !== "remarks" && definition.canonicalName !== "privateRemarks") {
        let safeRest = body.header
          .slice(tagName.length + 1)
          .replace(PRIVATE, "")
          .trim();
        if (definition.canonicalName === "structure") {
          const FIRST_LINE_END: Regex = arkRegex.as(LINE_ENDING_SOURCE, "u");
          const lineEnd = block.text.search(FIRST_LINE_END);
          if (lineEnd >= 0) safeRest += block.text.slice(lineEnd);
        }
        applyBlockTag(doc, definition.canonicalName, definition.tagNameWithoutAt, safeRest, parse);
      }
      continue;
    }
    if (definition.canonicalName === "remarks" && body) {
      doc.remarks = body.text;
      continue;
    }
    applyBlockTag(doc, definition.canonicalName, definition.tagNameWithoutAt, rest, parse);
  }
  // A dotted component name (`menu.item`) implies membership in its immediate parent (`menu`), unless
  // an explicit @memberOf already said otherwise.
  if (!doc.memberOf && doc.component?.includes(".")) {
    const dot = doc.component.lastIndexOf(".");
    doc.memberOf = { component: doc.component.slice(0, dot), private: false };
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
    case "selector": {
      // Match a full selector token: consecutive bracket groups, :host(-context(…)), or a plain \S+ token.
      const SELECTOR: Regex = arkRegex.as(`^(${CSSDOC_SELECTOR_TOKEN_SOURCE})`, "u");
      doc.className = rest.match(SELECTOR)?.[1] ?? "";
      doc.fullSelector = rest.trim();
      break;
    }
    case "summary": {
      doc.summary = rest.replace(toRegExp(WHITESPACE_RUN), " ").trim();
      break;
    }
    case "stage":
      if (isReleaseStage(rest)) doc.releaseStage = rest;
      break;
    case "visibility":
      if (rest === "internal" || rest === "public") doc.visibility = rest;
      break;
    case "remarks":
      doc.remarks = normalizeMultilineDescription(rest);
      break;
    case "privateRemarks":
      doc.privateRemarks = normalizeMultilineDescription(rest);
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
      const variants = parseStructureVariants(css, parse, doc.component);
      doc.structure = variants
        ? (variants[0]?.nodes ?? [])
        : parseStructure(css, parse, doc.component);
      if (variants) doc.structureVariants = variants;
      if (description) doc.structureDescription = description;
      break;
    }
    case "modifier": {
      const { name: mName, selector: mSel, description: mDesc } = splitModifierArg(rest);
      doc.modifiers.set(mName, parseModifierBody(mDesc));
      // Store only when the selector is a genuine CSS token (not a bare modifier name) and non-trivially different from `.${name}`.
      const SELECTOR_PREFIX: Regex = arkRegex.as(
        `^[${DOT_CHAR}${POUND_CHAR}${BRACKET_OPEN_SOURCE}${COLON_CHAR}${FORWARD_SLASH_SOURCE}]`,
        "u",
      );
      if (mSel !== `${DOT_CHAR}${mName}` && SELECTOR_PREFIX.test(mSel))
        doc.modifierSelectors.set(mName, mSel);
      break;
    }
    case "part": {
      const { name: pName, selector: pSel, description: pDesc } = splitPartArg(rest);
      doc.parts.set(pName, pDesc ?? "");
      if (pSel !== `${DOT_CHAR}${pName}`) doc.partSelectors.set(pName, pSel);
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
      const LEADING_DOT: Regex = arkRegex.as(`^${DOT_SOURCE}`, "u");
      doc.cssParts.set(head.replace(LEADING_DOT, ""), description ?? "");
      break;
    }
    case "pseudo": {
      // A native pseudo-element, named as `::before` or `before` (tolerate the leading `::`).
      const { head, description } = splitDesc(rest);
      const LEADING_PSEUDO: Regex = arkRegex.as(`^${COLON_SOURCE}{2}`, "u");
      doc.pseudoElements.set(head.replace(LEADING_PSEUDO, ""), description ?? "");
      break;
    }
    case "wrapper": {
      const { name: wName, selector: wSel, description: wDesc } = splitPartArg(rest);
      doc.wrappers.set(wName, wDesc ?? "");
      if (wSel !== `${DOT_CHAR}${wName}`) doc.wrapperSelectors.set(wName, wSel);
      break;
    }
    case "cssproperty": {
      // `--name [<syntax>] — description`
      const PROPERTY: Regex = arkRegex.as(
        String.raw`^(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})\s*(<[^>]+>)?\s*(?:${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s*([\s\S]*))?$`,
        "u",
      );
      const propMatch = rest.match(PROPERTY);
      if (propMatch) {
        doc.cssProperties.push({
          name: propMatch[1],
          syntax: propMatch[2],
          description: propMatch[3] ? normalizeMultilineDescription(propMatch[3]) : undefined,
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
      // A bracketed attribute expression (`[aria-sort="ascending"]`) needs bracket-aware splitting,
      // since its value may contain spaces; other forms (`:disabled`, a bare custom-state name) don't.
      if (rest.startsWith(BRACKET_OPEN_CHAR)) {
        const ATTRIBUTE: Regex = arkRegex.as(`^(${CSSDOC_ATTRIBUTE_SELECTOR_SOURCE})`, "u");
        const selMatch = rest.match(ATTRIBUTE);
        const head = selMatch?.[1] ?? rest;
        const DESCRIPTION: Regex = arkRegex.as(
          String.raw`^${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s+([\s\S]*)$`,
          "u",
        );
        const descMatch = rest.slice(head.length).trim().match(DESCRIPTION);
        doc.cssStates.set(head, descMatch ? normalizeMultilineDescription(descMatch[1]) : "");
        break;
      }
      const { head, description } = splitDesc(rest);
      doc.cssStates.set(head, description ?? "");
      break;
    }
    case "slot": {
      const { head, description } = splitDesc(rest);
      const LEADING_DOT: Regex = arkRegex.as(`^${DOT_SOURCE}`, "u");
      doc.slots.set(head.replace(LEADING_DOT, ""), description ?? "");
      break;
    }
    case "element": {
      const ELEMENT: Regex = arkRegex.as(
        String.raw`^(${ALPHANUMERIC_EXTENDED_SOURCE}+)\s*${COLON_SOURCE}\s*([\s\S]+)$`,
        "u",
      );
      const m = rest.match(ELEMENT);
      const profile = m ? m[1] : "";
      const body = (m ? m[2] : rest).trim();
      if (!body) break;
      const existing = doc.elements.get(profile) ?? [];
      existing.push(body);
      doc.elements.set(profile, existing);
      break;
    }
    case "function": {
      const FUNCTION_NAME: Regex = arkRegex.as(`^(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})`, "u");
      const nameMatch = rest.match(FUNCTION_NAME);
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
    case "deprecated":
      doc.deprecated = rest;
      break;
    case "demo": {
      const WHITESPACE: Regex = arkRegex.as(String.raw`\s`, "u");
      doc.demo = rest.split(WHITESPACE)[0];
      break;
    }
    case "see":
      doc.see.push(rest);
      break;
    case "usage":
      doc.usage = rest.trim();
      break;
    case "annotations": {
      for (const row of parseAnnotationsBody(rest)) doc.annotations.set(row.ref, row.text);
      break;
    }
    case "ref": {
      const parsed = parseRef(rest);
      if (parsed !== undefined) {
        doc.refs.push(parsed.ref);
        // Inline prose (@ref 1. Prevent…) populates annotations without needing @annotations.
        // @annotations block wins if it already set this ref.
        if (parsed.text && !doc.annotations.has(parsed.ref))
          doc.annotations.set(parsed.ref, parsed.text);
      }
      break;
    }
    case "readonly":
      doc.decorators.isReadonly = true;
      break;
    case "global":
      doc.global = true;
      break;
    case "preventExtensions":
      doc.decorators.preventExtensions = true;
      break;
    case "sealed":
      doc.decorators.sealed = true;
      break;
    case "frozen":
      doc.decorators.frozen = true;
      break;
    case "compat":
      doc.compat.push(rest.trim());
      break;
    case "related": {
      const { head, description } = splitDesc(rest);
      const LEADING_DOT: Regex = arkRegex.as(`^${DOT_SOURCE}`, "u");
      doc.related.push({ name: head.replace(LEADING_DOT, ""), description });
      break;
    }
    case "members": {
      doc.members = rest
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      break;
    }
    case "memberOf":
    case "member": {
      const MEMBER: Regex = arkRegex.as(
        String.raw`^(${ALPHANUMERIC_EXTENDED_SOURCE}+)(?:\s+(private))?\s*$`,
        "u",
      );
      const m = rest.match(MEMBER);
      if (m) {
        if (canonical === "memberOf") doc.memberOf = { component: m[1], private: Boolean(m[2]) };
        else doc.memberEntries.push({ name: m[1], private: Boolean(m[2]) });
      }
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
 * @param commentText - A complete doc comment or unframed comment body.
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
  const RECORD_TAG: Regex = arkRegex.as(
    String.raw`^${AT_SOURCE}(?:${tagNames.join("|")})\s+(\S+)`,
    "u",
  );
  for (const block of collectDocCommentBlocks(
    commentText,
    configuration ?? new CssDocConfiguration(),
  )) {
    const match = block.text.match(RECORD_TAG);
    if (match) return match[1];
  }
  return undefined;
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
 * Normalize multi-line tag descriptions by collapsing continuation-line whitespace into single spaces
 * when appropriate, while preserving intentional Markdown structure (like lists and paragraphs).
 *
 * When an author wraps a long description across multiple lines, indenting continuation lines for readability:
 * ```
 * @modifier -should-animate — @interaction Toggled by JS
 *   while the ring's growth animation runs.
 * ```
 * The leading/trailing whitespace from comment formatting is removed, leaving the words joined on one line.
 *
 * But when the description is structured (a list, a paragraph with intentional breaks), the author may
 * include multi-line content after the tag:
 * ```
 * @remarks
 * ✅ Use when:
 * - Building a full page
 * - Using the nav
 * ```
 * Those blank lines and line breaks should be preserved as Markdown structure.
 *
 * The heuristic: if a line *begins* with punctuation that starts a Markdown structure (like `-` for a list,
 * or `*` for bold/list), or if there's a blank line, preserve the line break. Otherwise, collapse into a space.
 *
 * @param text - The raw tag description (may contain newlines and variable indentation).
 * @returns The normalized description with collapsed continuation-line spacing but preserved Markdown structure.
 */
function normalizeMultilineDescription(text: string): string {
  const lines = splitCommentLines(text).map((l) => l.trim());
  const MARKDOWN_STRUCTURE: Regex = arkRegex.as(
    String.raw`^(?:${GREATER_THAN_CHAR}|${MARKDOWN_UNORDERED_LIST_MARKER_SOURCE})\s|${MARKDOWN_ORDERED_LIST_MARKER_SOURCE}\s|^${MARKDOWN_ATX_HEADING_PREFIX_SOURCE}`,
  );

  // Look ahead: does this description contain Markdown structure?
  const hasMarkdownStructure = lines.some((line) => MARKDOWN_STRUCTURE.exec(line) !== null);

  if (!hasMarkdownStructure) {
    // No Markdown structure — just join all lines with spaces, skipping blank lines.
    return lines.filter((l) => l !== "").join(" ");
  }

  // Markdown structure detected — preserve line breaks for lists, headers, etc.
  const result: string[] = [];
  let currentParagraph = "";

  for (const line of lines) {
    if (line === "") {
      // Blank line marks a potential paragraph break.
      if (currentParagraph) {
        result.push(currentParagraph);
        currentParagraph = "";
      }
      result.push(""); // Preserve blank line for Markdown structure.
    } else if (MARKDOWN_STRUCTURE.exec(line) !== null) {
      // This line starts a Markdown list item, header, blockquote, code block, etc.
      // Flush the current paragraph and start a new one for the list item.
      if (currentParagraph) {
        result.push(currentParagraph);
      }
      currentParagraph = "";
      result.push(line); // Each list item gets its own line.
    } else {
      // Regular text — accumulate in the current paragraph.
      currentParagraph = currentParagraph ? `${currentParagraph} ${line}` : line;
    }
  }

  // Flush any remaining paragraph.
  if (currentParagraph) {
    result.push(currentParagraph);
  }

  return result.join("\n").trim();
}

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
export function splitPartArg(rest: string): {
  /** Original selector, excluding an optional alias and description. */
  selector: string;
  /** Explicit alias or a name derived from the selector. */
  name: string;
  /** Description after the separator, when supplied. */
  description?: string;
} {
  // Split on the description separator to isolate selector+alias from description.
  const DESCRIPTION: Regex = arkRegex.as(
    String.raw`^([\s\S]*?)\s+${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s+([\s\S]*)$`,
    "u",
  );
  const descM = rest.match(DESCRIPTION);
  const selectorPlusAlias = (descM ? descM[1] : rest).trim();
  const rawDescription = descM?.[2];
  const description = rawDescription ? normalizeMultilineDescription(rawDescription) : undefined;

  // Greedy-match the last bare [\w-]+ token as a potential alias. A CSS selector segment always
  // starts with . # [ : — if the candidate selector ends with a combinator (>, ~, +) the last
  // token is the next selector segment, not an alias.
  const COMBINATOR_CHARACTERS = ">~+";
  const ALIAS: Regex = arkRegex.as(
    String.raw`^([\s\S]+)\s+(${ALPHANUMERIC_EXTENDED_SOURCE}+)$`,
    "u",
  );
  const TRAILING_COMBINATOR: Regex = arkRegex.as(String.raw`[${COMBINATOR_CHARACTERS}]\s*$`, "u");
  const aliasM = selectorPlusAlias.match(ALIAS);
  if (aliasM && TRAILING_COMBINATOR.exec(aliasM[1]) === null) {
    return { selector: aliasM[1].trim(), name: aliasM[2], description };
  }

  // No alias — derive the name from the final compound of the (possibly chained) selector.
  const FINAL_SEGMENT: Regex = arkRegex.as(String.raw`([^\s${COMBINATOR_CHARACTERS}]+)\s*$`, "u");
  const finalSeg = selectorPlusAlias.match(FINAL_SEGMENT)?.[1] ?? selectorPlusAlias;
  return { selector: selectorPlusAlias, name: deriveSelectorName(finalSeg), description };
}

/** Split a modifier tag argument into its selector, alias or derived name, and optional description. */
export function splitModifierArg(rest: string): {
  /** The selector portion of the modifier argument. */
  selector: string;
  /** Explicit alias or a name derived from the selector. */
  name: string;
  /** Description after the separator, when supplied. */
  description?: string;
} {
  // Grab the selector with the same bracket-aware regex as splitPartArg.
  const SELECTOR: Regex = arkRegex.as(`^(${CSSDOC_SELECTOR_TOKEN_SOURCE})`, "u");
  const selMatch = rest.match(SELECTOR);
  const selector = selMatch?.[1] ?? "";
  const after = rest.slice(selector.length).trim();

  // If `after` starts with a word (the alias) before the `—` separator, use it as the name.
  const ALIAS: Regex = arkRegex.as(
    String.raw`^([\w-]+)\s+${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s+([\s\S]*)$`,
    "u",
  );
  const aliasMatch = after.match(ALIAS);
  if (aliasMatch)
    return {
      selector,
      name: aliasMatch[1],
      description: normalizeMultilineDescription(aliasMatch[2]),
    };

  const DESCRIPTION: Regex = arkRegex.as(
    String.raw`^${CSSDOC_DESCRIPTION_SEPARATOR_SOURCE}\s+([\s\S]*)$`,
    "u",
  );
  const descMatch = after.match(DESCRIPTION);
  return {
    selector,
    name: deriveModifierKey(selector),
    description: descMatch ? normalizeMultilineDescription(descMatch[1]) : undefined,
  };
}

function splitStructureBody(raw: string): { description?: string; css: string } {
  const lines = splitCommentLines(raw);
  const braceLine = lines.findIndex((l) => l.includes(BRACE_OPEN_CHAR));
  if (braceLine <= 0) return { css: raw }; // no rule, or the first line already opens one
  const lead = lines.slice(0, braceLine);
  // A lead that itself begins a selector is part of a multi-line selector, not a description.
  const SELECTOR_START: Regex = arkRegex.as(
    String.raw`^\s*[${DOT_SOURCE}${POUND_CHAR}${COLON_CHAR}${BRACKET_OPEN_SOURCE}${ASTERISK_SOURCE}&>+~]`,
    "u",
  );
  if (SELECTOR_START.test(lead[0])) return { css: raw };
  const description = lead.join("\n").trim();
  return description ? { description, css: lines.slice(braceLine).join("\n") } : { css: raw };
}

/** Parse an `@annotations` body into numbered legend rows. */
function parseAnnotationsBody(raw: string): DocAnnotation[] {
  const rows: DocAnnotation[] = [];
  const MARKER: Regex = arkRegex.as(String.raw`^(${DIGIT_SOURCE}+)${DOT_SOURCE}\s*([\s\S]*)$`, "u");
  let current: DocAnnotation | undefined;
  for (const line of splitCommentLines(raw)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const marker = trimmed.match(MARKER);
    if (marker) {
      if (current) rows.push(current);
      current = { ref: Number.parseInt(marker[1], 10), text: marker[2].trim() };
      continue;
    }
    if (current) current.text = current.text ? `${current.text}\n${trimmed}` : trimmed;
  }
  if (current) rows.push(current);
  return rows;
}

/** Parse `@ref <n>[. prose]` — returns the numeric index and any trailing description. */
function parseRef(rest: string): { ref: number; text?: string } | undefined {
  const REF: Regex = arkRegex.as(String.raw`^(${DIGIT_SOURCE}+)${DOT_SOURCE}?\s*(.*)$`, "u");
  const m = rest.match(REF);
  if (!m) return undefined;
  const text = m[2].trim() || undefined;
  return { ref: Number.parseInt(m[1], 10), text };
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
// A trailing pseudo marks a child's cardinality: `:optional`/`:opt` (0..1), `:many` (0..n),
// `:one-or-more`/`:more` (1..n), a bare `:max-<n>` (0..n, capped), or a chained
// `:one-or-more:max-<n>`/`:more:max-<n>` (1..n, capped). No marker means the child is present
// (required) when the component is used. A pseudo, not a `/* … *\/` comment, because `@structure`
// lives inside a doc comment where a nested comment would close it early — an unknown pseudo-class is
// valid selector syntax, and it's stripped from the stored selector here.
const STRUCTURE_REF_KINDS = new Set(["component", "name", "utility", "rule", "declaration"]);

function normalizeStructureAtRuleRef(
  name: string,
  params: string,
): { selector: string; cardinality?: NonNullable<StructureNode["cardinality"]> } | undefined {
  const STRUCTURE_REF: Regex = arkRegex.as(
    `^${RECORD_REFERENCE_NAME_SOURCE}(?:${DOT_SOURCE}${ALPHANUMERIC_EXTENDED_SOURCE}+)*$`,
    "u",
  );
  const STRUCTURE_REF_PROFILE: Regex = arkRegex.as(
    String.raw`^${COLON_SOURCE}\s*(${ALPHANUMERIC_EXTENDED_SOURCE}+)$`,
    "u",
  );
  const STRUCTURE_REF_TYPED: Regex = arkRegex.as(
    `^(${CSSDOC_QUALIFIED_REFERENCE_SOURCE})(?:${COLON_SOURCE}(${ALPHANUMERIC_EXTENDED_SOURCE}+))?$`,
    "u",
  );
  const STRUCTURE_REF_CUSTOM_MEDIA: Regex = arkRegex.as(
    String.raw`^${PAREN_OPEN_SOURCE}\s*(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})\s*${PAREN_CLOSE_SOURCE}$`,
    "u",
  );
  const STRUCTURE_REF_TYPED_CUSTOM_MEDIA: Regex = arkRegex.as(
    String.raw`^(${CSSDOC_QUALIFIED_REFERENCE_SOURCE})\s+${PAREN_OPEN_SOURCE}\s*(${CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE})\s*${PAREN_CLOSE_SOURCE}$`,
    "u",
  );
  if (name === "member") {
    return undefined;
  }
  const cardSplit = splitTrailingCardinality(params);
  if (name.includes(":")) {
    if (cardSplit.params.trim()) return undefined;
    const [record, profile] = name.split(":", 2);
    if (!STRUCTURE_REF.test(record) || !profile || !STRUCTURE_REF.test(profile)) {
      return undefined;
    }
    return { selector: `@${record}:${profile}`, cardinality: cardSplit.cardinality };
  }
  if (!STRUCTURE_REF.test(name)) return undefined;
  const trimmed = cardSplit.params;
  if (STRUCTURE_REF_KINDS.has(name)) {
    const typedMedia = trimmed.match(STRUCTURE_REF_TYPED_CUSTOM_MEDIA);
    if (typedMedia) {
      return {
        selector: `@${name} ${typedMedia[1]} (${typedMedia[2]})`,
        cardinality: cardSplit.cardinality,
      };
    }
    const typed = trimmed.match(STRUCTURE_REF_TYPED);
    if (!typed) return undefined;
    return {
      selector: `@${name} ${typed[1]}${typed[2] ? `:${typed[2]}` : ""}`,
      cardinality: cardSplit.cardinality,
    };
  }
  if (!trimmed) return { selector: `@${name}`, cardinality: cardSplit.cardinality };
  const customMedia = trimmed.match(STRUCTURE_REF_CUSTOM_MEDIA);
  if (customMedia) {
    return { selector: `@${name} (${customMedia[1]})`, cardinality: cardSplit.cardinality };
  }
  const profile = trimmed.match(STRUCTURE_REF_PROFILE);
  if (!profile) return undefined;
  return { selector: `@${name}:${profile[1]}`, cardinality: cardSplit.cardinality };
}

function resolveStructureMemberRef(
  params: string,
  currentParent: string | undefined,
): { selector: string; cardinality?: NonNullable<StructureNode["cardinality"]> } | undefined {
  if (!currentParent) return undefined;
  const STRUCTURE_MEMBER: Regex = arkRegex.as(
    String.raw`^(${ALPHANUMERIC_EXTENDED_SOURCE}+)(?:${COLON_SOURCE}(${ALPHANUMERIC_EXTENDED_SOURCE}+))?(?:\s+(private))?$`,
    "u",
  );
  const cardSplit = splitTrailingCardinality(params);
  const m = cardSplit.params.trim().match(STRUCTURE_MEMBER);
  if (!m) return undefined;
  const name = m[1];
  const profile = m[2];
  const privateFlag = Boolean(m[3]);
  return {
    selector: `@component ${currentParent}.${name}${profile ? `:${profile}` : ""}${privateFlag ? " private" : ""}`,
    cardinality: cardSplit.cardinality,
  };
}

function structureReferenceComponentName(selector: string): string | undefined {
  if (!selector.startsWith(AT_CHAR)) return undefined;
  const TYPED: Regex = arkRegex.as(
    String.raw`^(${STRUCTURE_RECORD_KIND_SOURCE})\s+(${CSSDOC_QUALIFIED_REFERENCE_SOURCE})(?:${COLON_SOURCE}${ALPHANUMERIC_EXTENDED_SOURCE}+)?(?:\s+private)?$`,
    "u",
  );
  const SHORTHAND: Regex = arkRegex.as(
    String.raw`^(${CSSDOC_QUALIFIED_REFERENCE_SOURCE})(?:${COLON_SOURCE}${ALPHANUMERIC_EXTENDED_SOURCE}+)?(?:\s+private)?$`,
    "u",
  );
  const raw = selector.slice(1).trim();
  const typed = raw.match(TYPED);
  if (typed) return typed[2];
  const shorthand = raw.match(SHORTHAND);
  if (!shorthand || STRUCTURE_REF_KINDS.has(shorthand[1])) return undefined;
  return shorthand[1];
}

/** Build a {@link StructureNode} tree from one already-parsed level of a `@structure` body. */
function buildStructureNodes(nodes: readonly ChildNode[], currentParent?: string): StructureNode[] {
  // A single-class `:is(.<class>)` signals the element itself carries that class (co-location).
  const COLOC: Regex = arkRegex.as(
    String.raw`${COLON_SOURCE}is${PAREN_OPEN_SOURCE}\s*([^,${PAREN_CLOSE_CHAR}]+?)\s*${PAREN_CLOSE_SOURCE}`,
    "u",
  );
  const out: StructureNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const rule = nodes[i];
    if (rule.type === "atrule" && rule.name === "variant") {
      // A nested `@variant` group: this child position is filled by exactly one of these alternative
      // subtrees. Collect this rule and any immediately-following `@variant` siblings into one
      // synthetic boundary node (mirrors how `@scope` gets a synthetic wrapper node above).
      const variants: StructureVariant[] = [];
      let next: ChildNode = rule;
      while (next.type === "atrule" && next.name === "variant") {
        variants.push({
          name: next.params.trim() || undefined,
          nodes: buildStructureNodes(next.nodes ?? [], currentParent),
        });
        i++;
        if (i >= nodes.length) break;
        next = nodes[i];
      }
      i--;
      out.push({ selector: "", variants, children: [] });
      continue;
    }
    if (rule.type === "atrule" && rule.name === "scope") {
      // @scope boundary: emit a wrapper node whose children are the scoped rules.
      out.push({
        selector: "",
        scope: rule.params.trim(),
        children: buildStructureNodes(rule.nodes ?? [], currentParent),
      });
      continue;
    }
    if (rule.type === "atrule" && rule.name === "member") {
      const resolved = resolveStructureMemberRef(rule.params, currentParent);
      if (!resolved) continue;
      const nextParent = structureReferenceComponentName(resolved.selector) ?? currentParent;
      out.push({
        selector: resolved.selector,
        cardinality: resolved.cardinality,
        children: buildStructureNodes(rule.nodes ?? [], nextParent),
      });
      continue;
    }
    if (rule.type === "atrule") {
      const resolved = normalizeStructureAtRuleRef(rule.name, rule.params);
      if (!resolved) continue;
      const nextParent = structureReferenceComponentName(resolved.selector) ?? currentParent;
      out.push({
        selector: resolved.selector,
        cardinality: resolved.cardinality,
        children: buildStructureNodes(rule.nodes ?? [], nextParent),
      });
      continue;
    }
    if (rule.type !== "rule") continue;
    const rawSel = rule.selector.trim();
    const coloc = rawSel.match(COLOC);
    const withoutColoc = coloc ? rawSel.replace(COLOC, "").trim() : rawSel;
    const card = withoutColoc.match(STRUCTURE_CARDINALITY);
    const node: StructureNode = {
      selector: card ? withoutColoc.slice(0, card.index).trim() : withoutColoc,
      children: buildStructureNodes(rule.nodes ?? [], currentParent),
    };
    if (card?.groups) node.cardinality = cardinalityFromMatch(card.groups);
    if (coloc) node.colocated = coloc[1].trim();
    out.push(node);
  }
  return out;
}

/** Parse a structure body into nodes; return an empty array without a parser or for malformed input. */
export function parseStructure(
  raw: string,
  parse?: CssParse,
  ownerRecordName?: string,
): StructureNode[] {
  if (!parse) return []; // no parser injected → no tree (the grammar module stays parser-free)
  try {
    return buildStructureNodes(parse(raw).nodes, ownerRecordName);
  } catch {
    return []; // malformed structure → empty, never throws
  }
}

/**
 * Split a `@structure` body into alternative {@link StructureVariant}s when it has one or more
 * top-level `@variant <name>? { … }` blocks — an author saying "pick one of these DOM shapes" (e.g. a
 * `<label>` wrapping a control vs. a `<label for>` + a sibling control), as opposed to `parseStructure`'s
 * default of "these roots all coexist". A bare (non-`@variant`) run of top-level nodes becomes an
 * unnamed variant in place. This only handles the top level (the whole tree alternates); a `@variant`
 * nested deeper is a local choice at one child position, handled during tree construction and stored
 * on that node's {@link StructureNode.variants}.
 *
 * @returns `undefined` when the body has no top-level `@variant` block (the common case).
 */
export function parseStructureVariants(
  raw: string,
  parse?: CssParse,
  ownerRecordName?: string,
): StructureVariant[] | undefined {
  if (!parse) return undefined;
  let topNodes: readonly ChildNode[];
  try {
    topNodes = parse(raw).nodes;
  } catch {
    return undefined; // malformed structure → no variants, parseStructure will also empty out
  }
  if (!topNodes.some((n) => n.type === "atrule" && n.name === "variant")) return undefined;

  const variants: StructureVariant[] = [];
  let bareRun: ChildNode[] = [];
  const flushBareRun = (): void => {
    if (bareRun.length) variants.push({ nodes: buildStructureNodes(bareRun, ownerRecordName) });
    bareRun = [];
  };
  for (const node of topNodes) {
    if (node.type === "atrule" && node.name === "variant") {
      flushBareRun();
      variants.push({
        name: node.params.trim() || undefined,
        nodes: buildStructureNodes(node.nodes ?? [], ownerRecordName),
      });
      continue;
    }
    bareRun.push(node);
  }
  flushBareRun();
  return variants;
}
