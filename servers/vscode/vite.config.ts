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
  // `vp run` sandboxes env vars by default (see viteplus.dev/guide/cache#environment-variables), so
  // these publish scripts must opt in to receive their PAT via `untrackedEnv` — the token isn't part
  // of the cache fingerprint. Without this, `vsce`/`ovsx` silently get no token in CI: `vsce` falls
  // back to an anonymous credential and fails auth, `ovsx` prompts interactively and the job aborts.
  run: {
    tasks: {
      "publish:vsce": {
        command: "vsce publish --no-dependencies --packagePath cssdoc.vsix",
        untrackedEnv: ["VSCE_PAT"],
      },
      "publish:ovsx": {
        command: "ovsx publish cssdoc.vsix",
        untrackedEnv: ["OVSX_PAT"],
      },
    },
  },
});
