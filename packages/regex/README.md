# @cssdoc/regex

Type-safe, ArkRegex-based pattern library for cssdoc. Centralizes CSS, grammar-driven, and cssdoc-specific regex patterns with modern named capture groups.

## Features

- **ArkRegex**: Compiled patterns are available alongside their source strings
- **Single Source of Truth**: Each pattern defined once with metadata and test fixtures in `definitions.ts`
- **Maintainability**: Patterns traceable to W3C specs and CssDoc grammar
- **Testing**: Pattern definitions include pass/fail fixtures

## Usage

All patterns are exported from `definitions.ts` as a single `PATTERN_DEFINITIONS` object:

```typescript
import { PATTERN_DEFINITIONS } from "@cssdoc/regex";

// Access any pattern
const pattern = PATTERN_DEFINITIONS.CSS_IDENTIFIER;
console.log(pattern.name); // "CSS_IDENTIFIER"
console.log(pattern.tier); // 1
console.log(pattern.description); // "CSS identifier"
console.log(pattern.source); // resolved regex source
console.log(pattern.fixtures); // { passes: [...], fails: [...] }
```

## Pattern Tiers

Patterns are organized by tier level:

- **Tier 0**: Character classes (single characters, digits, word boundaries)
- **Tier 1**: CSS specification patterns (identifiers, colors, functions, dimensions)
- **Tier 2**: CssDoc grammar patterns (tags, modifiers, cardinality, record names)
- **Tier 3**: cssdoc-specific patterns (parts, properties, states, variants, slots)
- **Tier 4**: Complex composite patterns

`UNDERSCORE_CHAR` is the literal underscore for composing separators and patterns.
`ASTERISK_CHAR`, `CARET_CHAR`, `DOLLAR_CHAR`, and `TILDE_CHAR` provide literal operator characters.
`EQUALS_CHAR` provides the literal equals sign.
`AMPERSAND_CHAR` provides the literal ampersand.
`FILE_EXTENSION` captures a lowercase ASCII filename extension at the end of a string.
`DOC_COMMENT_START_SOURCE` matches a doc-comment opener; `DOC_COMMENT_START_TEXT` is its literal form.
`LESS_THAN_CHAR` and `GREATER_THAN_CHAR` provide literal angle brackets.
`REGEX_METACHARACTER_SOURCE` matches characters that need escaping in regular expressions.
Use `escapeRegex(text)` to escape those characters throughout a string for use in a regex pattern.
`CSSDOC_DESCRIPTION_SEPARATOR_SOURCE` matches `—`, `-`, and the parser's legacy `--` separator.
Callers supply any whitespace required around it.
`CSSDOC_MODIFIER_REFERENCE_SOURCE` matches canonical modifier references, and
`CSSDOC_MODIFIER_ANNOTATION_PREFIX_SOURCE` matches optional punctuation before modifier annotations.
`CSSDOC_BLOCK_TAG_NAME_SOURCE` matches the broader block-tag names accepted by the comment parser.
`CSSDOC_EXAMPLE_LABEL_SOURCE` matches one label in an example's `labels=[...]` header.
`CSSDOC_ATTRIBUTE_SELECTOR_SOURCE` and `CSSDOC_SELECTOR_TOKEN_SOURCE` match the parser's
bracket-aware selector tokens. `CSSDOC_CUSTOM_PROPERTY_TAG_NAME_SOURCE` matches the broader
custom-property names accepted in doc tags. `CSSDOC_QUALIFIED_REFERENCE_SOURCE` matches the
dot-separated reference segments accepted in structure tags.
`CSSDOC_TYPED_STRUCTURE_REFERENCE_SOURCE` and `CSSDOC_SHORTHAND_STRUCTURE_REFERENCE_SOURCE`
match structure reference bodies and capture their optional profiles and privacy flags.
`CSS_CLASS_ATTRIBUTE_SELECTOR_SOURCE` matches a class attribute selector and captures its operator and value.
`CSSDOC_STRUCTURE_SLOT_SOURCE` matches default and named slot selectors in structure nodes.
`CSSDOC_ELEMENT_TAG_SOURCE` matches an element name with independently optional angle brackets and
captures the name.
`CSSDOC_BASE_CLASS_NAME_SOURCE` matches the class names used for base and scoped-part inference.
`CSS_CLASS_REFERENCE_SOURCE` captures permissive class references, including modifier names.
`CSSDOC_CUSTOM_STATE_SELECTOR_SOURCE`, `CSSDOC_SHADOW_PART_SELECTOR_SOURCE`, and
`CSSDOC_SCANNED_PSEUDO_SELECTOR_SOURCE` support parser and index selector scanning.
`CSSDOC_CARDINALITY_SOURCE` matches the cardinality suffixes supported by `@structure`;
`CSSDOC_CARDINALITY_KEYWORDS` maps their shorthand and full keywords to canonical values.

## Example: CSS Identifier

```typescript
import { PATTERN_DEFINITIONS } from "@cssdoc/regex";

const def = PATTERN_DEFINITIONS.CSS_IDENTIFIER;
const regex = new RegExp(def.source);
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

  // Resolved pattern source and, for tiers above 0, compiled regex
  source: string;
  regex?: Regex;

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
