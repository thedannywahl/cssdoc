import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: true,
    // Hand-managed exports in package.json (see the "." + "./package.json" subpaths).
    exports: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
