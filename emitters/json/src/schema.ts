/**
 * The JSON Schema (draft-07) describing the `@cssdoc/core` model — a `CssDocEntry[]`. Consumers of the
 * JSON output can validate or type against it. Kept in step with `@cssdoc/core`'s `model.ts` by hand.
 *
 * @module
 */

const named: {
  readonly type: "object";
  readonly required: ["name"];
  readonly additionalProperties: false;
  readonly properties: {
    readonly name: { readonly type: "string" };
    readonly description: { readonly type: "string" };
  };
} = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: { name: { type: "string" }, description: { type: "string" } },
} as const;

const state: {
  readonly type: "object";
  readonly required: ["name", "kind"];
  readonly additionalProperties: false;
  readonly properties: {
    readonly name: { readonly type: "string" };
    readonly kind: { readonly enum: ["custom", "pseudo-class", "class"] };
    readonly description: { readonly type: "string" };
  };
} = {
  type: "object",
  required: ["name", "kind"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    kind: { enum: ["custom", "pseudo-class", "class"] },
    description: { type: "string" },
  },
} as const;

const modifier: {
  readonly type: "object";
  readonly required: ["name", "prop"];
  readonly additionalProperties: false;
  readonly properties: {
    readonly name: { readonly type: "string" };
    readonly prop: { readonly type: "string" };
    readonly value: { readonly type: "string" };
    readonly pattern: { readonly type: "boolean" };
    readonly description: { readonly type: "string" };
    readonly deprecated: {
      readonly type: "object";
      readonly additionalProperties: false;
      readonly properties: {
        readonly canonical: { readonly type: "string" };
        readonly note: { readonly type: "string" };
      };
    };
    readonly alias: {
      readonly type: "object";
      readonly additionalProperties: false;
      readonly properties: {
        readonly canonical: { readonly type: "string" };
        readonly note: { readonly type: "string" };
      };
    };
  };
} = {
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
    alias: {
      type: "object",
      additionalProperties: false,
      properties: { canonical: { type: "string" }, note: { type: "string" } },
    },
  },
} as const;

const part: {
  readonly type: "object";
  readonly required: ["name"];
  readonly additionalProperties: false;
  readonly properties: {
    readonly name: { readonly type: "string" };
    readonly description: { readonly type: "string" };
    readonly modifiers: { readonly type: "array"; readonly items: typeof modifier };
  };
} = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    modifiers: { type: "array", items: modifier },
  },
} as const;

const elementProfile: {
  readonly type: "object";
  readonly required: ["any", "allowed", "include", "exclude", "groups", "excludedGroups"];
  readonly additionalProperties: false;
  readonly properties: {
    readonly any: { readonly type: "boolean" };
    readonly allowed: { readonly type: "array"; readonly items: { readonly type: "string" } };
    readonly include: { readonly type: "array"; readonly items: { readonly type: "string" } };
    readonly exclude: { readonly type: "array"; readonly items: { readonly type: "string" } };
    readonly groups: { readonly type: "array"; readonly items: { readonly type: "string" } };
    readonly excludedGroups: {
      readonly type: "array";
      readonly items: { readonly type: "string" };
    };
  };
} = {
  type: "object",
  required: ["any", "allowed", "include", "exclude", "groups", "excludedGroups"],
  additionalProperties: false,
  properties: {
    any: { type: "boolean" },
    allowed: { type: "array", items: { type: "string" } },
    include: { type: "array", items: { type: "string" } },
    exclude: { type: "array", items: { type: "string" } },
    groups: { type: "array", items: { type: "string" } },
    excludedGroups: { type: "array", items: { type: "string" } },
  },
} as const;

/** JSON Schema for a single {@link https://cssdoc.dev/reference/@cssdoc/core/interfaces/CssDocEntry | CssDocEntry}. */
export const cssDocEntrySchema: {
  /** JSON Schema type for a record. */
  readonly type: "object";
  /** Required model field names. */
  readonly required: readonly string[];
  /** Whether fields not listed in the schema are allowed. */
  readonly additionalProperties: false;
  /** Schemas keyed by model field name. */
  readonly properties: Record<string, any>;
} = {
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
    "todos",
    "cssPropertiesConsumed",
    "cssPropertiesDeclared",
    "functions",
    "animations",
    "layers",
    "conditions",
    "examples",
    "see",
    "annotations",
    "refs",
    "decorators",
    "compat",
    "related",
  ],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    kind: { enum: ["component", "utility", "declaration"] },
    className: { type: "string" },
    summary: { type: "string" },
    remarks: { type: "string" },
    privateRemarks: { type: "string" },
    releaseStage: { enum: ["alpha", "beta", "experimental", "stable"] },
    visibility: { enum: ["public", "internal"] },
    since: { type: "string" },
    group: { type: "string" },
    accessibility: { type: "string" },
    modifiers: { type: "array", items: modifier },
    parts: { type: "array", items: part },
    shadowParts: { type: "array", items: named },
    pseudoElements: { type: "array", items: named },
    states: { type: "array", items: state },
    slots: { type: "array", items: named },
    todos: { type: "array", items: { type: "string" } },
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
    prose: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tag", "header", "text", "mode", "span"],
        properties: {
          tag: { type: "string" },
          header: { type: "string" },
          text: { type: "string" },
          mode: { enum: ["plain", "markdown"] },
          remarkKind: { type: "string" },
          private: { type: "boolean" },
          exampleIndex: { type: "integer", minimum: 0 },
          span: {
            type: "object",
            additionalProperties: false,
            required: ["start", "end"],
            properties: {
              start: { type: "integer", minimum: 0 },
              end: { type: "integer", minimum: 0 },
            },
          },
        },
      },
    },
    exampleLabels: {
      type: "object",
      propertyNames: { pattern: "^(0|[1-9][0-9]*)$" },
      additionalProperties: {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
      },
    },
    privateExamples: {
      type: "array",
      uniqueItems: true,
      items: { type: "integer", minimum: 0 },
    },
    structure: { type: "array", items: { $ref: "#/$defs/StructureNode" } },
    structureVariants: { type: "array", items: { $ref: "#/$defs/StructureVariant" } },
    structureDescription: { type: "string" },
    demo: { type: "string" },
    deprecated: { type: "string" },
    see: { type: "array", items: { type: "string" } },
    usage: { type: "string" },
    annotations: {
      type: "array",
      items: {
        type: "object",
        required: ["ref", "text"],
        additionalProperties: false,
        properties: {
          ref: { type: "number" },
          text: { type: "string" },
        },
      },
    },
    refs: { type: "array", items: { type: "number" } },
    decorators: {
      type: "array",
      items: { enum: ["readonly", "preventExtensions", "sealed", "frozen"] },
    },
    compat: { type: "array", items: { type: "string" } },
    related: { type: "array", items: named },
    memberOf: {
      type: "object",
      required: ["component", "private"],
      additionalProperties: false,
      properties: {
        component: { type: "string" },
        private: { type: "boolean" },
      },
    },
    members: { type: "array", items: { type: "string" } },
    memberDeclarations: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "private"],
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          private: { type: "boolean" },
        },
      },
    },
    elements: {
      type: "object",
      required: ["default", "profiles"],
      additionalProperties: false,
      properties: {
        default: elementProfile,
        profiles: {
          type: "object",
          additionalProperties: elementProfile,
        },
      },
    },
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
export const cssDocSchema: {
  /** JSON Schema dialect URI. */
  readonly $schema: string;
  /** Canonical schema identifier. */
  readonly $id: string;
  /** Human-readable schema title. */
  readonly title: string;
  /** Human-readable description of the model. */
  readonly description: string;
  /** JSON Schema type for the model. */
  readonly type: "array";
  /** Schema for each model record. */
  readonly items: typeof cssDocEntrySchema;
  /** Reusable schema definitions. */
  readonly $defs: Record<string, any>;
} = {
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
        cardinality: {
          type: "string",
          pattern: "^(optional|many|one-or-more|max-\\d+|one-or-more-max-\\d+)$",
        },
        scope: { type: "string" },
        variants: { type: "array", items: { $ref: "#/$defs/StructureVariant" } },
        colocated: { type: "string" },
        description: { type: "string" },
        children: { type: "array", items: { $ref: "#/$defs/StructureNode" } },
      },
    },
    StructureVariant: {
      type: "object",
      required: ["nodes"],
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        nodes: { type: "array", items: { $ref: "#/$defs/StructureNode" } },
      },
    },
  },
} as const;
