interface BundledCssTree {
  fork?: (...args: unknown[]) => unknown;
  generate: (...args: unknown[]) => unknown;
  ident: { decode: (input: string) => string; encode: (input: string) => string };
  parse: (...args: unknown[]) => unknown;
  tokenTypes: Readonly<Record<string, number>>;
  tokenize: (...args: unknown[]) => unknown;
  walk: (...args: unknown[]) => unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBundledCssTree(value: unknown): value is BundledCssTree {
  return (
    isRecord(value) &&
    ["generate", "parse", "tokenize", "walk"].every((name) => typeof value[name] === "function") &&
    isRecord(value.ident) &&
    typeof value.ident.decode === "function" &&
    typeof value.ident.encode === "function" &&
    isRecord(value.tokenTypes) &&
    Object.values(value.tokenTypes).every((token) => typeof token === "number") &&
    (value.fork === undefined || typeof value.fork === "function")
  );
}

const loadedCssTree: unknown = require("css-tree-bundle");

if (!isBundledCssTree(loadedCssTree)) {
  throw new Error("css-tree parser exports are unavailable in the bundled build");
}
const cssTree = loadedCssTree;

/** CSS identifier helpers from the bundled parser. */
export const ident: { decode: (input: string) => string; encode: (input: string) => string } =
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
