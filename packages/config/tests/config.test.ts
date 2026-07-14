import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCssDocs } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import { CssDocConfigFile, resolveProviders } from "../src/index.ts";
import { cssDocSchema } from "../src/schema.ts";

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url));

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
  expect(configFile.naming.component).toBe("pascalCase");
  expect(configFile.structureIgnore).toEqual(["util-*", "sr-only"]);

  // And it drives parsing: an rscss modifier is extracted under this configuration.
  const [button] = parseCssDocs(`/**\n * @component button\n */\n.button {}\n.button.-color-x {}`, {
    configuration,
  });
  expect(button.modifiers.map((m) => m.name)).toEqual(["-color-x"]);
});

test("an invalid modifierConvention value is a collected schema error", () => {
  const configFile = CssDocConfigFile.loadFile(fixture("invalid-convention.cssdoc.json"));
  expect(configFile.hasErrors).toBe(true);
  expect(configFile.getErrorSummary()).toContain("Schema error");
});

test("the shipped cssdoc.schema.json mirrors the source schema (no drift)", () => {
  // The JSON file is validated against at runtime, shipped in the npm tarball, and published to the
  // docs site — it must stay byte-identical (structurally) to the `cssDocSchema` source of truth.
  const json = JSON.parse(readFileSync(new URL("../cssdoc.schema.json", import.meta.url), "utf8"));
  expect(json).toEqual(cssDocSchema);
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
