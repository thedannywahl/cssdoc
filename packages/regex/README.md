# @cssdoc/regex

Type-safe, ArkRegex-based pattern library for cssdoc. Centralizes CSS, grammar-driven, and cssdoc-specific regex patterns with modern named capture groups.

## Features

- **Type Safety**: All patterns use ArkRegex with named capture groups and TypeScript type inference
- **IDE Completion**: Auto-complete shows all available capture groups
- **Single Source of Truth**: Each pattern defined once with metadata and test fixtures in `definitions.ts`
- **Maintainability**: Patterns traceable to W3C specs and CssDoc grammar
- **Security**: ArkRegex prevents ReDoS (Regular Expression Denial of Service) vulnerabilities
- **Zero Overhead**: Compile-time type inference, no runtime cost
- **Comprehensive Testing**: 296 test cases covering all patterns with pass/fail fixtures

## Usage

All patterns are exported from `definitions.ts` as a single `PATTERN_DEFINITIONS` object:

```typescript
import { PATTERN_DEFINITIONS } from "@cssdoc/regex";

// Access any pattern
const pattern = PATTERN_DEFINITIONS.CSS_IDENTIFIER;
console.log(pattern.name); // "CSS_IDENTIFIER"
console.log(pattern.tier); // 1
console.log(pattern.description); // "CSS identifier"
console.log(pattern.pattern); // string or function
console.log(pattern.fixtures); // { passes: [...], fails: [...] }
```

## Pattern Tiers

Patterns are organized by tier level:

- **Tier 0**: Character classes (single characters, digits, word boundaries)
- **Tier 1**: CSS specification patterns (identifiers, colors, functions, dimensions)
- **Tier 2**: CssDoc grammar patterns (tags, modifiers, cardinality, record names)
- **Tier 3**: cssdoc-specific patterns (parts, properties, states, variants, slots)
- **Tier 4**: Complex composite patterns

## Example: CSS Identifier

```typescript
import { PATTERN_DEFINITIONS } from "@cssdoc/regex";

const def = PATTERN_DEFINITIONS.CSS_IDENTIFIER;
const pattern =
  def.pattern instanceof Function
    ? def.pattern((name) => PATTERN_DEFINITIONS[name].pattern)
    : def.pattern;

const regex = new RegExp(pattern);
console.log(regex.test("my-class")); // true
console.log(regex.test("-my-class")); // false (cannot start with dash)
```

## Pattern Structure

Each pattern definition includes:

```typescript
interface UnifiedPatternDef {
  // Export name (e.g., ALPHA, CSS_IDENTIFIER)
  name: string;

  // Grammar rule name from CssDoc.grammarkdown
  grammarRule?: string;

  // Tier level (0-4)
  tier: 0 | 1 | 2 | 3 | 4;

  // Pattern string or composition function
  pattern: string | ((resolve: (name: string) => string) => string);

  // Unicode flag: 'u' or 'v'
  flags?: "u" | "v";

  // Named capture groups and their descriptions
  captures?: Record<string, string>;

  // Human-readable description
  description: string;

  // Test fixtures with passes and fails
  fixtures: {
    passes: Array<{ input: string; note?: string }>;
    fails: Array<{ input: string; reason: string }>;
  };

  // Names of patterns this composes
  composedFrom?: string[];

  // Related pattern names
  relatedPatterns?: string[];
}
```

## Contributing

When adding or modifying patterns in `definitions.ts`:

1. **Choose the right tier**:
   - **Tier 0**: Character classes and basic building blocks
   - **Tier 1**: W3C CSS specification patterns
   - **Tier 2**: CssDoc grammar patterns from CssDoc.grammarkdown
   - **Tier 3**: cssdoc implementation-specific patterns
   - **Tier 4**: Complex composite patterns

2. **Use named capture groups**: Always use `(?<groupName>...)` instead of `(...)`

3. **Document clearly**:
   - Provide a descriptive `description` field
   - Add `note` to complex pass fixtures
   - Add `reason` to all fail fixtures

4. **Add comprehensive fixtures**:
   - Include at least 3-4 passing examples
   - Include edge cases and boundary conditions in failures
   - Use composition functions for complex patterns

5. **Test locally**:
   ```bash
   vp test packages/regex/
   ```

## Testing

All patterns are tested in `tests/definitions.test.ts`. Each pattern includes:

- Compilation check (can be converted to RegExp)
- Description validation
- Positive fixture tests (should match)
- Negative fixture tests (should not match full string)

Run tests with:

```bash
vp test packages/regex/tests/definitions.test.ts
```

## References

- [ArkRegex Documentation](https://arktype.io/docs/regex)
- [W3C CSS Specification](https://www.w3.org/TR/CSS2/)
- [CssDoc Specification](../spec/grammar/CssDoc.grammarkdown)
- [MDN CSS Data](https://github.com/mdn/data)
- [OWASP ReDoS Prevention](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)

## License

MIT
