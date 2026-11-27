/**
 * Discover the stylesheets used to build workspace indexes.
 *
 * @module
 */
import { globSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import { HOVER_SECTION_KEYS, type HoverSectionOrder } from "@cssdoc/providers";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
  hoverSectionOrder?: HoverSectionOrder;
  /** Whether to discover nested configuration files with providers. */
  providerDiscovery?: boolean;
  /** Maximum directory depth for configuration discovery. */
  providerScanDepth?: number;
  /** Whether to expand provider path globs. */
  providerGlobs?: boolean;
  /** How to handle repeated provider paths. */
  circularReferenceMode?: "first" | "last" | "ignore" | "warn" | "error";
  /** Client-specific hover presentation, supplied at initialization. */
  hoverPresentation?: "vscode" | "markdown";
}

function strings(input: unknown, name: string): string[] {
  if (!Array.isArray(input) || !input.every((item) => typeof item === "string")) {
    throw new TypeError(`cssdoc.${name} must be an array of strings`);
  }
  return input;
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
  if (!isRecord(value)) {
    throw new TypeError("cssdoc settings must be an object");
  }
  const config = value;
  const settings: ClientSettings = {};
  if ("css" in config) {
    const paths = strings(config.css, "css");
    settings.css = paths.length > 0 ? paths : undefined;
  }
  if ("include" in config) settings.include = strings(config.include, "include");
  if ("exclude" in config) settings.exclude = strings(config.exclude, "exclude");
  if ("hover" in config) {
    if (!isRecord(config.hover)) {
      throw new TypeError("cssdoc.hover must be an object");
    }
    const { hover } = config;
    if ("detail" in hover) {
      if (hover.detail !== "compact" && hover.detail !== "full" && hover.detail !== "custom") {
        throw new TypeError("cssdoc.hover.detail must be compact, full, or custom");
      }
      settings.hoverDetail = hover.detail;
    }
    if ("sectionOrder" in hover) {
      settings.hoverSectionOrder = strings(hover.sectionOrder, "hover.sectionOrder").map((name) => {
        const key = HOVER_SECTION_KEYS.find((section) => section === name);
        if (key === undefined) {
          throw new TypeError(`cssdoc.hover.sectionOrder has unknown section: ${name}`);
        }
        return key;
      });
    }
    if ("sections" in hover) {
      if (!isRecord(hover.sections)) {
        throw new TypeError("cssdoc.hover.sections must be an object");
      }
      const sections: Record<string, "on" | "off" | "auto"> = {};
      const sectionValues = hover.sections;
      for (const [key, mode] of Object.entries(sectionValues)) {
        if (mode !== "on" && mode !== "off" && mode !== "auto") {
          throw new TypeError(`cssdoc.hover.sections.${key} must be on, off, or auto`);
        }
        sections[key] = mode;
      }
      settings.hoverSections = sections;
    }
  }
  if ("editor" in config) {
    if (!isRecord(config.editor)) {
      throw new TypeError("cssdoc.editor must be an object");
    }
    const { editor } = config;
    for (const key of ["providerDiscovery", "providerGlobs"] as const) {
      if (key in editor) {
        if (typeof editor[key] !== "boolean") {
          throw new TypeError(`cssdoc.editor.${key} must be a boolean`);
        }
        settings[key] = editor[key];
      }
    }
    if ("providerScanDepth" in editor) {
      const depth = editor.providerScanDepth;
      if (typeof depth !== "number" || !Number.isInteger(depth) || depth < 0) {
        throw new TypeError("cssdoc.editor.providerScanDepth must be a non-negative integer");
      }
      settings.providerScanDepth = depth;
    }
    if ("circularReferenceMode" in editor) {
      const mode = editor.circularReferenceMode;
      if (
        mode !== "first" &&
        mode !== "last" &&
        mode !== "ignore" &&
        mode !== "warn" &&
        mode !== "error"
      ) {
        throw new TypeError("cssdoc.editor.circularReferenceMode is invalid");
      }
      settings.circularReferenceMode = mode;
    }
  }
  return settings;
}

/**
 * Validate initialization options, retaining the explicit empty CSS list.
 *
 * @param value - Initialization options supplied by the client.
 * @returns Validated server options.
 * @throws If a supplied option has an invalid shape.
 */
export function parseInitializationOptions(value: unknown): ClientSettings {
  if (value === null || value === undefined) return {};
  if (!isRecord(value)) {
    throw new TypeError("cssdoc initialization options must be an object");
  }
  const options = value;
  if (
    "hoverPresentation" in options &&
    options.hoverPresentation !== "vscode" &&
    options.hoverPresentation !== "markdown"
  ) {
    throw new TypeError("cssdoc initialization hoverPresentation must be vscode or markdown");
  }
  const settings = parseClientSettings({
    ...("css" in options ? { css: options.css } : {}),
    ...("include" in options ? { include: options.include } : {}),
    ...("exclude" in options ? { exclude: options.exclude } : {}),
    hover: {
      ...("hoverDetail" in options ? { detail: options.hoverDetail } : {}),
      ...("hoverSections" in options ? { sections: options.hoverSections } : {}),
      ...("hoverSectionOrder" in options ? { sectionOrder: options.hoverSectionOrder } : {}),
    },
    editor: {
      ...("providerDiscovery" in options ? { providerDiscovery: options.providerDiscovery } : {}),
      ...("providerScanDepth" in options ? { providerScanDepth: options.providerScanDepth } : {}),
      ...("providerGlobs" in options ? { providerGlobs: options.providerGlobs } : {}),
      ...("circularReferenceMode" in options
        ? { circularReferenceMode: options.circularReferenceMode }
        : {}),
    },
  });
  if ("css" in options && settings.css === undefined) settings.css = [];
  if (options.hoverPresentation === "vscode" || options.hoverPresentation === "markdown") {
    settings.hoverPresentation = options.hoverPresentation;
  }
  return settings;
}

/**
 * Find configuration directories up to a workspace-relative depth.
 *
 * @param root - The absolute workspace folder path.
 * @param depth - Maximum directory depth below the root.
 * @returns Sorted, unique directories containing a cssdoc configuration.
 */
export function discoverConfigDirectories(root: string, depth: number): string[] {
  const found = new Set<string>();
  const pending = [{ dir: root, level: 0 }];
  const excluded = new Set(["node_modules", "dist", "build"]);
  while (pending.length > 0) {
    const { dir, level } = pending.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "cssdoc.json" || entry.name === "cssdoc.jsonc") found.add(dir);
      if (
        level < depth &&
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !excluded.has(entry.name)
      ) {
        pending.push({ dir: join(dir, entry.name), level: level + 1 });
      }
    }
  }
  return [...found].toSorted();
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
  const bases = roots.length > 0 ? roots : [process.cwd()];
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
