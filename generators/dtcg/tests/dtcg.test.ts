import { createIndex } from "@cssdoc/index";
import { expect, test } from "vite-plus/test";
import { toDtcg } from "../src/index.ts";

const CSS = `
/**
 * @component button
 * @summary The primary action control.
 * @cssproperty --instui-button-radius — The corner radius.
 */
.instui-button { color: red; }
@property --instui-button-radius { syntax: "<length>"; inherits: false; initial-value: 4px; }
@property --instui-button-count { syntax: "<integer>"; inherits: false; initial-value: 0; }
`;

test("toDtcg maps custom properties to DTCG tokens grouped by record", () => {
  const tokens = toDtcg(createIndex(CSS));
  expect(tokens.button["instui-button-radius"]).toEqual({
    $value: "4px",
    $type: "dimension",
    $description: "The corner radius.",
  });
  expect(tokens.button["instui-button-count"]).toEqual({
    $value: "0",
    $type: "number",
  });
});
