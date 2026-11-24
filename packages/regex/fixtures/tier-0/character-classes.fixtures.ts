/**
 * Tier 0 Character Class Fixtures
 *
 * Tests for basic character class patterns.
 */

import type { PatternFixture } from "../types.js";

export const alphaFixtures: PatternFixture[] = [
  {
    pattern: "ALPHA",
    tier: 0,
    passes: [{ input: "a" }, { input: "Z" }, { input: "m" }, { input: "A" }],
    fails: [
      { input: "1", reason: "digit" },
      { input: "-", reason: "punctuation" },
      { input: " ", reason: "space" },
      { input: "", reason: "empty" },
    ],
  },
];

export const alphaLowerFixtures: PatternFixture[] = [
  {
    pattern: "ALPHA_LOWER",
    tier: 0,
    passes: [{ input: "a" }, { input: "z" }, { input: "m" }],
    fails: [
      { input: "A", reason: "uppercase" },
      { input: "Z", reason: "uppercase" },
      { input: "1", reason: "digit" },
      { input: "", reason: "empty" },
    ],
  },
];

export const alphaUpperFixtures: PatternFixture[] = [
  {
    pattern: "ALPHA_UPPER",
    tier: 0,
    passes: [{ input: "A" }, { input: "Z" }, { input: "M" }],
    fails: [
      { input: "a", reason: "lowercase" },
      { input: "z", reason: "lowercase" },
      { input: "1", reason: "digit" },
      { input: "", reason: "empty" },
    ],
  },
];

export const digitFixtures: PatternFixture[] = [
  {
    pattern: "DIGIT",
    tier: 0,
    passes: [{ input: "0" }, { input: "5" }, { input: "9" }],
    fails: [
      { input: "a", reason: "letter" },
      { input: "-", reason: "punctuation" },
      { input: " ", reason: "space" },
      { input: "", reason: "empty" },
    ],
  },
];

export const dashFixtures: PatternFixture[] = [
  {
    pattern: "DASH",
    tier: 0,
    passes: [{ input: "-" }],
    fails: [
      { input: "—", reason: "em dash" },
      { input: "_", reason: "underscore" },
      { input: "", reason: "empty" },
    ],
  },
];

export const doubleDashFixtures: PatternFixture[] = [
  {
    pattern: "DOUBLE_DASH",
    tier: 0,
    passes: [{ input: "--" }],
    fails: [
      { input: "-", reason: "single dash" },
      { input: "", reason: "empty" },
    ],
  },
];

export const dotFixtures: PatternFixture[] = [
  {
    pattern: "DOT",
    tier: 0,
    passes: [{ input: "." }],
    fails: [
      { input: "…", reason: "ellipsis" },
      { input: ",", reason: "comma" },
      { input: "", reason: "empty" },
    ],
  },
];

export const colonFixtures: PatternFixture[] = [
  {
    pattern: "COLON",
    tier: 0,
    passes: [{ input: ":" }],
    fails: [
      { input: ";", reason: "semicolon" },
      { input: "", reason: "empty" },
    ],
  },
];

export const spaceTabFixtures: PatternFixture[] = [
  {
    pattern: "SPACE_TAB",
    tier: 0,
    passes: [{ input: " " }, { input: "\t" }],
    fails: [
      { input: "\n", reason: "newline" },
      { input: "\r", reason: "carriage return" },
      { input: "a", reason: "letter" },
      { input: "", reason: "empty" },
    ],
  },
];

export const braceOpenFixtures: PatternFixture[] = [
  {
    pattern: "BRACE_OPEN",
    tier: 0,
    passes: [{ input: "{" }],
    fails: [
      { input: "}", reason: "closing brace" },
      { input: "[", reason: "bracket" },
      { input: "", reason: "empty" },
    ],
  },
];

export const braceCloseFixtures: PatternFixture[] = [
  {
    pattern: "BRACE_CLOSE",
    tier: 0,
    passes: [{ input: "}" }],
    fails: [
      { input: "{", reason: "opening brace" },
      { input: "]", reason: "bracket" },
      { input: "", reason: "empty" },
    ],
  },
];

export const parenOpenFixtures: PatternFixture[] = [
  {
    pattern: "PAREN_OPEN",
    tier: 0,
    passes: [{ input: "(" }],
    fails: [
      { input: ")", reason: "closing paren" },
      { input: "[", reason: "bracket" },
      { input: "", reason: "empty" },
    ],
  },
];

export const parenCloseFixtures: PatternFixture[] = [
  {
    pattern: "PAREN_CLOSE",
    tier: 0,
    passes: [{ input: ")" }],
    fails: [
      { input: "(", reason: "opening paren" },
      { input: "]", reason: "bracket" },
      { input: "", reason: "empty" },
    ],
  },
];
