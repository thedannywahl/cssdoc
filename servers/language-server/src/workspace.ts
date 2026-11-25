/**
 * Discover the stylesheets used to build workspace indexes.
 *
 * @module
 */
import { globSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

/** Options for discovering documented stylesheets. */
export interface WorkspaceDiscoveryOptions {
  /** Explicit paths override discovery, including when the list is empty. */
  css?: readonly string[];
  /** Workspace-relative glob patterns to include. */
  include?: readonly string[];
  /** Workspace-relative glob patterns to exclude. */
  exclude?: readonly string[];
}

/**
 * Find stylesheet paths in workspace folders. Relative explicit paths resolve against each root.
 *
 * @param roots - Absolute workspace folder paths.
 * @param options - Explicit paths or discovery globs.
 * @returns Sorted, unique absolute file paths.
 */
export function discoverStylesheets(
  roots: readonly string[],
  options: WorkspaceDiscoveryOptions = {},
): string[] {
  const bases = roots.length ? roots : [process.cwd()];
  const explicit = options.css;
  if (explicit !== undefined) {
    return [...new Set(bases.flatMap((root) => explicit.map((p) => resolve(root, p))))].toSorted();
  }
  const include = options.include ?? ["**/*.css"];
  const exclude = options.exclude ?? ["**/node_modules/**"];
  const files = new Set<string>();
  for (const root of roots) {
    for (const path of globSync([...include], { cwd: root, exclude: [...exclude] })) {
      const file = isAbsolute(path) ? path : resolve(root, path);
      if (statSync(file).isFile()) files.add(file);
    }
  }
  return [...files].toSorted();
}
