import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vite-plus/test";
import { discoverStylesheets } from "../src/workspace.ts";

test("discovers CSS in every root, excludes node_modules, and supports custom globs", () => {
  const fixture = mkdtempSync(join(tmpdir(), "cssdoc-discovery-"));
  try {
    const first = join(fixture, "first");
    const second = join(fixture, "second");
    mkdirSync(join(first, "src"), { recursive: true });
    mkdirSync(join(first, "node_modules", "pkg"), { recursive: true });
    mkdirSync(second);
    const css = join(first, "src", "button.css");
    const vue = join(first, "src", "button.vue");
    const other = join(second, "other.css");
    for (const file of [css, vue, other, join(first, "node_modules", "pkg", "ignored.css")]) {
      writeFileSync(file, "");
    }
    expect(discoverStylesheets([first, second])).toEqual([css, other].toSorted());
    expect(discoverStylesheets([first], { include: ["src/**/*.{css,vue}"] })).toEqual(
      [css, vue].toSorted(),
    );
    expect(discoverStylesheets([first], { exclude: ["**/src/**"] })).not.toContain(css);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("explicit paths override discovery and resolve relative to each root", () => {
  const roots = [join(tmpdir(), "one"), join(tmpdir(), "two")];
  const shared = join(tmpdir(), "shared.css");
  expect(discoverStylesheets(roots, { css: ["dist/all.css", shared] })).toEqual(
    [join(roots[0], "dist/all.css"), join(roots[1], "dist/all.css"), shared].toSorted(),
  );
  expect(discoverStylesheets(roots, { css: [] })).toEqual([]);
});
