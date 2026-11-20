// A tiny markdown-exit/markdown-it fence override: turn ```mermaid blocks into a client-only
// <vitepress-mermaid> component. Hand-rolled instead of `vitepress-plugin-mermaid` so mermaid's
// `dayjs` dependency is bundled normally (the plugin's own pre-bundling trips Vite's CJS→ESM
// interop and blanks the page).
//
// Enhanced with Mermaid v12 features: advanced theme variables, flowchart config, accessibility,
// and diagram export (SVG download/copy). Compatible with both markdown-it v15.0+ and
// markdown-exit v2.0+ via the shared plugin API.
export const mermaidPlugin = (md) => {
  const fence = md.renderer.rules.fence;
  if (!fence) return;

  md.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args;
    const token = tokens[idx];
    if (token.info.trim() === "mermaid") {
      const graph = encodeURIComponent(token.content.trim());
      // Add `enableExport` prop for structure diagrams (they benefit most from export)
      const enableExport = token.content.includes("flowchart") ? ' :enable-export="true"' : "";
      return `<vitepress-mermaid graph="${graph}"${enableExport}></vitepress-mermaid>\n`;
    }
    return fence(...args);
  };
};
