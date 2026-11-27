import { HEX_DIGIT_SOURCE } from "@cssdoc/regex";
import { toCss } from "@pantoken/css";
import { pruneCustomProps } from "@pantoken/plugin-prune-custom-props";
import { byTheme, type Token } from "@pantoken/tokens";
import { VITEPRESS_TO_INSTUI } from "@pantoken/vitepress";
import { regex as arkRegex } from "arkregex";
import postcss, {
  decl as createDeclaration,
  parse as parsePostcss,
  rule as createRule,
  type Plugin as PostcssPlugin,
} from "postcss";
import type { Plugin } from "vite-plus";

const auroraPrefix = "--instui-primitive-color-aurora-aurora";
const semanticColorTokens = new Set([
  "--instui-color-text-success",
  "--instui-color-text-error",
  "--instui-color-text-info",
  "--instui-color-background-pastel-success",
  "--instui-color-background-pastel-error",
  "--instui-color-background-pastel-info",
]);
const HEX_COLOR = arkRegex.as(`^#${HEX_DIGIT_SOURCE}{6}$`, "i");

/** Render Pantoken theme colors, VitePress brand bridges, and home-page backgrounds as CSS. */
export function themeCss(tokens: readonly Token[] = byTheme("rebrand")): string {
  const bridge = createRule({ selector: ":root" });
  for (const [property, token] of Object.entries(VITEPRESS_TO_INSTUI)) {
    if (property.startsWith("--vp-c-brand-")) {
      bridge.append(createDeclaration({ prop: property, value: `var(${token})` }));
    }
  }
  const aurora = tokens.filter((token) => token.name.startsWith(auroraPrefix));
  const statusColors = tokens.filter(
    ({ name }) =>
      semanticColorTokens.has(name) ||
      name.startsWith("--instui-primitive-color-blue-") ||
      name.startsWith("--instui-primitive-color-green-") ||
      name.startsWith("--instui-primitive-color-red-"),
  );
  const values = new Map(aurora.map((token) => [token.name, token.value]));
  const color = (step: number): string => {
    const value = values.get(`${auroraPrefix}${step}`);
    if (!value || HEX_COLOR.exec(value) === null) {
      throw new Error(`Missing literal Pantoken Aurora ${step}`);
    }
    return value;
  };
  const background = (dark: boolean): string => {
    const accent = color(dark ? 50 : 120);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56.5685424949" height="56.5685424949" viewBox="0 0 56.5685424949 56.5685424949"><defs><pattern id="lines" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V40" stroke="${accent}" stroke-width="2" opacity="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#lines)"/></svg>`;
    return `--vp-home-pattern-image: url("data:image/svg+xml,${encodeURIComponent(svg)}"); --vp-home-bg-image: linear-gradient(135deg, ${color(dark ? 200 : 10)}, ${color(dark ? 190 : 20)});`;
  };
  return `${toCss([...aurora, ...statusColors], { declareAll: true })}
${bridge.toString()}
:root { ${background(false)} }
.dark { ${background(true)} }`;
}

/** Replace the cssdoc theme at-rule with generated theme CSS. */
export function expandTheme(): PostcssPlugin {
  return {
    postcssPlugin: "cssdoc-pantoken-theme",
    AtRule: {
      "cssdoc-theme": (rule) => {
        rule.replaceWith(
          parsePostcss(themeCss(), { from: rule.source?.input.file ?? "pantoken-theme.css" }),
        );
      },
    },
  };
}

/** Remove unused Pantoken custom properties while preserving other custom properties. */
export async function pruneTheme(source: string): Promise<string> {
  const root = parsePostcss(source);
  const preserved = new Set<string>();
  root.walkDecls((declaration) => {
    if (declaration.prop.startsWith("--") && !declaration.prop.startsWith("--instui-")) {
      preserved.add(declaration.prop);
    }
  });
  const consumers = createRule({ selector: ":root" });
  for (const name of preserved) {
    consumers.append(createDeclaration({ prop: "color", value: `var(${name})` }));
  }
  root.append(consumers);
  await postcss([pruneCustomProps()]).process(root, { from: undefined });
  consumers.remove();
  return root.toString();
}

/** Prune Pantoken properties from the composed CSS asset after the site build. */
export function pruneThemeBundle(): Plugin {
  return {
    name: "cssdoc-prune-pantoken",
    apply: "build",
    generateBundle: {
      order: "post",
      async handler(_options, bundle) {
        const styles = Object.values(bundle).filter(
          (output) => output.type === "asset" && output.fileName.endsWith(".css"),
        );
        if (styles.length > 1) throw new Error("Pantoken pruning requires composed CSS");
        for (const style of styles) {
          if (style.type !== "asset") continue;
          const source =
            typeof style.source === "string"
              ? style.source
              : new TextDecoder().decode(style.source);
          style.source = await pruneTheme(source);
        }
      },
    },
  };
}
