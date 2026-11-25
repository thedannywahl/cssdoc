import { defineConfig } from "vite-plus";
import type { UserConfig } from "vite-plus";
const config: UserConfig = defineConfig({
  pack: {
    deps: { resolveDepSubpath: true },
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

export default config;
