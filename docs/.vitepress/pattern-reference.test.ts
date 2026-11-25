import { expect, test } from "vite-plus/test";
import { PATTERN_DEFINITIONS } from "../../packages/regex/src/definitions.ts";
import loader from "./pattern-reference.data.ts";

test("the pattern reference groups every registry entry without altering its source or flags", async () => {
  const groups = await loader.load();
  const rows = groups.flatMap((group) => group.patterns);
  expect(rows.map((row) => row.name).sort()).toEqual(Object.keys(PATTERN_DEFINITIONS).sort());
  expect(
    rows.filter((row) => {
      const pattern = PATTERN_DEFINITIONS[row.name];
      return row.source !== pattern.source || row.flags !== (pattern.flags ?? "");
    }),
  ).toEqual([]);
  expect(
    groups.flatMap((group, index) =>
      group.patterns
        .filter((row) => {
          const source = PATTERN_DEFINITIONS[row.name].grammarSource;
          return index !== (source === "cssdoc" ? 0 : source === "css" ? 1 : 2);
        })
        .map((row) => row.name),
    ),
  ).toEqual([]);
  expect(
    groups[0].patterns.find((row) => row.name === "CSSDOC_DESCRIPTION_SEPARATOR"),
  ).toMatchObject({
    grammarRule: "Separator",
    grammarRelation: "exact",
    source: PATTERN_DEFINITIONS.CSSDOC_DESCRIPTION_SEPARATOR.source,
    flags: PATTERN_DEFINITIONS.CSSDOC_DESCRIPTION_SEPARATOR.flags ?? "",
  });
  expect(groups[1].patterns.find((row) => row.name === "CSS_IDENTIFIER")?.grammarRule).toBe(
    "ident",
  );
  expect(
    groups[2].patterns.find((row) => row.name === "CSSDOC_TAG_NAME")?.grammarRule,
  ).toBeUndefined();
});
