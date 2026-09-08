import { readFileSync } from "node:fs";
import process from "node:process";
import tab from "@bomb.sh/tab/commander";
import * as clack from "@clack/prompts";
import { Command, CommanderError, InvalidArgumentError, Option } from "@commander-js/extra-typings";
import type { Command as CommanderCommand } from "commander";
import { runLint, type LintCliOptions, type LintCliResult, type OutputFormat } from "./index.ts";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

interface PromptAdapter {
  intro(message: string): void;
  outro(message: string): void;
  cancel(message: string): void;
  text(options: clack.TextOptions): Promise<string | symbol>;
  confirm(options: clack.ConfirmOptions): Promise<boolean | symbol>;
  isCancel(value: unknown): value is symbol;
  log: Pick<typeof clack.log, "error" | "info" | "message" | "success" | "warn">;
}

export interface CliRuntime {
  stdinIsTTY: boolean;
  stdoutIsTTY: boolean;
  writeOut(message: string): void;
  writeErr(message: string): void;
  setExitCode(exitCode: number): void;
  prompts: PromptAdapter;
  lint(options: LintCliOptions): LintCliResult;
}

const defaultRuntime: CliRuntime = {
  stdinIsTTY: process.stdin.isTTY === true,
  stdoutIsTTY: process.stdout.isTTY === true,
  writeOut: (message) => process.stdout.write(message),
  writeErr: (message) => process.stderr.write(message),
  setExitCode: (exitCode) => {
    process.exitCode = exitCode;
  },
  prompts: {
    intro: (message) => clack.intro(message),
    outro: (message) => clack.outro(message),
    cancel: (message) => clack.cancel(message),
    text: (options) => clack.text(options),
    confirm: (options) => clack.confirm(options),
    isCancel: clack.isCancel,
    log: clack.log,
  },
  lint: runLint,
};

function parseMaxWarnings(value: string): number {
  if (!/^-?\d+$/u.test(value)) {
    throw new InvalidArgumentError("must be an integer greater than or equal to -1");
  }
  const parsed = Number(value);
  if (parsed < -1) {
    throw new InvalidArgumentError("must be an integer greater than or equal to -1");
  }
  return parsed;
}

function writeLine(write: (message: string) => void, message: string): void {
  if (message) write(`${message}\n`);
}

function presentInteractive(result: LintCliResult, prompts: PromptAdapter): void {
  if (result.errorCount === 0 && result.warningCount === 0) {
    prompts.log.success("No problems found.");
    return;
  }

  for (const { file, violations } of result.results) {
    if (violations.length === 0) continue;
    prompts.log.message(file);
    for (const violation of violations) {
      const message = `${violation.line}:0  [${violation.rule}] ${violation.message}`;
      if (violation.severity === "error") prompts.log.error(message);
      else prompts.log.warn(message);
    }
  }

  const total = result.errorCount + result.warningCount;
  prompts.log.info(
    `${total} problems (${result.errorCount} errors, ${result.warningCount} warnings)`,
  );
}

function runLintAction(
  runtime: CliRuntime,
  globs: string[],
  options: Omit<LintCliOptions, "globs">,
): void {
  const result = runtime.lint({ globs, ...options });
  if (options.format === "pretty" && runtime.stdoutIsTTY) {
    presentInteractive(result, runtime.prompts);
  } else {
    writeLine((message) => runtime.writeOut(message), result.output);
  }
  runtime.setExitCode(result.exitCode);
}

async function runGuidedLint(runtime: CliRuntime): Promise<void> {
  if (!runtime.stdinIsTTY || !runtime.stdoutIsTTY) return;

  runtime.prompts.intro("cssdoc lint");
  const target = await runtime.prompts.text({
    message: "Which CSS path or glob should be linted?",
    placeholder: "**/*.css",
    defaultValue: "**/*.css",
    validate: (value) => (value?.trim() ? undefined : "Enter a CSS path or glob."),
  });
  if (runtime.prompts.isCancel(target)) {
    runtime.prompts.cancel("Lint cancelled.");
    runtime.setExitCode(130);
    return;
  }

  const fix = await runtime.prompts.confirm({
    message: "Apply safe fixes?",
    initialValue: false,
  });
  if (runtime.prompts.isCancel(fix)) {
    runtime.prompts.cancel("Lint cancelled.");
    runtime.setExitCode(130);
    return;
  }

  const strict = await runtime.prompts.confirm({
    message: "Fail when warnings are reported?",
    initialValue: false,
  });
  if (runtime.prompts.isCancel(strict)) {
    runtime.prompts.cancel("Lint cancelled.");
    runtime.setExitCode(130);
    return;
  }

  runLintAction(runtime, [target.trim()], {
    format: "pretty",
    fix,
    maxWarnings: strict ? 0 : -1,
  });
  runtime.prompts.outro("Lint complete.");
}

export function createCssDocProgram(runtime: CliRuntime = defaultRuntime): Command {
  const program = new Command("cssdoc")
    .description("Lint CSS documentation without a host linter.")
    .version(version)
    .showHelpAfterError()
    .showSuggestionAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (message) => runtime.writeOut(message),
      writeErr: (message) => runtime.writeErr(message),
    });

  program.action(async () => {
    if (!runtime.stdinIsTTY || !runtime.stdoutIsTTY) {
      program.outputHelp();
      runtime.setExitCode(1);
      return;
    }
    await runGuidedLint(runtime);
  });

  program
    .command("lint")
    .description("Lint CSS documentation comments.")
    .argument("<globs...>", "CSS files or glob patterns")
    .addOption(
      new Option("--format <format>", "output format")
        .choices(["pretty", "json", "github"] as const)
        .default("pretty"),
    )
    .option("--quiet", "suppress warning-severity violations", false)
    .option(
      "--max-warnings <count>",
      "fail when more than this many warnings are reported",
      parseMaxWarnings,
      -1,
    )
    .option("--fix", "apply safe deterministic fixes", false)
    .action((globs, options) => {
      runLintAction(runtime, globs, {
        format: options.format as OutputFormat,
        quiet: options.quiet,
        maxWarnings: options.maxWarnings,
        fix: options.fix,
      });
    });

  tab(program as unknown as CommanderCommand, { completionCommandName: "complete" });
  return program;
}

export async function runCli(
  argv: readonly string[] = process.argv.slice(2),
  runtime: CliRuntime = defaultRuntime,
): Promise<void> {
  const program = createCssDocProgram(runtime);
  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      runtime.setExitCode(error.exitCode);
      return;
    }
    throw error;
  }
}
