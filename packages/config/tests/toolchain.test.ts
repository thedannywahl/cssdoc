import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";

import docsConfig from "../../../docs/vite.config.ts";
import { CSSDOC_TAG_NAMES } from "../../spec/src/index.ts";
import regexConfig from "../../regex/vite.config.ts";
import cliConfig from "../../cli/vite.config.ts";
import grammarConfig from "../../../syntaxes/cssdoc/tmlanguage/vite.config.ts";

test("the TypeScript catalog matches the compiler revision targeted by Vite+'s tsrs", () => {
  const require = createRequire(import.meta.url);
  const viteRequire = createRequire(require.resolve("vite-plus/package.json"));
  const typescript: { version: string; gitHead: string } = require("typescript/package.json");
  const tsrs: { tsrs: { typescriptVersion: string; typescriptCommit: string } } =
    viteRequire("tsrs/package.json");

  expect(typescript.version).toBe(tsrs.tsrs.typescriptVersion);
  expect(typescript.gitHead).toBe(tsrs.tsrs.typescriptCommit);
});

test("merged Vite configs retain package-specific pack settings and tasks", () => {
  expect(cliConfig).toMatchObject({
    lint: { options: { typeAware: true, typeCheck: true } },
    pack: {
      deps: { resolveDepSubpath: true },
      dts: true,
      entry: ["src/index.ts", "src/cli.ts"],
      exports: false,
    },
    run: { tasks: { build: "vp pack", "type-check": "tsc --noEmit" } },
  });
  expect(grammarConfig).toMatchObject({
    pack: { deps: { resolveDepSubpath: true }, dts: true, exports: false },
    run: { tasks: { generate: { command: "node scripts/generate.mjs", cache: false } } },
  });
  expect(regexConfig.pack).toEqual({ entry: "src/index.ts", dts: true });
  expect(docsConfig).not.toHaveProperty("pack");
  expect(docsConfig.run?.tasks).not.toHaveProperty("build");
});

test("JSDoc lint accepts cssdoc tags but still reports unknown tags", () => {
  const directory = mkdtempSync(join(tmpdir(), "cssdoc-jsdoc-"));
  try {
    const file = join(directory, "tags.ts");
    const tags = [...CSSDOC_TAG_NAMES, "param", "unknownCssdocTag"]
      .map((tag) => ` * @${tag} example`)
      .join("\n");
    writeFileSync(file, `/**\n${tags}\n */\nexport const example = 1;\n`);

    for (const workspace of ["../../../", "../../../servers/vscode/"]) {
      const cwd = fileURLToPath(new URL(workspace, import.meta.url));
      const output = execFileSync("vp", ["lint", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      const result: { diagnostics: { code: string; help: string }[] } = JSON.parse(output);
      expect(
        result.diagnostics
          .filter((diagnostic) => diagnostic.code === "jsdoc(check-tag-names)")
          .map((diagnostic) => diagnostic.help),
      ).toEqual(["`@unknownCssdocTag` is invalid tag name."]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
