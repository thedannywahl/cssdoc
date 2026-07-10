import { parseCssDocs } from "@cssdoc/core";
import { expect, test } from "vite-plus/test";
import { dialectForFilename, resolveParser } from "../src/index.ts";

const SCSS = `$brand: #06c;
@mixin card { border-radius: 4px; }

/**
 * @component card
 * @summary A surface.
 * @modifier card--featured — Raised.
 */
.card {
  @include card;
  color: $brand;
  &.card--featured { box-shadow: 0 1px 4px; }
}
`;

test("dialectForFilename maps extensions", () => {
  expect(dialectForFilename("a.scss")).toBe("scss");
  expect(dialectForFilename("a.sass")).toBe("scss");
  expect(dialectForFilename("a.less")).toBe("less");
  expect(dialectForFilename("a.css")).toBe("css");
  expect(dialectForFilename(undefined)).toBe("css");
});

test("the scss parser lets parseCssDocs read a component past $vars and @mixin", () => {
  const parse = resolveParser("scss");
  const [card] = parseCssDocs(SCSS, { parse });
  expect(card?.name).toBe("card");
  expect(card?.summary).toBe("A surface.");
  expect(card?.modifiers.map((m) => m.name)).toContain("card--featured");
});

test("the scss parser reads a component past a // line comment", () => {
  const withLineComment = `// a SCSS line comment
/**
 * @component x
 * @summary s
 */
.x { color: red; }`;
  const [x] = parseCssDocs(withLineComment, { parse: resolveParser("scss") });
  expect(x?.name).toBe("x");
});

test("the less parser reads a component with less syntax", () => {
  const less = `@brand: #06c;
/**
 * @component box
 * @summary A container.
 */
.box { color: @brand; }
`;
  const [box] = parseCssDocs(less, { parse: resolveParser("less") });
  expect(box?.name).toBe("box");
});
