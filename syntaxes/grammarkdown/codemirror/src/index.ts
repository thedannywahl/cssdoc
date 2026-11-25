/**
 * A CodeMirror 6 highlighter for grammarkdown, using the same patterns as
 * `@cssdoc/grammarkdown-tmlanguage`.
 *
 * @module @cssdoc/grammarkdown-codemirror
 */
import { RangeSetBuilder, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { buildGrammar } from "@cssdoc/grammarkdown-tmlanguage";
import { BRACKET_CLOSE_CHAR, BRACKET_OPEN_CHAR } from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";

/** Semantic token kind, styled with a `cm-grammarkdown-<kind>` class. */
export type GrammarkdownTokenType =
  | "comment"
  | "prose"
  | "directive"
  | "production"
  | "parameter"
  | "operator"
  | "terminal"
  | "character-class"
  | "codepoint"
  | "keyword"
  | "nonterminal"
  | "punct";

/** A highlighted span, with offsets relative to the tokenized text. */
export interface GrammarkdownToken {
  from: number;
  to: number;
  type: GrammarkdownTokenType;
}

const grammar = buildGrammar();

function rulePattern(name: string): RegExp {
  const source = grammar.repository[name]?.match;
  if (!source) throw new Error(`Missing grammarkdown TextMate match rule: ${name}`);
  return arkRegex.as(source, "dy");
}

const patterns = {
  comment: rulePattern("comment"),
  prose: rulePattern("prose"),
  directive: rulePattern("directive"),
  production: rulePattern("production"),
  terminal: rulePattern("terminal"),
  characterClass: rulePattern("characterClass"),
  codepoint: rulePattern("codepoint"),
  keyword: rulePattern("keywords"),
  optional: rulePattern("optional"),
  nonterminal: rulePattern("nonterminal"),
  parameter: rulePattern("parameters"),
};

const outsideRules: [RegExp, GrammarkdownTokenType][] = [
  [patterns.comment, "comment"],
  [patterns.prose, "prose"],
  [patterns.directive, "directive"],
  [patterns.terminal, "terminal"],
  [patterns.characterClass, "character-class"],
  [patterns.codepoint, "codepoint"],
  [patterns.keyword, "keyword"],
  [patterns.optional, "operator"],
  [patterns.nonterminal, "nonterminal"],
];
const constraintRules: [RegExp, GrammarkdownTokenType][] = [
  [patterns.keyword, "keyword"],
  [patterns.terminal, "terminal"],
  [/[+~?]|[∈∉≠]|!=/dy, "operator"],
  [patterns.parameter, "parameter"],
];

function matchAt(pattern: RegExp, text: string, pos: number): RegExpExecArray | null {
  pattern.lastIndex = pos;
  return pattern.exec(text);
}

/** Tokenize grammarkdown text into ordered, non-overlapping highlighted spans. */
export function tokenizeGrammarkdown(text: string): GrammarkdownToken[] {
  const tokens: GrammarkdownToken[] = [];
  let offset = 0;
  let inConstraint = false;

  for (const line of text.split("\n")) {
    const add = (from: number, to: number, type: GrammarkdownTokenType): void => {
      if (from < to) tokens.push({ from: offset + from, to: offset + to, type });
    };

    for (let pos = 0; pos < line.length;) {
      if (!inConstraint) {
        const production = matchAt(patterns.production, line, pos);
        if (production?.indices) {
          const [, name, parameters, separator] = production.indices;
          if (name) add(name[0], name[1], "production");
          if (parameters) {
            add(parameters[0], parameters[0] + 1, "punct");
            let p = parameters[0] + 1;
            while (p < parameters[1] - 1) {
              const parameter = matchAt(patterns.parameter, line, p);
              if (parameter) {
                add(p, p + parameter[0].length, "parameter");
                p += parameter[0].length;
              } else {
                p++;
              }
            }
            add(parameters[1] - 1, parameters[1], "punct");
          }
          if (separator) add(separator[0], separator[1], "operator");
          pos += production[0].length;
          continue;
        }
      }

      if (
        (!inConstraint && line[pos] === BRACKET_OPEN_CHAR) ||
        (inConstraint && line[pos] === BRACKET_CLOSE_CHAR)
      ) {
        add(pos, pos + 1, "punct");
        inConstraint = !inConstraint;
        pos++;
        continue;
      }

      const rules = inConstraint ? constraintRules : outsideRules;
      let matched = false;
      for (const [pattern, type] of rules) {
        const match = matchAt(pattern, line, pos);
        if (match) {
          add(pos, pos + match[0].length, type);
          pos += match[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) pos++;
    }

    offset += line.length + 1;
  }

  return tokens;
}

function decorations(text: string): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const token of tokenizeGrammarkdown(text)) {
    builder.add(token.from, token.to, Decoration.mark({ class: `cm-grammarkdown-${token.type}` }));
  }
  return builder.finish();
}

const highlights = StateField.define<DecorationSet>({
  create: (state) => decorations(state.doc.toString()),
  update: (value, transaction) =>
    transaction.docChanged ? decorations(transaction.newDoc.toString()) : value,
  provide: (field) => EditorView.decorations.from(field),
});

/** Highlight grammarkdown in a CodeMirror editor and install a light/dark base theme. */
export function grammarkdownHighlight(): Extension {
  return [
    highlights,
    EditorView.baseTheme({
      "&light .cm-grammarkdown-comment": { color: "#6a737d" },
      "&dark .cm-grammarkdown-comment": { color: "#a1a1aa" },
      "&light .cm-grammarkdown-prose": { color: "#22863a" },
      "&dark .cm-grammarkdown-prose": { color: "#85e89d" },
      "&light .cm-grammarkdown-directive, &light .cm-grammarkdown-keyword": { color: "#d73a49" },
      "&dark .cm-grammarkdown-directive, &dark .cm-grammarkdown-keyword": { color: "#f97583" },
      "&light .cm-grammarkdown-production, &light .cm-grammarkdown-nonterminal": {
        color: "#6f42c1",
      },
      "&dark .cm-grammarkdown-production, &dark .cm-grammarkdown-nonterminal": { color: "#b392f0" },
      "&light .cm-grammarkdown-terminal, &light .cm-grammarkdown-character-class": {
        color: "#032f62",
      },
      "&dark .cm-grammarkdown-terminal, &dark .cm-grammarkdown-character-class": {
        color: "#9ecbff",
      },
      "&light .cm-grammarkdown-parameter, &light .cm-grammarkdown-codepoint": { color: "#005cc5" },
      "&dark .cm-grammarkdown-parameter, &dark .cm-grammarkdown-codepoint": { color: "#79b8ff" },
      "&light .cm-grammarkdown-operator, &light .cm-grammarkdown-punct": { color: "#d73a49" },
      "&dark .cm-grammarkdown-operator, &dark .cm-grammarkdown-punct": { color: "#f97583" },
    }),
  ];
}
