import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const REGISTRY_SECTION = /^\[cssdoc-language-server\]\s*$/gmu;
const NEXT_SECTION = /^\[/mu;
const REGISTRY_SUBMODULE = /^submodule = "extensions\/cssdoc-language-server"$/mu;
const REGISTRY_PATH = /^path = "servers\/zed"$/mu;
const REGISTRY_VERSION = /^version = "[^"]+"$/gmu;

export function updateRegistryVersion(content, version) {
  if (!RELEASE_VERSION.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  const sections = [...content.matchAll(REGISTRY_SECTION)];
  if (sections.length !== 1) throw new Error("Expected one cssdoc-language-server registry entry");
  const start = sections[0].index;
  const next = content.slice(start + sections[0][0].length).search(NEXT_SECTION);
  const end = next < 0 ? content.length : start + sections[0][0].length + next;
  const entry = content.slice(start, end);
  if (!REGISTRY_SUBMODULE.test(entry)) {
    throw new Error("Unexpected Zed registry submodule");
  }
  if (!REGISTRY_PATH.test(entry)) {
    throw new Error("Unexpected Zed registry extension path");
  }
  const versions = [...entry.matchAll(REGISTRY_VERSION)];
  if (versions.length !== 1) throw new Error("Expected one Zed registry version");
  return (
    content.slice(0, start) +
    entry.replace(versions[0][0], `version = "${version}"`) +
    content.slice(end)
  );
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const [file, version] = process.argv.slice(2);
  if (!file || !version) {
    throw new Error("Usage: node update-zed-registry.mjs <extensions.toml> <version>");
  }
  const content = readFileSync(file, "utf8");
  writeFileSync(file, updateRegistryVersion(content, version));
}
