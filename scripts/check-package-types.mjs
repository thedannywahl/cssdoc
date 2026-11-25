import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "cssdoc-attw-"));
const tarball = join(directory, "package.tgz");
const args = ["exec", "attw", "--profile", "esm-only", "--no-definitely-typed", "--no-summary"];

try {
  execFileSync("vp", ["pm", "pack", "--out", tarball], { stdio: "inherit" });
  execFileSync("vp", [...args, tarball], { stdio: "inherit" });
  const { analysis } = JSON.parse(
    execFileSync("vp", [...args, "--format", "json", tarball], { encoding: "utf8" }),
  );
  if (!analysis.types) throw new Error("ATTW: package has no type declarations");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
