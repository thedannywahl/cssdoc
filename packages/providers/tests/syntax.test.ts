import { expect, test } from "vite-plus/test";
import { matchesSyntax } from "../src/syntax.ts";

test("matches basic data types", () => {
  expect(matchesSyntax("<length>", "4px").ok).toBe(true);
  expect(matchesSyntax("<length>", "red").ok).toBe(false);
  expect(matchesSyntax("<color>", "#fff").ok).toBe(true);
  expect(matchesSyntax("<color>", "10px").ok).toBe(false);
  expect(matchesSyntax("<integer>", "3.5").ok).toBe(false);
});

test("handles alternations, multipliers, and keywords", () => {
  expect(matchesSyntax("<length> | <percentage>", "50%").ok).toBe(true);
  expect(matchesSyntax("<length>+", "4px 8px").ok).toBe(true);
  expect(matchesSyntax("<length>#", "4px, 8px").ok).toBe(true);
  expect(matchesSyntax("small | large", "small").ok).toBe(true);
  expect(matchesSyntax("small | large", "huge").ok).toBe(false);
});

test("skips what can't be checked statically", () => {
  expect(matchesSyntax("*", "anything at all").skipped).toBe(true);
  expect(matchesSyntax("<length>", "var(--x)").skipped).toBe(true);
  expect(matchesSyntax("<length>", "env(safe-area-inset-top)").skipped).toBe(true);
  expect(matchesSyntax("<length>", "inherit").skipped).toBe(true);
  // A skipped value never counts as a failure.
  expect(matchesSyntax("<length>", "var(--x)").ok).toBe(true);
});
