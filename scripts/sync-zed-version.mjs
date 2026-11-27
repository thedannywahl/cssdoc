import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const fields = [
  ["servers/zed/extension.toml", /^(version = ")([^"]+)(")$/gmu],
  ["servers/zed/Cargo.toml", /^(\[package\]\nname = "cssdoc-zed"\nversion = ")([^"]+)(")$/gmu],
  ["servers/zed/Cargo.lock", /^(\[\[package\]\]\nname = "cssdoc-zed"\nversion = ")([^"]+)(")$/gmu],
  ["servers/zed/src/lib.rs", /^(const VERSION: &str = ")([^"]+)(";)$/gmu],
];

export function syncZedVersion(directory, write = false) {
  const packagePath = resolve(directory, "servers/language-server/package.json");
  const version = JSON.parse(readFileSync(packagePath, "utf8")).version;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
    throw new Error(`Invalid language-server version in ${packagePath}: ${version}`);
  }

  const changes = fields.map(([path, pattern]) => {
    const file = resolve(directory, path);
    const content = readFileSync(file, "utf8");
    const matches = [...content.matchAll(pattern)];
    if (matches.length !== 1) throw new Error(`Expected one version field in ${path}`);
    const current = matches[0][2];
    return {
      file,
      path,
      current,
      content: content.replace(pattern, (_match, before, _old, after) => before + version + after),
    };
  });

  const mismatches = changes.filter(({ current }) => current !== version);
  if (!write && mismatches.length) {
    throw new Error(
      `Zed versions differ from ${version}: ${mismatches.map(({ path, current }) => `${path} (${current})`).join(", ")}`,
    );
  }
  if (write) {
    for (const { file, content } of mismatches) writeFileSync(file, content);
  }
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (mode !== "--write" && mode !== "--check") {
    throw new Error("Usage: node scripts/sync-zed-version.mjs --write|--check");
  }
  syncZedVersion(root, mode === "--write");
}
