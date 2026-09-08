import { resolve } from "node:path";
import { expect, test } from "vite-plus/test";
import { createCssDocProgram, runCli, type CliRuntime } from "../src/cli.ts";
import { runLint, type LintCliOptions, type LintCliResult } from "../src/index.ts";

const FIXTURES = resolve(import.meta.dirname, "fixtures");

interface HarnessOptions {
  stdinIsTTY?: boolean;
  stdoutIsTTY?: boolean;
  textValue?: string | symbol;
  confirmValues?: (boolean | symbol)[];
  result?: LintCliResult;
}

function cleanResult(output = ""): LintCliResult {
  return {
    exitCode: 0,
    output,
    results: [],
    errorCount: 0,
    warningCount: 0,
  };
}

function createHarness(options: HarnessOptions = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const exits: number[] = [];
  const lintCalls: LintCliOptions[] = [];
  const promptEvents: string[] = [];
  const confirmValues = [...(options.confirmValues ?? [false, false])];
  const formatMessage = (message: string | string[] | undefined): string =>
    Array.isArray(message) ? message.join("\n") : (message ?? "");

  const runtime: CliRuntime = {
    stdinIsTTY: options.stdinIsTTY ?? false,
    stdoutIsTTY: options.stdoutIsTTY ?? false,
    writeOut: (message) => out.push(message),
    writeErr: (message) => err.push(message),
    setExitCode: (exitCode) => exits.push(exitCode),
    prompts: {
      intro: (message) => promptEvents.push(`intro:${message}`),
      outro: (message) => promptEvents.push(`outro:${message}`),
      cancel: (message) => promptEvents.push(`cancel:${message}`),
      text: async () => options.textValue ?? "**/*.css",
      confirm: async () => confirmValues.shift() ?? false,
      isCancel: (value): value is symbol => typeof value === "symbol",
      log: {
        error: (message) => promptEvents.push(`error:${message}`),
        info: (message) => promptEvents.push(`info:${message}`),
        message: (message) => promptEvents.push(`message:${formatMessage(message)}`),
        success: (message) => promptEvents.push(`success:${message}`),
        warn: (message) => promptEvents.push(`warn:${message}`),
      },
    },
    lint: (lintOptions) => {
      lintCalls.push(lintOptions);
      return options.result ?? cleanResult();
    },
  };

  return { runtime, out, err, exits, lintCalls, promptEvents };
}

test("generated root help and version use configured output", async () => {
  const help = createHarness();
  await runCli(["--help"], help.runtime);
  expect(help.out.join("")).toContain("Usage: cssdoc [options] [command]");
  expect(help.out.join("")).toContain("complete [shell]");
  expect(help.exits.at(-1)).toBe(0);

  const version = createHarness();
  await runCli(["--version"], version.runtime);
  expect(version.out.join("")).toBe("0.15.0\n");
  expect(version.exits.at(-1)).toBe(0);
});

test("lint maps validated Commander arguments to the lint runner", async () => {
  const harness = createHarness({ result: cleanResult("machine output") });
  await runCli(
    [
      "lint",
      "src/*.css",
      "docs/*.css",
      "--format",
      "github",
      "--quiet",
      "--max-warnings",
      "0",
      "--fix",
    ],
    harness.runtime,
  );

  expect(harness.lintCalls).toEqual([
    {
      globs: ["src/*.css", "docs/*.css"],
      format: "github",
      quiet: true,
      maxWarnings: 0,
      fix: true,
    },
  ]);
  expect(harness.out).toEqual(["machine output\n"]);
  expect(harness.exits.at(-1)).toBe(0);
});

test("Commander rejects missing globs and invalid option values", async () => {
  const missing = createHarness();
  await runCli(["lint"], missing.runtime);
  expect(missing.err.join("")).toContain("missing required argument 'globs'");
  expect(missing.exits.at(-1)).toBe(1);

  const invalidFormat = createHarness();
  await runCli(["lint", "a.css", "--format", "xml"], invalidFormat.runtime);
  expect(invalidFormat.err.join("")).toContain("Allowed choices are pretty, json, github");
  expect(invalidFormat.exits.at(-1)).toBe(1);

  const invalidWarnings = createHarness();
  await runCli(["lint", "a.css", "--max-warnings", "-2"], invalidWarnings.runtime);
  expect(invalidWarnings.err.join("")).toContain("greater than or equal to -1");
  expect(invalidWarnings.exits.at(-1)).toBe(1);
});

test("interactive pretty output uses the prompt presenter", async () => {
  const result = runLint({ globs: ["dirty/*.css"], cwd: FIXTURES });
  const harness = createHarness({ stdoutIsTTY: true, result });
  await runCli(["lint", "dirty/*.css"], harness.runtime);

  expect(harness.out).toEqual([]);
  expect(harness.promptEvents).toContain("message:dirty/a.css");
  expect(harness.promptEvents.some((event) => event.startsWith("warn:1:0"))).toBe(true);
  expect(harness.promptEvents).toContain("info:1 problems (0 errors, 1 warnings)");
});

test("machine formats bypass interactive presentation even on a TTY", async () => {
  const harness = createHarness({ stdoutIsTTY: true, result: cleanResult("[]") });
  await runCli(["lint", "a.css", "--format", "json"], harness.runtime);

  expect(harness.out).toEqual(["[]\n"]);
  expect(harness.promptEvents).toEqual([]);
});

test("bare cssdoc runs the guided lint flow on a TTY", async () => {
  const harness = createHarness({
    stdinIsTTY: true,
    stdoutIsTTY: true,
    textValue: "styles/**/*.css",
    confirmValues: [true, true],
  });
  await runCli([], harness.runtime);

  expect(harness.lintCalls).toEqual([
    {
      globs: ["styles/**/*.css"],
      format: "pretty",
      fix: true,
      maxWarnings: 0,
    },
  ]);
  expect(harness.promptEvents).toEqual([
    "intro:cssdoc lint",
    "success:No problems found.",
    "outro:Lint complete.",
  ]);
});

test("guided lint cancellation uses exit code 130", async () => {
  const harness = createHarness({
    stdinIsTTY: true,
    stdoutIsTTY: true,
    textValue: Symbol("cancel"),
  });
  await runCli([], harness.runtime);

  expect(harness.lintCalls).toEqual([]);
  expect(harness.promptEvents).toEqual(["intro:cssdoc lint", "cancel:Lint cancelled."]);
  expect(harness.exits.at(-1)).toBe(130);
});

test("bare cssdoc prints help instead of prompting without a TTY", async () => {
  const harness = createHarness();
  await runCli([], harness.runtime);

  expect(harness.out.join("")).toContain("Usage: cssdoc [options] [command]");
  expect(harness.promptEvents).toEqual([]);
  expect(harness.exits.at(-1)).toBe(1);
});

test("completion command is registered in the Commander tree", () => {
  const harness = createHarness();
  const completion = createCssDocProgram(harness.runtime).commands.find(
    (command) => command.name() === "complete",
  );

  expect(completion).toBeDefined();
  expect(completion?.description()).toBe("Generate shell completion scripts");
  expect(completion?.registeredArguments[0]?.description).toContain(
    'choices: "zsh", "bash", "fish", "powershell"',
  );
});
