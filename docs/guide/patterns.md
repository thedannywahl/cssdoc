---
outline: 2
---

<script setup lang="ts">
import { data } from "../.vitepress/pattern-reference.data";

function formatInput(input: string): string {
  return JSON.stringify(input).replace(/[^\S ]/gu, (character) => {
    return "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0");
  });
}
</script>

# Regex patterns

These patterns come from `@cssdoc/regex`. **Actual** shows the TypeScript expression as written,
including any calls that compose other patterns. **Resolved** shows the resulting regex source.
Sources are unanchored unless shown otherwise. Callers may add anchors, flags, or surrounding
context. See the [grammar](./grammar) for the doc-comment productions.

An **exact** association matches a whole production when anchored. A **fragment** covers part of a
production. A **related** pattern is a heuristic, not an equivalent grammar rule. CSS grammar names
refer to CSS specifications, not the cssdoc grammar. Patterns without a grammar association are
grouped by their registry tier.

Expand **Examples** to see the registry's passing and failing test inputs. Tests match each input
against the whole pattern, except literal-text primitives, which use exact equality, and the
zero-width word boundary, which is tested in context. Quotes and escapes show whitespace and empty strings.

<section v-for="group in data" :key="group.id">
  <h2 :id="group.id">{{ group.name }}</h2>
  <p>{{ group.description }}</p>
  <article v-for="pattern in group.patterns" :key="pattern.name">
    <h3 :class="$style.name">{{ pattern.name }}</h3>
    <p>{{ pattern.description }}</p>
    <dl :class="$style.metadata">
      <div v-if="pattern.grammarRule">
        <dt>Production</dt>
        <dd>
          <a
            v-if="group.id === 'cssdoc-grammar'"
            :href="'./grammar#production-' + pattern.grammarRule.toLowerCase()"
            ><Badge type="info" :text="pattern.grammarRule" /></a
          >
          <Badge v-else type="info" :text="pattern.grammarRule" />
        </dd>
      </div>
      <div v-if="pattern.grammarRelation">
        <dt>Relationship</dt>
        <dd><Badge type="info" :text="pattern.grammarRelation" /></dd>
      </div>
      <div>
        <dt>Flags</dt>
        <dd><Badge type="info" :text="pattern.flags || 'None'" /></dd>
      </div>
    </dl>
    <div :class="$style.source" v-html="pattern.codeGroupHtml" />
    <details v-if="pattern.fixtures.passes.length || pattern.fixtures.fails.length">
      <summary>Examples</summary>
      <div :class="$style.examples">
        <div v-if="pattern.fixtures.passes.length" :class="$style.passes">
          <h4>Passes</h4>
          <ul>
            <li v-for="(fixture, index) in pattern.fixtures.passes" :key="index">
              <code>{{ formatInput(fixture.input) }}</code>
              <span v-if="fixture.note"> — {{ fixture.note }}</span>
            </li>
          </ul>
        </div>
        <div v-if="pattern.fixtures.fails.length" :class="$style.fails">
          <h4>Fails</h4>
          <ul>
            <li v-for="(fixture, index) in pattern.fixtures.fails" :key="index">
              <code>{{ formatInput(fixture.input) }}</code>
              <span> — {{ fixture.reason }}</span>
            </li>
          </ul>
        </div>
      </div>
    </details>
  </article>
</section>

<style module>
.name,
.metadata dd,
.examples code {
  overflow-wrap: anywhere;
}

.metadata,
.metadata > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.metadata {
  column-gap: 1rem;
  font-size: 0.875rem;
}

.metadata dt {
  font-weight: 600;
}

.metadata dd {
  margin: 0;
  min-width: 0;
}

.source :global(.tabs),
.source :global(.blocks > div) {
  margin-inline: 0;
}

.examples {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: 0.5rem 1rem;
}

.passes {
  --fixture-color: var(--instui-color-text-success);
  --fixture-background: var(--instui-color-background-pastel-success);
}

.fails {
  --fixture-color: var(--instui-color-text-error);
  --fixture-background: var(--instui-color-background-pastel-error);
}

.examples ul li > code {
  color: var(--fixture-color);
  background-color: var(--fixture-background);
}
</style>
