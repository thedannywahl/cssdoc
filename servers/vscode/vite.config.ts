import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: true,
    exports: true,
    // `vscode` is provided by the extension host at runtime (only @types/vscode exists), so keep it
    // external rather than trying to bundle the types package.
    deps: { neverBundle: ["vscode"] },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
