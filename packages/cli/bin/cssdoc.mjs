#!/usr/bin/env node
// Keep the executable thin so the package's programmatic entry stays side-effect-free.
import { runCli } from "../dist/cli.mjs";

await runCli();
