#!/usr/bin/env node
// The `cssdoc` executable: `cssdoc lint <globs...>`. The library entry (dist/index.mjs) stays
// side-effect-free so it can be imported for programmatic use.
import { parseArgs } from "node:util";
import { runLint } from "../dist/index.mjs";

const [command, ...rest] = process.argv.slice(2);

if (command !== "lint") {
  console.error(
    `Usage: cssdoc lint <globs...> [--format pretty|json|github] [--quiet] [--max-warnings <n>]`,
  );
  process.exit(1);
}

const { values, positionals } = parseArgs({
  args: rest,
  allowPositionals: true,
  options: {
    format: { type: "string", default: "pretty" },
    quiet: { type: "boolean", default: false },
    "max-warnings": { type: "string", default: "-1" },
  },
});

if (positionals.length === 0) {
  console.error("cssdoc lint: expected at least one glob or file path.");
  process.exit(1);
}

const { exitCode, output } = runLint({
  globs: positionals,
  format: values.format,
  quiet: values.quiet,
  maxWarnings: Number(values["max-warnings"]),
});

if (output) console.log(output);
process.exit(exitCode);
