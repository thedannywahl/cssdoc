/**
 * `@cssdoc/embedded` — read cssdoc-annotated CSS out of host files where it lives embedded: JS/TS
 * tagged templates (such as `styled.x` and `css`, Lit, `keyframes`), HTML-like `<style>` blocks
 * (`.html`, `.vue`, `.svelte`, `.astro`), and Markdown/MDX code fences.
 *
 * The core is {@link projectCss}: it returns a character-for-character CSS **projection** of the host
 * source — identical length and newlines, with the embedded-CSS regions and any `/** … *\/` doc comment
 * kept verbatim, everything else blanked to spaces, and JS `${…}` interpolations masked. Because the
 * projection shares every offset/line/column with the source, all downstream CSS tooling
 * (`parseCssDocs`, `createIndex`, spans, ranges) works unchanged and correctly-positioned.
 *
 * @module \@cssdoc/embedded
 */
import { type CssDocEntry, type ParseOptions, parseCssDocs } from "@cssdoc/core";
import { type CssDialect as ParserDialect, resolveParser } from "@cssdoc/dialects";
import { type LintOptions, type Violation, lintCssDocs } from "@cssdoc/lint-core";
import {
  ALPHA_LOWER_SOURCE,
  ALPHA_SOURCE,
  ASTERISK_CHAR,
  BACKSLASH_CHAR,
  BACKTICK_CHAR,
  BRACE_CLOSE_CHAR,
  BRACE_CLOSE_SOURCE,
  BRACE_OPEN_CHAR,
  BRACE_OPEN_SOURCE,
  COLON_CHAR,
  COMMENT_END_SOURCE,
  COMMENT_START_SOURCE,
  DASH_SOURCE,
  DOLLAR_CHAR,
  EQUALS_CHAR,
  FILE_EXTENSION,
  FORWARD_SLASH_CHAR,
  GREATER_THAN_CHAR,
  HTML_COMMENT,
  HTML_LIKE_CLASS_ATTRIBUTE_NAME_SOURCE,
  HTML_LIKE_DOTTED_TAG_NAME_SOURCE,
  HTML_LIKE_STYLE_CLOSE_PREFIX_SOURCE,
  HTML_LIKE_STYLE_OPEN_TAG_SOURCE,
  HTML_QUOTED_ATTRIBUTE_VALUE_SOURCE,
  JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE,
  JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY_SOURCE,
  JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT_SOURCE,
  LESS_THAN_CHAR,
  QUOTE_DOUBLE_CHAR,
  QUOTE_SINGLE_CHAR,
  WORD_BOUNDARY_SOURCE,
  MARKDOWN_BACKTICK_FENCE_SOURCE,
  MARKDOWN_BACKTICK_FENCE_TEXT,
  escapeRegex,
  toRegExp,
} from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";

/** A host language cssdoc can pull embedded CSS out of. */
export type EmbeddedHost = "js" | "html" | "markdown";

/** A stylesheet dialect identified in an embedded region. `sass` is parsed as SCSS syntax. */
export type CssDialect = "css" | "scss" | "sass" | "less";

/** Options for the extraction/projection. Extra `ParseOptions`/`LintOptions` fields pass through. */
export interface EmbeddedOptions {
  /** Which host scanner to run. `"auto"` (default) picks by {@link EmbeddedOptions.filename}, else runs all. */
  host?: EmbeddedHost | "auto";
  /** The source's filename, used by `host: "auto"` to choose a scanner. */
  filename?: string;
  /** JS tag identifiers that introduce a CSS template. Defaults to the common CSS-in-JS set. */
  tags?: readonly string[];
}

/** One embedded CSS region discovered in a host source. */
export interface CssBlock {
  /** The region's CSS text (interpolations masked). */
  css: string;
  /** The host the region came from. */
  host: EmbeddedHost;
  /** The region's stylesheet dialect (from a `lang` attribute, fence info-string, or `"css"`). */
  dialect: CssDialect;
  /** Region start: 1-based line, 0-based column, and 0-based UTF-16 offset in the host source. */
  start: {
    /** 1-based line number. */
    line: number;
    /** 0-based column number. */
    column: number;
    /** 0-based UTF-16 offset in the host source. */
    offset: number;
  };
}

/** The default JS tags treated as CSS templates. */
export const DEFAULT_TAGS: readonly string[] = [
  "css",
  "styled",
  "createGlobalStyle",
  "keyframes",
  "injectGlobal",
];

const LANG_ATTRIBUTE = arkRegex.as(
  String.raw`${WORD_BOUNDARY_SOURCE}lang\s*${EQUALS_CHAR}\s*[${QUOTE_DOUBLE_CHAR}${QUOTE_SINGLE_CHAR}]?(${ALPHA_LOWER_SOURCE}+)`,
  "iu",
);

interface Region {
  start: number;
  end: number;
  host: EmbeddedHost;
  dialect: CssDialect;
}
interface Mask {
  start: number;
  end: number;
}

const dialectFromLang = (lang: string | undefined): CssDialect => {
  const l = lang?.toLowerCase();
  return l === "scss" || l === "sass" || l === "less" ? l : "css";
};

/**
 * Detect the embedded host for a filename, or `undefined` when it isn't one cssdoc extracts from
 * (including plain `.css`/`.scss`/`.less`, which callers should feed through as-is rather than project).
 */
export const detectEmbeddedHost = (filename?: string): EmbeddedHost | undefined => {
  const ext = filename?.toLowerCase().match(FILE_EXTENSION)?.[1];
  if (!ext) return undefined;
  if (["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts"].includes(ext)) return "js";
  if (["html", "htm", "vue", "svelte", "astro"].includes(ext)) return "html";
  if (["md", "mdx", "markdown"].includes(ext)) return "markdown";
  return undefined;
};

/** Skip a JS `${ … }` interpolation starting at `i` (the `$`). Returns the index just past the `}`. */
function skipInterpolation(src: string, i: number): number {
  let depth = 0;
  i += 1; // past '$'
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === BRACE_OPEN_CHAR) depth++;
    else if (c === BRACE_CLOSE_CHAR) {
      depth--;
      if (depth === 0) return i + 1;
    } else if (c === QUOTE_SINGLE_CHAR || c === QUOTE_DOUBLE_CHAR) {
      i = skipString(src, i, c);
    } else if (c === BACKTICK_CHAR) {
      i = skipTemplate(src, i);
    }
  }
  return i;
}

/** Skip a quoted string starting at `i` (the quote). Returns the index of the closing quote. */
function skipString(src: string, i: number, quote: string): number {
  for (i += 1; i < src.length; i++) {
    if (src[i] === BACKSLASH_CHAR) i++;
    else if (src[i] === quote) return i;
  }
  return i;
}

/** Skip a (non-CSS) template literal starting at `i` (the backtick). Returns the closing backtick index. */
function skipTemplate(src: string, i: number): number {
  for (i += 1; i < src.length; i++) {
    if (src[i] === BACKSLASH_CHAR) i++;
    else if (src[i] === BACKTICK_CHAR) return i;
    else if (src[i] === DOLLAR_CHAR && src[i + 1] === BRACE_OPEN_CHAR)
      i = skipInterpolation(src, i) - 1;
  }
  return i;
}

/** Find embedded CSS regions in JS/TS: tagged-template literals whose tag is in {@link EmbeddedOptions.tags}. */
function scanJs(
  src: string,
  tags: readonly string[],
): { regions: Region[]; masks: Mask[]; comments: Mask[] } {
  const regions: Region[] = [];
  const masks: Mask[] = [];
  const comments: Mask[] = [];
  if (tags.length === 0) return { regions, masks, comments };
  // Matches a CSS tag expression immediately before a backtick: `css`, `styled.x`, `styled(x)`, chains.
  const tagRe = arkRegex.as(
    `${JAVASCRIPT_TAGGED_TEMPLATE_BOUNDARY_SOURCE}(?:${tags.map(escapeRegex).join("|")})${JAVASCRIPT_TAGGED_TEMPLATE_CHAIN_SEGMENT_SOURCE}*\\s*$`,
    "u",
  );
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === FORWARD_SLASH_CHAR && src[i + 1] === FORWARD_SLASH_CHAR) {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === FORWARD_SLASH_CHAR && src[i + 1] === ASTERISK_CHAR) {
      const start = i;
      const isDoc = src[i + 2] === ASTERISK_CHAR;
      i += 2;
      while (i < src.length && !(src[i] === ASTERISK_CHAR && src[i + 1] === FORWARD_SLASH_CHAR))
        i++;
      const closed = i < src.length;
      i += 1; // land on the '/'; loop's i++ moves past
      if (isDoc && closed) comments.push({ start, end: Math.min(i + 1, src.length) });
    } else if (c === QUOTE_SINGLE_CHAR || c === QUOTE_DOUBLE_CHAR) {
      i = skipString(src, i, c);
    } else if (c === BACKTICK_CHAR) {
      const isCss = tagRe.test(src.slice(Math.max(0, i - 256), i));
      if (!isCss) {
        i = skipTemplate(src, i);
        continue;
      }
      const start = i + 1;
      let j = start;
      for (; j < src.length; j++) {
        if (src[j] === BACKSLASH_CHAR) j++;
        else if (src[j] === BACKTICK_CHAR) break;
        else if (src[j] === DOLLAR_CHAR && src[j + 1] === BRACE_OPEN_CHAR) {
          const end = skipInterpolation(src, j);
          masks.push({ start: j, end });
          j = end - 1;
        }
      }
      regions.push({ start, end: j, host: "js", dialect: "css" });
      i = j;
    }
  }
  return { regions, masks, comments };
}

/**
 * Find `<style …>…</style>` regions in HTML-like sources. Scanning runs over a comment-masked copy (same
 * length, so offsets still map to `src`) so a `<style>` written inside a comment — e.g. a
 * `<!-- move this into a <style> block -->` note — isn't treated as a real opener. Left unmasked, a
 * commented, unclosed `<style>` would pair with the next real `</style>` (or run to end of file) and
 * project the wrong region, silently breaking every check in the document.
 */
function scanHtml(src: string): { regions: Region[] } {
  const regions: Region[] = [];
  const scan = maskComments(src);
  const open = arkRegex.as(HTML_LIKE_STYLE_OPEN_TAG_SOURCE, "giu");
  const closeTag = arkRegex.as(HTML_LIKE_STYLE_CLOSE_PREFIX_SOURCE, "giu");
  let m: RegExpExecArray | null = open.exec(scan);
  while (m) {
    const contentStart = m.index + m[0].length;
    closeTag.lastIndex = contentStart;
    const close = closeTag.exec(scan)?.index ?? -1;
    const end = close === -1 ? scan.length : close;
    const lang = m[1].match(LANG_ATTRIBUTE)?.[1];
    regions.push({ start: contentStart, end, host: "html", dialect: dialectFromLang(lang) });
    open.lastIndex = close === -1 ? scan.length : close;
    m = open.exec(scan);
  }
  return { regions };
}

/** Find fenced CSS and SCSS code blocks in Markdown/MDX. */
function scanMarkdown(src: string): { regions: Region[] } {
  const regions: Region[] = [];
  const fence = arkRegex.as(
    String.raw`(^|\n)${MARKDOWN_BACKTICK_FENCE_SOURCE}(${ALPHA_SOURCE}+)[^\n]*\n`,
    "gu",
  );
  let m: RegExpExecArray | null = fence.exec(src);
  while (m) {
    const lang = m[2].toLowerCase();
    const contentStart = m.index + m[0].length;
    const close = src.indexOf(`\n${MARKDOWN_BACKTICK_FENCE_TEXT}`, contentStart - 1);
    const end = close === -1 ? src.length : close + 1;
    if (["css", "scss", "sass", "less"].includes(lang)) {
      regions.push({ start: contentStart, end, host: "markdown", dialect: dialectFromLang(lang) });
    }
    fence.lastIndex = close === -1 ? src.length : close + 1 + MARKDOWN_BACKTICK_FENCE_TEXT.length;
    m = fence.exec(src);
  }
  return { regions };
}

function scan(
  source: string,
  opts: EmbeddedOptions,
): { regions: Region[]; masks: Mask[]; comments: Mask[] } {
  const host = opts.host && opts.host !== "auto" ? opts.host : detectEmbeddedHost(opts.filename);
  const tags = opts.tags ?? DEFAULT_TAGS;
  if (host === "js") return scanJs(source, tags);
  if (host === "html") return { regions: scanHtml(source).regions, masks: [], comments: [] };
  if (host === "markdown")
    return { regions: scanMarkdown(source).regions, masks: [], comments: [] };
  // "auto" with no filename hint: run all finders and union the regions.
  const js = scanJs(source, tags);
  return {
    regions: [...js.regions, ...scanHtml(source).regions, ...scanMarkdown(source).regions],
    masks: js.masks,
    comments: js.comments,
  };
}

/**
 * Project a host source down to a CSS string: same length and line structure, with embedded-CSS
 * regions and outer `/** … *\/` doc comments kept in place, everything else blanked, and JS `${…}`
 * interpolations masked. The result feeds any CSS tool with source-accurate positions.
 *
 * @param source - The complete host-language source.
 * @param opts - Host detection and CSS template tag options.
 * @returns The projected CSS, with source offsets and line breaks preserved.
 */
export function projectCss(source: string, opts: EmbeddedOptions = {}): string {
  const { regions, masks, comments } = scan(source, opts);
  // Only keep the last doc comment before each CSS region — the one that documents that template.
  // Keeping all comments lets TSDoc prose containing `@component`-like examples trigger false records.
  const commentSet = new Set<Mask>();
  for (const region of regions) {
    let best: Mask | undefined;
    for (const c of comments) {
      if (c.end <= region.start && (!best || c.end > best.end)) best = c;
    }
    if (best) commentSet.add(best);
  }
  const keep = [...regions.map((r) => ({ start: r.start, end: r.end })), ...commentSet];
  const out: string[] = Array.from({ length: source.length }, (_, i) =>
    source[i] === "\n" ? "\n" : " ",
  );
  for (const k of keep)
    for (let i = k.start; i < k.end && i < source.length; i++) out[i] = source[i];
  for (const m of masks)
    for (let i = m.start; i < m.end && i < source.length; i++)
      out[i] = source[i] === "\n" ? "\n" : "a";
  return out.join("");
}

/**
 * Extract each embedded CSS region as a discrete block, with its source position and dialect.
 *
 * @param source - The complete host-language source.
 * @param opts - Host detection and CSS template tag options.
 * @returns Blocks in scanner order, with interpolations masked in their CSS.
 */
export function extractCssBlocks(source: string, opts: EmbeddedOptions = {}): CssBlock[] {
  const projected = projectCss(source, opts);
  return scan(source, opts).regions.map((r) => {
    const before = source.slice(0, r.start);
    const line = before.split("\n").length;
    const column = r.start - (before.lastIndexOf("\n") + 1);
    return {
      css: projected.slice(r.start, r.end),
      host: r.host,
      dialect: r.dialect,
      start: { line, column, offset: r.start },
    };
  });
}

/**
 * Choose one parser dialect for the projection: `scss` (including `sass`) wins over `less`, which wins
 * over `css`. A source with no embedded regions uses `css`.
 *
 * @param source - The complete host-language source.
 * @param opts - Host detection and CSS template tag options.
 * @returns The dialect selected for the combined projection.
 */
export const projectionDialect = (source: string, opts: EmbeddedOptions = {}): ParserDialect => {
  const dialects = scan(source, opts).regions.map((r) => r.dialect);
  if (dialects.includes("scss") || dialects.includes("sass")) return "scss";
  if (dialects.includes("less")) return "less";
  return "css";
};

/**
 * Project a host source and parse its cssdoc records. Unless `opts.parse` is provided, the parser is
 * selected from the detected dialects using {@link projectionDialect}.
 *
 * @param source - The complete host-language source.
 * @param opts - Projection and core parser options.
 * @returns The parsed records, or an empty array if projection or parsing throws.
 */
export function parseCssDocsFromSource(
  source: string,
  opts: EmbeddedOptions & ParseOptions = {},
): CssDocEntry[] {
  try {
    const parse = opts.parse ?? resolveParser(projectionDialect(source, opts));
    return parseCssDocs(projectCss(source, opts), { ...opts, parse });
  } catch {
    return [];
  }
}

/**
 * Project a host source and lint its cssdoc records. Unless `opts.parse` is provided, the parser is
 * selected from the detected dialects using {@link projectionDialect}.
 *
 * @param source - The complete host-language source.
 * @param opts - Projection and lint options.
 * @returns Violations with source-relative line numbers, or an empty array if projection or linting throws.
 */
export function lintCssDocsFromSource(
  source: string,
  opts: EmbeddedOptions & LintOptions = {},
): Violation[] {
  try {
    const parse = opts.parse ?? resolveParser(projectionDialect(source, opts));
    return lintCssDocs(projectCss(source, opts), { ...opts, parse });
  } catch {
    return [];
  }
}

// ── consumer class-usage scanning (where component classes are *used* in templates) ───────────────

/** One class token used on an element, with its offset span in the source. */
export interface ClassToken {
  /** Class token text. */
  token: string;
  /** 0-based UTF-16 start offset in the host source. */
  start: number;
  /** Exclusive 0-based UTF-16 end offset in the host source. */
  end: number;
}

/** Every class token found on one element — across `class`/`className`/`:class`/`class:name`. */
export interface ClassUsageSite {
  /** The host tag name for the usage site, lowercased when available (e.g. `button`). */
  elementName?: string;
  /** Class tokens found on this element. */
  tokens: ClassToken[];
}

const TAG = arkRegex.as(
  String.raw`${LESS_THAN_CHAR}(${HTML_LIKE_DOTTED_TAG_NAME_SOURCE})${WORD_BOUNDARY_SOURCE}([^${GREATER_THAN_CHAR}]*)${GREATER_THAN_CHAR}`,
  "gu",
);
// Static `class="…"` / `className="…"` — not `:class` / `v-bind:class` (excluded by the lookbehind).
const STATIC_CLASS = arkRegex.as(
  String.raw`(?<![${COLON_CHAR}\w${DASH_SOURCE}])${HTML_LIKE_CLASS_ATTRIBUTE_NAME_SOURCE}\s*${EQUALS_CHAR}\s*(${HTML_QUOTED_ATTRIBUTE_VALUE_SOURCE})`,
  "gu",
);
// JSX brace value: `className={ … }` / `class={ … }` (string/template literals inside are class names).
const JSX_CLASS = arkRegex.as(
  String.raw`(?<![${COLON_CHAR}\w${DASH_SOURCE}])${HTML_LIKE_CLASS_ATTRIBUTE_NAME_SOURCE}\s*${EQUALS_CHAR}\s*${BRACE_OPEN_SOURCE}([^${BRACE_OPEN_CHAR}${BRACE_CLOSE_CHAR}]*)${BRACE_CLOSE_SOURCE}`,
  "gu",
);
// Vue bound value: `:class="…"` / `v-bind:class="…"` (string literals inside the expression).
const VUE_BOUND = arkRegex.as(
  String.raw`(?:${COLON_CHAR}class|v-bind${COLON_CHAR}class)\s*${EQUALS_CHAR}\s*(${HTML_QUOTED_ATTRIBUTE_VALUE_SOURCE})`,
  "gu",
);
// Svelte directive: `class:name` toggles the class `name`.
const SVELTE_CLASS = arkRegex.as(
  String.raw`${WORD_BOUNDARY_SOURCE}class${COLON_CHAR}([\w${DASH_SOURCE}]+)`,
  "gu",
);
const STRING_LITERAL = toRegExp(JAVASCRIPT_QUOTED_OR_TEMPLATE_LITERAL_LIKE);
const WORD = arkRegex.as(String.raw`\S+`, "gu");
// Comment forms to blank before scanning, so commented-out markup isn't read as a usage. The `//`
// form guards against `://` (URLs) so a `href="http://…"` isn't mistaken for a line comment.
const COMMENT_RES = [
  toRegExp(HTML_COMMENT),
  arkRegex.as(`${COMMENT_START_SOURCE}[\\s\\S]*?${COMMENT_END_SOURCE}`, "gu"),
  arkRegex.as(
    String.raw`(?<![${COLON_CHAR}${FORWARD_SLASH_CHAR}])${FORWARD_SLASH_CHAR}{2}[^\n]*`,
    "gu",
  ),
];

/** Blank every `${ … }` interpolation in a template-literal body to same-length spaces, so a static
 * prefix like `-icon-` followed by an interpolation still tokenizes to `-icon-` instead of the raw expression
 * text (which would never match a documented modifier or its `*` family). */
function maskTemplateInterpolations(body: string): string {
  let out = body;
  for (let i = 0; i < out.length; i++) {
    if (out[i] === DOLLAR_CHAR && out[i + 1] === BRACE_OPEN_CHAR) {
      const end = skipInterpolation(out, i);
      out = out.slice(0, i) + " ".repeat(end - i) + out.slice(end);
    }
  }
  return out;
}

/** Blank every comment's characters to spaces (newlines kept), preserving length and offsets. */
function maskComments(source: string): string {
  const ranges: Array<[number, number]> = [];
  for (const re of COMMENT_RES)
    for (const m of source.matchAll(re)) ranges.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  if (ranges.length === 0) return source;
  const out = Array.from({ length: source.length }, (_, i) => source[i]);
  for (const [s, e] of ranges)
    for (let i = s; i < e && i < source.length; i++) if (out[i] !== "\n") out[i] = " ";
  return out.join("");
}

/**
 * Scan a host document (HTML, JSX, Vue, Svelte, …) for the places component classes are **used**, so
 * the consumer-usage rules (unknown-modifier/part/state) can run in templates. Returns one site per
 * element with every class token and its source offset. Dynamic expressions are best-effort — only
 * string/template **literals** are read (a `:class="{ active: x }"` object key or a computed name is
 * not), which is enough for the common `class="…"`, `:class="[ '…' ]"`, and `class:name` forms. A
 * template literal's `${…}` interpolations are masked out before tokenizing, so an `-icon-` prefix
 * reads as the static prefix `-icon-` rather than the raw (unmatchable) expression text.
 *
 * @param source - The complete host-language source to scan.
 * @returns Class usage sites in source order, with offsets into the original source.
 */
export function scanClassUsages(source: string): ClassUsageSite[] {
  const sites: ClassUsageSite[] = [];
  // Blank comments first (same length, so offsets still map to `source`) — commented-out markup like
  // `<!-- <div class="tabs tabs--boxed"></div> -->` must not be read as a real usage.
  const scanned = maskComments(source);
  for (const tag of scanned.matchAll(TAG)) {
    const attrs = tag[2];
    if (!attrs) continue;
    const elementName = tag[1]?.toLowerCase();
    const base = (tag.index ?? 0) + tag[0].length - 1 - attrs.length; // absolute start of the attrs
    const tokens: ClassToken[] = [];
    const pushWords = (raw: string, rawBase: number): void => {
      for (const w of raw.matchAll(WORD)) {
        const start = rawBase + (w.index ?? 0);
        tokens.push({ token: w[0], start, end: start + w[0].length });
      }
    };
    const pushLiterals = (expr: string, exprBase: number): void => {
      for (const s of expr.matchAll(STRING_LITERAL)) {
        const body = s[1] === BACKTICK_CHAR ? maskTemplateInterpolations(s[2]) : s[2];
        pushWords(body, exprBase + (s.index ?? 0) + 1); // +1 skips the opening quote
      }
    };
    for (const a of attrs.matchAll(STATIC_CLASS)) {
      const raw = a[2] ?? a[3] ?? "";
      pushWords(raw, base + (a.index ?? 0) + a[0].length - 1 - raw.length);
    }
    for (const a of attrs.matchAll(JSX_CLASS)) {
      pushLiterals(a[1], base + (a.index ?? 0) + a[0].length - 1 - a[1].length);
    }
    for (const a of attrs.matchAll(VUE_BOUND)) {
      const raw = a[2] ?? a[3] ?? "";
      pushLiterals(raw, base + (a.index ?? 0) + a[0].length - 1 - raw.length);
    }
    for (const a of attrs.matchAll(SVELTE_CLASS)) {
      const start = base + (a.index ?? 0) + a[0].length - a[1].length;
      tokens.push({ token: a[1], start, end: start + a[1].length });
    }
    if (tokens.length) sites.push({ tokens, ...(elementName ? { elementName } : {}) });
  }
  return sites;
}
