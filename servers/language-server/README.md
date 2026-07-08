# @cssdoc/language-server

An editor-agnostic [LSP](https://microsoft.github.io/language-server-protocol/) server for the
documented CSS surface, over [`@cssdoc/providers`](../../packages/providers). It offers:

- **completion** — a component's modifiers inside `class`/`className`, and declared custom properties
  inside `var(--…)`;
- **hover** — a modifier's or custom property's documentation;
- **definition** — jump to the CSS rule that defines a class or `@property`;
- **diagnostics + quick-fix** — unknown and deprecated modifiers, with a one-click replace-with-canonical
  fix.

## Use it

Editors spawn the built binary and pass the CSS paths as `initializationOptions`:

```jsonc
{
  "command": "cssdoc-language-server",
  "initializationOptions": { "css": ["dist/components.css"] },
}
```

Or embed the pure service (no LSP runtime):

```ts
import { createIndex } from "@cssdoc/index";
import { CssDocLanguageService } from "@cssdoc/language-server";

const service = new CssDocLanguageService(createIndex(css, { file: "components.css" }));
service.completions(documentText, { line, character });
service.diagnostics(documentText);
```

## License

MIT
