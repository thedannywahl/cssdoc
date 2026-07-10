import { fileURLToPath } from "node:url";
import { Grammar } from "grammarkdown";
import { expect, test } from "vite-plus/test";

// The grammar spec is the source of truth for the doc-comment shape (grammar/CssDoc.grammarkdown); the
// runtime parser in grammar.ts conforms to it. This test keeps the spec honest: it must be valid
// grammarkdown with no error-level diagnostics. (grammarkdown message templates aren't substituted in
// getDiagnosticInfos, so surface the line + raw template on failure — enough to locate the problem.)
const SPEC = fileURLToPath(new URL("../grammar/CssDoc.grammarkdown", import.meta.url));

test("CssDoc.grammarkdown is a valid grammarkdown spec", async () => {
  const grammar = new Grammar([SPEC]);
  await grammar.check();
  const errors = grammar.diagnostics
    .getDiagnosticInfos()
    .filter((info) => !info.warning)
    .map((info) => `line ${(info.range?.start?.line ?? -1) + 1}: ${info.message}`);
  expect(errors).toEqual([]);
});
