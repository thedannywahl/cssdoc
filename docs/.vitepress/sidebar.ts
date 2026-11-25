import type { DefaultTheme } from "vitepress";

type SidebarItem = DefaultTheme.SidebarItem;
type SidebarRoutes = Record<string, SidebarItem[]>;

const guides: SidebarItem[] = [
  { text: "Introduction", link: "/guide/introduction" },
  { text: "Getting started", link: "/guide/getting-started" },
  { text: "Authoring doc comments", link: "/guide/authoring" },
  { text: "Layouts", link: "/guide/layouts" },
  { text: "Modifier conventions", link: "/guide/modifier-conventions" },
  { text: "Configuration", link: "/guide/config" },
  { text: "Embedded CSS", link: "/guide/embedded-css" },
  { text: "Emitting docs", link: "/guide/emitters" },
  { text: "Standard formats", link: "/guide/generators" },
  { text: "Linting", link: "/guide/linting" },
  { text: "Editor support", link: "/guide/editor" },
];

const reference: SidebarItem[] = [
  { text: "Overview", link: "/guide/reference" },
  { text: "Packages", link: "/guide/packages" },
  { text: "Grammar", link: "/guide/grammar" },
  { text: "Config", link: "/guide/config-reference" },
  { text: "Playground", link: "/guide/playground" },
];

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
  active === "guides"
    ? { text: "Guides", items: guides }
    : sectionLink("Guides", "/guide/introduction"),
  active === "api"
    ? { text: "API", items: [{ text: "Overview", link: "/api/" }, ...apiItems] }
    : sectionLink("API", "/api/"),
  active === "reference"
    ? { text: "Reference", items: reference }
    : sectionLink("Reference", "/guide/reference"),
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
  for (const item of reference) {
    if (item.link) routes[item.link] = sectionSidebar("reference");
  }
  routes["/guide/"] = sectionSidebar("guides");
  routes["/"] = sectionSidebar("guides");
  return routes;
}
