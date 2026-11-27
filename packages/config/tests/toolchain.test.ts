import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, expect, test, vi } from "vite-plus/test";

import docsConfig from "../../../docs/vite.config.ts";
import { CSSDOC_TAG_NAMES, CSSDOC_TAGS } from "../../spec/src/index.ts";
import regexConfig from "../../regex/vite.config.ts";
import cliConfig from "../../cli/vite.config.ts";
import grammarConfig from "../../../syntaxes/cssdoc/tmlanguage/vite.config.ts";
import tsdocConfig from "../../../tsdoc.json" with { type: "json" };

vi.setConfig({ testTimeout: 30_000 });
afterAll(() => vi.resetConfig());

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
    const file = join(directory, "tags.test.ts");
    const tags = [...CSSDOC_TAG_NAMES, "param", "unknownCssdocTag"]
      .map((tag) => ` * @${tag} example`)
      .join("\n");
    writeFileSync(file, `/**\n${tags}\n */\nexport const example = 1;\n`);

    for (const workspace of ["../../../", "../../../servers/vscode/"]) {
      const cwd = fileURLToPath(new URL(workspace, import.meta.url));
      const lint = spawnSync("vp", ["lint", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect([0, 1]).toContain(lint.status);
      const output = lint.stdout;
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

test("TSDoc definitions follow the cssdoc vocabulary", () => {
  const require = createRequire(import.meta.url);
  const pluginRequire = createRequire(require.resolve("eslint-plugin-tsdoc"));
  const tsdoc: { StandardTags: { allDefinitions: { tagName: string }[] } } =
    pluginRequire("@microsoft/tsdoc");
  const standardTags = new Set(
    tsdoc.StandardTags.allDefinitions.map((definition) => definition.tagName.toLowerCase()),
  );
  const definitions = CSSDOC_TAGS.filter(
    (tag) => !standardTags.has(`@${tag.name}`.toLowerCase()),
  ).map((tag) => ({
    tagName: `@${tag.name}`,
    syntaxKind: tag.kind === "record" ? "block" : tag.kind,
    ...(tag.allowMultiple ? { allowMultiple: true } : {}),
  }));
  expect(tsdocConfig.tagDefinitions).toEqual([
    { tagName: "@module", syntaxKind: "block" },
    ...definitions,
  ]);
});

test("TSDoc lint recognizes cssdoc tags without accepting unknown tags", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".tsdoc-check-"));
  try {
    const file = join(directory, "tags.ts");
    const tags = [...CSSDOC_TAG_NAMES, "unknownCssdocTag"]
      .map((tag) => ` * @${tag} example`)
      .join("\n");
    writeFileSync(file, `/**\n${tags}\n */\nexport const example = 1;\n`);
    const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    const output: { diagnostics: { code: string; message: string }[] } = JSON.parse(result.stdout);
    expect(
      output.diagnostics
        .filter(
          (diagnostic) =>
            diagnostic.code === "tsdoc(syntax)" &&
            diagnostic.message.startsWith("tsdoc-undefined-tag:"),
        )
        .map((diagnostic) => diagnostic.message),
    ).toEqual([
      'tsdoc-undefined-tag: The TSDoc tag "@unknownCssdocTag" is not defined in this configuration',
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("documentation lint accepts TSDoc return descriptions and rejects empty ones", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".tsdoc-check-"));
  try {
    const file = join(directory, "returns.ts");
    const lint = () =>
      spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd: root,
        encoding: "utf8",
      });

    writeFileSync(file, "/** Returns a value.\n * @returns\n */\nexport const value = () => 1;\n");
    const missing = lint();
    expect(missing.status).toBe(1);
    const output: { diagnostics: { code: string }[] } = JSON.parse(missing.stdout);
    expect(output.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "jsdoc(require-returns-description)",
    );

    writeFileSync(
      file,
      "/** Returns a value.\n * @returns The value.\n */\nexport const value = () => 1;\n",
    );
    expect(lint().status).toBe(0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("documentation lint checks parameter tags without requiring them on every function", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".tsdoc-check-"));
  try {
    const file = join(directory, "params.ts");
    const lint = (source: string) => {
      writeFileSync(file, source);
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd: root,
        encoding: "utf8",
      });
      const output: { diagnostics: { code: string }[] } = JSON.parse(result.stdout);
      return output.diagnostics.map((diagnostic) => diagnostic.code);
    };

    expect(
      lint(
        "/** Combines values.\n * @param first - First value.\n */\nexport function combine(first: number, second: number) { return first + second; }\n",
      ),
    ).toContain("jsdoc(require-param)");
    expect(
      lint(
        "/** Combines values.\n * @param first\n */\nexport function combine(first: number) { return first; }\n",
      ),
    ).toContain("jsdoc(require-param-description)");
    expect(
      lint(
        "/** Combines values.\n * @param\n */\nexport function combine(first: number) { return first; }\n",
      ),
    ).toContain("jsdoc(require-param-name)");
    expect(lint("/** A value.\n * @public extra\n */\nexport const value = 1;\n")).toContain(
      "jsdoc(empty-tags)",
    );
    expect(
      lint(
        "/** Combines values. */\nexport function combine(first: number, second: number) { return first + second; }\n",
      ),
    ).not.toContain("jsdoc(require-param)");
    expect(
      lint(
        "/** Combines values.\n * @param first - First value.\n * @param second - Second value.\n * @throws If the inputs cannot be combined.\n */\nexport function combine(first: number, second: number) { return first + second; }\n",
      ),
    ).toEqual([]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the package type check fails on missing declarations and cleans its tarball", () => {
  const directory = mkdtempSync(join(tmpdir(), "cssdoc-attw-test-"));
  try {
    const packageDir = join(directory, "package");
    const scratchDir = join(directory, "scratch");
    mkdirSync(packageDir);
    mkdirSync(scratchDir);
    symlinkSync(
      fileURLToPath(new URL("../../../node_modules", import.meta.url)),
      join(packageDir, "node_modules"),
      "junction",
    );
    writeFileSync(
      join(packageDir, "package.json"),
      JSON.stringify({
        name: "cssdoc-attw-test",
        version: "1.0.0",
        type: "module",
        exports: "./index.js",
      }),
    );
    writeFileSync(join(packageDir, "index.js"), "export const example = 1;\n");
    const script = fileURLToPath(
      new URL("../../../scripts/check-package-types.mjs", import.meta.url),
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: packageDir,
      encoding: "utf8",
      env: { ...process.env, TMPDIR: scratchDir, TMP: scratchDir, TEMP: scratchDir },
    });

    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).toContain("ATTW: package has no type declarations");
    expect(readdirSync(scratchDir).filter((entry) => entry.startsWith("cssdoc-attw-"))).toEqual([]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
