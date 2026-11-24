/**
 * Tier 2 CSS Doc Grammar Fixtures - Core Patterns
 *
 * Minimal comprehensive fixtures for CSS Doc grammar patterns.
 * Focus: patterns that work correctly with full anchoring (^...$).
 *
 * Note: Complex patterns like @modifier with spaces, @part with selectors,
 * and patterns with complex nesting are deferred to a later phase.
 */

import type { PatternFixture } from "../types.js";

export const cssdocIdentifierFixtures: PatternFixture[] = [
  {
    pattern: "CSSDOC_IDENTIFIER",
    grammarRule: "Identifier",
    tier: 2,
    passes: [
      { input: "button", captures: { identifier: "button" } },
      { input: "my-component", captures: { identifier: "my-component" } },
      { input: "_private", captures: { identifier: "_private" } },
    ],
    fails: [
      { input: "1button", reason: "starts with digit" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssdocRecordNameFixtures: PatternFixture[] = [
  {
    pattern: "CSSDOC_RECORD_NAME",
    grammarRule: "RecordName",
    tier: 2,
    passes: [
      { input: "button", captures: { parts: "button" } },
      { input: "progress-circle", captures: { parts: "progress-circle" } },
      { input: "menu.item", captures: { parts: "menu.item" } },
      { input: "dialog.header", captures: { parts: "dialog.header" } },
    ],
    fails: [
      { input: ".", reason: "just dot" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssdocModifierSuffixFixtures: PatternFixture[] = [
  {
    pattern: "CSSDOC_MODIFIER_SUFFIX",
    grammarRule: "SuffixModifierName",
    tier: 2,
    passes: [
      { input: "primary", captures: { name: "primary" } },
      { input: "large", captures: { name: "large" } },
      { input: "variant-dark", captures: { name: "variant-dark" } },
    ],
    fails: [
      { input: "-primary", reason: "starts with dash" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssdocModifierChainedFixtures: PatternFixture[] = [
  {
    pattern: "CSSDOC_MODIFIER_CHAINED",
    grammarRule: "ChainedModifierName",
    tier: 2,
    passes: [
      { input: "-primary", captures: { prop: "primary" } },
      { input: "-large", captures: { prop: "large" } },
      { input: "-button--primary", captures: { prop: "button--primary" } },
    ],
    fails: [
      { input: "primary", reason: "missing leading dash" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssdocTagFixtures: PatternFixture[] = [
  {
    pattern: "CSSDOC_TAG",
    grammarRule: "TagName",
    tier: 2,
    passes: [
      { input: "@component", captures: { tag: "component" } },
      { input: "@modifier", captures: { tag: "modifier" } },
      { input: "@part", captures: { tag: "part" } },
      { input: "@deprecated", captures: { tag: "deprecated" } },
      { input: "@Component", captures: { tag: "Component" } },
    ],
    fails: [
      { input: "component", reason: "missing @" },
      { input: "", reason: "empty" },
    ],
  },
];

export const cssdocStructureClassFixtures: PatternFixture[] = [
  {
    pattern: "CSSDOC_STRUCTURE_CLASS",
    grammarRule: "StructureClass",
    tier: 2,
    passes: [
      { input: ".alert", captures: { class: "alert" } },
      { input: ".my-component", captures: { class: "my-component" } },
      { input: ".custom", captures: { class: "custom" } },
    ],
    fails: [
      { input: "alert", reason: "missing dot" },
      { input: ".", reason: "just dot" },
      { input: "", reason: "empty" },
      { input: ".-custom", reason: "class name starts with dash" },
    ],
  },
];
