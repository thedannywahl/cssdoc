---
aside: false
---

<script setup>
import { data } from "../.vitepress/pattern-reference.data";
</script>

# Pattern reference

These patterns come from `@cssdoc/regex`. Their sources are unanchored unless shown otherwise;
callers may add anchors, flags, or surrounding context. See the [grammar](./grammar) for the
doc-comment productions.

An **exact** association matches a whole production when anchored. A **fragment** covers part of a
production. A **related** pattern is a heuristic, not an equivalent grammar rule. CSS grammar names
refer to CSS specifications, not the cssdoc grammar. Patterns without a grammar association may
still be used by the parser or other tools.

<section v-for="group in data" :key="group.name">
  <h2>{{ group.name }}</h2>
  <table>
    <thead>
      <tr>
        <th>Pattern</th>
        <th>Production</th>
        <th>Relationship</th>
        <th>Source</th>
        <th>Flags</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="pattern in group.patterns" :key="pattern.name">
        <td><code>{{ pattern.name }}</code></td>
        <td><code>{{ pattern.grammarRule ?? "—" }}</code></td>
        <td>{{ pattern.grammarRelation ?? "—" }}</td>
        <td><code>{{ pattern.source }}</code></td>
        <td><code>{{ pattern.flags || "none" }}</code></td>
        <td>{{ pattern.description }}</td>
      </tr>
    </tbody>
  </table>
</section>
