import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    // Two entries: the full barrel and the parse-free `./lite` subpath (no postcss). `exports: true`
    // writes both into package.json `exports`.
    entry: ["src/index.ts", "src/lite.ts"],
    dts: true,
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
