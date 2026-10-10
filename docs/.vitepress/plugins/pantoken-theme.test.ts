import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import postcss from "postcss";
import { byTheme } from "@pantoken/tokens";
import { VITEPRESS_TO_INSTUI } from "@pantoken/vitepress";
import { expandTheme, pruneTheme, themeCss } from "./pantoken-theme.js";

describe("Pantoken docs theme", () => {
  it("uses the official brand bridge without changing neutral surfaces or typography", () => {
    const root = postcss.parse(themeCss());
    const declarations = new Map<string, string>();
    root.walkDecls((declaration) => {
      declarations.set(declaration.prop, declaration.value.trim());
    });
    for (const [property, token] of Object.entries(VITEPRESS_TO_INSTUI)) {
      if (property.startsWith("--vp-c-brand-")) {
        expect(declarations.get(property)).toBe(`var(${token})`);
      }
    }
    expect(declarations.has("--vp-c-bg")).toBe(false);
    expect(declarations.has("--vp-font-family-base")).toBe(false);
  });

  it("uses official Aurora colors in background-only light and dark SVGs", () => {
    const css = themeCss();
    const images = [...css.matchAll(/data:image\/svg\+xml,([^"]+)/g)].map((match) =>
      decodeURIComponent(match[1]),
    );
    expect(images).toHaveLength(2);
    expect(images[0]).toContain("#D8FCEB");
    expect(images[0]).toContain("#C8F3DF");
    expect(images[0]).toContain("#007352");
    expect(images[1]).toContain("#00190F");
    expect(images[1]).toContain("#051F15");
    expect(images[1]).toContain("#2BC692");
    for (const image of images) {
      expect(image).toContain('patternTransform="rotate(45)"');
      expect(image).toContain('mask="url(#mask)"');
      expect(image).not.toContain("<text");
      expect(image).not.toContain("cssdoc");
      expect(image).not.toContain('height="10"');
    }
    expect(css).not.toContain("--instui-icon-");
    expect(css).not.toContain("--instui-component-");
  });

  it("fails rather than substituting a missing Aurora color", () => {
    expect(() => themeCss([])).toThrow("Missing literal Pantoken Aurora");
    const tokens = byTheme("rebrand").map((token) =>
      token.name.endsWith("aurora120") ? { ...token, value: "var(--other)" } : token,
    );
    expect(() => themeCss(tokens)).toThrow("Missing literal Pantoken Aurora 120");
  });

  it("expands tokens in the stylesheet at build time", async () => {
    const result = await postcss([expandTheme()]).process("@cssdoc-theme;", { from: undefined });
    expect(result.css).not.toContain("@cssdoc-theme");
    expect(result.css).toContain("--instui-primitive-color-aurora-aurora120");
  });

  it("retains only the Aurora stops referenced by the actual docs theme", async () => {
    const source = readFileSync(new URL("../theme/custom.css", import.meta.url), "utf8");
    const expanded = await postcss([expandTheme()]).process(source, { from: undefined });
    const result = await pruneTheme(expanded.css);
    const names = [...new Set(result.match(/--instui-primitive-color-aurora-aurora\d+/g))];
    expect(names.sort()).toEqual(
      [40, 50, 120, 130, 200].map((step) => `--instui-primitive-color-aurora-aurora${step}`).sort(),
    );
    expect(result).toContain(":root:has(.VPHome)");
    expect(result).toContain(".VPNavBar.home");
    expect(result).not.toContain(".VPHome::before");
    expect(result).toContain("--vp-button-brand-hover-text");
    expect(result).not.toContain("#388080");
    expect(result).not.toContain("#1dc4b6");
  });

  it("prunes unused tokens and registrations while preserving runtime and chained references", async () => {
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
