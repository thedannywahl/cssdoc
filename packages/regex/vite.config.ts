import { defineConfig } from "vite-plus";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      name: "@cssdoc/regex",
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
      formats: ["es"],
    },
    rollupOptions: {
      external: Object.keys(packageJson.dependencies || {}),
    },
  },
});
