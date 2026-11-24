/**
 * Tier 1 CSS Spec Fixtures - Core Patterns
 *
 * Minimal comprehensive fixtures for W3C CSS patterns.
 * Focus: patterns that work correctly with full anchoring (^...$).
 *
 * Note: Some patterns like CSS_UNICODE_RANGE, CSS_KEYWORD have complex
 * subsets; comprehensive fixtures are deferred to a later phase.
 */

import type { PatternFixture } from "../types.js";

export const cssIdentifierFixtures: PatternFixture[] = [
  {
    pattern: "CSS_IDENTIFIER",
    grammarRule: "Identifier",
    tier: 1,
    passes: [
      { input: "button" },
      { input: "my-component" },
      { input: "_private" },
      { input: "a1" },
    ],
    fails: [
      { input: "1button", reason: "starts with digit" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssPropertyNameFixtures: PatternFixture[] = [
  {
    pattern: "CSS_PROPERTY_NAME",
    grammarRule: "PropertyName",
    tier: 1,
    passes: [
      { input: "color", captures: { name: "color", custom: undefined } },
      { input: "background-color", captures: { name: "background-color", custom: undefined } },
      { input: "--primary-color", captures: { name: "--primary-color", custom: "--" } },
      { input: "--color", captures: { name: "--color", custom: "--" } },
    ],
    fails: [
      { input: "-primary", reason: "only one dash" },
      { input: "--", reason: "empty name" },
    ],
  },
];

export const cssFunctionFixtures: PatternFixture[] = [
  {
    pattern: "CSS_FUNCTION",
    grammarRule: "Function",
    tier: 1,
    passes: [
      { input: "rgb(", captures: { name: "rgb" } },
      { input: "var(", captures: { name: "var" } },
      { input: "calc(", captures: { name: "calc" } },
      { input: "my-func(", captures: { name: "my-func" } },
    ],
    fails: [
      { input: "rgb", reason: "no opening paren" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssNumberFixtures: PatternFixture[] = [
  {
    pattern: "CSS_NUMBER",
    grammarRule: "Number",
    tier: 1,
    passes: [{ input: "123" }, { input: "0.5" }, { input: "0" }],
    fails: [
      { input: "abc", reason: "not numeric" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssPercentageFixtures: PatternFixture[] = [
  {
    pattern: "CSS_PERCENTAGE",
    grammarRule: "Percentage",
    tier: 1,
    passes: [
      { input: "50%", captures: { value: "50" } },
      { input: "0.5%", captures: { value: "0.5" } },
      { input: "0%", captures: { value: "0" } },
    ],
    fails: [
      { input: "50", reason: "missing percent sign" },
      { input: "%", reason: "no number" },
    ],
  },
];

export const cssDimensionFixtures: PatternFixture[] = [
  {
    pattern: "CSS_DIMENSION",
    grammarRule: "Dimension",
    tier: 1,
    passes: [
      { input: "12px", captures: { value: "12", unit: "px" } },
      { input: "1.5em", captures: { value: "1.5", unit: "em" } },
      { input: "360deg", captures: { value: "360", unit: "deg" } },
    ],
    fails: [
      { input: "12 px", reason: "space between number and unit" },
      { input: "12", reason: "no unit" },
    ],
  },
];

export const cssHashColorFixtures: PatternFixture[] = [
  {
    pattern: "CSS_HASH_COLOR",
    tier: 1,
    passes: [
      { input: "#fff", captures: { color: "fff" } },
      { input: "#ffffff", captures: { color: "ffffff" } },
      { input: "#abc", captures: { color: "abc" } },
      { input: "#000", captures: { color: "000" } },
    ],
    fails: [
      { input: "#ffff", reason: "wrong length (4 digits)" },
      { input: "#ff", reason: "too short" },
      { input: "#gggggg", reason: "invalid hex" },
    ],
  },
];
