/**
 * The JSON Schema for a `cssdoc.json` file — the single source of truth used to validate config files
 * via ajv. A byte-identical copy is shipped at the package root as `cssdoc.schema.json` for editor
 * `$schema` references.
 *
 * @module
 */

/** The JSON Schema (draft-07) describing a valid `cssdoc.json`. */
export const cssDocSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://cssdoc.dev/cssdoc.schema.json",
  title: "cssdoc.json",
  description: "Configuration for cssdoc: custom tags, lint rules, and markdown render options.",
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: { type: "string" },
    extends: {
      description:
        "Paths to other cssdoc.json files (or packages) to inherit tag definitions from.",
      type: "array",
      items: { type: "string" },
    },
    noStandardTags: {
      description: "Disable every built-in standard tag; only tagDefinitions remain supported.",
      type: "boolean",
    },
    tagDefinitions: {
      description: "Custom tags to register.",
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tagName", "syntaxKind"],
        properties: {
          tagName: {
            type: "string",
            pattern: "^@?[a-zA-Z][a-zA-Z0-9-]*$",
          },
          syntaxKind: {
            enum: ["record", "block", "modifier", "inline"],
          },
          allowMultiple: { type: "boolean" },
          recordKind: {
            enum: ["component", "utility", "rule", "declaration"],
          },
          aliasFor: { type: "string" },
        },
      },
    },
    supportForTags: {
      description: "Enable or disable specific tags by name.",
      type: "object",
      additionalProperties: { type: "boolean" },
    },
    modifierConvention: {
      description:
        "How modifier classes are spelled: a preset name (bem, rscss, bare) or a custom convention.",
      oneOf: [
        { enum: ["bem", "rscss", "bare"] },
        {
          type: "object",
          additionalProperties: false,
          required: ["structure", "separator"],
          properties: {
            structure: { enum: ["chained", "suffix", "attribute"] },
            separator: {
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
            },
            elementSeparator: {
              description: 'BEM-style element delimiter (e.g. "__"); matched classes become parts.',
              oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }],
            },
            statePrefixes: {
              description: 'Class prefixes that mark a state (e.g. ["is-","has-"]).',
              type: "array",
              items: { type: "string" },
            },
            statePseudoClasses: {
              description:
                'Native pseudo-classes (without the colon) recognized as states, e.g. ["disabled","checked"]. Overrides the built-in default set.',
              type: "array",
              items: { type: "string" },
            },
            pseudoElements: {
              description:
                'Native pseudo-elements (without the ::) to document, e.g. ["before","after"]. Overrides the built-in default set.',
              type: "array",
              items: { type: "string" },
            },
            propValue: { type: "boolean" },
            propValueSeparator: { type: "string" },
          },
        },
      ],
    },
    inlineComments: {
      description:
        "How a /* … */ comment on a member's rule combines with its tag prose: append (default), prepend, replace, or ignore.",
      enum: ["append", "prepend", "replace", "ignore"],
    },
    rules: {
      description: "Per-rule severity overrides (off/warn/error).",
      type: "object",
      additionalProperties: { enum: ["off", "warn", "error"] },
    },
    naming: {
      description:
        "Enforce a name case on class names: a preset (pascalCase, camelCase, lowercase) or a custom regex.",
      type: "object",
      additionalProperties: false,
      properties: {
        component: { type: "string" },
        part: { type: "string" },
      },
    },
    structureIgnore: {
      description:
        "Class names to exempt from the structure-unknown-selector rule — legitimately-external classes (utilities, cross-component refs) referenced in @structure. Literal names or simple globs where * matches any run of characters (e.g. util-*).",
      type: "array",
      items: { type: "string" },
    },
    render: {
      description:
        "Markdown render options for the CSS API pages (used by @cssdoc/markdown and @cssdoc/typedoc). Explicit emitter options still override these.",
      type: "object",
      additionalProperties: false,
      properties: {
        sectionOrder: {
          description:
            "Order (and inclusion) of the reorderable ## sections on a record page; omitted keys are dropped.",
          type: "array",
          items: {
            enum: [
              "demo",
              "examples",
              "usage",
              "modifiers",
              "parts",
              "shadowParts",
              "states",
              "slots",
              "structure",
              "cssProperties",
              "functions",
              "animations",
              "layers",
              "conditions",
              "tokensConsumed",
              "compat",
              "accessibility",
              "related",
              "see",
            ],
          },
        },
        headingPrefix: {
          description: 'Prefix for each record page title, e.g. "CSS:".',
          type: "string",
        },
        baseHref: {
          description: "Base href for @related cross-links and the sidebar/index links.",
          type: "string",
        },
        structureView: {
          description:
            'Which Structure representation(s) to emit: "text" tree, "diagram" flowchart, or "both" (default).',
          enum: ["text", "diagram", "both"],
        },
      },
    },
  },
} as const;
