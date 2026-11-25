import { expect, test } from "vite-plus/test";
import { PATTERN_DEFINITIONS } from "../../packages/regex/src/definitions.ts";
import loader from "./pattern-reference.data.ts";

test("the pattern reference preserves registry patterns and their test fixtures", async () => {
  const groups = await loader.load();
  const rows = groups.flatMap((group) => group.patterns);
  expect(rows.map((row) => row.name).sort()).toEqual(Object.keys(PATTERN_DEFINITIONS).sort());
  expect(
    rows.filter((row) => {
      const pattern = PATTERN_DEFINITIONS[row.name];
      return row.source !== pattern.source || row.flags !== (pattern.flags ?? "");
    }),
  ).toEqual([]);
  for (const row of rows) {
    expect(row.fixtures).toEqual(PATTERN_DEFINITIONS[row.name].fixtures);
    expect(row.codeGroupHtml).toContain('class="vp-code-group"');
    expect(row.codeGroupHtml).toContain('data-title="Actual"');
    expect(row.codeGroupHtml).toContain('data-title="Resolved"');
    expect(row.codeGroupHtml).toContain(`name="regex-${row.name}-group-`);
    expect(row.codeGroupHtml).toContain("language-ts");
    expect(row.codeGroupHtml).toContain("language-regex");
    expect(row.codeGroupHtml.match(/class="shiki /g)).toHaveLength(2);
  }
  const fileExtension = rows.find((row) => row.name === "FILE_EXTENSION")?.codeGroupHtml;
  expect(fileExtension).toContain("PatternResolver");
  expect(fileExtension).toContain("ALPHA_LOWER");
  expect(fileExtension).toContain("[a-z]");
  const commentStart = rows.find((row) => row.name === "COMMENT_START")?.codeGroupHtml;
  const actual = commentStart?.match(/<code>([\s\S]*?)<\/code>/)?.[1]?.replace(/<[^>]+>/g, "");
  expect(actual).toContain('\n  const slash = resolve("FORWARD_SLASH");');
  expect(actual).toMatch(/\n\}$/);
  expect(
    groups.flatMap((group) =>
      group.patterns
        .filter((row) => {
          const { grammarSource, tier } = PATTERN_DEFINITIONS[row.name];
          return group.id !== (grammarSource ? `${grammarSource}-grammar` : `tier-${tier}`);
        })
        .map((row) => row.name),
    ),
  ).toEqual([]);
  const populatedTiers = new Set(
    Object.values(PATTERN_DEFINITIONS)
      .filter(({ grammarSource }) => !grammarSource)
      .map(({ tier }) => tier),
  );
  expect(groups.map(({ id }) => id)).toEqual([
    "cssdoc-grammar",
    "css-grammar",
    ...Array.from(populatedTiers)
      .sort((a, b) => b - a)
      .map((tier) => `tier-${tier}`),
  ]);
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
  expect(rows.find((row) => row.name === "CSSDOC_TAG_NAME")?.grammarRule).toBeUndefined();
});
