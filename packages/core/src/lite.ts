/**
 * `@cssdoc/core/lite` — the parse-free surface of `@cssdoc/core`: the model, the doc-comment grammar,
 * the tag configuration, the modifier matcher, and helpers like {@link toJson} / {@link toMermaid} — but
 * NOT {@link parseCssDocs}, the one export that needs a CSS parser (postcss).
 *
 * Import from here to use cssdoc in a browser bundle without linking postcss. (The main `@cssdoc/core`
 * entry statically imports postcss for {@link parseCssDocs}, so importing from it can still bundle postcss
 * even when only parse-free names are used.) When you do need to parse CSS, use `@cssdoc/core`'s
 * {@link parseCssDocs}, or inject your own parser via `ParseOptions.parse` (e.g. `@cssdoc/dialects`'s
 * `resolveParser`).
 *
 * @module @cssdoc/core/lite
 */
export {
  parseDocComment,
  parseStructure,
  recordNameOf,
  RECORD_TAGS,
  stripCommentFraming,
} from "./grammar.ts";
export type { ParsedDoc, DocCssProperty, DocModifier, DocCondition } from "./grammar.ts";
export { CssDocConfiguration, CssDocTagDefinition } from "./configuration.ts";
export type { CssDocSyntaxKind, CssDocTagDefinitionOptions } from "./configuration.ts";
export {
  DEFAULT_MODIFIER_CONVENTION,
  DEFAULT_STATE_PSEUDO_CLASSES,
  MODIFIER_PRESETS,
  ModifierMatcher,
  resolveModifierConvention,
} from "./modifier.ts";
export type { ModifierConvention, ModifierConventionInput, ModifierHit } from "./modifier.ts";
export { toMermaid } from "./mermaid.ts";
export type {
  CssAnimation,
  CssCondition,
  CssDocEntry,
  CssFunction,
  CssLayer,
  CssModifier,
  CssParse,
  CssPart,
  CssPropertyDeclared,
  CssRecordKind,
  CssRelated,
  CssReleaseStage,
  CssSlot,
  CssSource,
  CssState,
  CssTokenConsumed,
  ParseOptions,
  StructureNode,
} from "./model.ts";

import type { CssDocEntry } from "./model.ts";

/**
 * Serialize a documentation model to pretty JSON (the raw, emitter-agnostic artifact — like TypeDoc's
 * `--json`).
 *
 * @param model - The entries from `parseCssDocs`.
 * @returns A JSON string.
 */
export function toJson(model: CssDocEntry[]): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}
