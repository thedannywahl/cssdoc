import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function updateRegistryVersion(content, version) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  const sections = [...content.matchAll(/^\[cssdoc-language-server\]\s*$/gmu)];
  if (sections.length !== 1) throw new Error("Expected one cssdoc-language-server registry entry");
  const start = sections[0].index;
  const next = content.slice(start + sections[0][0].length).search(/^\[/mu);
  const end = next < 0 ? content.length : start + sections[0][0].length + next;
  const entry = content.slice(start, end);
  if (!/^submodule = "extensions\/cssdoc-language-server"$/mu.test(entry)) {
    throw new Error("Unexpected Zed registry submodule");
  }
  if (!/^path = "servers\/zed"$/mu.test(entry)) {
    throw new Error("Unexpected Zed registry extension path");
  }
  const versions = [...entry.matchAll(/^version = "[^"]+"$/gmu)];
  if (versions.length !== 1) throw new Error("Expected one Zed registry version");
  return (
    content.slice(0, start) +
    entry.replace(versions[0][0], `version = "${version}"`) +
    content.slice(end)
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, version] = process.argv.slice(2);
  if (!file || !version)
    throw new Error("Usage: node update-zed-registry.mjs <extensions.toml> <version>");
  const content = readFileSync(file, "utf8");
  writeFileSync(file, updateRegistryVersion(content, version));
}
