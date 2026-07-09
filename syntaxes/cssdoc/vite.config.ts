import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: true,
    // Hand-managed: we expose an extra ./cssdoc.injection.tmLanguage.json subpath that auto-exports drops.
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
