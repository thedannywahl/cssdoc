import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: { deps: { resolveDepSubpath: true }, dts: true, exports: true },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
