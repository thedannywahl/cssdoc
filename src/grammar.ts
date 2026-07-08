/**
 * The CSS doc-comment grammar — a small, TSDoc-shaped tag vocabulary parsed out of `/** … *\/` block
 * comments. It is deliberately generic: the tags describe a CSS surface (a component's base class,
 * modifiers, parts, custom properties) and adopt the Custom Elements Manifest names (`@cssproperty`,
 * `@csspart`, `@cssstate`) where they exist, so the vocabulary is standards-aligned.
 *
 * A block looks like:
 * ```css
 * /**
 *  * @component button
 *  * @summary The primary action control.
 *  * @modifier -color-secondary — A lower-emphasis action.
 *  * @part .icon — A leading glyph.
 *  * @cssproperty --value <number> — The 0–100 fill.
 *  * @demo self:button
 *  *\/
 * ```
 *
 * @module
 */
import type { CssRecordKind, StructureNode } from "./model.ts";

/**
 * The record-opening tags and the {@link CssRecordKind} each selects. A doc comment carrying one of
 * these opens a new record; `@name` is an alias for `@component`. Order is irrelevant.
 */
export const RECORD_TAGS: Record<string, CssRecordKind> = {
  component: "component",
  name: "component",
  utility: "utility",
  rule: "rule",
  declaration: "declaration",
};

/** A custom property documented by a `@cssproperty` tag. */
export interface DocCssProperty {
  name: string;
  syntax?: string;
  description?: string;
}

/** The prose a `@modifier` tag contributes: a description and/or an inline deprecation replacement note. */
export interface DocModifier {
  description?: string;
  /** Free-text replacement guidance from an inline `deprecated` tag on the modifier line. */
  deprecated?: string;
  /**
   * The canonical modifier this one deprecates, from a `{@link -canonical}` in the deprecation note
   * (e.g. `@deprecated {@link -color-danger}`). Stored without its leading dot, matching the AST-derived
   * `deprecated.canonical`, so an authored alias and a generated one resolve to the same reference.
   */
  deprecatedCanonical?: string;
}

/** The structured content extracted from one doc-comment block. */
export interface ParsedDoc {
  /** `@component`/`@utility`/`@rule`/`@declaration`/`@name` — the record name. Marks a record boundary. */
  component?: string;
  /** The record kind chosen by the opening tag (`component` unless `@utility`/`@rule`/`@declaration`). */
  kind?: CssRecordKind;
  /** `@class` — an explicit base class selector (otherwise inferred from the CSS). */
  className?: string;
  /** `@summary` — one-line intro. */
  summary?: string;
  /** `@modifier` prose, keyed by the modifier class without its dot (e.g. `-color-secondary`). */
  modifiers: Map<string, DocModifier>;
  /** `@part`/`@csspart` descriptions, keyed by the part name without its dot (e.g. `item`). */
  parts: Map<string, string>;
  /** `@cssproperty` declarations. */
  cssProperties: DocCssProperty[];
  /** `@cssstate` descriptions, keyed by state name. */
  cssStates: Map<string, string>;
  /** `@example` blocks. */
  examples: string[];
  /** `@structure` — the raw (indented) HTML-tree body, parsed into nodes by {@link parseStructure}. */
  structure?: StructureNode[];
  /** The `<replacement>` argument from a `deprecated` tag. */
  deprecated?: string;
  /** `@demo <spec>`. */
  demo?: string;
  /** `@see <ref>` entries. */
  see: string[];
}

/** Split a tag's argument into `head` (a selector/name/token) and `description` on ` — ` or ` - `. */
function splitDesc(rest: string): { head: string; description?: string } {
  const m = rest.match(/^(\S+)\s+(?:—|-{1,2})\s+(.*)$/u);
  if (m) return { head: m[1], description: m[2].trim() };
  return { head: rest.trim() || rest };
}

/** Strip the comment framing (`/**`, `*\/`, and leading ` * `) from a raw block-comment body. */
export function stripCommentFraming(raw: string): string {
  return raw
    .replace(/^\/\*\*?/, "")
    .replace(/\*\/$/, "")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n")
    .trim();
}

/**
 * Parse a doc-comment's INNER text (already stripped of `/* *\/` framing, or a raw block — both are
 * handled) into a {@link ParsedDoc}. Unknown `@tags` are ignored, so the grammar degrades gracefully.
 *
 * @param raw - The comment text (with or without `/** … *\/` framing).
 * @returns The structured tags.
 */
export function parseDocComment(raw: string): ParsedDoc {
  // Works on either a raw `/** … *\/` block or PostCSS's already-unframed `Comment.text` (which keeps
  // the inner `*` line prefixes) — stripCommentFraming no-ops the frame removal when it's absent.
  const body = stripCommentFraming(raw);
  const doc: ParsedDoc = {
    modifiers: new Map(),
    parts: new Map(),
    cssProperties: [],
    cssStates: new Map(),
    examples: [],
    see: [],
  };

  // Group lines into tag blocks: a line starting with `@tag` opens a block that continues until the
  // next `@tag` (so multi-line @example/@summary work).
  const blocks: string[] = [];
  for (const line of body.split("\n")) {
    if (/^\s*@\w/.test(line)) blocks.push(line.trim());
    else if (blocks.length) blocks[blocks.length - 1] += `\n${line}`;
  }

  for (const block of blocks) {
    const m = block.match(/^@(\w+)\s*([\s\S]*)$/u);
    if (!m) continue;
    const tag = m[1];
    const rest = m[2].trim();
    switch (tag) {
      case "component":
      case "name":
      case "utility":
      case "rule":
      case "declaration":
        doc.component = rest.split(/\s/u)[0];
        doc.kind = RECORD_TAGS[tag];
        break;
      case "structure":
        doc.structure = parseStructure(rest);
        break;
      case "class":
        doc.className = rest.split(/\s/u)[0];
        break;
      case "summary":
        doc.summary = rest.replace(/\s+/gu, " ").trim();
        break;
      case "modifier": {
        const { head, description } = splitDesc(rest);
        // A description beginning `@deprecated …` marks the modifier deprecated. A `{@link -canonical}`
        // in the remainder names the modifier to use instead; any other text is the free-text note.
        const dep = description?.match(/^@deprecated\b\s*([\s\S]*)$/u);
        if (dep) {
          const raw = dep[1].trim();
          const link = raw.match(/\{@link\s+\.?(-[\w-]+)\s*\}/u);
          const note = raw.replace(/\{@link\s+[^}]*\}/u, "").trim();
          doc.modifiers.set(head.replace(/^\./u, ""), {
            deprecated: note || undefined,
            deprecatedCanonical: link?.[1],
          });
        } else {
          doc.modifiers.set(head.replace(/^\./u, ""), { description: description ?? "" });
        }
        break;
      }
      case "part":
      case "csspart": {
        const { head, description } = splitDesc(rest);
        doc.parts.set(head.replace(/^\./u, ""), description ?? "");
        break;
      }
      case "cssproperty": {
        // `--name [<syntax>] — description`
        const propMatch = rest.match(/^(--[\w-]+)\s*(<[^>]+>)?\s*(?:(?:—|-{1,2})\s*(.*))?$/u);
        if (propMatch) {
          doc.cssProperties.push({
            name: propMatch[1],
            syntax: propMatch[2],
            description: propMatch[3]?.trim() || undefined,
          });
        }
        break;
      }
      case "cssstate": {
        const { head, description } = splitDesc(rest);
        doc.cssStates.set(head, description ?? "");
        break;
      }
      case "example":
        doc.examples.push(rest);
        break;
      case "deprecated":
        doc.deprecated = rest;
        break;
      case "demo":
        doc.demo = rest.split(/\s/u)[0];
        break;
      case "see":
        doc.see.push(rest);
        break;
      default:
        break;
    }
  }
  return doc;
}

/** Whether a comment's text opens a record — i.e. carries one of the {@link RECORD_TAGS}. */
export function recordNameOf(commentText: string): string | undefined {
  const tags = Object.keys(RECORD_TAGS).join("|");
  const m = commentText.match(new RegExp(`@(?:${tags})\\s+(\\S+)`, "u"));
  return m?.[1];
}

/**
 * Parse a `@structure` body — an indentation-nested list of element selectors — into a
 * {@link StructureNode} tree. Indentation depth (any consistent width) sets nesting; blank lines are
 * ignored.
 *
 * @example
 * ```
 * .instui-tabs
 *   .list
 *     .tab
 *   .panel
 * ```
 */
export function parseStructure(raw: string): StructureNode[] {
  const roots: StructureNode[] = [];
  const stack: { indent: number; node: StructureNode }[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const node: StructureNode = { selector: line.trim(), children: [] };
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (stack.length) stack[stack.length - 1].node.children.push(node);
    else roots.push(node);
    stack.push({ indent, node });
  }
  return roots;
}
