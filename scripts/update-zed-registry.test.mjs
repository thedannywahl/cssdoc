import { expect, test } from "vite-plus/test";

import { updateRegistryVersion } from "./update-zed-registry.mjs";

const registry = `[another]
version = "1.0.0"

[cssdoc-language-server]
submodule = "extensions/cssdoc-language-server"
path = "servers/zed"
version = "0.20.1"

[next]
version = "2.0.0"
`;

test("updates only the Zed registry entry", () => {
  expect(updateRegistryVersion(registry, "0.21.0")).toBe(
    registry.replace('version = "0.20.1"', 'version = "0.21.0"'),
  );
  expect(updateRegistryVersion(updateRegistryVersion(registry, "0.21.0"), "0.21.0")).toBe(
    updateRegistryVersion(registry, "0.21.0"),
  );
});

test("rejects a missing, duplicated, or unexpected registry entry", () => {
  expect(() => updateRegistryVersion("[other]\n", "1.0.0")).toThrow("Expected one");
  expect(() => updateRegistryVersion(registry + registry, "1.0.0")).toThrow("Expected one");
  expect(() =>
    updateRegistryVersion(registry.replace("servers/zed", "elsewhere"), "1.0.0"),
  ).toThrow("Unexpected Zed registry extension path");
});
