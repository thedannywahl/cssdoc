import { describe, expect, test } from "vite-plus/test";
import type { DefaultTheme } from "vitepress";
import { createSidebars } from "./sidebar.js";

type Item = DefaultTheme.SidebarItem;

const generated: Item[] = [
  {
    text: "@cssdoc/core",
    link: "/reference/@cssdoc/core/",
    items: [
      {
        text: "Functions",
        items: [
          { text: "parseCssDocs", link: "/reference/@cssdoc/core/functions/parseCssDocs.md" },
        ],
      },
    ],
  },
  {
    text: "@cssdoc/html",
    link: "/reference/@cssdoc/html/",
    items: [
      {
        text: "Functions",
        items: [{ text: "buildHtml", link: "/reference/@cssdoc/html/functions/buildHtml.md" }],
      },
    ],
  },
  {
    text: "packages",
    items: [
      {
        text: "regex",
        items: [
          {
            text: "src",
            link: "/reference/packages/regex/src/",
            items: [
              {
                text: "Variables",
                items: [
                  { text: "ALPHA", link: "/reference/packages/regex/src/variables/ALPHA.md" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    text: "@cssdoc/codemirror",
    link: "/reference/@cssdoc/codemirror/",
    items: [{ text: "Functions", items: [{ text: "cssdocHighlight", link: "/highlight.md" }] }],
  },
  { text: "@cssdoc/new-package", link: "/reference/@cssdoc/new-package/" },
];

const find = (items: Item[], text: string): Item | undefined => {
  for (const item of items) {
    if (item.text === text) return item;
    const child = find(item.items ?? [], text);
    if (child) return child;
  }
  return undefined;
};

// Match VitePress's multi-sidebar route selection, including its stable slash-count ordering.
const sidebarFor = (routes: Record<string, Item[]>, path: string): Item[] => {
  const key = Object.keys(routes)
    .sort((a, b) => b.split("/").length - a.split("/").length)
    .find((prefix) => path.startsWith(prefix));
  return key ? routes[key] : [];
};

describe("createSidebars", () => {
  test("keeps all three sections reachable on guide, API, and reference pages", () => {
    const routes = createSidebars(generated);
    for (const path of [
      "/guide/config.html",
      "/api/index.html",
      "/guide/reference.html",
      "/guide/config-reference.html",
    ]) {
      const sidebar = sidebarFor(routes, path);
      expect(sidebar).toHaveLength(3);
      expect(find(sidebar, "Guides")).toBeDefined();
      expect(find(sidebar, "API")).toBeDefined();
      expect(find(sidebar, "Reference")).toBeDefined();
    }
    expect(find(sidebarFor(routes, "/guide/config.html"), "Configuration")?.link).toBe(
      "/guide/config",
    );
    expect(find(sidebarFor(routes, "/guide/config-reference.html"), "Config")?.link).toBe(
      "/guide/config-reference",
    );
    expect(find(sidebarFor(routes, "/api/index.html"), "Overview")?.link).toBe("/api/");
    expect(find(sidebarFor(routes, "/guide/reference.html"), "Overview")?.link).toBe(
      "/guide/reference",
    );
    expect(find(sidebarFor(routes, "/guide/config.html"), "Reference")?.link).toBe(
      "/guide/reference",
    );
    expect(find(sidebarFor(routes, "/api/index.html"), "Reference")?.link).toBe("/guide/reference");
  });

  test("groups packages and expands only the active package's symbols", () => {
    const routes = createSidebars(generated);
    const overview = sidebarFor(routes, "/api/index.html");
    const core = sidebarFor(routes, "/reference/@cssdoc/core/functions/parseCssDocs.html");
    const regex = sidebarFor(routes, "/reference/packages/regex/src/variables/ALPHA.html");
    expect(find(overview, "Model and providers")?.items?.map((item) => item.text)).toEqual([
      "@cssdoc/core",
      "@cssdoc/regex",
    ]);
    expect(find(overview, "@cssdoc/core")?.items).toBeUndefined();
    expect(find(core, "parseCssDocs")?.link).toBe(
      "/reference/@cssdoc/core/functions/parseCssDocs.md",
    );
    expect(find(core, "buildHtml")).toBeUndefined();
    expect(find(regex, "ALPHA")).toBeDefined();
    expect(find(overview, "Syntax highlighting")?.items?.[0]?.link).toBe(
      "/reference/@cssdoc/codemirror/",
    );
    expect(
      find(
        sidebarFor(routes, "/reference/@cssdoc/codemirror/functions/highlight.html"),
        "cssdocHighlight",
      ),
    ).toBeDefined();
    expect(find(overview, "Other")?.items?.[0]?.link).toBe("/reference/@cssdoc/new-package/");
  });

  test("works without generated TypeDoc data and does not mutate it", () => {
    const before = structuredClone(generated);
    expect(find(sidebarFor(createSidebars([]), "/api/index.html"), "Overview")?.link).toBe("/api/");
    createSidebars(generated);
    expect(generated).toEqual(before);
  });
});
