import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, expect, test, vi } from "vite-plus/test";

import docsConfig from "../../../docs/vite.config.ts";
import grammarConfig from "../../../syntaxes/cssdoc/tmlanguage/vite.config.ts";
import tsdocConfig from "../../../tsdoc.json" with { type: "json" };
import cliConfig from "../../cli/vite.config.ts";
import regexConfig from "../../regex/vite.config.ts";
import { CSSDOC_TAG_NAMES, CSSDOC_TAGS } from "../../spec/src/index.ts";

vi.setConfig({ testTimeout: 30_000 });

afterAll(() => vi.resetConfig());

interface LintDiagnostic {
  code: string;
  severity: string;
  filename: string;
  message: string;
  help?: string;
  labels: { span: { line: number } }[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function isLintDiagnostic(diagnostic: unknown): diagnostic is LintDiagnostic {
  if (
    !isObject(diagnostic) ||
    typeof diagnostic.code !== "string" ||
    typeof diagnostic.severity !== "string" ||
    typeof diagnostic.filename !== "string" ||
    typeof diagnostic.message !== "string" ||
    (diagnostic.help !== undefined && typeof diagnostic.help !== "string") ||
    !Array.isArray(diagnostic.labels)
  ) {
    return false;
  }
  return diagnostic.labels.every(
    (label: unknown) =>
      isObject(label) && isObject(label.span) && typeof label.span.line === "number",
  );
}

function parseLintOutput(json: string): { diagnostics: LintDiagnostic[] } {
  const value: unknown = JSON.parse(json);
  if (
    !isObject(value) ||
    !Array.isArray(value.diagnostics) ||
    !value.diagnostics.every(isLintDiagnostic)
  ) {
    throw new Error("Unexpected lint JSON output");
  }
  return { diagnostics: value.diagnostics };
}

test("the TypeScript catalog matches the compiler revision targeted by Vite+'s tsrs", () => {
  const require = createRequire(import.meta.url);
  const viteRequire = createRequire(require.resolve("vite-plus/package.json"));
  const typescript: unknown = require("typescript/package.json");
  const tsrs: unknown = viteRequire("tsrs/package.json");
  if (
    !isObject(typescript) ||
    typeof typescript.version !== "string" ||
    typeof typescript.gitHead !== "string" ||
    !isObject(tsrs) ||
    !isObject(tsrs.tsrs) ||
    typeof tsrs.tsrs.typescriptVersion !== "string" ||
    typeof tsrs.tsrs.typescriptCommit !== "string"
  ) {
    throw new Error("Unexpected TypeScript or tsrs package metadata");
  }

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
      const result = parseLintOutput(output);
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

test("unassigned CSS imports are allowed while other side-effect imports warn", () => {
  const directory = mkdtempSync(join(tmpdir(), "cssdoc-imports-"));
  try {
    const file = join(directory, "imports.test.js");
    writeFileSync(
      file,
      'import "normalize.css";\nimport "./custom.css";\nimport "./nested/site.css";\nimport "./setup.js";\n',
    );
    for (const workspace of ["../../../", "../../../servers/vscode/"]) {
      const cwd = fileURLToPath(new URL(workspace, import.meta.url));
      const lint = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(lint.status).toBe(0);
      const result = parseLintOutput(lint.stdout);
      expect(
        result.diagnostics
          .filter((diagnostic) => diagnostic.code === "import(no-unassigned-import)")
          .map((diagnostic) => [diagnostic.severity, diagnostic.labels[0].span.line]),
      ).toEqual([["warning", 4]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("style fixes preserve explicit Vitest imports, strict assertions, and catalog order", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".style-check-"));
  try {
    const file = join(directory, "style.test.ts");
    writeFileSync(
      file,
      [
        'import { expect, test } from "vite-plus/test";',
        "",
        'test("checks a catalog", () => {',
        "  const catalog = { zebra: 1, alpha: 2 };",
        "  let actual = false;",
        "  if (catalog.zebra)",
        "    actual = true;",
        "  expect(actual).toBe(true);",
        "  expect(false).toBe(false);",
        "});",
        "",
      ].join("\n"),
    );
    const lint = (...args: string[]) =>
      spawnSync("vp", ["lint", "--no-ignore", "--format", "json", ...args, file], {
        cwd: root,
        encoding: "utf8",
      });
    const before = lint();
    expect(before.status, `${before.stdout}\n${before.stderr}`).toBe(0);
    const diagnostics = parseLintOutput(before.stdout);
    expect(diagnostics.diagnostics.map(({ code }) => code)).toContain("eslint(curly)");
    expect(lint("--fix").status).toBe(0);
    const after = parseLintOutput(lint().stdout);
    expect(after.diagnostics.map(({ code }) => code)).not.toContain("eslint(curly)");
    const fixed = readFileSync(file, "utf8");
    expect(fixed).toContain('from "vite-plus/test"');
    expect(fixed).toContain("expect(actual).toBe(true)");
    expect(fixed).toContain("expect(false).toBe(false)");
    expect(fixed).toContain("{ zebra: 1, alpha: 2 }");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("style lint allows literal security fixtures but checks production strings", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".style-check-"));
  try {
    const source = 'const template = "${value}";\nconst url = "javascript:alert(1)";\n';
    const diagnostics = (name: string) => {
      const file = join(directory, name);
      writeFileSync(file, source);
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd: root,
        encoding: "utf8",
      });
      const output = parseLintOutput(result.stdout);
      return output.diagnostics.map(({ code }) => code);
    };
    const fixture = diagnostics("literal.test.js");
    const production = diagnostics("literal.js");
    for (const rule of ["eslint(no-template-curly-in-string)", "eslint(no-script-url)"]) {
      expect(fixture).not.toContain(rule);
      expect(production).toContain(rule);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("restriction lint preserves repository conventions and checks unsafe forms", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".restriction-check-"));
  try {
    const diagnostics = (name: string, source: string) => {
      const file = join(directory, name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, source);
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd: root,
        encoding: "utf8",
      });
      const output = parseLintOutput(result.stdout);
      return output.diagnostics.map(({ code }) => code);
    };
    const production = diagnostics(
      "sample.js",
      [
        "function reassign(value) { value = 1; return value; }",
        "function caller() { return hoisted(); }",
        "function hoisted() { return 1; }",
        "const earlier = later;",
        "const later = 2;",
        "const discarded = void 0;",
        "console.log(reassign(earlier), discarded, process.env.CSSDOC_TEST);",
        "export default reassign;",
      ].join("\n"),
    );
    for (const rule of [
      "eslint(no-param-reassign)",
      "eslint(no-use-before-define)",
      "eslint(no-void)",
      "eslint(no-console)",
      "node(no-process-env)",
    ]) {
      expect(production).toContain(rule);
    }
    expect(production.filter((rule) => rule === "eslint(no-use-before-define)")).toHaveLength(1);
    expect(production).not.toContain("import(no-default-export)");
    const allowed = diagnostics("allowed.js", 'console.error("error");\nvoid Promise.resolve();\n');
    expect(allowed).not.toContain("eslint(no-console)");
    expect(allowed).not.toContain("eslint(no-void)");
    const fixture = diagnostics(
      "example.test.js",
      [
        'import { expect, test } from "vite-plus/test";',
        'test("uses supported patterns", () => {',
        "  let count = 0;",
        "  count++;",
        "  expect(undefined).toBeUndefined();",
        "  expect(count).toBe(1);",
        "  console.log(process.env.CSSDOC_TEST);",
        "});",
      ].join("\n"),
    );
    for (const rule of [
      "eslint(no-undefined)",
      "eslint(no-plusplus)",
      "eslint(no-console)",
      "node(no-process-env)",
      "vitest(require-test-timeout)",
    ]) {
      expect(fixture).not.toContain(rule);
    }
    const script = diagnostics(
      "scripts/build.mjs",
      'await Promise.resolve();\nconsole.log("done");',
    );
    expect(script).not.toContain("node(no-top-level-await)");
    expect(script).not.toContain("eslint(no-console)");
    expect(diagnostics("ambient.d.ts", 'declare module "example" {}')).not.toContain(
      "import(unambiguous)",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint prefers native import.meta path properties", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".import-meta-check-"));
  try {
    const file = join(directory, "paths.mjs");
    writeFileSync(
      file,
      [
        'import { fileURLToPath } from "node:url";',
        "const legacy = fileURLToPath(import.meta.url);",
        "const modern = import.meta.filename;",
        "const relative = fileURLToPath(new URL('..', import.meta.url));",
        "console.error(legacy, modern, relative);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(prefer-import-meta-properties)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint prefers flat for flattening arrays", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".array-flat-check-"));
  try {
    const file = join(directory, "arrays.mjs");
    writeFileSync(
      file,
      [
        "const values = [[1], [2]];",
        "const legacy = values.flatMap((value) => value);",
        "const flat = values.flat();",
        "const mapped = values.flatMap((value) => value.map((number) => number + 1));",
        "console.error(legacy, flat, mapped);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(prefer-array-flat)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint prefers sets for repeated membership checks", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".set-has-check-"));
  try {
    const file = join(directory, "membership.mjs");
    writeFileSync(
      file,
      [
        "const values = ['one', 'two'];",
        "function unsafe(value) { return values.includes(value); }",
        "const set = new Set(['one', 'two']);",
        "function safe(value) { return set.has(value); }",
        "console.error(unsafe('one'), safe('two'));",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(prefer-set-has)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 1]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint prefers replaceAll for global replacements", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".replace-all-check-"));
  try {
    const file = join(directory, "replace.mjs");
    writeFileSync(
      file,
      [
        "const legacy = 'banana'.replace(/a/gu, 'o');",
        "const modern = 'banana'.replaceAll('a', 'o');",
        "const first = 'banana'.replace('a', 'o');",
        "console.error(legacy, modern, first);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(prefer-string-replace-all)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 1]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint flags callback references that receive extra iterator arguments", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".callback-check-"));
  try {
    const file = join(directory, "callbacks.mjs");
    writeFileSync(
      file,
      [
        "const input = ['10', '10'];",
        "const unsafe = input.map(parseInt);",
        "const safe = input.map((value) => parseInt(value, 10));",
        "console.error(unsafe, safe);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(no-array-callback-reference)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint prefers Unicode code point APIs", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".code-point-check-"));
  try {
    const file = join(directory, "unicode.mjs");
    writeFileSync(
      file,
      [
        "const legacy = String.fromCharCode(65);",
        "const modern = String.fromCodePoint(65);",
        "const code = modern.charCodeAt(0);",
        "const point = modern.codePointAt(0);",
        "console.error(legacy, modern, code, point);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(prefer-code-point)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([
        ["warning", 1],
        ["warning", 3],
      ]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("import lint flags anonymous default exports", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".default-export-check-"));
  try {
    const unsafe = join(directory, "unsafe.mjs");
    const safe = join(directory, "safe.mjs");
    writeFileSync(unsafe, "export default { name: 'card' };\n");
    writeFileSync(safe, "const card = { name: 'card' };\nexport default card;\n");
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", unsafe, safe], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "import(no-anonymous-default-export)")
          .map(({ severity, filename }) => [severity, filename.endsWith("unsafe.mjs")]),
      ).toEqual([["warning", true]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("promise lint prefers catch while allowing VS Code Thenable handlers", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const vscode = fileURLToPath(new URL("../../../servers/vscode/", import.meta.url));
  const directory = mkdtempSync(join(root, ".promise-catch-check-"));
  try {
    const file = join(directory, "promises.mjs");
    const extension = join(vscode, "src/index.ts");
    writeFileSync(
      file,
      [
        "const work = Promise.resolve(1);",
        "void work.then((value) => value, (error) => console.error(error));",
        "void work.catch((error) => console.error(error));",
      ].join("\n"),
    );
    for (const cwd of [root, vscode]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file, extension], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "promise(prefer-catch)")
          .map(({ severity, filename, labels }) => [
            severity,
            filename.endsWith("promises.mjs"),
            labels[0].span.line,
          ]),
      ).toEqual([["warning", true, 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Vitest lint flags ambiguous truthiness assertions", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".boolean-matchers-check-"));
  try {
    const file = join(directory, "assertions.test.ts");
    writeFileSync(
      file,
      [
        'import { expect, test } from "vite-plus/test";',
        'test("checks booleans", () => {',
        "  expect(true).toBeTruthy();",
        "  expect(false).toBe(false);",
        "});",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "vitest(prefer-strict-boolean-matchers)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 3]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("JSDoc lint requires parameter and return types in JavaScript but not TypeScript", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".jsdoc-types-check-"));
  try {
    const javascript = join(directory, "example.mjs");
    const typescript = join(directory, "example.ts");
    writeFileSync(
      javascript,
      [
        "/** @param value - Input.\n * @returns Output. */",
        "function unsafe(value) { return value; }",
        "/** @param {string} value - Input.\n * @returns {string} Output. */",
        "function safe(value) { return value; }",
        "console.error(unsafe('a'), safe('b'));",
      ].join("\n"),
    );
    writeFileSync(
      typescript,
      "/** @param value - Input.\n * @returns Output. */\nfunction typed(value: string) { return value; }\nconsole.error(typed('a'));\n",
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync(
        "vp",
        ["lint", "--no-ignore", "--format", "json", javascript, typescript],
        { cwd, encoding: "utf8" },
      );
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "jsdoc(require-param-type)")
          .map(({ severity, filename, labels }) => [
            severity,
            filename.endsWith("example.mjs"),
            labels[0].span.line,
          ]),
      ).toEqual([["warning", true, 1]]);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "jsdoc(require-returns-type)")
          .map(({ severity, filename, labels }) => [
            severity,
            filename.endsWith("example.mjs"),
            labels[0].span.line,
          ]),
      ).toEqual([["warning", true, 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint rejects accidental switch fallthrough", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".fallthrough-check-"));
  try {
    const file = join(directory, "switches.mjs");
    writeFileSync(
      file,
      [
        "function broken(value) {",
        "  switch (value) {",
        '    case 1: console.error("one");',
        '    case 2: return "two";',
        '    default: return "other";',
        "  }",
        "}",
        "function intentional(value) {",
        "  switch (value) {",
        '    case 1: console.error("one");',
        "      // falls through",
        '    case 2: return "two";',
        '    default: return "other";',
        "  }",
        "}",
        "console.error(broken(1), intentional(1));",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "eslint(no-fallthrough)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["error", 4]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint rejects recursive accessors", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".accessor-check-"));
  try {
    const file = join(directory, "accessors.mjs");
    writeFileSync(
      file,
      [
        "class Broken { get value() { return this.value; } }",
        "class Safe { get value() { return this.backing; } }",
        "console.error(new Broken(), new Safe());",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(no-accessor-recursion)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["error", 1]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lint rejects filling arrays with shared references", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".array-fill-check-"));
  try {
    const file = join(directory, "arrays.mjs");
    writeFileSync(
      file,
      [
        "const unsafe = Array(3).fill({});",
        "const safe = Array.from({ length: 3 }, () => ({}));",
        "const primitives = Array(3).fill(0);",
        "console.error(unsafe, safe, primitives);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "unicorn(no-array-fill-with-reference-type)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["error", 1]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("selected nursery rules check control flow, imports, and Node ESM globals", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".nursery-check-"));
  try {
    writeFileSync(join(directory, "exports.js"), "export const present = 1;\n");
    const file = join(directory, "sample.mjs");
    writeFileSync(
      file,
      [
        'import { missing } from "./exports.js";',
        "function deadStore() { let value = 1; value = 2; return value; }",
        "function first(items) { for (const item of items) return item; }",
        "console.error(process.version, missing, deadStore(), first([]), unknownName, require);",
      ].join("\n"),
    );
    const valid = join(directory, "valid.mjs");
    writeFileSync(
      valid,
      [
        'import { present } from "./exports.js";',
        "function sum(items) { let total = 0; for (const item of items) total += item; return total; }",
        "console.error(process.version, present, sum([1]));",
      ].join("\n"),
    );
    for (const workspace of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file, valid], {
        cwd: workspace,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      const output = parseLintOutput(result.stdout);
      const sample = output.diagnostics.filter(({ filename }) => filename.endsWith("sample.mjs"));
      for (const code of ["eslint(no-unreachable-loop)", "eslint(no-useless-assignment)"]) {
        expect(sample.filter((diagnostic) => diagnostic.code === code)).toMatchObject([
          { severity: "error" },
        ]);
      }
      expect(sample.filter(({ code }) => code === "import(named)")).toMatchObject([
        { severity: "warning" },
      ]);
      const undefinedNames = sample.filter(({ code }) => code === "eslint(no-undef)");
      expect(undefinedNames.every(({ severity }) => severity === "warning")).toBe(true);
      expect(undefinedNames.map(({ message }) => message).sort()).toEqual([
        "'require' is not defined.",
        "'unknownName' is not defined.",
      ]);
      expect(
        output.diagnostics.filter(
          ({ filename, code }) =>
            filename.endsWith("valid.mjs") &&
            [
              "eslint(no-unreachable-loop)",
              "eslint(no-useless-assignment)",
              "import(named)",
              "eslint(no-undef)",
            ].includes(code),
        ),
      ).toEqual([]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint rejects floating and misused promises", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "promises.ts");
    writeFileSync(
      file,
      [
        "async function work() { return 1; }",
        "work();",
        "void work();",
        "const handler: () => void = () => Promise.resolve(1);",
        "handler();",
      ].join("\n"),
    );
    const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
    const output = parseLintOutput(result.stdout);
    expect(
      output.diagnostics
        .filter(({ code }) => code === "typescript(no-floating-promises)")
        .map(({ severity, labels }) => [severity, labels[0].span.line]),
    ).toEqual([["error", 2]]);
    expect(
      output.diagnostics
        .filter(({ code }) => code === "typescript(no-misused-promises)")
        .map(({ severity, labels }) => [severity, labels[0].span.line]),
    ).toEqual([["error", 4]]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint detects unsafe boundaries", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "unsafe.ts");
    writeFileSync(
      file,
      [
        'const value = JSON.parse("{}");',
        "const assigned: string = value;",
        "function take(input: string) { return input; }",
        "take(value);",
        "value.run();",
        "const member = value.name;",
        'function returned(): string { return JSON.parse("\\"\\""); }',
        "console.error(assigned, member, returned());",
      ].join("\n"),
    );
    const rules = [
      "no-unsafe-assignment",
      "no-unsafe-argument",
      "no-unsafe-call",
      "no-unsafe-member-access",
      "no-unsafe-return",
    ];
    const safe = join(directory, "safe.ts");
    writeFileSync(safe, 'const value: unknown = JSON.parse("{}");\nconsole.error(value);\n');
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const configured = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file, safe], {
        cwd,
        encoding: "utf8",
      });
      expect(configured.status, `${configured.stdout}\n${configured.stderr}`).toBe(1);
      for (const rule of rules) {
        const diagnostics = parseLintOutput(configured.stdout).diagnostics.filter(
          ({ code }) => code === `typescript(${rule})`,
        );
        expect(
          diagnostics.some(
            ({ severity, filename }) => severity === "error" && filename.endsWith("unsafe.ts"),
          ),
        ).toBe(true);
        expect(diagnostics.some(({ filename }) => filename.endsWith("/safe.ts"))).toBe(false);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("TypeScript lint rejects the unsafe Function type", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    const file = join(directory, "functions.ts");
    writeFileSync(
      file,
      [
        "let unsafe: Function;",
        "let safe: (value: string) => void;",
        "console.error(unsafe, safe);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(no-unsafe-function-type)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["error", 1]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint rejects unsafe enum assignments and comparisons", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "enums.ts");
    writeFileSync(
      file,
      [
        "enum Status { Ready, Done }",
        "function unsafe(value: number) { const status: Status = value; return status; }",
        "function safe() { const status: Status = Status.Ready; return status; }",
        'enum Mode { Ready = "ready", Done = "done" }',
        "function unsafeComparison(mode: Mode, value: string) { return mode === value; }",
        "function safeComparison(mode: Mode) { return mode === Mode.Ready; }",
        'console.error(unsafe(0), safe(), unsafeComparison(Mode.Ready, "ready"), safeComparison(Mode.Ready));',
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(no-unsafe-enum-assignment)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["error", 2]]);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(no-unsafe-enum-comparison)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["error", 5]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint requires comparators for non-string array sorts", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "sort.ts");
    writeFileSync(
      file,
      [
        "const numbers = [10, 2];",
        "numbers.sort();",
        "numbers.toSorted((a, b) => a - b);",
        '["b", "a"].sort();',
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(require-array-sort-compare)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint flags deprecated APIs", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "deprecated.ts");
    writeFileSync(
      file,
      [
        "/** @deprecated Use modern instead. */",
        "function old() { return 1; }",
        "function modern() { return 1; }",
        "console.error(old(), modern());",
        "interface Example {",
        "  /** @deprecated */ rootUri: string;",
        "  /** @deprecated */ configurationSection: string;",
        "}",
        "function local(value: Example) { console.error(value.rootUri, value.configurationSection); }",
        "local({ rootUri: '', configurationSection: '' });",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(no-deprecated)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([
        ["warning", 4],
        ["warning", 9],
        ["warning", 9],
        ["warning", 10],
        ["warning", 10],
      ]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint flags confusing void expressions but allows concise callbacks", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "void.ts");
    writeFileSync(
      file,
      [
        "function work(): void {}",
        "const result = work();",
        "const callback = () => work();",
        "work();",
        "console.error(result, callback);",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(no-confusing-void-expression)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint flags inconsistent return paths", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "returns.ts");
    writeFileSync(
      file,
      [
        "function unsafe(flag: boolean) { if (flag) return 1; }",
        "function safe(flag: boolean) { if (flag) return 1; return undefined; }",
        "console.error(unsafe(true), safe(false));",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(consistent-return)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 1]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint flags unsafe template interpolations", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "templates.ts");
    writeFileSync(
      file,
      [
        "function render(value: Date, optional: string | undefined, count: number) {",
        "  const unsafe = `${value} ${optional}`;",
        "  console.error(unsafe);",
        "  return `${value.toISOString()} ${optional ?? 'missing'} ${count}`;",
        "}",
        "console.error(render(new Date(), undefined, 1));",
      ].join("\n"),
    );
    const javascript = join(directory, "templates.mjs");
    writeFileSync(javascript, "const value = new Date();\nconsole.error(`${value}`);\n");
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync(
        "vp",
        ["lint", "--no-ignore", "--format", "json", file, javascript],
        {
          cwd,
          encoding: "utf8",
        },
      );
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(restrict-template-expressions)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([
        ["warning", 2],
        ["warning", 2],
      ]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type-aware lint prefers nullish defaults without changing falsy primitive defaults", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "defaults.ts");
    writeFileSync(
      file,
      [
        "function render(value: { name: string } | undefined, label: string | undefined) {",
        "  const legacy = value || { name: 'default' };",
        "  const modern = value ?? { name: 'default' };",
        "  const nonempty = label || 'default';",
        "  return [legacy, modern, nonempty];",
        "}",
        "console.error(render(undefined, ''));",
      ].join("\n"),
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(
        parseLintOutput(result.stdout)
          .diagnostics.filter(({ code }) => code === "typescript(prefer-nullish-coalescing)")
          .map(({ severity, labels }) => [severity, labels[0].span.line]),
      ).toEqual([["warning", 2]]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("type import lint requires type-only imports", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(join(directory, "dependency.ts"), "export interface Item { name: string; }\n");
    const file = join(directory, "imports.ts");
    writeFileSync(
      file,
      [
        'import { Item } from "./dependency.ts";',
        'import { type Item as InlineItem } from "./dependency.ts";',
        'import type { Item as TypeItem } from "./dependency.ts";',
        "export type Example = Item | InlineItem | TypeItem;",
        "export function inferred() { return 1; }",
        "export function declared(): number { return 1; }",
      ].join("\n"),
    );
    const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
    const output = parseLintOutput(result.stdout);
    expect(output.diagnostics).toContainEqual(
      expect.objectContaining({ code: "typescript(consistent-type-imports)", severity: "error" }),
    );
    expect(
      output.diagnostics
        .filter(({ code }) => code === "typescript(no-import-type-side-effects)")
        .map(({ severity, labels }) => [severity, labels[0].span.line]),
    ).toEqual([["error", 2]]);
    expect(
      output.diagnostics
        .filter(({ code }) => code === "typescript(explicit-module-boundary-types)")
        .map(({ severity, labels }) => [severity, labels[0].span.line]),
    ).toEqual([["error", 5]]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("switch lint requires cases or an intentional fallback", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    writeFileSync(
      join(directory, "tsconfig.json"),
      JSON.stringify({ extends: join(root, "tsconfig.base.json"), include: ["*.ts"] }),
    );
    const file = join(directory, "switches.ts");
    writeFileSync(
      file,
      [
        'type State = "open" | "closed";',
        'function incomplete(state: State) { switch (state) { case "open": return 1; } }',
        'function fallback(state: State) { switch (state) { case "open": return 1; default: return 0; } }',
        'function complete(state: State) { switch (state) { case "open": return 1; case "closed": return 0; } }',
        'console.error(incomplete("open"), fallback("open"), complete("open"));',
      ].join("\n"),
    );
    const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
    const output = parseLintOutput(result.stdout);
    expect(
      output.diagnostics
        .filter(({ code }) => code === "typescript(switch-exhaustiveness-check)")
        .map(({ severity, labels }) => [severity, labels[0].span.line]),
    ).toEqual([["error", 2]]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("TypeScript lint rejects require calls and explicit any", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    const file = join(directory, "imports.ts");
    writeFileSync(
      file,
      'const fs = require("node:fs");\nconst value: any = 1;\nconsole.error(fs, value);\n',
    );
    const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
    expect(parseLintOutput(result.stdout).diagnostics).toContainEqual(
      expect.objectContaining({ code: "typescript(no-require-imports)", severity: "error" }),
    );
    expect(parseLintOutput(result.stdout).diagnostics).toContainEqual(
      expect.objectContaining({ code: "typescript(no-explicit-any)", severity: "error" }),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("TypeScript suppression comments require safe alternatives", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, "packages/config/tests/type-aware-check-"));
  try {
    const file = join(directory, "comments.ts");
    writeFileSync(
      file,
      [
        "// @ts-ignore",
        "const ignored: string = 1;",
        "// @ts-expect-error -- exercise the invalid assignment",
        "const expected: string = 1;",
        "console.error(ignored, expected);",
      ].join("\n"),
    );
    const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
    const diagnostics = parseLintOutput(result.stdout).diagnostics.filter(
      ({ code }) => code === "typescript(ban-ts-comment)",
    );
    expect(diagnostics.map(({ severity, labels }) => [severity, labels[0].span.line])).toEqual([
      ["error", 1],
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Vue lint runs only for the documentation site in root and package runs", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const site = join(root, "docs");
  const siteDirectory = mkdtempSync(join(site, ".vue-lint-check-"));
  const otherDirectory = mkdtempSync(join(root, "packages/config/tests/vue-lint-check-"));
  try {
    const source = [
      '<script setup lang="ts">',
      "const { label } = defineProps<{ label: string }>();",
      "console.error(label);",
      "</script>",
    ].join("\n");
    const siteFile = join(siteDirectory, "sample.vue");
    const safeFile = join(siteDirectory, "safe.vue");
    const otherFile = join(otherDirectory, "sample.vue");
    writeFileSync(siteFile, source);
    writeFileSync(
      safeFile,
      [
        '<script setup lang="ts">',
        "const props = defineProps<{ label: string; value: string }>();",
        "console.error(props.label, props.value);",
        "</script>",
      ].join("\n"),
    );
    writeFileSync(otherFile, source);
    for (const cwd of [root, site]) {
      const result = spawnSync(
        "vp",
        ["lint", "--no-ignore", "--format", "json", siteFile, safeFile],
        {
          cwd,
          encoding: "utf8",
        },
      );
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      const { diagnostics } = parseLintOutput(result.stdout);
      expect(diagnostics).toContainEqual(
        expect.objectContaining({
          code: "vue(define-props-destructuring)",
          severity: "warning",
        }),
      );
      expect(
        diagnostics.filter(
          ({ code, filename }) => code.startsWith("vue(") && filename.endsWith("/safe.vue"),
        ),
      ).toEqual([]);
    }
    const other = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", otherFile], {
      cwd: root,
      encoding: "utf8",
    });
    expect(other.status, `${other.stdout}\n${other.stderr}`).toBe(0);
    expect(
      parseLintOutput(other.stdout).diagnostics.filter(({ code }) => code.startsWith("vue(")),
    ).toEqual([]);
  } finally {
    rmSync(siteDirectory, { recursive: true, force: true });
    rmSync(otherDirectory, { recursive: true, force: true });
  }
});

test("Node imports use the node: protocol in root and package lint runs", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".node-protocol-check-"));
  try {
    const file = join(directory, "imports.mjs");
    writeFileSync(
      file,
      'import fs from "fs";\nimport path from "node:path";\nconsole.error(fs, path);\n',
    );
    for (const cwd of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      const diagnostics = parseLintOutput(result.stdout).diagnostics.filter(
        ({ code }) => code === "unicorn(prefer-node-protocol)",
      );
      expect(diagnostics.map(({ severity, labels }) => [severity, labels[0].span.line])).toEqual([
        ["error", 1],
      ]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("regexp lint detects dangerous native patterns in root and package runs", () => {
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  const directory = mkdtempSync(join(root, ".regexp-check-"));
  try {
    const file = join(directory, "patterns.mjs");
    writeFileSync(
      file,
      [
        "export const literal = /(a+)+$/u;",
        'export const constructor = new RegExp("(a+)+$", "u");',
        "export const moving = /a+$/u;",
        "export const duplicate = /(?:cat|cat)/u;",
        "export const safe = /^a+$/u;",
      ].join("\n"),
    );
    for (const workspace of [root, fileURLToPath(new URL("../../cli/", import.meta.url))]) {
      const result = spawnSync("vp", ["lint", "--no-ignore", "--format", "json", file], {
        cwd: workspace,
        encoding: "utf8",
      });
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(1);
      const output = parseLintOutput(result.stdout);
      const backtracking = output.diagnostics.filter(
        ({ code }) => code === "regexp(no-super-linear-backtracking)",
      );
      expect(
        backtracking
          .toSorted((a, b) => a.labels[0].span.line - b.labels[0].span.line)
          .map(({ labels, severity }) => [labels[0].span.line, severity]),
      ).toEqual([
        [1, "error"],
        [2, "error"],
      ]);
      expect(
        output.diagnostics.some(
          ({ code, severity, labels }) =>
            code === "regexp(no-super-linear-move)" &&
            severity === "warning" &&
            labels[0].span.line === 3,
        ),
      ).toBe(true);
      expect(
        output.diagnostics.some(
          ({ code, severity, labels }) =>
            code === "regexp(no-dupe-disjunctions)" &&
            severity === "warning" &&
            labels[0].span.line === 4,
        ),
      ).toBe(true);
      expect(
        output.diagnostics.filter(
          ({ code, labels }) => code.startsWith("regexp(") && labels[0].span.line === 5,
        ),
      ).toEqual([]);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("TSDoc definitions follow the cssdoc vocabulary", () => {
  const require = createRequire(import.meta.url);
  const pluginRequire = createRequire(require.resolve("eslint-plugin-tsdoc"));
  const tsdoc: unknown = pluginRequire("@microsoft/tsdoc");
  if (
    !isObject(tsdoc) ||
    !isObject(tsdoc.StandardTags) ||
    !Array.isArray(tsdoc.StandardTags.allDefinitions) ||
    !tsdoc.StandardTags.allDefinitions.every(
      (definition: unknown): definition is { tagName: string } =>
        isObject(definition) && typeof definition.tagName === "string",
    )
  ) {
    throw new Error("Unexpected TSDoc standard tag definitions");
  }
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
    const output = parseLintOutput(result.stdout);
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

    writeFileSync(
      file,
      "/** Returns a value.\n * @returns\n */\nexport const value = (): number => 1;\n",
    );
    const missing = lint();
    expect(missing.status).toBe(1);
    const output = parseLintOutput(missing.stdout);
    expect(output.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "jsdoc(require-returns-description)",
    );

    writeFileSync(
      file,
      "/** Returns a value.\n * @returns The value.\n */\nexport const value = (): number => 1;\n",
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
      const output = parseLintOutput(result.stdout);
      return output.diagnostics.map((diagnostic) => diagnostic.code);
    };

    expect(
      lint(
        "/** Combines values.\n * @param first - First value.\n */\nexport function combine(first: number, second: number): number { return first + second; }\n",
      ),
    ).toContain("jsdoc(require-param)");
    expect(
      lint(
        "/** Combines values.\n * @param first\n */\nexport function combine(first: number): number { return first; }\n",
      ),
    ).toContain("jsdoc(require-param-description)");
    expect(
      lint(
        "/** Combines values.\n * @param\n */\nexport function combine(first: number): number { return first; }\n",
      ),
    ).toContain("jsdoc(require-param-name)");
    expect(lint("/** A value.\n * @public extra\n */\nexport const value = 1;\n")).toContain(
      "jsdoc(empty-tags)",
    );
    expect(
      lint(
        "/** Combines values. */\nexport function combine(first: number, second: number): number { return first + second; }\n",
      ),
    ).not.toContain("jsdoc(require-param)");
    expect(
      lint(
        "/** Combines values.\n * @param first - First value.\n * @param second - Second value.\n * @throws If the inputs cannot be combined.\n */\nexport function combine(first: number, second: number): number { return first + second; }\n",
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
