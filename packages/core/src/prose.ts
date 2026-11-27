/** Markdown-aware prose interpretation without a CSS parser. */
export {
  escapedInlineOpenerRanges,
  markdownCodeRanges,
  parseDocComment,
  unescapeInlineOpeners,
} from "./full-grammar.ts";
export { sanitizeMarkdownLinks } from "./markdown-links.ts";
