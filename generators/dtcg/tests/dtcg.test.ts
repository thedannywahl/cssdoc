import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import { toDtcg } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @cssproperty --button-radius — The corner radius.
 */
.button { color: red; }
@property --button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }
@property --button-count { syntax: "<integer>"; inherits: false; initial-value: 0; }
`;

test("toDtcg maps custom properties to DTCG tokens grouped by record", () => {
  const tokens = toDtcg(createIndex(CSS));
  expect(tokens.button["button-radius"]).toEqual({
    $value: "4px",
    $type: "dimension",
    $description: "The corner radius.",
  });
  expect(tokens.button["button-count"]).toEqual({
    $value: "0",
    $type: "number",
  });
});
