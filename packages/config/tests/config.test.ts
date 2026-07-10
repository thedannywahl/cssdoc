import { fileURLToPath } from "node:url";
import { parseCssDocs } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import { CssDocConfigFile } from "../src/index.ts";

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
