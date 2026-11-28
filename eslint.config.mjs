import json from "@eslint/json";
import { defineConfig } from "eslint/config";

const rules = {
  "json/no-duplicate-keys": "error",
  "json/no-unsafe-values": "error",
  // Empty keys, Unicode spelling, property order, and scalar roots can be intentional JSON data.
  "json/no-empty-keys": "off",
  "json/no-unnormalized-keys": "off",
  "json/sort-keys": "off",
  "json/top-level-interop": "off",
};

export default defineConfig([
  {
    ignores: [
      // ESLint otherwise includes these extensions by default; Oxlint owns them.
      "**/*.{js,mjs,cjs}",
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.vitest/**",
      "**/.vitepress/cache/**",
      "**/.worktrees/**",
      "**/.claude/worktrees/**",
      "docs/reference/**",
      "docs/internal/**",
      "servers/vscode/syntaxes/**",
      "servers/zed/target/**",
    ],
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    rules,
  },
  {
    files: [
      "**/*.jsonc",
      "**/.vscode/*.json",
      "**/tsconfig*.json",
      "**/cssdoc.json",
      "**/*.cssdoc.json",
      "docs/examples/cssdoc.*.json",
    ],
    plugins: { json },
    language: "json/jsonc",
    languageOptions: { allowTrailingCommas: true },
    rules,
  },
]);
