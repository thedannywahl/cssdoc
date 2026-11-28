import { readFileSync } from "node:fs";

import { byTheme } from "@pantoken/tokens";
import { VITEPRESS_TO_INSTUI } from "@pantoken/vitepress";
import postcss, { parse as parsePostcss } from "postcss";
import { describe, expect, test } from "vite-plus/test";

import { expandTheme, pruneTheme, themeCss } from "./pantoken-theme.js";

const SVG_DATA = /data:image\/svg\+xml,(?<data>[^"]+)/gu;
const CUSTOM_PROPERTY_REFERENCE = /var\((?<dependency>[^)]+)\)/gu;

describe("Pantoken docs theme", () => {
  test("uses the official brand bridge without changing neutral surfaces or typography", () => {
    const root = parsePostcss(themeCss());
    const declarations = new Map<string, string>();
    root.walkDecls((declaration) => {
      declarations.set(declaration.prop, declaration.value.trim());
    });
    const brandTokens = Object.entries(VITEPRESS_TO_INSTUI).filter(([property]) =>
      property.startsWith("--vp-c-brand-"),
    );
    for (const [property, token] of brandTokens) {
      expect(declarations.get(property)).toBe(`var(${token})`);
    }
    expect(declarations.has("--vp-c-bg")).toBe(false);
    expect(declarations.has("--vp-font-family-base")).toBe(false);
  });

  test("uses official Aurora colors in background-only light and dark SVGs", () => {
    const css = themeCss();
    const images = [...css.matchAll(SVG_DATA)].map((match) =>
      decodeURIComponent(match.groups!.data),
    );
    expect(images).toHaveLength(2);
    expect(css).toContain("linear-gradient(135deg, #D8FCEB, #C8F3DF)");
    expect(images[0]).toContain("#007352");
    expect(css).toContain("linear-gradient(135deg, #00190F, #051F15)");
    expect(images[1]).toContain("#2BC692");
    for (const image of images) {
      expect(image).toContain('width="56.5685424949" height="56.5685424949"');
      expect(image).not.toContain('preserveAspectRatio="none"');
      expect(image).toContain('patternTransform="rotate(45)"');
      expect(image).not.toContain("<mask");
      expect(image).not.toContain("<text");
      expect(image).not.toContain("cssdoc");
      expect(image).not.toContain('height="10"');
    }
    expect(css).not.toContain("--instui-icon-");
    expect(css).not.toContain("--instui-component-");
  });

  test("fails rather than substituting a missing Aurora color", () => {
    expect(() => themeCss([])).toThrow("Missing literal Pantoken Aurora");
    const tokens = byTheme("rebrand").map((token) =>
      token.name.endsWith("aurora120") ? { ...token, value: "var(--other)" } : token,
    );
    expect(() => themeCss(tokens)).toThrow("Missing literal Pantoken Aurora 120");
  });

  test("expands tokens in the stylesheet at build time", async () => {
    const result = await postcss([expandTheme()]).process("@cssdoc-theme;", { from: undefined });
    expect(result.css).not.toContain("@cssdoc-theme");
    expect(result.css).toContain("--instui-primitive-color-aurora-aurora120");
  });

  test("keeps both themes' Pantoken colors for passing and failing fixtures", async () => {
    const page = readFileSync(new URL("../../guide/patterns.md", import.meta.url), "utf8");
    const styles = page.split("<style module>")[1].split("</style>")[0];
    const result = await pruneTheme(themeCss() + styles);
    const colors = byTheme("rebrand").filter(({ name }) =>
      /--instui-color-(?:text|background-pastel)-(?:success|error)$/u.test(name),
    );
    expect(colors).toHaveLength(4);
    for (const { name, value } of colors) {
      expect(result).toContain(`${name}: ${value}`);
      for (const match of value.matchAll(CUSTOM_PROPERTY_REFERENCE)) {
        expect(result).toContain(`${match.groups!.dependency}: #`);
      }
    }
  });

  test("keeps the info badge's themed colors and their dependencies after pruning", async () => {
    const styles = readFileSync(new URL("../theme/custom.css", import.meta.url), "utf8");
    const expanded = await postcss([expandTheme()]).process(styles, { from: undefined });
    const result = await pruneTheme(expanded.css);
    const tokens = byTheme("rebrand");
    for (const name of ["--instui-color-text-info", "--instui-color-background-pastel-info"]) {
      const token = tokens.find((entry) => entry.name === name);
      if (!token) throw new Error(`Missing Pantoken token ${name}`);
      expect(result).toContain(`${name}: ${token.value}`);
      for (const match of token.value.matchAll(CUSTOM_PROPERTY_REFERENCE)) {
        expect(result).toContain(`${match.groups!.dependency}: #`);
      }
    }
    const badge = parsePostcss(result).nodes.find(
      (node) =>
        node.type === "rule" && node.selector === ".editor-download-cta__button .VPBadge.top-right",
    );
    expect(badge?.toString()).toContain("color: var(--instui-color-text-info)");
    expect(badge?.toString()).toContain(
      "background-color: var(--instui-color-background-pastel-info)",
    );
  });

  test("retains only the Aurora stops referenced by the actual docs theme", async () => {
    const source = readFileSync(new URL("../theme/custom.css", import.meta.url), "utf8");
    const expanded = await postcss([expandTheme()]).process(source, { from: undefined });
    const result = await pruneTheme(expanded.css);
    const names = [...new Set(result.match(/--instui-primitive-color-aurora-aurora\d+/gu))];
    expect(names.sort()).toEqual(
      [40, 50, 120, 130, 200].map((step) => `--instui-primitive-color-aurora-aurora${step}`).sort(),
    );
    expect(result).toContain(":root:has(.VPHome)");
    expect(result).toContain("background-size: 56.5685424949px 56.5685424949px");
    expect(result).toContain("background-position: right top");
    expect(result).toContain(":root:has(.VPHome)::before");
    expect(result).toContain("position: absolute");
    expect(result).toContain("inset: 0");
    expect(result).toContain("linear-gradient(to left, black, transparent 66.666667%)");
    expect(result).toContain("linear-gradient(to bottom, black, transparent 66.666667%)");
    expect(result).toContain("mask-composite: intersect");
    expect(result).toContain(".VPNavBar.home");
    expect(result).not.toContain(".VPHome::before");
    expect(result).toContain("--vp-button-brand-hover-text");
    expect(result).not.toContain("#388080");
    expect(result).not.toContain("#1dc4b6");
  });

  test("prunes unused tokens and registrations while preserving runtime and chained references", async () => {
    const css = `
      @property --instui-unused { syntax: "<color>"; inherits: true; initial-value: red; }
      :root {
        --instui-used: green;
        --instui-unused: red;
        --instui-dependency: var(--instui-used);
        --vp-c-brand-1: var(--instui-dependency);
        --runtime-only: blue;
      }
      .dark { --instui-used: lime; }
      .component { border-color: var(--vp-c-brand-1); }
    `;
    const result = await pruneTheme(css);
    expect(result).not.toContain("--instui-unused");
    expect(result).toContain("--instui-used: green");
    expect(result).toContain("--instui-used: lime");
    expect(result).toContain("--instui-dependency");
    expect(result).toContain("--runtime-only: blue");
    expect(result).not.toContain("color: var(--runtime-only)");
  });
});
