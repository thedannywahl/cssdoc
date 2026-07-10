import { defineClientComponent } from "vitepress";
import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import VitePressMermaid from "../plugins/vitepress-mermaid/index.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Renders ```mermaid fences (rewritten to <vitepress-mermaid> by the markdown-it plugin).
    app.component("vitepress-mermaid", VitePressMermaid);

    // Client-only: the playground imports the browser-native parser/linter; keep it out of SSR so
    // css-tree never loads on the server and the editable textarea can't cause hydration mismatches.
    app.component(
      "CssdocPlayground",
      defineClientComponent(() => import("./CssdocPlayground.vue")),
    );
  },
} satisfies Theme;
