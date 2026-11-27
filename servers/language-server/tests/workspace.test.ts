import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "vite-plus/test";

import {
  discoverConfigDirectories,
  discoverStylesheets,
  parseClientSettings,
  parseInitializationOptions,
} from "../src/workspace.ts";

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

test("client configuration maps discovery and hover settings and rejects malformed values", () => {
  expect(
    parseClientSettings({
      css: [],
      include: ["src/**/*.css"],
      hover: { detail: "custom", sections: { examples: "off" }, sectionOrder: ["summary"] },
    }),
  ).toEqual({
    css: undefined,
    include: ["src/**/*.css"],
    hoverDetail: "custom",
    hoverSections: { examples: "off" },
    hoverSectionOrder: ["summary"],
  });
  expect(() => parseClientSettings({ include: "**/*.css" })).toThrow("cssdoc.include");
  expect(() => parseClientSettings({ hover: { sections: { summary: "sometimes" } } })).toThrow(
    "cssdoc.hover.sections.summary",
  );
  expect(
    parseClientSettings({ editor: { providerDiscovery: false, providerScanDepth: 0 } }),
  ).toEqual({
    providerDiscovery: false,
    providerScanDepth: 0,
  });
  expect(() => parseClientSettings({ editor: { providerScanDepth: -1 } })).toThrow(
    "cssdoc.editor.providerScanDepth",
  );
});

test("initialization validates settings and preserves an explicit empty CSS list", () => {
  expect(parseInitializationOptions({ css: [], hoverDetail: "compact" })).toEqual({
    css: [],
    hoverDetail: "compact",
  });
  expect(() => parseInitializationOptions({ providerScanDepth: -1 })).toThrow(
    "cssdoc.editor.providerScanDepth",
  );
  expect(() => parseInitializationOptions({ include: "**/*.css" })).toThrow("cssdoc.include");
  expect(parseInitializationOptions({ hoverPresentation: "vscode" })).toEqual({
    hoverPresentation: "vscode",
  });
  expect(() => parseInitializationOptions({ hoverPresentation: "zed" })).toThrow(
    "hoverPresentation",
  );
});

test("configuration discovery respects depth and skips dependency directories", () => {
  const root = mkdtempSync(join(tmpdir(), "cssdoc-config-discovery-"));
  try {
    mkdirSync(join(root, "nested", "deep"), { recursive: true });
    mkdirSync(join(root, "node_modules", "pkg"), { recursive: true });
    for (const dir of [
      root,
      join(root, "nested"),
      join(root, "nested", "deep"),
      join(root, "node_modules", "pkg"),
    ]) {
      writeFileSync(join(dir, "cssdoc.json"), "{}");
    }
    expect(discoverConfigDirectories(root, 1)).toEqual([root, join(root, "nested")].toSorted());
    expect(discoverConfigDirectories(root, 3)).toEqual(
      [root, join(root, "nested"), join(root, "nested", "deep")].toSorted(),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
