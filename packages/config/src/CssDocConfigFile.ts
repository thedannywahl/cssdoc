/**
 * Load a `cssdoc.json` file into an `@cssdoc/core` {@link CssDocConfiguration} — cssdoc's analog to
 * `@microsoft/tsdoc-config`'s `TSDocConfigFile`. It reads the file, validates it against the JSON
 * schema (via ajv), resolves `extends` chains, and applies the result onto a configuration through
 * {@link CssDocConfigFile.configureParser}. Errors are collected on the instance rather than thrown, so
 * a malformed config degrades gracefully.
 *
 * @module
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, parse as parsePath, resolve } from "node:path";
import { Ajv } from "ajv";
import { type ParseError, parse as parseJsonc, printParseErrorCode } from "jsonc-parser";
import { CssDocConfiguration, CssDocTagDefinition } from "@cssdoc/core";
import type {
  CssDocSyntaxKind,
  CssRecordKind,
  InlineCommentMode,
  ModifierConventionInput,
} from "@cssdoc/core";
import { cssDocSchema } from "./schema.ts";

/** A per-rule severity override, as spelled in `cssdoc.json`. */
export type RuleSeverityOverride = "off" | "warn" | "error";

/** The `naming` block: a name case (preset or custom regex) per class kind, as spelled in `cssdoc.json`. */
export interface NamingOverride {
  component?: string;
  part?: string;
}

/**
 * The `render` block: markdown render options for the CSS API pages, as spelled in `cssdoc.json`.
 * `sectionOrder` items are the emitter's section keys (typed loosely here to keep `@cssdoc/config`
 * independent of `@cssdoc/markdown`; the emitter validates/uses them).
 */
export interface RenderConfig {
  sectionOrder?: readonly string[];
  headingPrefix?: string;
  baseHref?: string;
  /** Which Structure representation(s) to emit: `"text"`, `"diagram"`, or `"both"` (default). */
  structureView?: "text" | "diagram" | "both";
  /**
   * Explicit sidebar/index group order for the CSS API pages. Listed group labels come first, in this
   * order; unlisted groups follow the default order (record kinds, then custom `@group` groups). The
   * emitter validates/uses these.
   */
  groups?: readonly string[];
}

/**
 * An upstream cssdoc provider this config consumes. `path` points at the provider's published model
 * (`model.json`, the JSON emitter's output) or a source stylesheet (`.css`/`.scss`/…) — resolved
 * relative to this file for `.`-paths, else via Node resolution (so a package specifier works).
 * `baseHref` prefixes links to the provider's rendered doc pages (`<baseHref><name>.md`).
 */
export interface ProviderRef {
  path: string;
  baseHref?: string;
}

interface RawTagDefinition {
  tagName: string;
  syntaxKind: CssDocSyntaxKind;
  allowMultiple?: boolean;
  recordKind?: CssRecordKind;
  aliasFor?: string;
}

interface RawConfig {
  $schema?: string;
  extends?: string[];
  noStandardTags?: boolean;
  tagDefinitions?: RawTagDefinition[];
  supportForTags?: Record<string, boolean>;
  modifierConvention?: ModifierConventionInput;
  inlineComments?: InlineCommentMode;
  providers?: ProviderRef[];
  rules?: Record<string, RuleSeverityOverride>;
  naming?: NamingOverride;
  structureIgnore?: string[];
  render?: RenderConfig;
}

const ajv = new Ajv({ allErrors: true });
const validateSchema = ajv.compile<RawConfig>(cssDocSchema);

/**
 * The conventional file names loaders look for, in preference order. Both are parsed the same way
 * (JSON with comments); `.jsonc` just makes the comments explicit.
 */
export const CSSDOC_CONFIG_FILENAMES = ["cssdoc.json", "cssdoc.jsonc"] as const;

/** The primary config file name (`cssdoc.json`). See {@link CSSDOC_CONFIG_FILENAMES} for all names. */
export const CSSDOC_CONFIG_FILENAME = CSSDOC_CONFIG_FILENAMES[0];

interface ConfigFileInit {
  filePath: string;
  fileNotFound: boolean;
  messages: string[];
  noStandardTags: boolean;
  tagDefinitions: CssDocTagDefinition[];
  supportForTags: Map<string, boolean>;
  extendsFiles: CssDocConfigFile[];
  modifierConvention?: ModifierConventionInput;
  inlineComments?: InlineCommentMode;
  providers: ProviderRef[];
  rules: Record<string, RuleSeverityOverride>;
  naming: NamingOverride;
  structureIgnore: string[];
  render: RenderConfig;
}

/** A loaded `cssdoc.json` (plus the files it `extends`), ready to configure a parser. */
export class CssDocConfigFile {
  /** The absolute path the file was loaded from (or would be, when not found). */
  readonly filePath: string;
  /** Whether the file was absent. */
  readonly fileNotFound: boolean;
  /** Parse/validation/resolution messages collected while loading (this file only). */
  readonly messages: readonly string[];
  /** Whether the file disables the standard tags. */
  readonly noStandardTags: boolean;
  /** The custom tag definitions declared by this file. */
  readonly tagDefinitions: readonly CssDocTagDefinition[];
  /** Per-tag support overrides declared by this file. */
  readonly supportForTags: ReadonlyMap<string, boolean>;
  /** The resolved files this one `extends`, in declaration order. */
  readonly extendsFiles: readonly CssDocConfigFile[];
  /** The modifier convention declared by this file, if any. */
  readonly modifierConvention?: ModifierConventionInput;
  /** How inline `/* … *\/` comments combine with tag prose, if declared by this file. */
  readonly inlineComments?: InlineCommentMode;
  /**
   * Upstream cssdoc providers this file consumes (this file's own — NOT inherited via `extends`, which
   * carries configuration, not components). Resolve with {@link resolveProviders}.
   */
  readonly providers: readonly ProviderRef[];
  /**
   * The per-rule severity overrides, merged across the `extends` chain (this file wins). Not the
   * resolved severities — pass these to `resolveRuleSeverities` in `@cssdoc/providers`.
   */
  readonly ruleSeverities: Readonly<Record<string, RuleSeverityOverride>>;
  /**
   * The name-case conventions, merged across the `extends` chain (this file wins). Pass to
   * `resolveNaming` in `@cssdoc/providers`.
   */
  readonly naming: Readonly<NamingOverride>;
  /**
   * Class names exempt from the `structure-unknown-selector` rule, merged (union) across the `extends`
   * chain. Pass to `lintModel` in `@cssdoc/providers`.
   */
  readonly structureIgnore: readonly string[];
  /**
   * Markdown render options (`sectionOrder`/`headingPrefix`/`baseHref`), merged across the `extends`
   * chain (this file wins). The emitter (`@cssdoc/markdown`/`@cssdoc/typedoc`) reads these as defaults;
   * explicit emitter options still override. Not part of the parser `CssDocConfiguration`.
   */
  readonly render: Readonly<RenderConfig>;

  private constructor(init: ConfigFileInit) {
    this.filePath = init.filePath;
    this.fileNotFound = init.fileNotFound;
    this.messages = init.messages;
    this.noStandardTags = init.noStandardTags;
    this.tagDefinitions = init.tagDefinitions;
    this.supportForTags = init.supportForTags;
    this.extendsFiles = init.extendsFiles;
    this.modifierConvention = init.modifierConvention;
    this.inlineComments = init.inlineComments;
    this.providers = init.providers;
    const severities: Record<string, RuleSeverityOverride> = {};
    const naming: NamingOverride = {};
    const render: RenderConfig = {};
    const structureIgnore = new Set<string>();
    for (const extended of init.extendsFiles) {
      Object.assign(severities, extended.ruleSeverities);
      Object.assign(naming, extended.naming);
      Object.assign(render, extended.render);
      for (const g of extended.structureIgnore) structureIgnore.add(g);
    }
    Object.assign(severities, init.rules);
    Object.assign(naming, init.naming);
    Object.assign(render, init.render);
    for (const g of init.structureIgnore) structureIgnore.add(g);
    this.ruleSeverities = severities;
    this.naming = naming;
    this.render = render;
    this.structureIgnore = [...structureIgnore];
  }

  /** Whether this file — or any file it extends — reported an error. */
  get hasErrors(): boolean {
    return this.messages.length > 0 || this.extendsFiles.some((f) => f.hasErrors);
  }

  /** A newline-joined summary of every message from this file and its `extends` chain. */
  getErrorSummary(): string {
    return [
      ...this.messages.map((m) => `${this.filePath}: ${m}`),
      ...this.extendsFiles.map((f) => f.getErrorSummary()),
    ]
      .filter(Boolean)
      .join("\n");
  }

  /**
   * Apply this file (and its `extends` chain) onto a {@link CssDocConfiguration}. Extended files are
   * applied first so this file's settings win.
   *
   * @param configuration - The configuration to mutate.
   */
  configureParser(configuration: CssDocConfiguration): void {
    for (const extended of this.extendsFiles) extended.configureParser(configuration);
    if (this.noStandardTags) configuration.setNoStandardTags();
    configuration.addTagDefinitions(this.tagDefinitions, true);
    for (const [tagName, supported] of this.supportForTags) {
      const definition = configuration.tryGetTagDefinition(tagName);
      if (definition) configuration.setSupportForTag(definition, supported);
    }
    // Extended files applied their convention first; this file's (if any) wins.
    if (this.modifierConvention !== undefined) {
      configuration.setModifierConvention(this.modifierConvention);
    }
    if (this.inlineComments !== undefined) {
      configuration.setInlineComments(this.inlineComments);
    }
  }

  /**
   * Build a {@link CssDocConfiguration} from this file. Convenience for the common case.
   *
   * @returns A fresh configuration with this file applied.
   */
  toConfiguration(): CssDocConfiguration {
    const configuration = new CssDocConfiguration();
    this.configureParser(configuration);
    return configuration;
  }

  /**
   * Load a `cssdoc.json` from an exact path. Missing files yield a `fileNotFound` instance (not an
   * error); malformed ones collect messages.
   *
   * @param filePath - The config file path (resolved to absolute).
   * @returns The loaded config file.
   */
  static loadFile(filePath: string): CssDocConfigFile {
    return CssDocConfigFile._loadFile(resolve(filePath), new Set());
  }

  /**
   * Find and load the nearest `cssdoc.json`, walking upward from `folderPath` to the filesystem root.
   *
   * @param folderPath - The folder to start from.
   * @returns The nearest config file, or a `fileNotFound` instance rooted at `folderPath`.
   */
  static loadForFolder(folderPath: string): CssDocConfigFile {
    let current = resolve(folderPath);
    const root = parsePath(current).root;
    for (;;) {
      for (const name of CSSDOC_CONFIG_FILENAMES) {
        const candidate = resolve(current, name);
        if (existsSync(candidate)) return CssDocConfigFile._loadFile(candidate, new Set());
      }
      if (current === root) break;
      current = dirname(current);
    }
    return new CssDocConfigFile({
      filePath: resolve(folderPath, CSSDOC_CONFIG_FILENAME),
      fileNotFound: true,
      messages: [],
      noStandardTags: false,
      tagDefinitions: [],
      supportForTags: new Map(),
      extendsFiles: [],
      providers: [],
      rules: {},
      naming: {},
      structureIgnore: [],
      render: {},
    });
  }

  private static _loadFile(filePath: string, visited: Set<string>): CssDocConfigFile {
    const messages: string[] = [];
    const empty = (fileNotFound: boolean): CssDocConfigFile =>
      new CssDocConfigFile({
        filePath,
        fileNotFound,
        messages,
        noStandardTags: false,
        tagDefinitions: [],
        supportForTags: new Map(),
        extendsFiles: [],
        providers: [],
        rules: {},
        naming: {},
        structureIgnore: [],
        render: {},
      });

    if (visited.has(filePath)) {
      messages.push("Circular extends reference; skipped.");
      return empty(false);
    }
    visited.add(filePath);

    if (!existsSync(filePath)) return empty(true);

    // Parse as JSON-with-comments (a superset of JSON), so both cssdoc.json and cssdoc.jsonc accept
    // comments and trailing commas. Syntax errors are collected, not thrown.
    const parseErrors: ParseError[] = [];
    const raw = parseJsonc(readFileSync(filePath, "utf8"), parseErrors, {
      allowTrailingComma: true,
    }) as RawConfig | undefined;
    if (parseErrors.length > 0 || raw === undefined) {
      for (const err of parseErrors) {
        messages.push(`Invalid JSON at offset ${err.offset}: ${printParseErrorCode(err.error)}`);
      }
      if (parseErrors.length === 0) messages.push("Invalid JSON: empty or unparseable config.");
      return empty(false);
    }

    if (!validateSchema(raw)) {
      for (const err of validateSchema.errors ?? []) {
        messages.push(`Schema error at ${err.instancePath || "/"}: ${err.message ?? "invalid"}`);
      }
      return empty(false);
    }

    // Resolve extends relative to this file (local paths start with `.`; else Node resolution).
    const requireFrom = createRequire(filePath);
    const extendsFiles: CssDocConfigFile[] = [];
    for (const ref of raw.extends ?? []) {
      let resolved: string;
      try {
        resolved = ref.startsWith(".") ? resolve(dirname(filePath), ref) : requireFrom.resolve(ref);
      } catch (error) {
        messages.push(`Cannot resolve extends "${ref}": ${(error as Error).message}`);
        continue;
      }
      extendsFiles.push(CssDocConfigFile._loadFile(resolved, visited));
    }

    const tagDefinitions: CssDocTagDefinition[] = [];
    for (const raw_ of raw.tagDefinitions ?? []) {
      try {
        tagDefinitions.push(new CssDocTagDefinition(raw_));
      } catch (error) {
        messages.push((error as Error).message);
      }
    }

    return new CssDocConfigFile({
      filePath,
      fileNotFound: false,
      messages,
      noStandardTags: raw.noStandardTags ?? false,
      tagDefinitions,
      supportForTags: new Map(Object.entries(raw.supportForTags ?? {})),
      extendsFiles,
      modifierConvention: raw.modifierConvention,
      inlineComments: raw.inlineComments,
      providers: raw.providers ?? [],
      rules: raw.rules ?? {},
      naming: raw.naming ?? {},
      structureIgnore: raw.structureIgnore ?? [],
      render: raw.render ?? {},
    });
  }
}
