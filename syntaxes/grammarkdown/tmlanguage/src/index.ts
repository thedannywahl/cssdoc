/**
 * `@cssdoc/grammarkdown-tmlanguage` — a TextMate grammar for
 * [grammarkdown](https://github.com/rbuckton/grammarkdown), the ECMAScript-style grammar notation used
 * by TSDoc and by cssdoc's own doc-comment spec. The default export is the grammar as a Shiki
 * `LanguageRegistration` (it carries `name` and `scopeName`), so it drops straight into a Shiki or
 * VitePress config; a generated snapshot is also published at `./grammarkdown.tmLanguage.json` for
 * editors and other TextMate consumers.
 *
 * @example
 * ```ts
 * // .vitepress/config.ts
 * import grammarkdown from "@cssdoc/grammarkdown-tmlanguage";
 * export default { markdown: { languages: [grammarkdown] } };
 * ```
 *
 * @module \@cssdoc/grammarkdown-tmlanguage
 */
import {
  ALPHA_SOURCE,
  ALPHA_UPPER_SOURCE,
  ALPHANUMERIC_SOURCE,
  AT_SOURCE,
  BRACKET_CLOSE_SOURCE,
  BRACKET_OPEN_SOURCE,
  COLON_SOURCE,
  FORWARD_SLASH_SOURCE,
  HEX_DIGIT_SOURCE,
  WORD_BOUNDARY_SOURCE,
} from "@cssdoc/regex";

interface TmRule {
  name?: string;
  match?: string;
  begin?: string;
  end?: string;
  captures?: Record<string, TmRule>;
  patterns?: TmRule[];
  include?: string;
}

/** A grammarkdown TextMate grammar. */
export interface GrammarkdownGrammar {
  /** TextMate grammar schema URL. */
  $schema: string;
  /** Human-readable grammar name. */
  name: string;
  /** Scope assigned to grammarkdown source. */
  scopeName: string;
  /** File extensions associated with the grammar. */
  fileTypes: string[];
  /** Top-level TextMate patterns. */
  patterns: TmRule[];
  /** Named rules referenced by the patterns. */
  repository: Record<string, TmRule>;
}

const identifier = `${ALPHA_SOURCE}${ALPHANUMERIC_SOURCE}*`;
const boundedIdentifier = `${WORD_BOUNDARY_SOURCE}${identifier}${WORD_BOUNDARY_SOURCE}`;

/** Build the grammarkdown TextMate grammar. */
export function buildGrammar(): GrammarkdownGrammar {
  return {
    $schema: "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    name: "grammarkdown",
    scopeName: "source.grammarkdown",
    fileTypes: ["grammarkdown"],
    patterns: [
      { include: "#comment" },
      { include: "#prose" },
      { include: "#directive" },
      { include: "#production" },
      { include: "#constraint" },
      { include: "#terminal" },
      { include: "#characterClass" },
      { include: "#codepoint" },
      { include: "#keywords" },
      { include: "#optional" },
      { include: "#nonterminal" },
    ],
    repository: {
      comment: {
        match: `${FORWARD_SLASH_SOURCE}${FORWARD_SLASH_SOURCE}.*$`,
        name: "comment.line.double-slash.grammarkdown",
      },
      prose: {
        match: String.raw`^\s*>.*$`,
        name: "string.unquoted.prose.grammarkdown",
      },
      directive: {
        match: `${AT_SOURCE}(import|define|line|augments|noStrictParametricRedeclaration|noSyntacticPredicates)${WORD_BOUNDARY_SOURCE}`,
        name: "keyword.control.directive.grammarkdown",
      },
      production: {
        match: `^\\s*(${identifier})\\s*(${BRACKET_OPEN_SOURCE}[^\\]]*${BRACKET_CLOSE_SOURCE})?\\s*(${COLON_SOURCE}{3}|${COLON_SOURCE}{2}|${COLON_SOURCE})`,
        captures: {
          "1": { name: "entity.name.type.production.grammarkdown" },
          "2": {
            name: "meta.parameter-list.grammarkdown",
            patterns: [{ include: "#parameters" }],
          },
          "3": { name: "keyword.operator.definition.grammarkdown" },
        },
      },
      constraint: {
        begin: BRACKET_OPEN_SOURCE,
        end: BRACKET_CLOSE_SOURCE,
        name: "meta.annotation.grammarkdown",
        patterns: [
          { include: "#keywords" },
          { include: "#terminal" },
          { match: "[+~?]", name: "keyword.operator.parameter.grammarkdown" },
          { match: "[∈∉≠]|!=", name: "keyword.operator.assertion.grammarkdown" },
          { match: boundedIdentifier, name: "variable.parameter.grammarkdown" },
        ],
      },
      terminal: {
        match: "`[^`]*`",
        name: "constant.character.terminal.grammarkdown",
      },
      characterClass: {
        match: String.raw`<[^>\n]+>`,
        name: "constant.language.character-class.grammarkdown",
      },
      codepoint: {
        match: `${WORD_BOUNDARY_SOURCE}U\\+${HEX_DIGIT_SOURCE}{2,6}${WORD_BOUNDARY_SOURCE}`,
        name: "constant.numeric.codepoint.grammarkdown",
      },
      keywords: {
        match: `${WORD_BOUNDARY_SOURCE}(but\\s+not|one\\s+of|lookahead|empty|here|but|not|or|of|no)${WORD_BOUNDARY_SOURCE}`,
        name: "keyword.control.grammarkdown",
      },
      optional: {
        match: String.raw`\?`,
        name: "keyword.operator.optional.grammarkdown",
      },
      nonterminal: {
        match: `${WORD_BOUNDARY_SOURCE}${ALPHA_UPPER_SOURCE}${ALPHANUMERIC_SOURCE}*${WORD_BOUNDARY_SOURCE}`,
        name: "variable.other.nonterminal.grammarkdown",
      },
      parameters: {
        match: boundedIdentifier,
        name: "variable.parameter.grammarkdown",
      },
    },
  };
}

/** The grammarkdown TextMate grammar, shaped as a Shiki `LanguageRegistration`. */
export const grammarkdown: GrammarkdownGrammar = buildGrammar();

export default grammarkdown;
