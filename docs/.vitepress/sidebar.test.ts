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
  test("groups guides by task and keeps API and reference reachable", () => {
    const sidebar = sidebarFor(createSidebars(generated), "/guide/config.html");
    expect(sidebar.slice(0, 4).map(({ text }) => text)).toEqual([
      "Overview",
      "Write CSS docs",
      "Publish and export",
      "Set up your project",
    ]);
    expect(
      find(find(sidebar, "Write CSS docs")?.items ?? [], "Describe variants and states")?.link,
    ).toBe("/guide/variants-and-states");
    expect(
      find(find(sidebar, "Publish and export")?.items ?? [], "Publish alongside TypeDoc")?.link,
    ).toBe("/guide/publish-with-typedoc");
    expect(find(sidebar, "Configure cssdoc")?.link).toBe("/guide/config");
    expect(find(sidebar, "API")?.link).toBe("/api/");
    expect(find(sidebar, "Reference")?.link).toBe("/guide/reference");
  });

  test("shows the same grouped navigation on all reference pages", () => {
    const routes = createSidebars(generated);
    const reference = sidebarFor(routes, "/guide/reference.html");

    expect(reference.map(({ text }) => text).filter(Boolean)).toEqual([
      "Authoring",
      "Project behavior",
      "Specification",
    ]);
    expect(find(reference, "Guides")?.link).toBe("/guide/introduction");
    expect(find(reference, "API")?.link).toBe("/api/");
    expect(find(reference, "Reference")?.link).toBe("/guide/reference");
    expect(find(reference, "Authoring")?.items?.map(({ text }) => text)).toEqual([
      "Doc-comment tags",
      "Selectors and structure",
    ]);
    expect(find(reference, "Project behavior")?.items?.map(({ text }) => text)).toEqual([
      "Configuration",
      "Lint rules and diagnostics",
      "Language server",
      "Embedded CSS support",
    ]);
    expect(find(reference, "Language server")?.link).toBe("/guide/language-server-reference");
    expect(find(reference, "Specification")?.items).toEqual([
      { text: "Formal grammar", link: "/guide/grammar" },
      { text: "Regex patterns", link: "/guide/patterns" },
    ]);

    for (const group of reference.filter(({ text }) => text)) {
      for (const item of group.items ?? []) {
        if (item.link === undefined) throw new Error("Reference item is missing its link");
        expect(sidebarFor(routes, `${item.link}.html`)).toBe(reference);
      }
    }
  });

  test("lists the package catalog with the API pages", () => {
    const routes = createSidebars(generated);
    const overview = sidebarFor(routes, "/api/index.html");
    expect(sidebarFor(routes, "/guide/packages.html")).toBe(overview);
    expect(find(overview, "Overview")?.link).toBe("/api/");
    expect(find(overview, "Packages")?.link).toBe("/guide/packages");
    expect(find(overview, "Reference")?.link).toBe("/guide/reference");
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
