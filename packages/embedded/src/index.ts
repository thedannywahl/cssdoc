/**
 * `@cssdoc/embedded` — read cssdoc-annotated CSS out of host files where it lives embedded: JS/TS
 * tagged templates (`` styled.x`…` ``, `` css`…` ``, Lit, `keyframes`), HTML-like `<style>` blocks
 * (`.html`, `.vue`, `.svelte`, `.astro`), and Markdown/MDX code fences.
 *
 * The core is {@link projectCss}: it returns a character-for-character CSS **projection** of the host
 * source — identical length and newlines, with the embedded-CSS regions and any `/** … *\/` doc comment
 * kept verbatim, everything else blanked to spaces, and JS `${…}` interpolations masked. Because the
 * projection shares every offset/line/column with the source, all downstream CSS tooling
 * (`parseCssDocs`, `createIndex`, spans, ranges) works unchanged and correctly-positioned.
 *
 * @module @cssdoc/embedded
 */
import { type CssDocEntry, type ParseOptions, parseCssDocs } from "@cssdoc/core";
import { type CssDialect as ParserDialect, resolveParser } from "@cssdoc/dialects";
import { type LintOptions, type Violation, lintCssDocs } from "@cssdoc/lint-core";

/** A host language cssdoc can pull embedded CSS out of. */
export type EmbeddedHost = "js" | "html" | "markdown";

/** A stylesheet dialect (Phase 2 uses this to pick a PostCSS syntax; today everything is treated as CSS). */
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
  /** Where the region begins in the source. */
  start: { line: number; column: number; offset: number };
}

/** The default JS tags treated as CSS templates. */
export const DEFAULT_TAGS: readonly string[] = [
  "css",
  "styled",
  "createGlobalStyle",
  "keyframes",
  "injectGlobal",
];

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
  const ext = filename?.toLowerCase().match(/\.([a-z]+)$/u)?.[1];
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
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i + 1;
    } else if (c === "'" || c === '"') {
      i = skipString(src, i, c);
    } else if (c === "`") {
      i = skipTemplate(src, i);
    }
  }
  return i;
}

/** Skip a quoted string starting at `i` (the quote). Returns the index of the closing quote. */
function skipString(src: string, i: number, quote: string): number {
  for (i += 1; i < src.length; i++) {
    if (src[i] === "\\") i++;
    else if (src[i] === quote) return i;
  }
  return i;
}

/** Skip a (non-CSS) template literal starting at `i` (the backtick). Returns the closing backtick index. */
function skipTemplate(src: string, i: number): number {
  for (i += 1; i < src.length; i++) {
    if (src[i] === "\\") i++;
    else if (src[i] === "`") return i;
    else if (src[i] === "$" && src[i + 1] === "{") i = skipInterpolation(src, i) - 1;
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
  // Matches a CSS tag expression immediately before a backtick: `css`, `styled.x`, `styled(x)`, chains.
  const tagRe = new RegExp(
    `(?:[^.\\w$]|^)(?:${tags.join("|")})(?:\\.[A-Za-z0-9_$]+|\\([^()]*\\))*\\s*$`,
    "u",
  );
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      const start = i;
      const isDoc = src[i + 2] === "*";
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      const closed = i < src.length;
      i += 1; // land on the '/'; loop's i++ moves past
      if (isDoc && closed) comments.push({ start, end: Math.min(i + 1, src.length) });
    } else if (c === "'" || c === '"') {
      i = skipString(src, i, c);
    } else if (c === "`") {
      const isCss = tagRe.test(src.slice(Math.max(0, i - 256), i));
      if (!isCss) {
        i = skipTemplate(src, i);
        continue;
      }
      const start = i + 1;
      let j = start;
      for (; j < src.length; j++) {
        if (src[j] === "\\") j++;
        else if (src[j] === "`") break;
        else if (src[j] === "$" && src[j + 1] === "{") {
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
  const open = /<style([^>]*)>/giu;
  let m: RegExpExecArray | null = open.exec(scan);
  while (m) {
    const contentStart = m.index + m[0].length;
    const close = scan.indexOf("</style", contentStart);
    const end = close === -1 ? scan.length : close;
    const lang = m[1].match(/\blang\s*=\s*["']?([a-z]+)/iu)?.[1];
    regions.push({ start: contentStart, end, host: "html", dialect: dialectFromLang(lang) });
    open.lastIndex = close === -1 ? scan.length : close;
    m = open.exec(scan);
  }
  return { regions };
}

/** Find fenced ` ```css `/` ```scss ` … code blocks in Markdown/MDX. */
function scanMarkdown(src: string): { regions: Region[] } {
  const regions: Region[] = [];
  const fence = /(^|\n)```([a-zA-Z]+)[^\n]*\n/gu;
  let m: RegExpExecArray | null = fence.exec(src);
  while (m) {
    const lang = m[2].toLowerCase();
    const contentStart = m.index + m[0].length;
    const close = src.indexOf("\n```", contentStart - 1);
    const end = close === -1 ? src.length : close + 1;
    if (["css", "scss", "sass", "less"].includes(lang)) {
      regions.push({ start: contentStart, end, host: "markdown", dialect: dialectFromLang(lang) });
    }
    fence.lastIndex = close === -1 ? src.length : close + 4;
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
 */
export function projectCss(source: string, opts: EmbeddedOptions = {}): string {
  const { regions, masks, comments } = scan(source, opts);
  const keep = [
    ...regions.map((r) => ({ start: r.start, end: r.end })),
    // JS doc comments can document a following styled-component declaration. Collect them with the
    // JS lexer rather than a source-wide regex: Markdown prose and glob strings can contain `/**`
    // followed much later by `*/`, and preserving that span would feed non-CSS text to PostCSS.
    ...comments,
  ];
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

/** Extract each embedded CSS region as a discrete block, with its source position and dialect. */
export function extractCssBlocks(source: string, opts: EmbeddedOptions = {}): CssBlock[] {
  const projected = projectCss(source, opts);
  return scan(source, opts).regions.map((r) => {
    const before = source.slice(0, r.start);
    const line = (before.match(/\n/gu)?.length ?? 0) + 1;
    const column = r.start - (before.lastIndexOf("\n") + 1);
    return {
      css: projected.slice(r.start, r.end),
      host: r.host,
      dialect: r.dialect,
      start: { line, column, offset: r.start },
    };
  });
}

/** The dialect to parse a source's projection with — `scss` wins over `less` wins over `css`. */
export const projectionDialect = (source: string, opts: EmbeddedOptions = {}): ParserDialect => {
  const dialects = scan(source, opts).regions.map((r) => r.dialect);
  if (dialects.includes("scss") || dialects.includes("sass")) return "scss";
  if (dialects.includes("less")) return "less";
  return "css";
};

/** Parse cssdoc records out of a host source (projects first). Returns `[]` if the projection can't parse. */
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

/** Lint the cssdoc in a host source (projects first). Violation lines are absolute in the source. */
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
  token: string;
  start: number;
  end: number;
}

/** Every class token found on one element — across `class`/`className`/`:class`/`class:name`. */
export interface ClassUsageSite {
  tokens: ClassToken[];
}

const TAG_RE = /<[A-Za-z][\w.-]*\b([^>]*)>/gu;
// Static `class="…"` / `className="…"` — not `:class` / `v-bind:class` (excluded by the lookbehind).
const STATIC_CLASS_RE = /(?<![:\w-])(?:className|class)\s*=\s*("([^"]*)"|'([^']*)')/gu;
// JSX brace value: `className={ … }` / `class={ … }` (string/template literals inside are class names).
const JSX_CLASS_RE = /(?<![:\w-])(?:className|class)\s*=\s*\{([^{}]*)\}/gu;
// Vue bound value: `:class="…"` / `v-bind:class="…"` (string literals inside the expression).
const VUE_BOUND_RE = /(?::class|v-bind:class)\s*=\s*("([^"]*)"|'([^']*)')/gu;
// Svelte directive: `class:name` toggles the class `name`.
const SVELTE_CLASS_RE = /\bclass:([\w-]+)/gu;
const STRING_LITERAL_RE = /(["'`])((?:(?!\1)[\s\S])*)\1/gu;
const WORD_RE = /\S+/gu;
// Comment forms to blank before scanning, so commented-out markup isn't read as a usage. The `//`
// form guards against `://` (URLs) so a `href="http://…"` isn't mistaken for a line comment.
const COMMENT_RES = [/<!--[\s\S]*?-->/gu, /\/\*[\s\S]*?\*\//gu, /(?<![:/])\/\/[^\n]*/gu];

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
 * not), which is enough for the common `class="…"`, `:class="[ '…' ]"`, and `class:name` forms.
 */
export function scanClassUsages(source: string): ClassUsageSite[] {
  const sites: ClassUsageSite[] = [];
  // Blank comments first (same length, so offsets still map to `source`) — commented-out markup like
  // `<!-- <div class="tabs tabs--boxed"></div> -->` must not be read as a real usage.
  const scanned = maskComments(source);
  for (const tag of scanned.matchAll(TAG_RE)) {
    const attrs = tag[1];
    if (!attrs) continue;
    const base = (tag.index ?? 0) + tag[0].length - 1 - attrs.length; // absolute start of the attrs
    const tokens: ClassToken[] = [];
    const pushWords = (raw: string, rawBase: number): void => {
      for (const w of raw.matchAll(WORD_RE)) {
        const start = rawBase + (w.index ?? 0);
        tokens.push({ token: w[0], start, end: start + w[0].length });
      }
    };
    const pushLiterals = (expr: string, exprBase: number): void => {
      for (const s of expr.matchAll(STRING_LITERAL_RE)) {
        pushWords(s[2], exprBase + (s.index ?? 0) + 1); // +1 skips the opening quote
      }
    };
    for (const a of attrs.matchAll(STATIC_CLASS_RE)) {
      const raw = a[2] ?? a[3] ?? "";
      pushWords(raw, base + (a.index ?? 0) + a[0].length - 1 - raw.length);
    }
    for (const a of attrs.matchAll(JSX_CLASS_RE)) {
      pushLiterals(a[1], base + (a.index ?? 0) + a[0].length - 1 - a[1].length);
    }
    for (const a of attrs.matchAll(VUE_BOUND_RE)) {
      const raw = a[2] ?? a[3] ?? "";
      pushLiterals(raw, base + (a.index ?? 0) + a[0].length - 1 - raw.length);
    }
    for (const a of attrs.matchAll(SVELTE_CLASS_RE)) {
      const start = base + (a.index ?? 0) + a[0].length - a[1].length;
      tokens.push({ token: a[1], start, end: start + a[1].length });
    }
    if (tokens.length) sites.push({ tokens });
  }
  return sites;
}
