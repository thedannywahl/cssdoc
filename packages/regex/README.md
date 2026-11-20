# @cssdoc/regex

Type-safe, ArkRegex-based pattern library for cssdoc. Centralizes CSS, grammar-driven, and cssdoc-specific regex patterns with modern named capture groups.

## Features

- **Type Safety**: All patterns use ArkRegex with named capture groups and TypeScript type inference
- **IDE Completion**: Auto-complete shows all available capture groups
- **Single Source of Truth**: Each pattern defined once, used everywhere
- **Maintainability**: Patterns traceable to W3C specs and CssDoc grammar
- **Security**: ArkRegex prevents ReDoS (Regular Expression Denial of Service) vulnerabilities
- **Zero Overhead**: Compile-time type inference, no runtime cost

## Three-Tier Architecture

### Tier 1: W3C CSS Specification Patterns

Standard CSS constructs from the official W3C formal grammar:

- CSS identifiers, keywords, colors, functions
- Property names, units, dimensions
- Numbers, percentages, unicode ranges

```typescript
import { CSS_IDENTIFIER, CSS_HASH_COLOR } from "@cssdoc/regex";

const match = CSS_HASH_COLOR.exec("#ffffff");
const color = match?.groups?.color; // "ffffff" (typed)
```

### Tier 2: CssDoc Grammar Patterns

Patterns derived from the formal `CssDoc.grammarkdown` specification:

- Record names and identifiers
- Modifier names (suffix, chained, attribute forms)
- Tags and structure references
- Cardinality keywords

```typescript
import { CSSDOC_TAG, CSSDOC_RECORD_NAME } from "@cssdoc/regex";

const tagMatch = CSSDOC_TAG.exec("@component Button");
const { tag, arg } = tagMatch?.groups ?? {}; // "component", "Button"

const nameMatch = CSSDOC_RECORD_NAME.exec("menu.item.action");
const parts = nameMatch?.groups?.parts; // "menu.item.action"
```

### Tier 3: cssdoc-Specific Patterns

Local implementation patterns for cssdoc architecture:

- BEM naming conventions (base, element, modifier)
- ARIA attribute state matching
- Configuration glob patterns
- CSS combinator and pseudo-selector matching

```typescript
import { BEM_MODIFIER, ARIA_STATE, VAR_REFERENCE } from "@cssdoc/regex";

const bemMatch = BEM_MODIFIER.exec(".button--primary");
const { base, mod } = bemMatch?.groups ?? {}; // "button", "primary"

const ariaMatch = ARIA_STATE.exec('[aria-expanded="true"]');
const { attr, value } = ariaMatch?.groups ?? {}; // "aria-expanded", "true"

const varMatches = [...".selector".matchAll(VAR_REFERENCE)];
```

## Pattern Groups & Usage

### CSS Patterns (Tier 1 + 3)

Used for CSS selector/class matching and validation:

```typescript
import { CSS_IDENTIFIER, BEM_BASE, CLASS_REF, SINGLE_CLASS } from "@cssdoc/regex";
```

### CSS-Doc Patterns (Tier 2)

Used for doc-comment parsing and grammar validation:

```typescript
import {
  CSSDOC_IDENTIFIER,
  CSSDOC_TAG,
  CSSDOC_RECORD_NAME,
  CSSDOC_MODIFIER_SUFFIX,
} from "@cssdoc/regex";
```

### Modifier Patterns (Tier 2 + 3)

Used for modifier extraction and BEM convention matching:

```typescript
import { CSSDOC_MODIFIER_CHAINED, BEM_MODIFIER, MODIFIER_CHAIN } from "@cssdoc/regex";
```

### Selector Patterns (Tier 1 + 2 + 3)

Used for selector validation and structure analysis:

```typescript
import {
  CSS_FUNCTION,
  PSEUDO_CLASS,
  PSEUDO_ELEMENT,
  ATTRIBUTE_SELECTOR,
  COMBINATOR,
} from "@cssdoc/regex";
```

### Config Patterns (Tier 3)

Used for configuration and globbing:

```typescript
import { GLOB_PATTERN } from "@cssdoc/regex";
```

## Type Inference Example

All patterns infer their capture group types at compile time:

```typescript
import { CSSDOC_TAG } from "@cssdoc/regex";

const pattern = CSSDOC_TAG;
// Inferred type:
// Regex<
//   string,
//   {
//     names: {
//       tag: string;
//       arg?: string;
//     }
//   }
// >

const match = pattern.exec("@modifier active");
// Type of match:
// {
//   index: number;
//   input: string;
//   groups: { tag: string; arg?: string };
//   ...
// } | null

const tag = match?.groups?.tag; // string | undefined (typed!)
const arg = match?.groups?.arg; // string | undefined (typed!)

// TypeScript error: Property 'unknown' does not exist
match?.groups?.unknown; // ❌ Compile error!
```

## Why Not Just Native RegExp?

### Before (native RegExp with numbered captures)

```typescript
const pattern = /^@(\w+)\s+(\S+)?/;
const match = pattern.exec("@component Button");
const tag = match?.[1]; // any - could be wrong!
const arg = match?.[2]; // any - easy to confuse
```

### After (ArkRegex with named groups)

```typescript
import { CSSDOC_TAG } from "@cssdoc/regex";

const match = CSSDOC_TAG.exec("@component Button");
const tag = match?.groups?.tag; // string | undefined (clear!)
const arg = match?.groups?.arg; // string | undefined (clear!)
// IDE completion shows exactly what groups are available
```

## Contributing

When adding new patterns:

1. **Determine the tier**:
   - **Tier 1**: Is it in W3C CSS specs? Add to `tiers/css-spec.ts`
   - **Tier 2**: Is it in `CssDoc.grammarkdown`? Add to `tiers/css-doc-grammar.ts`
   - **Tier 3**: Is it cssdoc-specific? Add to `tiers/cssdoc-local.ts`

2. **Use named capture groups**: Always use `(?<groupName>...)` instead of `(...)`

3. **Document with examples**: Include JSDoc comment with usage examples

4. **Add tests**: Extend `tests/patterns.test.ts` with test cases

5. **Update types**: Add entry to `PatternTypes` in `types.ts` if adding new pattern

## References

- [ArkRegex Documentation](https://arktype.io/docs/regex)
- [W3C CSS Specification](https://www.w3.org/TR/CSS2/)
- [CssDoc Grammar](../spec/grammar/CssDoc.grammarkdown)
- [MDN CSS Data](https://github.com/mdn/data)
- [OWASP ReDoS Prevention](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)

## License

MIT
