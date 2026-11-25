const cssTree = require("css-tree-bundle") as { fork?: (...args: unknown[]) => unknown };

/** Forward a fork request to the bundled css-tree implementation. */
export function fork(...args: unknown[]): unknown {
  if (typeof cssTree.fork !== "function") {
    throw new Error("css-tree fork() is unavailable in the bundled build");
  }

  return cssTree.fork(...args);
}
