/**
 * The JSON Schema (draft-07) describing the `@cssdoc/core` model — a `CssDocEntry[]`. Consumers of the
 * JSON output can validate or type against it. Kept in step with `@cssdoc/core`'s `model.ts` by hand.
 *
 * @module
 */

const named = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: { name: { type: "string" }, description: { type: "string" } },
} as const;

const state = {
  type: "object",
  required: ["name", "kind"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    kind: { enum: ["custom", "pseudo-class", "class"] },
    description: { type: "string" },
  },
} as const;

const modifier = {
  type: "object",
  required: ["name", "prop"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    prop: { type: "string" },
    value: { type: "string" },
    pattern: { type: "boolean" },
    description: { type: "string" },
    deprecated: {
      type: "object",
      additionalProperties: false,
      properties: { canonical: { type: "string" }, note: { type: "string" } },
    },
  },
} as const;

const part = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    modifiers: { type: "array", items: modifier },
  },
} as const;

/** JSON Schema for a single {@link @cssdoc/core!CssDocEntry | CssDocEntry}. */
export const cssDocEntrySchema = {
  type: "object",
  required: [
    "name",
    "kind",
    "className",
    "modifiers",
    "parts",
    "shadowParts",
    "pseudoElements",
    "states",
    "slots",
    "cssPropertiesConsumed",
    "cssPropertiesDeclared",
    "functions",
    "animations",
    "layers",
    "conditions",
    "examples",
    "see",
    "compat",
    "related",
  ],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    kind: { enum: ["component", "utility", "rule", "declaration"] },
    className: { type: "string" },
    summary: { type: "string" },
    remarks: { type: "string" },
    privateRemarks: { type: "string" },
    releaseStage: { enum: ["alpha", "beta", "experimental", "internal", "public"] },
    since: { type: "string" },
    group: { type: "string" },
    accessibility: { type: "string" },
    modifiers: { type: "array", items: modifier },
    parts: { type: "array", items: part },
    shadowParts: { type: "array", items: named },
    pseudoElements: { type: "array", items: named },
    states: { type: "array", items: state },
    slots: { type: "array", items: named },
    cssPropertiesConsumed: { type: "array", items: named },
    cssPropertiesDeclared: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          syntax: { type: "string" },
          inherits: { type: "boolean" },
          defaultValue: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    functions: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "parameters"],
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          parameters: { type: "array", items: { type: "string" } },
          result: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    animations: { type: "array", items: named },
    layers: { type: "array", items: named },
    conditions: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "query"],
        additionalProperties: false,
        properties: {
          type: { enum: ["container", "supports", "media"] },
          query: { type: "string" },
          containerName: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    examples: { type: "array", items: { type: "string" } },
    structure: { type: "array", items: { $ref: "#/$defs/StructureNode" } },
    structureDescription: { type: "string" },
    demo: { type: "string" },
    deprecated: { type: "string" },
    see: { type: "array", items: { type: "string" } },
    usage: { type: "string" },
    compat: { type: "array", items: { type: "string" } },
    related: { type: "array", items: named },
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        file: { type: "string" },
        line: { type: "number" },
        column: { type: "number" },
      },
    },
    customBlocks: {
      type: "object",
      additionalProperties: { type: "array", items: { type: "string" } },
    },
  },
} as const;

/** JSON Schema (draft-07) for the whole model: a `CssDocEntry[]`. */
export const cssDocSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://cssdoc.dev/model.schema.json",
  title: "cssdoc model",
  description: "The @cssdoc/core documentation model: one entry per documented CSS record.",
  type: "array",
  items: cssDocEntrySchema,
  $defs: {
    StructureNode: {
      type: "object",
      required: ["selector", "children"],
      additionalProperties: false,
      properties: {
        selector: { type: "string" },
        cardinality: { enum: ["optional", "many", "one-or-more"] },
        children: { type: "array", items: { $ref: "#/$defs/StructureNode" } },
      },
    },
  },
} as const;
