/**
 * `@cssdoc/llms` — render the `@cssdoc/core` model to an `llms.txt`-style digest: a flat, deterministic,
 * token-efficient Markdown summary of every documented component's surface, sized for dropping into an
 * LLM's context window. One compact block per record; empty facets are omitted.
 *
 * @module
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  type CssDocConfiguration,
  type CssDocEntry,
  type CssModifier,
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

/** Options for the digest header. */
export interface RenderLlmsOptions {
  /** The H1 title (default `"CSS components"`). */
  title?: string;
  /** A one-line summary rendered as a blockquote under the title. */
  intro?: string;
}

const clean = (text: string | undefined): string => (text ?? "").replace(/\s+/gu, " ").trim();

function modifier(m: CssModifier): string {
  if (m.deprecated) {
    const via = m.deprecated.canonical
      ? `→ \`-${m.deprecated.canonical.replace(/^-/u, "")}\``
      : clean(m.deprecated.note);
    return `\`-${m.name.replace(/^-/u, "")}\` (deprecated ${via})`.replace(/\s+\)/u, ")");
  }
  const desc = clean(m.description);
  return desc ? `\`-${m.name.replace(/^-/u, "")}\` (${desc})` : `\`-${m.name.replace(/^-/u, "")}\``;
}

/** Render the model to an `llms.txt`-style Markdown digest. */
export function renderLlms(
  entries: readonly CssDocEntry[],
  options: RenderLlmsOptions = {},
): string {
  const lines: string[] = [`# ${options.title ?? "CSS components"}`, ""];
  if (options.intro) lines.push(`> ${clean(options.intro)}`, "");

  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  for (const e of sorted) {
    const kind = e.kind === "component" ? "" : ` (${e.kind})`;
    const stage = e.releaseStage ? ` [${e.releaseStage}]` : "";
    lines.push(`## ${e.name}${kind}${stage} — \`${e.className}\``);
    if (e.summary) lines.push(clean(e.summary));
    if (e.deprecated) lines.push(`Deprecated: ${clean(e.deprecated)}`);

    const facet = (label: string, items: string[]): void => {
      if (items.length) lines.push(`- ${label}: ${items.join(", ")}`);
    };
    facet("Modifiers", e.modifiers.map(modifier));
    facet(
      "Parts",
      e.parts.map((p) =>
        clean(p.description) ? `\`.${p.name}\` (${clean(p.description)})` : `\`.${p.name}\``,
      ),
    );
    facet(
      "States",
      e.states.map((s) => `\`${s.name}\``),
    );
    facet(
      "Slots",
      e.slots.map((s) => `\`${s.name || "(default)"}\``),
    );
    facet(
      "Custom properties",
      e.cssPropertiesDeclared.map((p) => `\`${p.name}\`${p.syntax ? ` ${p.syntax}` : ""}`),
    );
    facet(
      "Functions",
      e.functions.map((f) => `\`${f.name}(${f.parameters.join(", ")})\``),
    );
    facet(
      "Layers",
      e.layers.map((l) => `\`${l.name}\``),
    );
    if (e.accessibility) lines.push(`- Accessibility: ${clean(e.accessibility)}`);
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** Options for {@link writeLlms}. */
export interface WriteLlmsOptions extends ModelInput, RenderLlmsOptions {
  /** Output file (default `llms.txt`). */
  outFile?: string;
}

/** Write the digest to `outFile` (default `llms.txt`). */
export function writeLlms(options: WriteLlmsOptions): { outFile: string } {
  const outFile = options.outFile ?? "llms.txt";
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, renderLlms(resolveEntries(options), options));
  return { outFile };
}
