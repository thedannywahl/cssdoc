/**
 * `@cssdoc/typedoc` — a TypeDoc plugin that makes CSS docs ride along with a TS API-docs build. On
 * `RendererEvent.END` it renders CSS reference pages (via `@cssdoc/markdown`) into the TypeDoc output
 * and merges them into `typedoc-sidebar.json`, so the CSS reference themes identically and sits in the
 * same nav — the cssdoc-specific half of a CSS-API generator, codified.
 *
 * Register it and point it at your CSS in `typedoc.json`:
 *
 * @example
 * ```jsonc
 * // typedoc.json
 * {
 *   "plugin": ["typedoc-plugin-markdown", "typedoc-vitepress-theme", "@cssdoc/typedoc"],
 *   "cssdocCss": ["../packages/ui/dist/components.css"],
 *   "cssdocOut": "css",
 *   "cssdocLabel": "CSS",
 *   "cssdocBaseHref": "/api/css/"
 * }
 * ```
 *
 * (The generic `@demo` block-tag rewriter is a separate TypeDoc plugin, unrelated to CSS.)
 *
 * @module @cssdoc/typedoc
 */
import { type Application, ParameterType, RendererEvent } from "typedoc";
import { emitCssApi } from "./emit.ts";

/**
 * TypeDoc entry point. Declares the `cssdoc*` options and, after rendering, emits the CSS reference and
 * merges its sidebar.
 *
 * @param app - The TypeDoc application.
 */
export function load(app: Application): void {
  app.options.addDeclaration({
    name: "cssdocCss",
    help: "CSS source file paths whose doc comments become the CSS reference.",
    type: ParameterType.Array,
    defaultValue: [],
  });
  app.options.addDeclaration({
    name: "cssdocOut",
    help: "Subdirectory under the docs output for the CSS reference pages.",
    type: ParameterType.String,
    defaultValue: "css",
  });
  app.options.addDeclaration({
    name: "cssdocLabel",
    help: "The sidebar section label for the CSS reference.",
    type: ParameterType.String,
    defaultValue: "CSS",
  });
  app.options.addDeclaration({
    name: "cssdocBaseHref",
    help: "Link prefix for the CSS pages/sidebar (defaults to '<cssdocOut>/').",
    type: ParameterType.String,
    defaultValue: "",
  });

  app.renderer.on(RendererEvent.END, (event: RendererEvent) => {
    const css = app.options.getValue("cssdocCss") as string[];
    if (!css.length) return;
    const baseHref = app.options.getValue("cssdocBaseHref") as string;
    emitCssApi({
      outputDirectory: event.outputDirectory,
      css,
      outSubdir: app.options.getValue("cssdocOut") as string,
      label: app.options.getValue("cssdocLabel") as string,
      baseHref: baseHref || undefined,
    });
  });
}

export {
  emitCssApi,
  mergeCssSidebar,
  TYPEDOC_SIDEBAR_FILE,
  type EmitCssApiOptions,
} from "./emit.ts";
