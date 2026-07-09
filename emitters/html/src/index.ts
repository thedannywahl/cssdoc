/**
 * `@cssdoc/html` — render the `@cssdoc/core` model to standalone, self-contained HTML: one page per
 * record plus an index, each with inline styles and no build step. The TypeDoc default-theme analog.
 *
 * @module
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CssDocConfiguration,
  type CssDocEntry,
  type StructureNode,
  parseCssDocs,
} from "@cssdoc/core";

/** Either a CSS source or an already-parsed model. */
export interface ModelInput {
  css?: string | string[];
  entries?: CssDocEntry[];
  configuration?: CssDocConfiguration;
}

function resolveEntries(input: ModelInput): CssDocEntry[] {
  if (input.entries) return input.entries;
  const css = Array.isArray(input.css) ? input.css.join("\n") : (input.css ?? "");
  return parseCssDocs(css, { configuration: input.configuration });
}

const esc = (text: string | undefined): string =>
  (text ?? "")
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");

const code = (text: string | undefined): string => (text ? `<code>${esc(text)}</code>` : "—");

// The cssdoc mark (see icon.svg at the repo root), embedded as a favicon data URI so pages stay
// self-contained. Braces are vector paths, so it renders identically everywhere.
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><mask id="cut"><rect x="8" y="8" width="112" height="112" rx="24" fill="white"/><g fill="none" stroke="black" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="7"><path d="M 84 64 q -6 0 -6 6 l 0 11 q 0 6 -6 6 q 6 0 6 6 l 0 11 q 0 6 6 6"/><path d="M 100 64 q 6 0 6 6 l 0 11 q 0 6 6 6 q -6 0 -6 6 l 0 11 q 0 6 -6 6"/></g><g stroke-width="5"><path d="M 92 80 L 92 94"/><path d="M 86 83.5 L 98 90.5"/><path d="M 86 90.5 L 98 83.5"/></g></g></mask><rect x="8" y="8" width="112" height="112" rx="24" fill="#6ba7a5" mask="url(#cut)"/></svg>`;
const FAVICON = `data:image/svg+xml;base64,${Buffer.from(ICON_SVG).toString("base64")}`;

const STYLE = `
:root { color-scheme: light dark; }
body { font: 16px/1.5 system-ui, sans-serif; max-width: 60rem; margin: 2rem auto; padding: 0 1rem; }
h1 { margin-bottom: 0.25rem; } h2 { margin-top: 2rem; border-bottom: 1px solid #8884; padding-bottom: 0.2rem; }
code { font-family: ui-monospace, monospace; background: #8881; padding: 0.1em 0.3em; border-radius: 3px; }
table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #8883; vertical-align: top; }
.badge { font-size: 0.75rem; border: 1px solid #8886; border-radius: 999px; padding: 0.05em 0.5em; }
.warn { background: #f5a5; border-left: 3px solid #d80; padding: 0.5rem 0.75rem; border-radius: 3px; }
pre { background: #8881; padding: 0.75rem; border-radius: 4px; overflow: auto; }
a { color: inherit; }
`;

function doc(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><link rel="icon" href="${FAVICON}"><style>${STYLE}</style></head>
<body>
${body}
</body>
</html>
`;
}

function table(headers: string[], rows: string[][]): string {
  if (!rows.length) return "";
  const head = `<tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n");
  return `<table>${head}\n${body}</table>`;
}

function structureList(nodes: StructureNode[]): string {
  if (!nodes.length) return "";
  const items = nodes
    .map((n) => `<li>${code(n.selector)}${structureList(n.children)}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
}

/** Render one record to a standalone HTML page. */
export function renderPage(entry: CssDocEntry, options: { indexHref?: string } = {}): string {
  const parts: string[] = [];
  if (options.indexHref) parts.push(`<p><a href="${esc(options.indexHref)}">← Index</a></p>`);
  const stage = entry.releaseStage ? ` <span class="badge">${esc(entry.releaseStage)}</span>` : "";
  parts.push(`<h1>${esc(entry.name)}${stage}</h1>`);
  parts.push(`<p>${code(entry.className)}${entry.summary ? ` — ${esc(entry.summary)}` : ""}</p>`);
  if (entry.deprecated)
    parts.push(`<p class="warn"><strong>Deprecated</strong> — ${esc(entry.deprecated)}</p>`);
  if (entry.remarks) parts.push(`<p>${esc(entry.remarks)}</p>`);

  const meta = [
    entry.since && `<strong>Since:</strong> ${esc(entry.since)}`,
    entry.group && `<strong>Group:</strong> ${esc(entry.group)}`,
  ].filter(Boolean);
  if (meta.length) parts.push(`<p>${meta.join(" · ")}</p>`);

  const section = (title: string, html: string): void => {
    if (html) parts.push(`<h2>${title}</h2>`, html);
  };

  section(
    "Modifiers",
    table(
      ["Modifier", "Description"],
      entry.modifiers.map((m) => {
        if (m.deprecated) {
          const via = m.deprecated.canonical
            ? `use ${code(`.${m.deprecated.canonical}`)}`
            : esc(m.deprecated.note);
          return [code(`.${m.name}`), `<em>Deprecated</em> — ${via}`];
        }
        return [code(`.${m.name}`), esc(m.description) || "—"];
      }),
    ),
  );
  section(
    "Parts",
    table(
      ["Part", "Description"],
      entry.parts.map((p) => [code(`.${p.name}`), esc(p.description) || "—"]),
    ),
  );
  section(
    "States",
    table(
      ["State", "Description"],
      entry.states.map((s) => [code(s.name), esc(s.description) || "—"]),
    ),
  );
  section(
    "Slots",
    table(
      ["Slot", "Description"],
      entry.slots.map((s) => [
        s.name ? code(s.name) : "<em>(default)</em>",
        esc(s.description) || "—",
      ]),
    ),
  );
  section(
    "Custom properties",
    table(
      ["Property", "Type", "Default", "Description"],
      entry.cssPropertiesDeclared.map((p) => [
        code(p.name),
        code(p.syntax),
        code(p.defaultValue),
        esc(p.description) || "—",
      ]),
    ),
  );
  section(
    "Functions",
    table(
      ["Function", "Parameters", "Returns", "Description"],
      entry.functions.map((f) => [
        code(f.name),
        f.parameters.map((p) => code(p)).join(", ") || "—",
        code(f.result),
        esc(f.description) || "—",
      ]),
    ),
  );
  section(
    "Animations",
    table(
      ["Animation", "Description"],
      entry.animations.map((a) => [code(a.name), esc(a.description) || "—"]),
    ),
  );
  section(
    "Cascade layers",
    table(
      ["Layer", "Description"],
      entry.layers.map((l) => [code(l.name), esc(l.description) || "—"]),
    ),
  );
  section(
    "Conditions",
    table(
      ["Type", "Query", "Description"],
      entry.conditions.map((c) => [
        esc(c.type),
        code(c.containerName ? `${c.containerName} ${c.query}` : c.query),
        esc(c.description) || "—",
      ]),
    ),
  );
  if (entry.structure?.length) section("Structure", structureList(entry.structure));
  if (entry.examples.length)
    section(
      "Examples",
      entry.examples.map((ex) => `<pre><code>${esc(ex)}</code></pre>`).join("\n"),
    );
  if (entry.accessibility) section("Accessibility", `<p>${esc(entry.accessibility)}</p>`);
  if (entry.see.length)
    section("See also", `<ul>${entry.see.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`);

  return doc(entry.name, parts.join("\n"));
}

/** Render the index page linking to every record. */
export function renderIndex(
  entries: readonly CssDocEntry[],
  options: { title?: string } = {},
): string {
  const title = options.title ?? "CSS API reference";
  const rows = entries.map((e) => [
    `<a href="${esc(e.name)}.html">${esc(e.name)}</a>`,
    code(e.className),
    esc(e.summary) || "—",
  ]);
  return doc(title, `<h1>${esc(title)}</h1>\n${table(["Name", "Class", "Summary"], rows)}`);
}

/** Options for {@link buildHtml}. */
export interface BuildHtmlOptions extends ModelInput {
  outDir: string;
  title?: string;
}

/** What {@link buildHtml} produced. */
export interface BuildHtmlResult {
  entries: CssDocEntry[];
  pages: string[];
  indexPath: string;
}

/** Parse and write one HTML page per record plus `index.html`. */
export function buildHtml(options: BuildHtmlOptions): BuildHtmlResult {
  const entries = resolveEntries(options).sort((a, b) => a.name.localeCompare(b.name));
  mkdirSync(options.outDir, { recursive: true });
  const pages: string[] = [];
  for (const entry of entries) {
    const path = join(options.outDir, `${entry.name}.html`);
    writeFileSync(path, renderPage(entry, { indexHref: "index.html" }));
    pages.push(path);
  }
  const indexPath = join(options.outDir, "index.html");
  writeFileSync(indexPath, renderIndex(entries, { title: options.title }));
  return { entries, pages, indexPath };
}
