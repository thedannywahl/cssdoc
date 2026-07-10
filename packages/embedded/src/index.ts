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
function scanJs(src: string, tags: readonly string[]): { regions: Region[]; masks: Mask[] } {
  const regions: Region[] = [];
  const masks: Mask[] = [];
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
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 1; // land on the '/'; loop's i++ moves past
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
  return { regions, masks };
}

/** Find `<style …>…</style>` regions in HTML-like sources. */
function scanHtml(src: string): { regions: Region[] } {
  const regions: Region[] = [];
  const open = /<style([^>]*)>/giu;
  let m: RegExpExecArray | null = open.exec(src);
  while (m) {
    const contentStart = m.index + m[0].length;
    const close = src.indexOf("</style", contentStart);
    const end = close === -1 ? src.length : close;
    const lang = m[1].match(/\blang\s*=\s*["']?([a-z]+)/iu)?.[1];
    regions.push({ start: contentStart, end, host: "html", dialect: dialectFromLang(lang) });
    open.lastIndex = close === -1 ? src.length : close;
    m = open.exec(src);
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

/** Preserve `/** … *\/` block comments that sit outside every region (e.g. above `const X = styled…`). */
function docCommentsOutside(src: string, regions: Region[]): Mask[] {
  const inRegion = (p: number): boolean => regions.some((r) => p >= r.start && p < r.end);
  const out: Mask[] = [];
  const re = /\/\*\*[\s\S]*?\*\//gu;
  let m: RegExpExecArray | null = re.exec(src);
  while (m) {
    if (!inRegion(m.index)) out.push({ start: m.index, end: m.index + m[0].length });
    m = re.exec(src);
  }
  return out;
}

function scan(source: string, opts: EmbeddedOptions): { regions: Region[]; masks: Mask[] } {
  const host = opts.host && opts.host !== "auto" ? opts.host : detectEmbeddedHost(opts.filename);
  const tags = opts.tags ?? DEFAULT_TAGS;
  if (host === "js") return scanJs(source, tags);
  if (host === "html") return { regions: scanHtml(source).regions, masks: [] };
  if (host === "markdown") return { regions: scanMarkdown(source).regions, masks: [] };
  // "auto" with no filename hint: run all finders and union the regions.
  const js = scanJs(source, tags);
  return {
    regions: [...js.regions, ...scanHtml(source).regions, ...scanMarkdown(source).regions],
    masks: js.masks,
  };
}

/**
 * Project a host source down to a CSS string: same length and line structure, with embedded-CSS
 * regions and outer `/** … *\/` doc comments kept in place, everything else blanked, and JS `${…}`
 * interpolations masked. The result feeds any CSS tool with source-accurate positions.
 */
export function projectCss(source: string, opts: EmbeddedOptions = {}): string {
  const { regions, masks } = scan(source, opts);
  const keep = [
    ...regions.map((r) => ({ start: r.start, end: r.end })),
    ...docCommentsOutside(source, regions),
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
