import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";

import jsonConfig from "../eslint.config.mjs";

export default defineConfig([
  ...jsonConfig,
  {
    basePath: import.meta.dirname,
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    languageOptions: { frontmatter: "yaml" },
    rules: {
      "markdown/fenced-code-language": "warn",
      "markdown/fenced-code-meta": "off",
      "markdown/heading-increment": ["warn", { frontmatterTitle: "" }],
      "markdown/no-bare-urls": "off",
      "markdown/no-duplicate-definitions": "error",
      "markdown/no-duplicate-headings": "off",
      "markdown/no-empty-definitions": "error",
      "markdown/no-empty-images": "error",
      "markdown/no-empty-links": "error",
      "markdown/no-html": "off",
      "markdown/no-invalid-label-refs": "error",
      "markdown/no-missing-atx-heading-space": ["warn", { checkClosedHeadings: true }],
      "markdown/no-missing-label-refs": "error",
      "markdown/no-missing-link-fragments": "error",
      "markdown/no-multiple-h1": ["warn", { frontmatterTitle: "" }],
      "markdown/no-reference-like-urls": "off",
      "markdown/no-reversed-media-syntax": "error",
      "markdown/no-space-in-emphasis": "warn",
      "markdown/no-unused-definitions": "warn",
      "markdown/require-alt-text": "warn",
      "markdown/table-column-count": "error",
    },
  },
  {
    basePath: import.meta.dirname,
    // These anchors are rendered by the grammar include and Vue rule-reference data.
    files: ["guide/grammar.md", "guide/lint-reference.md"],
    rules: { "markdown/no-missing-link-fragments": "off" },
  },
]);
