/**
 * @cssdoc/regex Tests
 *
 * Comprehensive test suite for all three tiers of regex patterns.
 */

import { describe, it, expect } from "vite-plus/test";

// Tier 1: W3C CSS Spec patterns
import {
  CSS_IDENTIFIER,
  CSS_NUMBER,
  CSS_HASH_COLOR,
  CSS_FUNCTION,
  CSS_PROPERTY_NAME,
} from "../src/tiers/css-spec.js";

// Tier 2: CssDoc Grammar patterns
import {
  CSSDOC_IDENTIFIER,
  CSSDOC_RECORD_NAME,
  CSSDOC_TAG,
  CSSDOC_MODIFIER_SUFFIX,
  CSSDOC_CUSTOM_PROPERTY,
  CSSDOC_REF_NUM,
  CSSDOC_STATE_VALUE,
  CSSDOC_SELECTOR_VALUE,
  CSSDOC_STRUCTURE_CARDINALITY,
  CSSDOC_SLOT_DECL,
  CSSDOC_STRUCTURE_CLASS,
} from "../src/tiers/css-doc-grammar.js";

// Tier 3: cssdoc-Specific patterns
import {
  BEM_BLOCK,
  BEM_MODIFIER,
  CLASS_REF,
  SINGLE_CLASS,
  ARIA_STATE,
  VAR_REFERENCE,
} from "../src/tiers/cssdoc-local.js";

describe("@cssdoc/regex - Tier 1: W3C CSS Spec Patterns", () => {
  it("matches CSS identifiers", () => {
    const match = CSS_IDENTIFIER.exec("my-class");
    expect(match?.groups?.identifier).toBe("my-class");
  });

  it("matches CSS numbers with decimals", () => {
    const match = CSS_NUMBER.exec("3.14");
    expect(match?.groups?.number).toBe("3.14");
    expect(match?.groups?.integer).toBe("3");
    expect(match?.groups?.decimal).toBe("14");
  });

  it("matches CSS hash colors", () => {
    const match = CSS_HASH_COLOR.exec("#ffffff");
    expect(match?.groups?.color).toBe("ffffff");
  });

  it("matches CSS functions", () => {
    const match = CSS_FUNCTION.exec("rgb(");
    expect(match?.groups?.name).toBe("rgb");
  });

  it("matches CSS property names", () => {
    const match = CSS_PROPERTY_NAME.exec("--my-var");
    expect(match?.groups?.name).toBe("--my-var");
    expect(match?.groups?.custom).toBe("--");
  });
});

describe("@cssdoc/regex - Tier 2: CssDoc Grammar Patterns", () => {
  it("matches CssDoc identifiers", () => {
    const match = CSSDOC_IDENTIFIER.exec("button");
    expect(match?.groups?.identifier).toBe("button");
  });

  it("matches CssDoc record names with dots", () => {
    const match = CSSDOC_RECORD_NAME.exec("menu.item.action");
    expect(match?.groups?.parts).toBe("menu.item.action");
  });

  it("matches CssDoc tags with arguments", () => {
    const match = CSSDOC_TAG.exec("@modifier active");
    expect(match?.groups?.tag).toBe("modifier");
    expect(match?.groups?.arg).toBe("active");
  });

  it("matches CssDoc modifier suffix", () => {
    const match = CSSDOC_MODIFIER_SUFFIX.exec("primary");
    expect(match?.groups?.name).toBe("primary");
  });

  it("matches CssDoc custom properties", () => {
    const match = CSSDOC_CUSTOM_PROPERTY.exec("--primary-color");
    expect(match?.groups?.name).toBe("primary-color");
  });

  it("matches CssDoc ref numbers", () => {
    expect(CSSDOC_REF_NUM.exec("1")?.groups?.num).toBe("1");
    expect(CSSDOC_REF_NUM.exec("1.")?.groups?.num).toBe("1");
  });

  it("matches CssDoc state values", () => {
    expect(CSSDOC_STATE_VALUE.exec(":open")?.groups?.name).toBe("open");
    expect(CSSDOC_STATE_VALUE.exec(":state(open)")?.groups?.param).toBe("open");
    expect(CSSDOC_STATE_VALUE.exec(":disabled")?.groups?.name).toBe("disabled");
  });

  it("matches CssDoc selector/pseudo/class values", () => {
    expect(CSSDOC_SELECTOR_VALUE.exec(".alert-box")?.groups?.value).toBe(".alert-box");
    expect(CSSDOC_SELECTOR_VALUE.exec("alert-container")?.groups?.value).toBe("alert-container");
  });

  it("matches CssDoc structure cardinality modifiers", () => {
    expect(CSSDOC_STRUCTURE_CARDINALITY.exec(":optional")?.groups?.keyword).toBe("optional");
    const maxMatch = CSSDOC_STRUCTURE_CARDINALITY.exec(":max-1")?.groups;
    expect(maxMatch?.justMax || maxMatch?.maxValue).toBe("1");
    const comboMatch = CSSDOC_STRUCTURE_CARDINALITY.exec(":one-or-more:max-2")?.groups;
    expect(comboMatch?.keyword).toBe("one-or-more");
    expect(comboMatch?.maxValue).toBe("2");
  });

  it("matches CssDoc slot declarations", () => {
    expect(CSSDOC_SLOT_DECL.test("slot")).toBe(true);
    expect(CSSDOC_SLOT_DECL.exec('slot[name="x"]')?.groups?.name).toBe("x");
    expect(CSSDOC_SLOT_DECL.exec("slot[name='content']")?.groups?.name).toBe("content");
  });

  it("matches CssDoc structure class selectors", () => {
    expect(CSSDOC_STRUCTURE_CLASS.exec(".pfx-alert")?.groups?.class).toBe("pfx-alert");
    expect(CSSDOC_STRUCTURE_CLASS.exec(".button-group")?.groups?.class).toBe("button-group");
  });
});

describe("@cssdoc/regex - Tier 3: cssdoc-Specific Patterns", () => {
  it("matches BEM block classes", () => {
    const match = BEM_BLOCK.exec(".button");
    expect(match?.groups?.block).toBe("button");
  });

  it("matches BEM modifiers", () => {
    const match = BEM_MODIFIER.exec(".button--primary");
    expect(match?.groups?.base).toBe("button");
    expect(match?.groups?.mod).toBe("primary");
  });

  it("matches class references globally", () => {
    const selector = ".button.-active.-size-lg";
    const matches = [...selector.matchAll(CLASS_REF)];
    expect(matches).toHaveLength(3);
    expect(matches[0]?.groups?.className).toBe("button");
    expect(matches[1]?.groups?.className).toBe("active");
    expect(matches[2]?.groups?.className).toBe("size");
  });

  it("matches single class selectors only", () => {
    expect(SINGLE_CLASS.test(".button")).toBe(true);
    expect(SINGLE_CLASS.test(".button.active")).toBe(false);
    expect(SINGLE_CLASS.test("button")).toBe(false);
  });

  it("matches ARIA state attributes", () => {
    const match = ARIA_STATE.exec('[aria-disabled="true"]');
    expect(match?.groups?.attr).toBe("aria-disabled");
    expect(match?.groups?.value).toBe("true");
  });

  it("matches var() references", () => {
    const match = VAR_REFERENCE.exec("var(--primary-color)");
    expect(match?.groups?.name).toBe("--primary-color");
  });
});
