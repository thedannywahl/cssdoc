const cssTree = require("css-tree-bundle") as {
  fork?: (...args: unknown[]) => unknown;
  generate?: (...args: unknown[]) => unknown;
  ident?: { decode(input: string): string; encode(input: string): string };
  parse?: (...args: unknown[]) => unknown;
  tokenTypes?: Readonly<Record<string, number>>;
  tokenize?: (...args: unknown[]) => unknown;
  walk?: (...args: unknown[]) => unknown;
};

if (
  !cssTree.generate ||
  !cssTree.ident ||
  !cssTree.ident.encode ||
  !cssTree.parse ||
  !cssTree.tokenTypes ||
  !cssTree.tokenize ||
  !cssTree.walk
) {
  throw new Error("css-tree parser exports are unavailable in the bundled build");
}

/** CSS identifier helpers from the bundled parser. */
export const ident: { decode(input: string): string; encode(input: string): string } =
  cssTree.ident;
/** Generate CSS from the bundled parser's AST. */
export const generate: (...args: unknown[]) => unknown = cssTree.generate;
/** Parse CSS using the bundled parser. */
export const parse: (...args: unknown[]) => unknown = cssTree.parse;
/** CSS tokenizer constants from the bundled parser. */
export const tokenTypes: Readonly<Record<string, number>> = cssTree.tokenTypes;
/** Tokenize CSS using the bundled parser. */
export const tokenize: (...args: unknown[]) => unknown = cssTree.tokenize;
/** Walk the bundled parser's AST. */
export const walk: (...args: unknown[]) => unknown = cssTree.walk;

/** Forward a fork request to the bundled css-tree implementation. */
export function fork(...args: unknown[]): unknown {
  if (typeof cssTree.fork !== "function") {
    throw new TypeError("css-tree fork() is unavailable in the bundled build");
  }

  return cssTree.fork(...args);
}
