import { parse as parsePostcss } from "postcss";

import { buildCustomMediaDeclarations } from "./customMedia.ts";
import type { BuildCustomMediaOptions } from "./customMedia.ts";
import type { ParseOptions } from "./model.ts";
import { parseCssDocs } from "./parse.ts";

const INLINE_CUSTOM_MEDIA_PARAMS: RegExp = /^(--[A-Za-z][\w-]*)[ \t](.+)$/u;

function inlineCustomMediaMap(
  css: string,
  parse?: ParseOptions["parse"],
): Map<string, string | boolean> {
  const root = (parse ?? parsePostcss)(css);
  const out = new Map<string, string | boolean>();
  root.walkAtRules("custom-media", (rule) => {
    const match = INLINE_CUSTOM_MEDIA_PARAMS.exec(rule.params.trim());
    if (!match) return;
    const profile = match[1];
    const rawValue = match[2].trim();
    if (!rawValue) return;
    if (rawValue === "true") {
      out.set(profile, true);
      return;
    }
    if (rawValue === "false") {
      out.set(profile, false);
      return;
    }
    out.set(profile, rawValue);
  });
  return out;
}

/** Options for {@link compileCustomMediaDeclarations}. */
export interface CompileCustomMediaOptions extends ParseOptions, BuildCustomMediaOptions {}

/**
 * Parse CSS and compile any `@structure` profile references into `@custom-media` declarations.
 *
 * This is a convenience wrapper over `parseCssDocs(...)` + `buildCustomMediaDeclarations(...)`.
 */
export function compileCustomMediaDeclarations(
  css: string,
  options: CompileCustomMediaOptions = {},
): string {
  const { resolveValue, sort, ...parseOptions } = options;
  const entries = parseCssDocs(css, parseOptions);
  const inlineValues = inlineCustomMediaMap(css, parseOptions.parse);
  return buildCustomMediaDeclarations(entries, {
    sort,
    resolveValue: (profile, refs) => {
      const resolved = resolveValue?.(profile, refs);
      if (resolved !== undefined) return resolved;
      return inlineValues.get(profile);
    },
  });
}
