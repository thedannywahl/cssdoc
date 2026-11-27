import {
  AT_CHAR,
  ASTERISK_CHAR,
  BACKSLASH_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_OPEN_CHAR,
  BRACKET_CLOSE_CHAR,
  BRACKET_OPEN_CHAR,
  CSSDOC_BLOCK_TAG_NAME_SOURCE,
  FORWARD_SLASH_CHAR,
  LINE_ENDING_SOURCE,
  PAREN_CLOSE_CHAR,
  PAREN_OPEN_CHAR,
  PIPE_CHAR,
  QUOTE_DOUBLE_CHAR,
  QUOTE_SINGLE_CHAR,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";

import { scanCodeBoundaryLine, type CodeBoundaryState } from "./code-boundaries.ts";
import { CssDocConfiguration } from "./configuration.ts";
import { safeProseUrl } from "./prose-url.ts";

/** A recognized inline tag, with UTF-16 offsets relative to the scanned text. */
export interface InlineTag {
  /** Inclusive offset of the opening brace. */
  start: number;
  /** Exclusive offset of the closing brace, or the end of incomplete input. */
  end: number;
  /** Exclusive offset of the tag name, including its at sign. */
  nameEnd: number;
  /** Canonical tag name, without the at sign. */
  tag: string;
  /** Whether the closing brace was found. */
  closed: boolean;
  /** Offset of the top-level link label separator, when present. */
  separator?: number;
}

/** A parsed link, or an explicit reason its syntax cannot be interpreted. */
export type InlineLinkResult =
  | {
      /** True when the link target and label have valid syntax. */
      ok: true;
      /** Parsed target, without resolving record references. */
      target: {
        /** Whether the target is a record reference or a URL. */
        kind: "reference" | "url";
        /** Authored reference or decoded URL. */
        value: string;
      };
      /** Plain-text link label, when supplied. */
      label?: string;
    }
  | {
      /** False when the link cannot be interpreted. */
      ok: false;
      /** Syntax or URL-policy failure that prevented parsing. */
      error: "incomplete" | "missing-target" | "invalid-url" | "invalid-label";
    };

/**
 * Find fenced code lines in framing-free prose, including an incomplete fence.
 *
 * @param text - Authored prose.
 * @returns Half-open UTF-16 ranges relative to the prose.
 */
export function fencedProseRanges(text: string): {
  /** Inclusive UTF-16 offset of the fenced line in the supplied prose. */
  start: number;
  /** Exclusive UTF-16 offset of the fenced line in the supplied prose. */
  end: number;
}[] {
  const ENDING = arkRegex.as(LINE_ENDING_SOURCE, "gu");
  const state: CodeBoundaryState = { containers: [], indented: false, paragraph: false };
  const ranges: { start: number; end: number }[] = [];
  let start = 0;
  for (const ending of [...text.matchAll(ENDING), undefined]) {
    const end = ending?.index ?? text.length;
    const wasFenced = state.fence !== undefined;
    scanCodeBoundaryLine(text.slice(start, end), state);
    if ((wasFenced || state.fence) && end > start) ranges.push({ start, end });
    start = end + (ending?.[0].length ?? 0);
  }
  return ranges;
}

/**
 * Scan recognized inline tags without interpreting their arguments.
 *
 * @param text - Text to scan.
 * @param configuration - Active tag vocabulary.
 * @returns Non-overlapping ranges in source order, including incomplete tags.
 */
export function scanInlineTags(
  text: string,
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): InlineTag[] {
  const NAME = arkRegex.as(`^(${CSSDOC_BLOCK_TAG_NAME_SOURCE})(?=\\s|\\}|$)`, "u");
  const result: InlineTag[] = [];
  for (let start = 0; start + 1 < text.length; start++) {
    if (text[start] !== BRACE_OPEN_CHAR || text[start + 1] !== AT_CHAR) continue;
    let slashes = 0;
    for (let i = start - 1; i >= 0 && text[i] === BACKSLASH_CHAR; i--) slashes++;
    if (slashes % 2 !== 0) continue;
    const name = NAME.exec(text.slice(start + 2))?.[1];
    const definition = name && configuration.tryGetTagDefinition(name);
    if (
      !definition ||
      definition.syntaxKind !== "inline" ||
      !configuration.isTagSupported(definition)
    ) {
      continue;
    }

    const nameEnd = start + 2 + name.length;
    const stack: string[] = [];
    let quote: string | undefined;
    let comment = false;
    let escaped = false;
    let label = false;
    let separator: number | undefined;
    let end = nameEnd;
    for (; end < text.length; end++) {
      const char = text[end];
      if (comment) {
        if (char === ASTERISK_CHAR && text[end + 1] === FORWARD_SLASH_CHAR) {
          comment = false;
          end++;
        }
      } else if (escaped) {
        escaped = false;
      } else if (char === BACKSLASH_CHAR) {
        escaped = true;
      } else if (label) {
        if (char === BRACE_CLOSE_CHAR) break;
      } else if (quote) {
        if (char === quote) quote = undefined;
      } else if (char === QUOTE_DOUBLE_CHAR || char === QUOTE_SINGLE_CHAR) {
        quote = char;
      } else if (char === FORWARD_SLASH_CHAR && text[end + 1] === ASTERISK_CHAR) {
        comment = true;
        end++;
      } else if (definition.canonicalName === "link" && char === PIPE_CHAR && stack.length === 0) {
        label = true;
        separator = end;
      } else if (char === PAREN_OPEN_CHAR || char === BRACKET_OPEN_CHAR) stack.push(char);
      else if (char === PAREN_CLOSE_CHAR && stack.at(-1) === PAREN_OPEN_CHAR) stack.pop();
      else if (char === BRACKET_CLOSE_CHAR && stack.at(-1) === BRACKET_OPEN_CHAR) stack.pop();
      else if (char === BRACE_CLOSE_CHAR && stack.length === 0) break;
    }
    const closed = end < text.length;
    result.push({
      start,
      end: closed ? end + 1 : end,
      nameEnd,
      tag: definition.canonicalName,
      closed,
      ...(separator === undefined ? {} : { separator }),
    });
    start = end;
  }
  return result;
}

/**
 * Scan inline tags between protected ranges such as Markdown code spans.
 *
 * @param text - Text to scan.
 * @param protectedRanges - Ordered, non-overlapping UTF-16 ranges to exclude.
 * @param configuration - Active tag vocabulary.
 * @returns Source-relative inline tags in source order.
 * @throws If a protected range is invalid or out of order.
 */
export function scanInlineTagsOutsideCode(
  text: string,
  protectedRanges: readonly { start: number; end: number }[],
  configuration: CssDocConfiguration = new CssDocConfiguration(),
): InlineTag[] {
  const result: InlineTag[] = [];
  let cursor = 0;
  const append = (start: number, end: number): void => {
    for (const tag of scanInlineTags(text.slice(start, end), configuration)) {
      result.push({
        ...tag,
        start: tag.start + start,
        end: tag.end + start,
        nameEnd: tag.nameEnd + start,
        ...(tag.separator === undefined ? {} : { separator: tag.separator + start }),
      });
    }
  };
  for (const range of protectedRanges) {
    if (
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      range.start < cursor ||
      range.end < range.start ||
      range.end > text.length
    ) {
      throw new RangeError("Invalid protected code range");
    }
    append(cursor, range.start);
    cursor = range.end;
  }
  append(cursor, text.length);
  return result;
}

/**
 * Interpret a scanned link's target and plain-text label without resolving references.
 *
 * @param text - The source text supplied to {@link scanInlineTags}.
 * @param tag - A link returned by the scanner for that text.
 * @returns A decoded URL or authored reference and optional label, or a syntax error.
 * @throws If the tag isn't a link or its offsets don't describe the supplied text.
 */
export function parseInlineLink(text: string, tag: InlineTag): InlineLinkResult {
  if (
    tag.tag !== "link" ||
    tag.start < 0 ||
    tag.nameEnd < tag.start + 2 ||
    tag.end < tag.nameEnd ||
    tag.end > text.length ||
    (tag.separator !== undefined && (tag.separator < tag.nameEnd || tag.separator >= tag.end))
  ) {
    throw new RangeError("Invalid inline link range");
  }
  if (!tag.closed) return { ok: false, error: "incomplete" };
  const end = tag.end - 1;
  const rawTarget = text.slice(tag.nameEnd, tag.separator ?? end).trim();
  if (!rawTarget) return { ok: false, error: "missing-target" };
  let label: string | undefined;
  if (tag.separator !== undefined) {
    const raw = text.slice(tag.separator + 1, end).trim();
    label = "";
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] !== BACKSLASH_CHAR) {
        label += raw[i];
        continue;
      }
      const next = raw[++i];
      if (next !== BACKSLASH_CHAR && next !== PIPE_CHAR && next !== BRACE_CLOSE_CHAR) {
        return { ok: false, error: "invalid-label" };
      }
      label += next;
    }
    if (!label.trim()) return { ok: false, error: "invalid-label" };
  }
  let target: { kind: "reference" | "url"; value: string } = {
    kind: "reference",
    value: rawTarget,
  };
  if (rawTarget.startsWith(`url${PAREN_OPEN_CHAR}`)) {
    if (!rawTarget.endsWith(PAREN_CLOSE_CHAR)) return { ok: false, error: "invalid-url" };
    const argument = rawTarget.slice(4, -1).trim();
    let decoded: unknown;
    try {
      decoded = JSON.parse(argument);
    } catch (error) {
      if (error instanceof SyntaxError) return { ok: false, error: "invalid-url" };
      throw error;
    }
    if (typeof decoded !== "string" || !safeProseUrl(decoded)) {
      return { ok: false, error: "invalid-url" };
    }
    try {
      const url = new URL(decoded);
      if (
        (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "mailto:") ||
        (url.protocol === "mailto:" && !url.pathname)
      ) {
        return { ok: false, error: "invalid-url" };
      }
    } catch (error) {
      if (error instanceof TypeError) return { ok: false, error: "invalid-url" };
      throw error;
    }
    target = { kind: "url", value: decoded };
  }
  return { ok: true, target, ...(label === undefined ? {} : { label }) };
}
