const cssTree = require("css-tree-bundle") as { fork?: (...args: unknown[]) => unknown };

export const fork = (...args: unknown[]) => {
  if (typeof cssTree.fork !== "function") {
    throw new Error("css-tree fork() is unavailable in the bundled build");
  }

  return cssTree.fork(...args);
};
