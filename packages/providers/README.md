# @cssdoc/providers

The host-agnostic language-service core. Given a [`@cssdoc/index`](../index), it produces diagnostics,
completions, hover, and definitions — built from modular per-aspect modules (modifier, custom property,
structure, function, state, condition, plus record and part). Every cssdoc integration — the Stylelint
and ESLint plugins, and the language server — is a thin translation of these into its host's API.

## API

```ts
import { createIndex } from "@cssdoc/index";
import {
  lintModel, // author-side hygiene
  checkClassUsage, // consumer-side: unknown/deprecated modifiers
  checkPropertyUsage, // consumer-side: unknown var(--…) (opt-in)
  completeClasses, // components, or a component's modifiers
  completeCustomProperties,
  hoverForClass,
  definitionForClass,
} from "@cssdoc/providers";

const index = createIndex(css, { file: "components.css" });
checkClassUsage([{ base: "btn", tokens: ["btn", "-x"], token: "-x" }], index);
```

Adding an aspect is one module in `aspects.ts` plus a line in the aggregate — no adapter changes.

## License

MIT
