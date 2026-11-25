import { defineConfig } from "vite-plus";

import type { UserConfig } from "vite-plus";

const config: UserConfig = defineConfig({
  pack: {
    deps: { resolveDepSubpath: true },
    dts: true,
    // Hand-managed: we expose an extra ./grammarkdown.tmLanguage.json subpath that auto-exports drops.
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
