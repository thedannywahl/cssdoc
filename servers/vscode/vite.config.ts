import { defineConfig } from "vite-plus";

// This package is bundled with esbuild (see the `build` script), not `vp pack`, because a VS Code
// extension must ship as a self-contained CommonJS bundle. Vite+ still handles format, lint, and
// typecheck via `vp check`.
export default defineConfig({
  fmt: {},
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
