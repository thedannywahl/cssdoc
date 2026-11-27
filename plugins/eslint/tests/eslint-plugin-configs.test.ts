/**
 * Tests for @eslint/css 2.0:
 * - Preset configurations (recommended, strict, relaxed, classUsage, full)
 * - New cssdoc-specific rules (require-component-docs, valid-custom-properties)
 * - Configuration structure and plugin interface
 */
import { expect, test, vi } from "vite-plus/test";

import plugin from "../src/index.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError("Expected a configuration object");
  }
  return value;
}

// ── Preset Configuration Tests ──────────────────────────────────────────────────────────────────

test("plugin.configs.recommended is an array", () => {
  expect(Array.isArray(plugin.configs.recommended)).toBe(true);
});

test("plugin.configs.strict is an array", () => {
  expect(Array.isArray(plugin.configs.strict)).toBe(true);
});

test("plugin.configs.relaxed is an array", () => {
  expect(Array.isArray(plugin.configs.relaxed)).toBe(true);
});

test("plugin.configs.classUsage is a function", () => {
  expect(plugin.configs.classUsage).toBeTypeOf("function");
});

test("plugin.configs.classUsage() returns an array", () => {
  const result = plugin.configs.classUsage();
  expect(Array.isArray(result)).toBe(true);
});

test("plugin.configs.full is a function", () => {
  expect(plugin.configs.full).toBeTypeOf("function");
});

test("plugin.configs.full() returns an array", () => {
  const result = plugin.configs.full();
  expect(Array.isArray(result)).toBe(true);
});

test("plugin.configs.recommended includes cssdoc plugin", () => {
  const config = record(plugin.configs.recommended[0]);
  expect(config.files).toEqual(["**/*.css"]);
  expect(config.language).toBe("css/css");
});

test("plugin.configs.recommended includes valid-doc-comments rule", () => {
  const rules = record(plugin.configs.recommended[0].rules);
  expect(rules["cssdoc/valid-doc-comments"]).toBe("warn");
});

test("plugin.configs.strict includes error-level doc-comment rule", () => {
  const rules = record(plugin.configs.strict[0].rules);
  expect(rules["cssdoc/valid-doc-comments"]).toBeDefined();
  const ruleConfig: unknown = Array.isArray(rules["cssdoc/valid-doc-comments"])
    ? rules["cssdoc/valid-doc-comments"][0]
    : rules["cssdoc/valid-doc-comments"];
  expect(ruleConfig).toBe("error");
});

test("plugin.configs.strict includes error-level options with strict rule enforcement", () => {
  const rules = record(plugin.configs.strict[0].rules);
  const ruleConfig: unknown = Array.isArray(rules["cssdoc/valid-doc-comments"])
    ? rules["cssdoc/valid-doc-comments"][1]
    : null;
  expect(ruleConfig).toBeDefined();
  const options = record(record(ruleConfig).rules);
  expect(options["unknown-modifier"]).toBe("error");
  expect(options["unknown-part"]).toBe("error");
});

test("plugin.configs.relaxed includes warn-level with relaxed options", () => {
  const rules = record(plugin.configs.relaxed[0].rules);
  expect(rules["cssdoc/valid-doc-comments"]).toBeDefined();
  const ruleConfig: unknown = Array.isArray(rules["cssdoc/valid-doc-comments"])
    ? rules["cssdoc/valid-doc-comments"][1]
    : null;
  expect(ruleConfig).toBeDefined();
  const options = record(record(ruleConfig).rules);
  expect(options["unknown-modifier"]).toBe("off");
  expect(options["unknown-part"]).toBe("off");
  expect(options["unknown-pseudo"]).toBe("off");
});

test("plugin.configs.classUsage() returns config for JS and HTML files", () => {
  const result = plugin.configs.classUsage();
  expect(result).toHaveLength(2);
  expect(result[0].files).toContain("**/*.{js,jsx,ts,tsx}");
  expect(result[1].files).toContain("**/*.html");
});

test("plugin.configs.classUsage() with options passes css option to rules", () => {
  const result = plugin.configs.classUsage({ css: ["dist/components.css"] });
  const rules = record(result[0].rules);
  const classUsageRule = rules["cssdoc/valid-class-usage"];
  expect(Array.isArray(classUsageRule)).toBe(true);
  if (!Array.isArray(classUsageRule)) throw new TypeError("Expected rule options");
  const ruleConfig = record(classUsageRule[1]);
  expect(ruleConfig.css).toEqual(["dist/components.css"]);
});

test("plugin.configs.full() combines recommended and classUsage", () => {
  const result = plugin.configs.full({ css: ["dist/components.css"] });
  // Should have recommended config + classUsage configs (3 total: 1 from recommended + 2 from classUsage)
  expect(result).toHaveLength(3);
});

test("plugin.configs.full() without options returns recommended + classUsage", () => {
  const result = plugin.configs.full();
  expect(result).toHaveLength(3);
});

// ── require-component-docs ────────────────────────────────────────────────────────────

test("require-component-docs rule is registered in plugin", () => {
  expect(plugin.rules["require-component-docs"]).toBeDefined();
});

test("require-component-docs has proper meta structure", () => {
  const rule = plugin.rules["require-component-docs"];
  expect(rule.meta.type).toBe("suggestion");
  expect(rule.meta.docs.description).toBe(
    "Require @component documentation for component-like selectors.",
  );
  expect(rule.meta.schema).toBeDefined();
  expect(Array.isArray(rule.meta.schema)).toBe(true);
});

test("require-component-docs schema has proper structure", () => {
  const rule = plugin.rules["require-component-docs"];
  const schema = record(rule.meta.schema[0]);
  expect(schema.type).toBe("object");
  expect(schema.additionalProperties).toBe(false);
});

test("require-component-docs schema has pattern property", () => {
  const rule = plugin.rules["require-component-docs"];
  const properties = record(record(rule.meta.schema[0]).properties);
  expect(properties.pattern).toBeDefined();
  const patternProp = record(properties.pattern);
  expect(patternProp.type).toBe("string");
  expect(patternProp.description).toContain("RegExp pattern");
});

test("require-component-docs schema has skipUtilities property", () => {
  const rule = plugin.rules["require-component-docs"];
  const properties = record(record(rule.meta.schema[0]).properties);
  expect(properties.skipUtilities).toBeDefined();
  const skipUtilProp = record(properties.skipUtilities);
  expect(skipUtilProp.type).toBe("boolean");
  expect(skipUtilProp.description).toContain("@utility");
});

test("require-component-docs create function returns object with Rule visitor", () => {
  const rule = plugin.rules["require-component-docs"];
  const mockContext = {
    options: [],
    sourceCode: { text: "", getLocFromIndex: () => ({ line: 1, column: 0 }) },
    report: vi.fn<() => void>(),
  };
  const visitors = rule.create(mockContext);
  expect(visitors).toBeTypeOf("object");
  expect(visitors.Rule).toBeTypeOf("function");
});

test("require-component-docs matches configured component names before selector suffixes", () => {
  const messages: string[] = [];
  const visitors = plugin.rules["require-component-docs"].create({
    options: [{ pattern: "^Button$" }],
    sourceCode: { text: "", getLocFromIndex: () => ({ line: 1, column: 0 }) },
    report: ({ message }: { message: string }) => messages.push(message),
  });
  for (const selector of [".ButtonPrimary", ".Button:hover", ".Button-secondary", ".card"]) {
    const node = { type: "Rule", selector: { value: selector } };
    visitors.Rule(node);
  }
  expect(messages).toEqual(
    Array.from({ length: 3 }, () => "Component `.Button` should have a @component doc comment."),
  );
});

// ── valid-custom-properties ───────────────────────────────────────────────────────────

test("valid-custom-properties rule is registered in plugin", () => {
  expect(plugin.rules["valid-custom-properties"]).toBeDefined();
});

test("valid-custom-properties has proper meta structure", () => {
  const rule = plugin.rules["valid-custom-properties"];
  expect(rule.meta.type).toBe("problem");
  expect(rule.meta.docs.description).toContain("custom property");
  expect(rule.meta.schema).toBeDefined();
  expect(Array.isArray(rule.meta.schema)).toBe(true);
});

test("valid-custom-properties schema is properly defined", () => {
  const rule = plugin.rules["valid-custom-properties"];
  const { schema } = rule.meta;
  // Schema is defined but empty since this rule doesn't take options
  expect(Array.isArray(schema)).toBe(true);
});

test("valid-custom-properties create function returns object with Declaration visitor", () => {
  const rule = plugin.rules["valid-custom-properties"];
  const mockContext = {
    options: [],
    sourceCode: { text: "", getLocFromIndex: () => ({ line: 1, column: 0 }) },
    report: vi.fn<() => void>(),
    filename: "test.css",
    cwd: process.cwd(),
  };
  const visitors = rule.create(mockContext);
  expect(visitors).toBeTypeOf("object");
  expect(visitors.Declaration).toBeTypeOf("function");
});

test("valid-custom-properties applies each declared syntax on repeated visits", () => {
  const messages: string[] = [];
  const visitors = plugin.rules["valid-custom-properties"].create({
    options: [],
    filename: "test.css",
    sourceCode: {
      text: [
        '@property --color { syntax: "<color>"; }',
        '@property --length { syntax: "<length>"; }',
        '@property --count { syntax: "<number>"; }',
      ].join("\n"),
      getLocFromIndex: () => ({ line: 1, column: 0 }),
    },
    report: ({ message }: { message: string }) => messages.push(message),
  });
  const visit = (property: string, value: string) => {
    const node = { type: "Declaration", property, value };
    visitors.Declaration(node);
  };
  visit("--color", "invalid");
  visit("--length", "invalid");
  visit("--count", "invalid");
  visit("--color", "#fff");
  visit("--length", "1.5rem");
  visit("--count", "42");
  visit("--color", "invalid");
  expect(messages).toEqual([
    "Custom property --color requires a color value (syntax: <color>), got: invalid",
    "Custom property --length requires a length value (syntax: <length>), got: invalid",
    "Custom property --count requires a numeric value (syntax: <number>), got: invalid",
    "Custom property --color requires a color value (syntax: <color>), got: invalid",
  ]);
});

// ── Verify Schemas Are Complete ─────────────────────────────────────────────────

test("valid-doc-comments schema has proper structure", () => {
  const rule = plugin.rules["valid-doc-comments"];
  const schema = record(rule.meta.schema[0]);
  expect(schema.type).toBe("object");
  expect(schema.properties).toBeDefined();
  expect(schema.additionalProperties).toBe(false);
});

test("valid-doc-comments schema has all expected properties", () => {
  const rule = plugin.rules["valid-doc-comments"];
  const properties = record(record(rule.meta.schema[0]).properties);
  expect(properties.rules).toBeDefined();
  expect(properties.modifierConvention).toBeDefined();
  expect(properties.naming).toBeDefined();
  expect(properties.structureIgnore).toBeDefined();
});

test("valid-class-usage schema has proper structure", () => {
  const rule = plugin.rules["valid-class-usage"];
  const schema = record(rule.meta.schema[0]);
  expect(schema.type).toBe("object");
  expect(schema.properties).toBeDefined();
  expect(schema.additionalProperties).toBe(false);
});

test("valid-class-usage schema requires css option", () => {
  const rule = plugin.rules["valid-class-usage"];
  const schema = record(rule.meta.schema[0]);
  expect(schema.required).toContain("css");
});

test("valid-class-usage schema has css property definition", () => {
  const rule = plugin.rules["valid-class-usage"];
  const cssProp = record(record(record(rule.meta.schema[0]).properties).css);
  expect(cssProp.type).toBe("array");
  expect(cssProp.items).toBeDefined();
});

test("valid-class-usage schema has modifierConvention property", () => {
  const rule = plugin.rules["valid-class-usage"];
  const properties = record(record(rule.meta.schema[0]).properties);
  expect(properties.modifierConvention).toBeDefined();
});

// ── Plugin Rules Export ─────────────────────────────────────────────────────────────────────────

test("plugin.rules has all expected rules", () => {
  expect(plugin.rules["valid-doc-comments"]).toBeDefined();
  expect(plugin.rules["valid-class-usage"]).toBeDefined();
  expect(plugin.rules["require-component-docs"]).toBeDefined();
  expect(plugin.rules["valid-custom-properties"]).toBeDefined();
});

test("plugin.rules exports have required meta structure", () => {
  for (const [_name, rule] of Object.entries(plugin.rules)) {
    expect(rule.meta).toBeDefined();
    expect(["problem", "suggestion"]).toContain(rule.meta.type);
    expect(rule.meta.docs).toBeDefined();
    expect(rule.meta.docs.description).toBeDefined();
    expect(rule.meta.schema).toBeDefined();
  }
});

test("plugin.rules exports have create function", () => {
  for (const [_name, rule] of Object.entries(plugin.rules)) {
    const isFunction = typeof rule.create === "function";
    expect(isFunction).toBe(true);
  }
});

// ── Plugin Export ───────────────────────────────────────────────────────────────────────────────

test("plugin has proper meta", () => {
  expect(plugin.meta.name).toBe("@cssdoc/eslint-plugin");
  expect(plugin.meta.version).toBe("0.0.0");
});

test("plugin has configs object", () => {
  expect(plugin.configs).toBeTypeOf("object");
});

test("plugin has rules object", () => {
  expect(plugin.rules).toBeTypeOf("object");
});
