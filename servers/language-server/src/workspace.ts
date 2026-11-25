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

/** Settings received from an LSP client. */
export interface ClientSettings extends WorkspaceDiscoveryOptions {
  /** Component hover detail level. */
  hoverDetail?: "compact" | "full" | "custom";
  /** Per-section hover visibility. */
  hoverSections?: Record<string, "on" | "off" | "auto">;
  /** Order of hover sections. */
  hoverSectionOrder?: string[];
}

/**
 * Translate a client's `cssdoc` configuration section into server options.
 *
 * @param value - The configuration section returned by the client.
 * @returns Settings supplied by the client.
 * @throws If a supplied setting has an invalid shape.
 */
export function parseClientSettings(value: unknown): ClientSettings {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("cssdoc settings must be an object");
  }
  const config = value as Record<string, unknown>;
  const settings: ClientSettings = {};
  const strings = (input: unknown, name: string): string[] => {
    if (!Array.isArray(input) || !input.every((item) => typeof item === "string")) {
      throw new TypeError(`cssdoc.${name} must be an array of strings`);
    }
    return input;
  };
  if ("css" in config) {
    const paths = strings(config.css, "css");
    settings.css = paths.length ? paths : undefined;
  }
  if ("include" in config) settings.include = strings(config.include, "include");
  if ("exclude" in config) settings.exclude = strings(config.exclude, "exclude");
  if ("hover" in config) {
    if (!config.hover || typeof config.hover !== "object" || Array.isArray(config.hover)) {
      throw new TypeError("cssdoc.hover must be an object");
    }
    const hover = config.hover as Record<string, unknown>;
    if ("detail" in hover) {
      if (hover.detail !== "compact" && hover.detail !== "full" && hover.detail !== "custom") {
        throw new TypeError("cssdoc.hover.detail must be compact, full, or custom");
      }
      settings.hoverDetail = hover.detail;
    }
    if ("sectionOrder" in hover) {
      settings.hoverSectionOrder = strings(hover.sectionOrder, "hover.sectionOrder");
    }
    if ("sections" in hover) {
      if (!hover.sections || typeof hover.sections !== "object" || Array.isArray(hover.sections)) {
        throw new TypeError("cssdoc.hover.sections must be an object");
      }
      const sections: Record<string, "on" | "off" | "auto"> = {};
      for (const [key, mode] of Object.entries(hover.sections)) {
        if (mode !== "on" && mode !== "off" && mode !== "auto") {
          throw new TypeError(`cssdoc.hover.sections.${key} must be on, off, or auto`);
        }
        sections[key] = mode;
      }
      settings.hoverSections = sections;
    }
  }
  return settings;
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
