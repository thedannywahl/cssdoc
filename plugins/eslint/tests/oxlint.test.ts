/**
 * Verifies `cssdoc/valid-class-usage`'s JS/JSX half loads and runs under oxlint's `jsPlugins` bridge
 * (see #37), and asserts it reports the identical diagnostic ESLint reports for the same fixture.
 *
 * oxlint resolves a `jsPlugins` specifier through normal Node module resolution from the linted
 * project's `node_modules` — there's no workspace-aware resolution the way pnpm gives packages that
 * declare `@cssdoc/eslint-plugin` as a real dependency. `fixtures/oxlint/` isn't such a package (it
 * can't depend on the plugin it's testing), so this test links `@cssdoc/eslint-plugin` into a
 * throwaway `node_modules/` under the fixture at run time, the way a real consumer's own
 * `node_modules` would already have it installed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { Linter } from "eslint";
import { expect, test } from "vite-plus/test";
import plugin from "../src/index.ts";

const PLUGIN_ROOT = resolve(import.meta.dirname, "..");
const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures/oxlint");
const CONSUMER_JSX = "consumer.jsx";

/** Link `@cssdoc/eslint-plugin` into the fixture's own `node_modules`, as a real consumer would have. */
function linkPluginIntoFixture(): void {
  const scopeDir = resolve(FIXTURE_DIR, "node_modules/@cssdoc");
  const linkPath = resolve(scopeDir, "eslint-plugin");
  if (existsSync(linkPath)) return;
  mkdirSync(scopeDir, { recursive: true });
  symlinkSync(PLUGIN_ROOT, linkPath, "dir");
}

/** The real, installed `oxlint` binary (not the Vite+ IDE-only wrapper `.bin/oxlint` shadows it with). */
function resolveOxlintBin(): string {
  const require = createRequire(import.meta.url);
  const pkgPath = require.resolve("oxlint/package.json");
  return resolve(dirname(pkgPath), "bin/oxlint");
}

interface OxlintDiagnostic {
  message: string;
  code: string;
}

function runOxlint(): OxlintDiagnostic[] {
  linkPluginIntoFixture();
  const bin = resolveOxlintBin();
  let output: string;
  try {
    // oxlint exits non-zero when it reports an error-severity diagnostic — that's the expected outcome
    // here, not a failure to run, so read stdout off the thrown error rather than treating it as one.
    output = execFileSync(
      process.execPath,
      [bin, "--config", ".oxlintrc.json", "--format", "json", CONSUMER_JSX],
      { cwd: FIXTURE_DIR, encoding: "utf8" },
    );
  } catch (error) {
    output = (error as { stdout: string }).stdout;
  }
  return (JSON.parse(output) as { diagnostics: OxlintDiagnostic[] }).diagnostics;
}

function runEslint(): string[] {
  const code = `export const Button = () => <button className="button -bogus" />;\n`;
  const linter = new Linter();
  return linter
    .verify(
      code,
      [
        {
          files: ["**/*.jsx"],
          languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { cssdoc: plugin },
          rules: {
            "cssdoc/valid-class-usage": [
              "error",
              { css: [resolve(FIXTURE_DIR, "components.css")], modifierConvention: "rscss" },
            ],
          },
        },
      ] as Parameters<Linter["verify"]>[1],
      "test.jsx",
    )
    .map((m) => m.message);
}

test("cssdoc/valid-class-usage loads and runs under oxlint's jsPlugins bridge", () => {
  const diagnostics = runOxlint();
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]?.code).toBe("cssdoc(valid-class-usage)");
});

test("oxlint and eslint report the identical diagnostic for the same JSX usage", () => {
  const oxlintMessages = runOxlint().map((d) => d.message);
  const eslintMessages = runEslint();
  expect(oxlintMessages).toEqual(eslintMessages);
});
