import { expect, test } from "vite-plus/test";
import { type Violation, lintCssDocs } from "../src/index.ts";

const only = (css: string, rule: string): Violation[] =>
  lintCssDocs(css).filter((v) => v.rule === rule);

const CSS = `
/**
 * @component slider
 * @summary A slider.
 * @cssproperty --track — the rail.
 */
@property --track {
  syntax: "<length>";
  inherits: false;
  initial-value: red;
}
.slider {
  --track: 8px;
  --track: blue;
  --track: var(--x);
  width: var(--track, 2em);
  height: var(--track, green);
}
`;

test("check 1: an initial-value that doesn't match the syntax", () => {
  const v = only(CSS, "invalid-default-value");
  expect(v).toHaveLength(1);
  expect(v[0].message).toContain("<length>");
});

test("check 2: an assignment that doesn't match the syntax", () => {
  const v = only(CSS, "invalid-property-value");
  expect(v).toHaveLength(1);
  expect(v[0].message).toContain("blue");
});

test("check 3: a var() fallback that doesn't match the syntax", () => {
  const v = only(CSS, "invalid-fallback-value");
  expect(v).toHaveLength(1);
  expect(v[0].message).toContain("green");
});

test("valid values, var() substitution, and CSS-wide keywords are not flagged", () => {
  const ok = `
/**
 * @component x
 * @summary X.
 * @cssproperty --n — N.
 */
@property --n {
  syntax: "<length>";
  inherits: false;
  initial-value: 4px;
}
.x {
  --n: 8px;
  --n: var(--other);
  --n: inherit;
  width: var(--n, 2rem);
}
`;
  const values = lintCssDocs(ok).filter((v) =>
    ["invalid-default-value", "invalid-property-value", "invalid-fallback-value"].includes(v.rule),
  );
  expect(values).toEqual([]);
});

test("properties without a declared syntax are not value-checked", () => {
  const noSyntax = `
/**
 * @component y
 * @summary Y.
 * @cssproperty --c — C.
 */
.y {
  --c: whatever-goes-here;
}
`;
  expect(only(noSyntax, "invalid-property-value")).toEqual([]);
});

test("a value rule can be toggled off", () => {
  const off = lintCssDocs(CSS, { rules: { "invalid-property-value": false } });
  expect(off.filter((v) => v.rule === "invalid-property-value")).toEqual([]);
});
