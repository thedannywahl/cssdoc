import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

const config: UserConfig = defineConfig({
  pack: {
    deps: { resolveDepSubpath: true },
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

export default config;
