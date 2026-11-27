/** Markdown-aware prose interpretation without a CSS parser. */
export {
  escapedInlineOpenerRanges,
  markdownCodeRanges,
  markdownSyntaxRanges,
  parseDocComment,
  unescapeInlineOpeners,
} from "./full-grammar.ts";
export type { MarkdownSyntaxRange } from "./full-grammar.ts";
export { projectPrivateLinks } from "./prose-links.ts";
export type { PublicProseFragment, PublicProseProjection } from "./prose-links.ts";
export { sanitizeMarkdownLinks } from "./markdown-links.ts";
