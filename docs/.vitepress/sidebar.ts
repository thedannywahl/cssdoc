import type { DefaultTheme } from "vitepress";

type SidebarItem = DefaultTheme.SidebarItem;
type SidebarRoutes = Record<string, SidebarItem[]>;

const guides: SidebarItem[] = [
  {
    text: "Overview",
    items: [
      { text: "What is cssdoc?", link: "/guide/introduction" },
      { text: "Getting started", link: "/guide/getting-started" },
    ],
  },
  {
    text: "Write CSS docs",
    items: [
      { text: "Document a component", link: "/guide/authoring" },
      { text: "Describe variants and states", link: "/guide/variants-and-states" },
      { text: "Document composition", link: "/guide/layouts" },
      { text: "Document embedded CSS", link: "/guide/embedded-css" },
    ],
  },
  {
    text: "Publish and export",
    items: [
      { text: "Generate documentation", link: "/guide/emitters" },
      { text: "Publish alongside TypeDoc", link: "/guide/publish-with-typedoc" },
      { text: "Export to other tools", link: "/guide/generators" },
    ],
  },
  {
    text: "Set up your project",
    items: [
      { text: "Configure cssdoc", link: "/guide/config" },
      { text: "Set up linting", link: "/guide/linting" },
      { text: "Set up your editor", link: "/guide/editor" },
    ],
  },
];

const reference: SidebarItem[] = [
  {
    text: "Authoring",
    items: [
      { text: "Doc-comment tags", link: "/guide/doc-comment-tags" },
      { text: "Selectors and structure", link: "/guide/selectors-and-structure" },
    ],
  },
  {
    text: "Project behavior",
    items: [
      { text: "Configuration", link: "/guide/config-reference" },
      { text: "Lint rules and diagnostics", link: "/guide/lint-reference" },
      { text: "Language server", link: "/guide/language-server-reference" },
      { text: "Embedded CSS support", link: "/guide/embedded-css-support" },
    ],
  },
  {
    text: "Specification",
    items: [
      { text: "Formal grammar", link: "/guide/grammar" },
      { text: "Regex patterns", link: "/guide/patterns" },
    ],
  },
];

const referenceHome = "/guide/reference";
const packageCatalog = "/guide/packages";

const apiGroups = [
  {
    text: "Model and providers",
    packages: [
      "@cssdoc/cssdoc",
      "@cssdoc/core",
      "@cssdoc/spec",
      "@cssdoc/regex",
      "@cssdoc/config",
      "@cssdoc/index",
      "@cssdoc/providers",
      "@cssdoc/lint-core",
      "@cssdoc/embedded",
      "@cssdoc/dialects",
    ],
  },
  {
    text: "Emitters",
    packages: ["@cssdoc/markdown", "@cssdoc/html", "@cssdoc/json", "@cssdoc/llms"],
  },
  {
    text: "Standard formats",
    packages: ["@cssdoc/cem", "@cssdoc/dtcg", "@cssdoc/vscode-custom-data"],
  },
  {
    text: "Syntax highlighting",
    packages: [
      "@cssdoc/codemirror",
      "@cssdoc/tmlanguage",
      "@cssdoc/grammarkdown-codemirror",
      "@cssdoc/grammarkdown-tmlanguage",
    ],
  },
  {
    text: "Integrations",
    packages: [
      "@cssdoc/cli",
      "@cssdoc/eslint-plugin",
      "@cssdoc/stylelint-plugin",
      "@cssdoc/typedoc",
      "@cssdoc/language-server",
    ],
  },
];

const sectionLink = (text: string, link: string): SidebarItem => ({ items: [{ text, link }] });

const sectionSidebar = (
  active: "guides" | "api" | "reference",
  apiItems: SidebarItem[] = [],
): SidebarItem[] => [
  ...(active === "guides" ? guides : [sectionLink("Guides", "/guide/introduction")]),
  active === "api"
    ? {
        text: "API",
        items: [
          { text: "Overview", link: "/api/" },
          { text: "Packages", link: packageCatalog },
          ...apiItems,
        ],
      }
    : sectionLink("API", "/api/"),
  sectionLink("Reference", referenceHome),
  ...(active === "reference" ? reference : []),
];

const packageEntries = (items: SidebarItem[]): SidebarItem[] =>
  items.flatMap((item) => {
    if (item.link) {
      // Some TypeDoc modules use their source path rather than their package name as the title.
      const text = item.link === "/reference/packages/regex/src/" ? "@cssdoc/regex" : item.text;
      return [{ ...item, text }];
    }
    return packageEntries(item.items ?? []);
  });

const compactPackage = (item: SidebarItem, activePackage?: string): SidebarItem => {
  if (item.link === activePackage) return { ...item, collapsed: true };
  const { items: _items, collapsed: _collapsed, ...entry } = item;
  return entry;
};

const groupedPackages = (packages: SidebarItem[], activePackage?: string): SidebarItem[] => {
  const known = new Set(apiGroups.flatMap((group) => group.packages));
  const groups = apiGroups.map((group) => ({
    text: group.text,
    collapsed: true,
    items: group.packages.flatMap((name) =>
      packages
        .filter((item) => item.text === name)
        .map((item) => compactPackage(item, activePackage)),
    ),
  }));
  const other = packages.filter((item) => !item.text || !known.has(item.text));
  if (other.length) {
    groups.push({
      text: "Other",
      collapsed: true,
      items: other.map((item) => compactPackage(item, activePackage)),
    });
  }
  return groups.filter((group) => group.items.length > 0);
};

/**
 * Build route-specific sidebars from TypeDoc's generated package tree.
 * Only the active package retains its symbol tree; other packages remain linked.
 */
export function createSidebars(generated: SidebarItem[]): SidebarRoutes {
  const packages = packageEntries(generated);
  const apiSidebar = (activePackage?: string): SidebarItem[] =>
    sectionSidebar("api", groupedPackages(packages, activePackage));
  const routes: SidebarRoutes = {
    "/api/": apiSidebar(),
    "/reference/": apiSidebar(),
  };
  for (const entry of packages) {
    if (entry.link) routes[entry.link] = apiSidebar(entry.link);
  }
  // VitePress sorts by slash count, not string length: register these before /guide/.
  const referenceSidebar = sectionSidebar("reference");
  routes[referenceHome] = referenceSidebar;
  routes[packageCatalog] = routes["/api/"];
  for (const group of reference) {
    for (const item of group.items ?? []) {
      if (item.link) routes[item.link] = referenceSidebar;
    }
  }
  routes["/guide/"] = sectionSidebar("guides");
  routes["/"] = sectionSidebar("guides");
  return routes;
}
