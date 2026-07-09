import { defineConfig } from "vitepress";

// GitHub Pages serves a project site under /<repo>/. Override with DOCS_BASE if the repo name differs.
const base = process.env.DOCS_BASE ?? "/cssdoc/";

export default defineConfig({
  base,
  lang: "en-US",
  title: "cssdoc",
  description: "TSDoc, for CSS — document CSS with structured comments.",
  cleanUrls: true,
  head: [
    ["link", { rel: "icon", href: `${base}icon.svg` }],
    ["link", { rel: "icon", media: "(prefers-color-scheme: dark)", href: `${base}icon-dark.svg` }],
  ],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Packages", link: "/guide/packages" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Introduction", link: "/guide/introduction" },
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Authoring doc comments", link: "/guide/authoring" },
          { text: "Configuration", link: "/guide/config" },
          { text: "Emitting docs", link: "/guide/emitters" },
          { text: "Standard formats", link: "/guide/generators" },
          { text: "Linting", link: "/guide/linting" },
          { text: "Editor support", link: "/guide/editor" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "Packages", link: "/guide/packages" }],
      },
    ],
    outline: "deep",
    search: { provider: "local" },
  },
});
