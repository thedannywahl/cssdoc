declare module "postcss-less" {
  import type { Root } from "postcss";

  export function parse(css: string): Root;
}
