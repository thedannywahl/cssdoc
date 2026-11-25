import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";

const config: UserConfig = defineConfig({
  pack: { deps: { resolveDepSubpath: true }, dts: true, exports: true },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});

export default config;
