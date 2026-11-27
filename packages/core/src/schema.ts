/**
 * Runtime definitions of the documentation model. JSON Schema exports are generated from these
 * ArkType definitions; lightweight consumers use the static exports from `@cssdoc/core/lite`.
 *
 * @module
 */

import { CSSDOC_EXAMPLE_LABEL_SOURCE, DIGIT_SOURCE } from "@cssdoc/regex";
import { regex as arkRegex } from "arkregex";
import { ArkErrors, type JsonSchema, scope, type } from "arktype";

import type { CssDocEntry, StructureNode } from "./model.ts";

export { ArkErrors } from "arktype";

const EXAMPLE_INDEX = arkRegex.as(`^(?:0|[1-9]${DIGIT_SOURCE}*)$`);
const EXAMPLE_LABEL = arkRegex.as(`^(?:${CSSDOC_EXAMPLE_LABEL_SOURCE})$`);
const STORED_CARDINALITY = arkRegex.as(
  `^(?:optional|many|one-or-more|max-${DIGIT_SOURCE}+|one-or-more-max-${DIGIT_SOURCE}+)$`,
);

function uniqueItems(items: readonly unknown[]): boolean {
  return new Set(items).size === items.length;
}

function isCardinality(value: string): value is NonNullable<StructureNode["cardinality"]> {
  return STORED_CARDINALITY.test(value);
}

const model = scope(
  {
    FiniteNumber: type.number.narrow(Number.isFinite),
    NonnegativeInteger: "number.integer >= 0",
    ExampleIndex: type.string.matching(EXAMPLE_INDEX),
    ExampleLabels: {
      "+": "reject",
      "[ExampleIndex]": type.string
        .matching(EXAMPLE_LABEL)
        .array()
        .atLeastLength(1)
        .narrow(uniqueItems),
    },
    PrivateExamples: type("number.integer >= 0").array().narrow(uniqueItems),
    Cardinality: type.string.narrow(isCardinality),
    Named: { "+": "reject", name: "string", "description?": "string" },
    State: {
      "...": "Named",
      "+": "reject",
      kind: "'custom' | 'pseudo-class' | 'class' | 'attribute'",
      "selector?": "string",
    },
    ModifierLink: { "+": "reject", "canonical?": "string", "note?": "string" },
    ModifierEffect: {
      "+": "reject",
      component: "string",
      target: "string",
      "description?": "string",
    },
    Modifier: {
      "...": "Named",
      "+": "reject",
      prop: "string",
      "value?": "string",
      "pattern?": "boolean",
      "selector?": "string",
      "interaction?": "boolean",
      "global?": "boolean",
      "affects?": "ModifierEffect[]",
      "deprecated?": "ModifierLink",
      "alias?": "ModifierLink",
    },
    Part: { "...": "Named", "+": "reject", "selector?": "string", "modifiers?": "Modifier[]" },
    Property: {
      "...": "Named",
      "+": "reject",
      "syntax?": "string",
      "inherits?": "boolean",
      "defaultValue?": "string",
    },
    Function: { "...": "Named", "+": "reject", parameters: "string[]", "result?": "string" },
    Condition: {
      "+": "reject",
      type: "'container' | 'supports' | 'media'",
      query: "string",
      "containerName?": "string",
      "description?": "string",
    },
    ElementProfile: {
      "+": "reject",
      any: "boolean",
      allowed: "string[]",
      include: "string[]",
      exclude: "string[]",
      groups: "string[]",
      excludedGroups: "string[]",
    },
    Elements: {
      "+": "reject",
      default: "ElementProfile",
      profiles: { "[string]": "ElementProfile" },
    },
    StructureNode: {
      "+": "reject",
      selector: "string",
      children: "StructureNode[]",
      "cardinality?": "Cardinality",
      "scope?": "string",
      "variants?": "StructureVariant[]",
      "colocated?": "string",
      "description?": "string",
    },
    StructureVariant: { "+": "reject", "name?": "string", nodes: "StructureNode[]" },
    ProseSpan: { "+": "reject", start: "NonnegativeInteger", end: "NonnegativeInteger" },
    Prose: {
      "+": "reject",
      tag: "string",
      header: "string",
      text: "string",
      mode: "'plain' | 'markdown'",
      span: "ProseSpan",
      "remarkKind?": "string",
      "private?": "boolean",
      "field?": "'remarks' | 'usage'",
      "exampleIndex?": "NonnegativeInteger",
    },
    Annotation: {
      "+": "reject",
      ref: "FiniteNumber | string",
      text: "string",
      "private?": "boolean",
    },
    AnnotationReference: {
      "+": "reject",
      ref: "FiniteNumber | string",
      "text?": "string",
      "private?": "boolean",
      "attachment?": "'record' | 'css'",
    },
    MemberOf: { "+": "reject", component: "string", private: "boolean" },
    MemberDeclaration: { "+": "reject", name: "string", private: "boolean" },
    Source: {
      "+": "reject",
      "file?": "string",
      "line?": "FiniteNumber",
      "column?": "FiniteNumber",
    },
    CssDocEntry: {
      "+": "reject",
      name: "string",
      kind: "'component' | 'utility' | 'declaration'",
      className: "string",
      modifiers: "Modifier[]",
      parts: "Part[]",
      shadowParts: "Part[]",
      pseudoElements: "Named[]",
      states: "State[]",
      slots: "Named[]",
      todos: "string[]",
      cssPropertiesConsumed: "Named[]",
      cssPropertiesDeclared: "Property[]",
      functions: "Function[]",
      animations: "Named[]",
      layers: "Named[]",
      conditions: "Condition[]",
      examples: "string[]",
      see: "string[]",
      annotations: "Annotation[]",
      refs: "(FiniteNumber | string | AnnotationReference)[]",
      decorators: "('readonly' | 'preventExtensions' | 'sealed' | 'frozen')[]",
      compat: "string[]",
      related: "Named[]",
      "summary?": "string",
      "remarks?": "string",
      "privateRemarks?": "string",
      "releaseStage?": "'alpha' | 'beta' | 'experimental' | 'stable'",
      "visibility?": "'public' | 'internal'",
      "since?": "string",
      "group?": "string",
      "accessibility?": "string",
      "global?": "boolean",
      "prose?": "Prose[]",
      "exampleLabels?": "ExampleLabels",
      "privateExamples?": "PrivateExamples",
      "structure?": "StructureNode[]",
      "structureVariants?": "StructureVariant[]",
      "structureDescription?": "string",
      "demo?": "string",
      "deprecated?": "string",
      "usage?": "string",
      "memberOf?": "MemberOf",
      "members?": "string[]",
      "memberDeclarations?": "MemberDeclaration[]",
      "elements?": "Elements",
      "source?": "Source",
      "customBlocks?": { "[string]": "string[]" },
    },
    CssDocModel: "CssDocEntry[]",
  },
  {
    exactOptionalPropertyTypes: false,
    toJsonSchema: {
      target: "draft-07",
      fallback: {
        unit: (context) => {
          // undefined union branches accept no JSON values; optional omission remains valid.
          if (context.unit === undefined) return { not: {} };
          throw new TypeError("Cannot export a non-JSON model value");
        },
        predicate: (context) => {
          const { predicate, base } = context;
          if (predicate === uniqueItems && "type" in base && base.type === "array") {
            return { ...base, uniqueItems: true };
          }
          if (predicate === isCardinality && "type" in base && base.type === "string") {
            return { ...base, pattern: STORED_CARDINALITY.source };
          }
          // JSON numbers are finite; this predicate doesn't add a JSON Schema constraint.
          if (predicate === Number.isFinite && "type" in base && base.type === "number") {
            return base;
          }
          throw new TypeError("Cannot export an unrecognized model predicate to JSON Schema");
        },
      },
    },
  },
).export();

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T as Key extends number ? string : Key]: Mutable<T[Key]> }
    : T;
type RuntimeEntry = typeof model.CssDocEntry.infer;
type Equal<Left, Right> =
  // Fresh generic signatures distinguish exact types, including optional-field drift.
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;
type CheckedRuntimeEntry =
  Equal<Mutable<CssDocEntry>, RuntimeEntry> extends true ? RuntimeEntry : never;
const validateModel = model.CssDocModel;

/**
 * Validate a model without transforming it. Schema inference must stay compatible with the
 * documented model interfaces in both directions, including their optional field names.
 *
 * @param value - An untrusted model snapshot.
 * @returns Validated entries or errors with their model paths.
 */
export function validateCssDocModel(value: unknown): CssDocEntry[] | ArkErrors {
  const result = validateModel(value);
  if (result instanceof ArkErrors) return result;
  const entries: CheckedRuntimeEntry[] = result;
  return entries;
}

/**
 * Generate the interchange schemas using this scope's draft-07 export policy.
 *
 * @returns Schemas for a single record and the whole model.
 * @throws If an unsupported runtime constraint is added without a faithful JSON representation.
 */
export function createModelJsonSchemas(): { entry: JsonSchema; model: JsonSchema } {
  return {
    entry: model.CssDocEntry.toJsonSchema(),
    model: {
      ...model.CssDocModel.toJsonSchema(),
      title: "cssdoc model",
      description: "The @cssdoc/core documentation model: one entry per documented CSS record.",
    },
  };
}
