import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCssDocs, selectExamples } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import { findSchemaDrift } from "../../../scripts/sync-schema.ts";
import { CssDocConfigFile, resolveProviders } from "../src/index.ts";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url));

test("prose settings inherit, reset, and report unknown tags during loading", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-prose-"));
  const write = (file: string, value: object) =>
    writeFileSync(join(dir, file), JSON.stringify(value));
  try {
    write("base.json", {
      prose: { mode: "plain", tags: { "@component": "auto" }, remarkKinds: { usage: "markdown" } },
    });
    write("cssdoc.json", {
      extends: ["./base.json"],
      prose: { tags: { "@name": null }, remarkKinds: { usage: null } },
    });
    const config = CssDocConfigFile.loadFile(join(dir, "cssdoc.json"));
    expect(config.hasErrors).toBe(false);
    expect(config.toConfiguration().proseModeFor("@component")).toBe("plain");
    expect(config.toConfiguration().proseModeFor("@remarks", "usage")).toBe("plain");
    write("cssdoc.json", { prose: { tags: { "@unknown": "plain" } } });
    const invalid = CssDocConfigFile.loadFile(join(dir, "cssdoc.json"));
    expect(invalid.getErrorSummary()).toContain("Unknown prose block tag");
    expect(invalid.toConfiguration().proseModeFor("@part")).toBe("markdown");
    write("cssdoc.json", { prose: { mode: "other" } });
    expect(CssDocConfigFile.loadFile(join(dir, "cssdoc.json")).hasErrors).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("example filters inherit by surface and select without changing the model", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-example-filters-"));
  const write = (file: string, value: object) =>
    writeFileSync(join(dir, file), JSON.stringify(value));
  write("base.json", {
    render: {
      exampleFilters: {
        markdown: { labels: ["docs"], includeUnlabeled: false },
        html: { labels: ["demo"] },
        hover: { labels: ["docs"] },
      },
    },
  });
  write("cssdoc.json", {
    extends: ["./base.json"],
    render: { exampleFilters: { markdown: { labels: ["docs"] }, hover: null } },
  });
  const file = CssDocConfigFile.loadFile(join(dir, "cssdoc.json"));
  expect(file.messages).toEqual([]);
  expect(file.hasErrors).toBe(false);
  const filters = file.render.exampleFilters;
  expect(filters).toEqual({
    markdown: { labels: ["docs"] },
    html: { labels: ["demo"] },
    hover: null,
  });
  const entry = {
    examples: ["Unlabeled", "Shared", "Accessibility fixture", "Demo"],
    exampleLabels: { 1: ["docs", "demo"], 2: ["a11y"], 3: ["demo"] },
  };
  expect(selectExamples(entry, filters?.markdown)).toEqual(["Unlabeled", "Shared"]);
  expect(selectExamples(entry, filters?.html)).toEqual(["Unlabeled", "Shared", "Demo"]);
  expect(selectExamples(entry, filters?.hover)).toEqual(entry.examples);
  expect(selectExamples(entry, { labels: [], includeUnlabeled: false })).toEqual([]);

  write("cssdoc.json", { render: { exampleFilters: { hover: { labels: ["INVALID"] } } } });
  expect(CssDocConfigFile.loadFile(join(dir, "cssdoc.json")).hasErrors).toBe(true);
});

test("loadFile applies tagDefinitions, extends, and supportForTags to a configuration", () => {
  const configFile = CssDocConfigFile.loadFile(fixture("cssdoc.json"));
  expect(configFile.fileNotFound).toBe(false);
  expect(configFile.hasErrors).toBe(false);

  const configuration = configFile.toConfiguration();
  // From extends (base.cssdoc.json):
  expect(configuration.tryGetTagDefinition("@token")?.syntaxKind).toBe("block");
  // From this file:
  expect(configuration.tryGetTagDefinition("@pattern")?.recordKind).toBe("component");
  // supportForTags disabled a standard tag:
  const privateRemarks = configuration.tryGetTagDefinition("@privateRemarks")!;
  expect(configuration.isTagSupported(privateRemarks)).toBe(false);
});

test("the resulting configuration drives parseCssDocs (custom tag captured, custom record opens)", () => {
  const configuration = CssDocConfigFile.loadFile(fixture("cssdoc.json")).toConfiguration();

  const chip = parseCssDocs(
    `/**\n * @component chip\n * @token --chip-bg\n */\n.chip { color: red; }`,
    { configuration },
  );
  expect(chip[0].customBlocks).toEqual({ token: ["--chip-bg"] });

  const [card] = parseCssDocs(`/**\n * @pattern card\n */\n.card { display: block; }`, {
    configuration,
  });
  expect(card?.name).toBe("card");
});

test("loadForFolder finds the nearest cssdoc.json", () => {
  const configFile = CssDocConfigFile.loadForFolder(fixturesDir);
  expect(configFile.fileNotFound).toBe(false);
  expect(configFile.filePath).toBe(fixture("cssdoc.json"));
});

test("loads a cssdoc.jsonc with comments and a trailing comma", () => {
  const configFile = CssDocConfigFile.loadFile(fixture("comments.cssdoc.jsonc"));
  expect(configFile.fileNotFound).toBe(false);
  expect(configFile.hasErrors).toBe(false);
  expect(configFile.modifierConvention).toBe("rscss");
  expect(configFile.ruleSeverities["unknown-modifier"]).toBe("off");
});

test("an invalid cssdoc.json reports schema errors instead of throwing", () => {
  const configFile = CssDocConfigFile.loadFile(fixture("invalid.cssdoc.json"));
  expect(configFile.hasErrors).toBe(true);
  expect(configFile.getErrorSummary()).toContain("Schema error");
  // Applying it is still safe (no throw); the invalid tag simply isn't registered.
  const configuration = configFile.toConfiguration();
  expect(configuration.tryGetTagDefinition("@bad")).toBeUndefined();
});

test("a removed record kind fails configuration validation", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-record-kind-"));
  const file = join(dir, "cssdoc.json");
  writeFileSync(
    file,
    JSON.stringify({
      tagDefinitions: [{ tagName: "@pattern", syntaxKind: "record", recordKind: "layout" }],
    }),
  );
  expect(CssDocConfigFile.loadFile(file).hasErrors).toBe(true);
});

test("a missing file yields fileNotFound, not an error", () => {
  const configFile = CssDocConfigFile.loadForFolder("/nonexistent-folder-xyz");
  expect(configFile.fileNotFound).toBe(true);
  expect(configFile.hasErrors).toBe(false);
});

test("modifierConvention and rules load onto the configuration and config file", () => {
  const configFile = CssDocConfigFile.loadFile(fixture("convention.cssdoc.json"));
  expect(configFile.hasErrors).toBe(false);

  const configuration = configFile.toConfiguration();
  expect(configuration.modifierConvention.structure).toBe("chained");
  expect(configuration.modifierConvention.separator).toBe("-");
  expect(configFile.ruleSeverities["unknown-modifier"]).toBe("off");
  expect(configFile.ruleOptions.values?.allowInherit).toBe(true);
  expect(configFile.ruleOptions.sealed?.mode).toBe("compat");
  expect(configFile.naming.component).toBe("pascalCase");
  expect(configFile.structureIgnore).toEqual(["util-*", "sr-only"]);

  // And it drives parsing: an rscss modifier is extracted under this configuration.
  const [button] = parseCssDocs(`/**\n * @component button\n */\n.button {}\n.button.-color-x {}`, {
    configuration,
  });
  expect(button.modifiers.map((m) => m.name)).toEqual(["-color-x"]);
});

test("globalPrecedence inherits explicit values before applying its default", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-global-precedence-"));
  const write = (file: string, value: object) =>
    writeFileSync(join(dir, file), JSON.stringify(value));
  try {
    write("global.json", { globalPrecedence: "global" });
    write("unset.json", {});
    write("inherited.json", { extends: ["./global.json"] });
    write("multiple.json", { extends: ["./inherited.json", "./unset.json"] });
    write("base.json", { extends: ["./multiple.json"], globalPrecedence: "base" });

    for (const [file, expected] of [
      ["unset.json", "base"],
      ["inherited.json", "global"],
      ["multiple.json", "global"],
      ["base.json", "base"],
    ] as const) {
      const config = CssDocConfigFile.loadFile(join(dir, file));
      expect(config.hasErrors).toBe(false);
      expect(config.globalPrecedence).toBe(expected);
      expect(config.toConfiguration().globalPrecedence).toBe(expected);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rule overrides apply to matching files in declaration order", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-overrides-"));
  writeFileSync(
    join(dir, "cssdoc.json"),
    JSON.stringify({
      rules: { "missing-summary": "error" },
      overrides: [
        { files: "docs/*.css", rules: { "missing-summary": "off" } },
        { files: ["docs/special.css"], rules: { "missing-summary": "warn" } },
      ],
    }),
  );
  const configFile = CssDocConfigFile.loadFile(join(dir, "cssdoc.json"));
  expect(configFile.hasErrors).toBe(false);
  expect(configFile.ruleSeveritiesForFile(join(dir, "src/a.css"))["missing-summary"]).toBe("error");
  expect(configFile.ruleSeveritiesForFile(join(dir, "docs/a.css"))["missing-summary"]).toBe("off");
  expect(configFile.ruleSeveritiesForFile(join(dir, "docs/special.css"))["missing-summary"]).toBe(
    "warn",
  );
});

test("inherited rule overrides stay relative to the file that authored them", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-inherited-overrides-"));
  mkdirSync(join(dir, "base"));
  mkdirSync(join(dir, "app"));
  writeFileSync(
    join(dir, "base", "cssdoc.json"),
    JSON.stringify({ overrides: [{ files: "legacy/*.css", rules: { "missing-summary": "off" } }] }),
  );
  writeFileSync(
    join(dir, "app", "cssdoc.json"),
    JSON.stringify({
      extends: ["../base/cssdoc.json"],
      rules: { "missing-summary": "error" },
      overrides: [{ files: "local/*.css", rules: { "missing-summary": "warn" } }],
    }),
  );
  const configFile = CssDocConfigFile.loadFile(join(dir, "app", "cssdoc.json"));
  expect(configFile.hasErrors).toBe(false);
  expect(
    configFile.ruleSeveritiesForFile(join(dir, "base", "legacy", "a.css"))["missing-summary"],
  ).toBe("off");
  expect(
    configFile.ruleSeveritiesForFile(join(dir, "app", "local", "a.css"))["missing-summary"],
  ).toBe("warn");
});

test("unknown rule keys are rejected by schema validation", () => {
  const configFile = CssDocConfigFile.loadFile(fixture("invalid-rules.cssdoc.json"));
  expect(configFile.hasErrors).toBe(true);
  expect(configFile.getErrorSummary()).toContain("Schema error");
});

test("unknown override rule keys are rejected by schema validation", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-invalid-overrides-"));
  writeFileSync(
    join(dir, "cssdoc.json"),
    JSON.stringify({ overrides: [{ files: "*.css", rules: { nope: "off" } }] }),
  );
  const configFile = CssDocConfigFile.loadFile(join(dir, "cssdoc.json"));
  expect(configFile.hasErrors).toBe(true);
  expect(configFile.getErrorSummary()).toContain("Schema error");
});

test("an invalid modifierConvention value is a collected schema error", () => {
  const configFile = CssDocConfigFile.loadFile(fixture("invalid-convention.cssdoc.json"));
  expect(configFile.hasErrors).toBe(true);
  expect(configFile.getErrorSummary()).toContain("Schema error");
});

test("every cssdoc.schema.json mirror is byte-identical to the source schema (no drift)", () => {
  // `cssDocSchema` is the single source of truth; scripts/sync-schema.ts writes it, byte-for-byte, to
  // four locations (npm tarball, docs site, VS Code extension, repo root). This asserts none has
  // drifted — run `vp run sync:schema` to regenerate them all. Mirrored by `vp run check`.
  expect(findSchemaDrift()).toEqual([]);
});

test("providers is this file's own, not inherited via extends", () => {
  // base declares a provider; the extending file should NOT inherit it (components ≠ config).
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-prov-x-"));
  writeFileSync(join(dir, "base.json"), JSON.stringify({ providers: [{ path: "./x.json" }] }));
  writeFileSync(join(dir, "cssdoc.json"), JSON.stringify({ extends: ["./base.json"] }));
  const cf = CssDocConfigFile.loadFile(join(dir, "cssdoc.json"));
  expect(cf.providers).toEqual([]);
});

test("resolveProviders loads a .css provider (its own convention) and a .json model, with hrefs", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-prov-"));
  // A local source provider (rscss) with its own cssdoc.json governing the convention.
  mkdirSync(join(dir, "vendor"));
  writeFileSync(
    join(dir, "vendor", "cssdoc.json"),
    JSON.stringify({ modifierConvention: "rscss" }),
  );
  writeFileSync(
    join(dir, "vendor", "vendor.css"),
    "/**\n * @component widget\n * @summary A widget.\n */\n.widget {}\n.widget.-size-sm {}",
  );
  // A published model.json (a CssDocEntry[]) — no source, no convention needed.
  const model = parseCssDocs("/**\n * @component chip\n * @summary A chip.\n */\n.chip {}");
  writeFileSync(join(dir, "model.json"), JSON.stringify(model));
  writeFileSync(
    join(dir, "cssdoc.json"),
    JSON.stringify({
      modifierConvention: "bem",
      providers: [
        { path: "./vendor/vendor.css", baseHref: "/vendor/" },
        { path: "./model.json", baseHref: "https://x.dev/api/" },
      ],
    }),
  );
  const { entries, href, messages } = resolveProviders(
    CssDocConfigFile.loadFile(join(dir, "cssdoc.json")),
  );
  expect(messages).toEqual([]);
  expect(entries.map((e) => e.name).sort()).toEqual(["chip", "widget"]);
  // The .css provider parsed with ITS convention (rscss), not the consumer's bem.
  expect(entries.find((e) => e.name === "widget")!.modifiers.map((m) => m.name)).toContain(
    "-size-sm",
  );
  // Cross-link hrefs come from each provider's baseHref + `<name>.md`.
  expect(href("widget")).toBe("/vendor/widget.md");
  expect(href("chip")).toBe("https://x.dev/api/chip.md");
  expect(href("nope")).toBeUndefined();
});

test("resolveProviders reports an unresolvable provider without throwing", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-prov-miss-"));
  writeFileSync(
    join(dir, "cssdoc.json"),
    JSON.stringify({ providers: [{ path: "./missing.json" }] }),
  );
  const { entries, messages } = resolveProviders(
    CssDocConfigFile.loadFile(join(dir, "cssdoc.json")),
  );
  expect(entries).toEqual([]);
  expect(messages[0]).toContain("missing.json");
});

test("resolveProviders expands stylesheet globs and reports unmatched patterns", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-provider-globs-"));
  try {
    mkdirSync(join(dir, "generated"));
    for (const name of ["alpha", "beta"]) {
      writeFileSync(
        join(dir, "generated", `${name}.css`),
        `/** @component ${name} */\n.${name} {}\n`,
      );
    }
    const configPath = join(dir, "cssdoc.json");
    writeFileSync(
      configPath,
      JSON.stringify({ providers: [{ path: "./generated/*.css" }, { path: "./missing/*.css" }] }),
    );
    const result = resolveProviders(CssDocConfigFile.loadFile(configPath));
    expect(result.entries.map((entry) => entry.name)).toEqual(["alpha", "beta"]);
    expect(result.messages).toEqual(['Provider "./missing/*.css": glob pattern matched no files']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveProviders' prefix rewrite is verbatim — no separator assumed or added", () => {
  const dir = mkdtempSync(join(tmpdir(), "cssdoc-prov-prefix-"));
  const model = parseCssDocs(
    "/**\n * @component alert\n * @summary An alert.\n * @modifier -color-danger — Danger.\n */\n.vendor-alert { color: var(--vendor-alert-color); }\n.vendor-alert.-color-danger {}",
  );
  writeFileSync(join(dir, "model.json"), JSON.stringify(model));

  const resolve = (prefix?: { from: string; to?: string; isRegExp?: boolean }) => {
    writeFileSync(
      join(dir, "cssdoc.json"),
      JSON.stringify({ providers: [{ path: "./model.json", ...(prefix ? { prefix } : {}) }] }),
    );
    return resolveProviders(CssDocConfigFile.loadFile(join(dir, "cssdoc.json")));
  };

  // No `prefix` at all — the default, a no-op. This is the regression guard for "without doing
  // anything, the published prefix is maintained".
  expect(resolve().entries[0].className).toBe(".vendor-alert");

  // `to` is spliced in verbatim — no "-" (or any separator) is assumed, so this drops the separator
  // entirely, matching a consumer who built with no separator at all (`ialert`, not `i-alert`).
  expect(resolve({ from: "vendor-", to: "i" }).entries[0].className).toBe(".ialert");

  // An explicit separator in `to` is honored exactly as given.
  expect(resolve({ from: "vendor-", to: "acme-" }).entries[0].className).toBe(".acme-alert");

  // Omitting `to` (or "") strips the prefix to a bare class.
  expect(resolve({ from: "vendor-" }).entries[0].className).toBe(".alert");

  // `isRegExp` treats `from` as a regex source, anchored to the start.
  expect(resolve({ from: "(?:vendor|pfx)-", to: "", isRegExp: true }).entries[0].className).toBe(
    ".alert",
  );

  // Modifiers and custom properties are untouched — only the base `className` is rewritten.
  const rewritten = resolve({ from: "vendor-", to: "acme-" }).entries[0];
  expect(rewritten.modifiers.map((m) => m.name)).toContain("-color-danger");
  expect(rewritten.cssPropertiesConsumed.map((t) => t.name)).toContain("--vendor-alert-color");
});
