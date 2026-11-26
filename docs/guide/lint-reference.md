<script setup>
import { data } from "../.vitepress/lint-rule-reference.data";

const severityBadge = { off: "info", warn: "warning", error: "danger" };
</script>

# Lint rules and diagnostics

Use [Set up linting](/guide/linting) to enable checks in your project. To change severity or scope,
see [lint settings](/guide/config-reference#lint-rules).

## Rule index

Defaults apply when you enable the relevant checks and leave the rule severity unset. Some rules
also need project settings, such as a naming convention or a custom-property prefix.

<section v-for="group in data" :key="group.id">
  <h3 :id="group.id">{{ group.title }}</h3>
  <p>{{ group.description }}</p>
  <table :aria-labelledby="group.id" :class="$style.rules">
    <thead>
      <tr>
        <th scope="col">Rule</th>
        <th scope="col">Default</th>
        <th scope="col">Triggers when</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="rule in group.rules" :key="rule.name" :id="rule.name">
        <th scope="row"><code>{{ rule.name }}</code></th>
        <td><Badge :type="severityBadge[rule.severity]" :text="rule.severity" /></td>
        <td v-html="rule.descriptionHtml" />
      </tr>
    </tbody>
  </table>
</section>

## Worked examples

### Class usage

The ESLint plugin's `cssdoc/valid-class-usage` rule checks how HTML and JSX use documented
classes. It reports unknown and deprecated modifiers and checks allowed host elements declared with
[`@element`](/guide/doc-comment-tags#allowed-html-elements). The rule needs the paths to the
stylesheets it should check against.

The JSX check also runs through oxlint's `jsPlugins`. Use Stylelint alongside oxlint for CSS
doc-comment checks. See the [ESLint plugin setup](https://github.com/thedannywahl/cssdoc/tree/main/plugins/eslint)
for class usage configuration, including HTML and oxlint.

For the [documented button](/guide/authoring), the class usage check accepts `button--quiet`
and flags `button--loud`.

::: code-group

```css [button.css]
/**
 * @component button
 * @summary Triggers an action.
 * @modifier button--quiet — Use for secondary actions next to a
 *   primary button.
 * @tokens --button-radius — Adjusts the rounding of the corners.
 */
.button {
  padding: 0.5rem 1rem;
  border-radius: var(--button-radius, 0.25rem);
}

.button--quiet {
  background: transparent;
}
```

<!-- prettier-ignore -->
```html [index.html] diagnostic-warning="button--loud"
<button class="button button--quiet">Cancel</button>
<button class="button button--loud">Save</button> <!-- [!code warning] -->
Warning: unknown-modifier - ".button--loud" is not a documented  <!-- [!code warning] -->
modifier of "button". <!-- [!code warning] -->
```

:::

### Resolve an ambiguous structure reference

If a component and a utility share the ID `badge`, cssdoc reports
[`structure-ambiguous-record`](#structure-ambiguous-record) for the untyped `@badge` reference:

<!-- prettier-ignore -->
```css diagnostic-warning="@badge"
/**
 * @component shell
 * @structure
 * .shell {
 *   @badge {}
 * }
 */

.shell {
  display: flex;
}

/** @component badge */ /* [!code warning] */
/* Warning: duplicate-record-id-cross-kind - Record id "badge" is shared */ /* [!code warning] */
/* across kinds (component, utility); use typed structure refs like @component badge. */ /* [!code warning] */
.badge {
  display: inline-block;
}

/** @utility badge */ /* [!code warning] */
/* Warning: duplicate-record-id-cross-kind - Record id "badge" is shared */ /* [!code warning] */
/* across kinds (component, utility); use typed structure refs like @component badge. */ /* [!code warning] */
.badge-utility {
  font-weight: bold;
}
```

Use `@component badge {}` inside the structure tree to select the component. The shared ID still
triggers [`duplicate-record-id-cross-kind`](#duplicate-record-id-cross-kind).

### Registered custom properties

cssdoc checks registered `@property` values against the property's `syntax` descriptor. It can
report an invalid initial value, assignment, or `var()` fallback. The diagnostics are
`invalid-default-value`, `invalid-property-value`, and `invalid-fallback-value`. It skips runtime
substitutions such as `var()` and `env()` and properties declared with universal syntax (`*`).

Set [`invalid-fallback-value`](#invalid-fallback-value) to `error` in `cssdoc.jsonc`, and document
the registered property with `@declaration` so cssdoc can use its syntax. This property expects a
length. Replacing the fallback `red` with `0.5rem` clears
[`invalid-fallback-value`](#invalid-fallback-value):

::: code-group

```jsonc [cssdoc.jsonc]
{
  "rules": {
    "invalid-fallback-value": "error",
  },
}
```

<!-- prettier-ignore -->
```css [card.css] diagnostic-error="var(--card-gap, red)"
/** @declaration card-gap */
@property --card-gap {
  syntax: "<length>";
  inherits: false;
  initial-value: 1rem;
}

.card {
  padding: var(--card-gap, red); /* [!code error] */
  /* Error: invalid-fallback-value - `var(--card-gap, …)` fallback `red` */ /* [!code error] */
  /* doesn't match the declared syntax `<length>`. */ /* [!code error] */
}
```

:::

### Suppress diagnostics

Use `cssdoc-disable` and `cssdoc-enable` to mark a region, `cssdoc-disable-line` for the current
line, or `cssdoc-disable-next-line` for the next one. An omitted rule list applies the directive
to all rules. Separate multiple names with spaces or commas. Use a space, hyphen, and space
before an optional reason.

The directive suppresses the missing description on the next rule. Compare the warning without the
directive with the suppressed example:

::: code-group

<!-- prettier-ignore -->
```css [Without suppression] diagnostic-warning=".button--quiet"
/** @component button */
.button {
  padding: 0.5rem;
}

.button--quiet { /* [!code warning] */
  /* Warning: undocumented-modifier - Modifier ".button--quiet" of "button" */ /* [!code warning] */
  /* has no @modifier description. */ /* [!code warning] */
  background: transparent;
}
```

```css [With suppression]
/** @component button */
.button {
  padding: 0.5rem;
}

/* cssdoc-disable-next-line undocumented-modifier - documented by the upstream package */
.button--quiet {
  background: transparent;
}
```

:::

Use `cssdoc-expect-error` to require and suppress a matching diagnostic on the next line. If none
matches, cssdoc reports [`cssdoc-directive`](#cssdoc-directive).
Its configured severity controls that report, and directives can suppress it by rule ID.

<style module>
.rules th,
.rules td {
  padding: 0.375rem 0.625rem;
}

.rules th[scope="row"] {
  text-align: start;
  overflow-wrap: anywhere;
  font-weight: normal;
}
</style>
