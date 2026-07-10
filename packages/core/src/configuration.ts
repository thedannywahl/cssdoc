/**
 * The tag-definition registry — cssdoc's analog to `@microsoft/tsdoc`'s `TSDocConfiguration` /
 * `TSDocTagDefinition`. It names the vocabulary a parse understands: the built-in **standard** tags
 * (seeded automatically) plus any **custom** tags registered on top (typically loaded from a
 * `cssdoc.json` by `@cssdoc/config`). The parser consults the configuration to decide which record
 * tags open a boundary, which standard tags are active, and which unknown tags to capture as custom
 * blocks rather than ignore.
 *
 * The vocabulary is expansive and modeled on TSDoc's kind taxonomy — `record` / `block` / `modifier` /
 * `inline` — and covers the modern CSSOM surface. See `grammar/CssDoc.grammarkdown` for the formal
 * shape of each tag.
 *
 * @module
 */
import { CSSDOC_TAGS, CSSDOC_TAG_NAMES } from "@cssdoc/spec";
import type { CssRecordKind } from "./model.ts";
import {
  DEFAULT_MODIFIER_CONVENTION,
  resolveModifierConvention,
  type ModifierConvention,
  type ModifierConventionInput,
} from "./modifier.ts";

/**
 * The syntactic kind of a tag, mirroring TSDoc's Block/Modifier/Inline split, plus cssdoc's own
 * `record` kind for the tags that open a documentation record (`@component`, `@utility`, …).
 */
export type CssDocSyntaxKind = "record" | "block" | "modifier" | "inline";

/** Options for constructing a {@link CssDocTagDefinition}. */
export interface CssDocTagDefinitionOptions {
  /** The tag name, with or without a leading `@` (e.g. `@modifier` or `modifier`). */
  tagName: string;
  /** The tag's syntactic kind. */
  syntaxKind: CssDocSyntaxKind;
  /** Whether the tag may appear more than once in a comment (defaults to `false`). */
  allowMultiple?: boolean;
  /** For `record` tags, the {@link CssRecordKind} the tag selects. */
  recordKind?: CssRecordKind;
  /** The canonical tag (without `@`) this tag is an alias of, e.g. `@csspart` aliases `part`. */
  aliasFor?: string;
}

const TAG_NAME_RE = /^@?[a-zA-Z][a-zA-Z0-9-]*$/u;

/** One tag in the vocabulary: its name, kind, and how it may be used. */
export class CssDocTagDefinition {
  /** The normalized tag name, always with a leading `@` (e.g. `@modifier`). */
  readonly tagName: string;
  /** The tag name without its leading `@` (e.g. `modifier`). */
  readonly tagNameWithoutAt: string;
  readonly syntaxKind: CssDocSyntaxKind;
  readonly allowMultiple: boolean;
  readonly recordKind?: CssRecordKind;
  /** The canonical tag name (without `@`) this aliases, if any; otherwise its own name. */
  readonly aliasFor?: string;

  constructor(options: CssDocTagDefinitionOptions) {
    const raw = options.tagName.trim();
    if (!TAG_NAME_RE.test(raw)) {
      throw new Error(`Invalid CSS-doc tag name: ${JSON.stringify(options.tagName)}`);
    }
    this.tagNameWithoutAt = raw.replace(/^@/u, "");
    this.tagName = `@${this.tagNameWithoutAt}`;
    this.syntaxKind = options.syntaxKind;
    this.allowMultiple = options.allowMultiple ?? false;
    this.recordKind = options.recordKind;
    this.aliasFor = options.aliasFor;
  }

  /** The tag this definition resolves to when handled — its alias target, or itself. */
  get canonicalName(): string {
    return this.aliasFor ?? this.tagNameWithoutAt;
  }
}

function def(options: CssDocTagDefinitionOptions): CssDocTagDefinition {
  return new CssDocTagDefinition(options);
}

/**
 * A parse configuration: the set of tag definitions plus which are supported. Construct one to get the
 * full standard vocabulary, then add custom tags or disable standard ones.
 *
 * @example
 * ```ts
 * import { CssDocConfiguration, CssDocTagDefinition, parseCssDocs } from "@cssdoc/core";
 *
 * const config = new CssDocConfiguration();
 * config.addTagDefinition(new CssDocTagDefinition({ tagName: "@token", syntaxKind: "block" }), true);
 * const model = parseCssDocs(css, { configuration: config });
 * ```
 */
export class CssDocConfiguration {
  private readonly _tagDefinitions: CssDocTagDefinition[] = [];
  private readonly _byName = new Map<string, CssDocTagDefinition>();
  private readonly _supported = new Set<CssDocTagDefinition>();
  private _modifierConvention: ModifierConvention = DEFAULT_MODIFIER_CONVENTION;

  constructor() {
    this.addTagDefinitions(CssDocConfiguration.standardTags(), true);
  }

  /** The resolved modifier convention this configuration parses with (defaults to BEM). */
  get modifierConvention(): ModifierConvention {
    return this._modifierConvention;
  }

  /** Set the modifier convention from a preset name or a custom {@link ModifierConvention}. */
  setModifierConvention(input: ModifierConventionInput): void {
    this._modifierConvention = resolveModifierConvention(input);
  }

  /** Every registered tag definition, in registration order. */
  get tagDefinitions(): readonly CssDocTagDefinition[] {
    return this._tagDefinitions;
  }

  /** Only the tag definitions that are currently supported. */
  get supportedTagDefinitions(): readonly CssDocTagDefinition[] {
    return this._tagDefinitions.filter((d) => this._supported.has(d));
  }

  /**
   * Register a tag definition. Re-registering a tag name replaces the earlier definition.
   *
   * @param definition - The tag to add.
   * @param supported - Whether it is supported (defaults to `true`).
   */
  addTagDefinition(definition: CssDocTagDefinition, supported = true): void {
    const existing = this._byName.get(definition.tagNameWithoutAt);
    if (existing) {
      this._tagDefinitions.splice(this._tagDefinitions.indexOf(existing), 1);
      this._supported.delete(existing);
    }
    this._tagDefinitions.push(definition);
    this._byName.set(definition.tagNameWithoutAt, definition);
    if (supported) this._supported.add(definition);
  }

  /** Register several tag definitions. */
  addTagDefinitions(definitions: readonly CssDocTagDefinition[], supported = true): void {
    for (const definition of definitions) this.addTagDefinition(definition, supported);
  }

  /** Look up a tag definition by name (with or without a leading `@`). */
  tryGetTagDefinition(tagName: string): CssDocTagDefinition | undefined {
    return this._byName.get(tagName.replace(/^@/u, ""));
  }

  /** Whether a tag definition is supported. */
  isTagSupported(definition: CssDocTagDefinition): boolean {
    return this._supported.has(definition);
  }

  /** Enable or disable support for a tag. */
  setSupportForTag(definition: CssDocTagDefinition, supported: boolean): void {
    if (supported) this._supported.add(definition);
    else this._supported.delete(definition);
  }

  /** Enable or disable support for several tags. */
  setSupportForTags(definitions: readonly CssDocTagDefinition[], supported: boolean): void {
    for (const definition of definitions) this.setSupportForTag(definition, supported);
  }

  /** Disable support for every standard tag (custom tags added later remain supported). */
  setNoStandardTags(): void {
    this.setSupportForTags(
      CssDocConfiguration.standardTagNames.map((n) => this._byName.get(n)!),
      false,
    );
  }

  /** The names (without `@`) of every standard tag — the canonical vocabulary from `@cssdoc/spec`. */
  static readonly standardTagNames: readonly string[] = CSSDOC_TAG_NAMES;

  /** A fresh set of the standard tag definitions (new instances on each call), built from the spec. */
  static standardTags(): CssDocTagDefinition[] {
    return CSSDOC_TAGS.map((tag) =>
      def({
        tagName: tag.name,
        syntaxKind: tag.kind,
        ...(tag.recordKind ? { recordKind: tag.recordKind } : {}),
        ...(tag.aliasFor ? { aliasFor: tag.aliasFor } : {}),
        ...(tag.allowMultiple ? { allowMultiple: true } : {}),
      }),
    );
  }
}
