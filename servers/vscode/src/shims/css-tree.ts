const cssTree = require("css-tree-bundle") as {
  fork?: (...args: unknown[]) => unknown;
  ident?: { decode(input: string): string };
  parse?: (...args: unknown[]) => unknown;
  tokenTypes?: Readonly<Record<string, number>>;
  tokenize?: (...args: unknown[]) => unknown;
};

if (!cssTree.ident || !cssTree.parse || !cssTree.tokenTypes || !cssTree.tokenize) {
  throw new Error("css-tree parser exports are unavailable in the bundled build");
}

/** CSS identifier helpers from the bundled parser. */
export const ident: { decode(input: string): string } = cssTree.ident;
/** Parse CSS using the bundled parser. */
export const parse: (...args: unknown[]) => unknown = cssTree.parse;
/** CSS tokenizer constants from the bundled parser. */
export const tokenTypes: Readonly<Record<string, number>> = cssTree.tokenTypes;
/** Tokenize CSS using the bundled parser. */
export const tokenize: (...args: unknown[]) => unknown = cssTree.tokenize;

/** Forward a fork request to the bundled css-tree implementation. */
export function fork(...args: unknown[]): unknown {
  if (typeof cssTree.fork !== "function") {
    throw new Error("css-tree fork() is unavailable in the bundled build");
  }

  return cssTree.fork(...args);
}
