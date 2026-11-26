import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, expect, test } from "vite-plus/test";

import { syncZedVersion } from "./sync-zed-version.mjs";

const directories = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "cssdoc-zed-version-"));
  directories.push(directory);
  const files = {
    "servers/language-server/package.json": '{"version":"1.2.3-beta.1"}',
    "servers/zed/extension.toml": 'id = "test"\nversion = "1.0.0"\n',
    "servers/zed/Cargo.toml": '[package]\nname = "cssdoc-zed"\nversion = "0.1.0"\n',
    "servers/zed/Cargo.lock":
      '[[package]]\nname = "cssdoc-zed"\nversion = "0.1.0"\n\n[[package]]\nname = "dependency"\nversion = "0.1.0"\n',
    "servers/zed/src/lib.rs": 'const VERSION: &str = "1.0.0";\n',
  };
  for (const [path, content] of Object.entries(files)) {
    const file = join(directory, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return directory;
}

test("updates all Zed release versions and detects drift", () => {
  const directory = fixture();
  expect(() => syncZedVersion(directory)).toThrow("Zed versions differ");
  expect(syncZedVersion(directory, true)).toBe("1.2.3-beta.1");
  expect(syncZedVersion(directory)).toBe("1.2.3-beta.1");
  expect(readFileSync(join(directory, "servers/zed/Cargo.lock"), "utf8")).toContain(
    'name = "dependency"\nversion = "0.1.0"',
  );
});

test("rejects malformed or duplicate fields without writing partial changes", () => {
  const directory = fixture();
  const manifest = join(directory, "servers/zed/extension.toml");
  const original = readFileSync(manifest, "utf8");
  writeFileSync(manifest, `${original}version = "1.0.0"\n`);
  expect(() => syncZedVersion(directory, true)).toThrow("Expected one version field");
  expect(readFileSync(join(directory, "servers/zed/Cargo.toml"), "utf8")).toContain(
    'version = "0.1.0"',
  );
});
