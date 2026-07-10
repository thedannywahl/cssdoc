// A tiny markdown-it fence override: turn ```mermaid blocks into a client-only <vitepress-mermaid>
// component. Hand-rolled instead of `vitepress-plugin-mermaid` so mermaid's `dayjs` dependency is
// bundled normally (the plugin's own pre-bundling trips Vite's CJS→ESM interop and blanks the page).
export const mermaidPlugin = (md) => {
  const fence = md.renderer.rules.fence;
  if (!fence) return;

  md.renderer.rules.fence = (...args) => {
    const [tokens, idx] = args;
    const token = tokens[idx];
    if (token.info.trim() === "mermaid") {
      const graph = encodeURIComponent(token.content.trim());
      return `<vitepress-mermaid graph="${graph}"></vitepress-mermaid>\n`;
    }
    return fence(...args);
  };
};
