<script setup lang="ts">
import { parseCssDocs, toMermaid } from "@cssdoc/core";
import { createIndex, cssValueSites } from "@cssdoc/index";
import {
  checkClassUsage,
  checkPropertyAssignments,
  lintModel,
  resolveNaming,
  resolveRuleSeverities,
} from "@cssdoc/providers";
import { type ParseError, parse as parseJsonc, printParseErrorCode } from "jsonc-parser";
import MarkdownIt from "markdown-it";
import { computed, ref } from "vue";
import CodeEditor from "./CodeEditor.vue";
import { presets } from "./presets.ts";
// The JSON schema that powers cssdoc.json completion/validation — shown read-only beside the config.
import schemaJson from "../../../packages/config/cssdoc.schema.json?raw";

// Render authored prose (a11y notes, summaries, descriptions) so inline `code`, *emphasis*, and links
// come through as HTML rather than raw markdown text.
const md = new MarkdownIt({ html: false, linkify: true });
const inline = (text?: string): string => (text ? md.renderInline(text) : "");
const block = (text?: string): string => (text ? md.render(text) : "");

const escapeHtml = (s: string): string =>
  s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

// Most CSS value types live at /Web/CSS/Reference/Values/<type>; a few (e.g. <color>) don't.
const MDN_URL: Record<string, string> = {
  color: "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value",
};
const mdnUrl = (type: string): string =>
  MDN_URL[type] ?? `https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/${type}`;

/** Render a @property `syntax` descriptor with each `<type>` linked out to its MDN reference page. */
const syntaxHtml = (syntax: string): string =>
  escapeHtml(syntax).replace(
    /&lt;([a-z][\w-]*)&gt;/gu,
    (_m, type: string) =>
      `<a href="${mdnUrl(type)}" target="_blank" rel="noopener noreferrer">&lt;${type}&gt;</a>`,
  );

const active = ref("bem");
const css = ref(presets.bem.css);
const html = ref(presets.bem.html);
const config = ref(presets.bem.config);

// The preset switcher swaps the whole example — CSS, HTML, and cssdoc.json — to a valid bundle for
// that convention. The editable cssdoc.json then drives parsing/linting from there.
const loadPreset = (key: string): void => {
  const p = presets[key];
  active.value = key;
  css.value = p.css;
  html.value = p.html;
  config.value = p.config;
};

/** The editable config, parsed the way `@cssdoc/config` parses it: JSON with comments (cssdoc.jsonc). */
const cfg = computed(() => {
  const errors: ParseError[] = [];
  const raw = parseJsonc(config.value, errors, { allowTrailingComma: true }) as
    | {
        modifierConvention?: unknown;
        rules?: Record<string, "off" | "warn" | "error">;
        naming?: { component?: string; part?: string };
      }
    | undefined;
  if (errors.length > 0 || raw === undefined) {
    const first = errors[0];
    return {
      convention: undefined as never,
      severities: resolveRuleSeverities(),
      naming: resolveNaming(),
      error: first
        ? `${printParseErrorCode(first.error)} at offset ${first.offset}`
        : "empty or unparseable config",
    };
  }
  return {
    convention: raw.modifierConvention as never,
    severities: resolveRuleSeverities(raw.rules),
    naming: resolveNaming(raw.naming),
    error: undefined as string | undefined,
  };
});

/** Parse + author-side lint. Malformed CSS surfaces as an error, not a crash. */
const model = computed(() => {
  try {
    const entries = parseCssDocs(css.value, { modifierConvention: cfg.value.convention });
    const index = createIndex(css.value, { modifierConvention: cfg.value.convention });
    return {
      entries,
      diagnostics: [
        // Model hygiene (missing summaries, drift, @structure references, …).
        ...lintModel(index, cfg.value.severities, cfg.value.naming),
        // `--x: value` assignments must match their `@property` syntax (e.g. --tabs-gap: #F00).
        ...checkPropertyAssignments(
          cssValueSites(css.value).assignments,
          index,
          cfg.value.severities,
        ),
      ],
      error: undefined as string | undefined,
    };
  } catch (e) {
    return { entries: [], diagnostics: [], error: (e as Error).message };
  }
});

/** The effective (last) `--x: value` assignment for each custom property, to flag overrides. */
const assignedValues = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {};
  try {
    for (const a of cssValueSites(css.value).assignments) out[a.name] = a.value.trim();
  } catch {
    /* malformed CSS — nothing to resolve */
  }
  return out;
});

/** The resolved value of a custom property when an assignment overrides its declared default. */
const resolvedValue = (name: string, defaultValue?: string): string | undefined => {
  const assigned = assignedValues.value[name];
  return assigned && assigned !== defaultValue?.trim() ? assigned : undefined;
};

/** Consumer-side lint: scan the HTML's class attributes and check them against the component. */
const usage = computed(() => {
  try {
    const index = createIndex(css.value, { modifierConvention: cfg.value.convention });
    const { matcher } = index;
    const bases = new Set<string>();
    const usages: { base?: string; tokens: string[]; token: string }[] = [];
    for (const m of html.value.matchAll(/\bclass(?:Name)?\s*=\s*["']([^"']*)["']/gu)) {
      const tokens = m[1].split(/\s+/u).filter(Boolean);
      const base = tokens.find((t) => index.componentForClass(t));
      if (!base) continue;
      bases.add(base);
      for (const token of tokens) {
        if (matcher.looksLikeUsage(token, base)) usages.push({ base, tokens, token });
      }
    }
    return { bases: [...bases], diagnostics: checkClassUsage(usages, index, cfg.value.severities) };
  } catch {
    return { bases: [], diagnostics: [] };
  }
});
</script>

<template>
  <div class="pg">
    <!-- 1 — preset switcher -->
    <div class="pg__presets" role="group" aria-label="Convention preset">
      <button
        v-for="(p, key) in presets"
        :key="key"
        type="button"
        class="pg__preset"
        :class="{ 'is-active': active === key }"
        @click="loadPreset(key)"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- 2 — cssdoc.jsonc (editable) | cssdoc.schema.json (read-only) -->
    <h2 class="pg__label">cssdoc.jsonc</h2>
    <div class="pg__row pg__row--config">
      <div class="pg__cell">
        <CodeEditor v-model="config" lang="json" />
        <p v-if="cfg.error" class="pg__error">⚠ Invalid JSON — {{ cfg.error }}</p>
      </div>
      <div class="pg__cell">
        <CodeEditor :model-value="schemaJson" lang="json" readonly />
      </div>
    </div>

    <!-- 3 — component CSS | resolved + lint -->
    <h2 class="pg__label">tabs.css</h2>
    <div class="pg__row">
      <div class="pg__cell">
        <CodeEditor v-model="css" lang="css" />
      </div>
      <div class="pg__cell pg__resolved">
        <p v-if="model.error" class="pg__error">⚠ {{ model.error }}</p>
        <article v-for="entry in model.entries" :key="entry.name" class="pg__entry">
          <header class="pg__entry-head">
            <code class="pg__cls">{{ entry.className }}</code>
            <span class="pg__pill">{{ entry.kind }}</span>
            <span v-if="entry.releaseStage" class="pg__pill pg__pill--stage">{{
              entry.releaseStage
            }}</span>
            <span v-if="entry.since" class="pg__pill pg__pill--stage">since {{ entry.since }}</span>
          </header>
          <p v-if="entry.summary" class="pg__summary" v-html="inline(entry.summary)"></p>
          <p v-if="entry.deprecated" class="pg__badge">deprecated → {{ entry.deprecated }}</p>

          <section v-if="entry.structure && entry.structure.length" class="pg__facet">
            <h5 class="pg__facet-label">Structure</h5>
            <vitepress-mermaid :graph="encodeURIComponent(toMermaid(entry.structure ?? []))" />
          </section>

          <section v-if="entry.accessibility" class="pg__facet pg__a11y">
            <h5 class="pg__facet-label">♿ Accessibility</h5>
            <p v-html="inline(entry.accessibility)"></p>
          </section>

          <section v-if="entry.modifiers.length" class="pg__facet">
            <h5 class="pg__facet-label">Modifiers</h5>
            <div v-for="m in entry.modifiers" :key="m.name" class="pg__member">
              <code>{{ m.name }}</code>
              <span class="pg__pill"
                >{{ m.prop }}<template v-if="m.value">={{ m.value }}</template></span
              >
              <span v-if="m.deprecated" class="pg__badge"
                >deprecated<template v-if="m.deprecated.canonical">
                  → {{ m.deprecated.canonical }}</template
                ></span
              >
              <span v-if="m.description" class="pg__desc" v-html="inline(m.description)"></span>
            </div>
          </section>

          <section v-if="entry.parts.length" class="pg__facet">
            <h5 class="pg__facet-label">Parts</h5>
            <div v-for="p in entry.parts" :key="p.name" class="pg__member">
              <code>{{ p.name }}</code>
              <span v-if="p.description" class="pg__desc" v-html="inline(p.description)"></span>
            </div>
          </section>

          <section v-if="entry.states.length" class="pg__facet">
            <h5 class="pg__facet-label">States</h5>
            <div v-for="s in entry.states" :key="s.name" class="pg__member">
              <code>{{ s.name }}</code>
              <span v-if="s.description" class="pg__desc" v-html="inline(s.description)"></span>
            </div>
          </section>

          <section v-if="entry.slots.length" class="pg__facet">
            <h5 class="pg__facet-label">Slots</h5>
            <div v-for="s in entry.slots" :key="s.name" class="pg__member">
              <code>{{ s.name }}</code>
              <span v-if="s.description" class="pg__desc" v-html="inline(s.description)"></span>
            </div>
          </section>

          <section v-if="entry.cssPropertiesDeclared.length" class="pg__facet">
            <h5 class="pg__facet-label">Custom properties</h5>
            <div v-for="p in entry.cssPropertiesDeclared" :key="p.name" class="pg__member">
              <code>{{ p.name }}</code>
              <span v-if="p.syntax" class="pg__pill" v-html="syntaxHtml(p.syntax)"></span>
              <span v-if="p.defaultValue" class="pg__meta">default {{ p.defaultValue }}</span>
              <span v-if="resolvedValue(p.name, p.defaultValue)" class="pg__pill pg__pill--resolved"
                >resolved: {{ resolvedValue(p.name, p.defaultValue) }}</span
              >
              <span v-if="p.description" class="pg__desc" v-html="inline(p.description)"></span>
            </div>
          </section>

          <section v-if="entry.cssPropertiesConsumed.length" class="pg__facet">
            <h5 class="pg__facet-label">Consumes</h5>
            <div class="pg__member">
              <code v-for="v in entry.cssPropertiesConsumed" :key="v">{{ v }}</code>
            </div>
          </section>

          <section v-if="entry.examples.length" class="pg__facet">
            <h5 class="pg__facet-label">Examples</h5>
            <div
              v-for="(ex, i) in entry.examples"
              :key="i"
              class="pg__example"
              v-html="block(ex)"
            ></div>
          </section>
        </article>
        <div class="pg__findings">
          <p v-if="!model.diagnostics.length && !model.error" class="pg__ok">✓ No lint issues</p>
          <p
            v-for="(d, i) in model.diagnostics"
            :key="i"
            class="pg__diag"
            :class="`pg__diag--${d.severity}`"
          >
            <code>{{ d.rule }}</code> {{ d.message }}
          </p>
        </div>
      </div>
    </div>

    <!-- 4 — component HTML | resolved + lint -->

    <h2 class="pg__label">tabs.html</h2>
    <div class="pg__row">
      <div class="pg__cell">
        <CodeEditor v-model="html" lang="html" />
      </div>
      <div class="pg__cell pg__resolved">
        <p class="pg__meta" v-if="usage.bases.length">
          References <code v-for="b in usage.bases" :key="b">.{{ b }}</code>
        </p>
        <div class="pg__findings">
          <p v-if="!usage.diagnostics.length" class="pg__ok">✓ No usage findings</p>
          <p
            v-for="(d, i) in usage.diagnostics"
            :key="i"
            class="pg__diag"
            :class="`pg__diag--${d.severity}`"
          >
            <code>{{ d.rule }}</code
            ><br />{{ d.message }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/**
 * cssdoc dogfoods itself — this playground's own styles are documented with cssdoc doc-comments.
 *
 * @component pg
 * @summary The interactive cssdoc playground: a preset switcher, editors, and the resolved model.
 * @part .pg__preset — A convention-preset toggle button.
 * @part .pg__resolved — The resolved-model panel beside an editor.
 * @part .pg__facet — One group of extracted facts (modifiers, parts, states, …).
 * @part .pg__member — A single documented member within a facet.
 * @slot label — A panel's heading (`.pg__label`).
 * @cssproperty --pg-gap — The vertical gap between the playground's sections.
 * @cssstate is-active — The selected preset toggle.
 * @a11y The preset switcher is a `role="group"`; each toggle is a real `<button>`.
 * @structure
 *   .pg
 *     .pg__presets
 *       .pg__preset
 *     .pg__row
 *       .pg__resolved
 *         .pg__facet
 *           .pg__member
 */
@property --pg-gap {
  syntax: "<length>";
  inherits: false;
  initial-value: 1rem;
}

.pg {
  display: flex;
  flex-direction: column;
  gap: var(--pg-gap);
  margin: 1rem 0;
}
.pg__presets {
  display: flex;
  gap: 0.5rem;
}
.pg__preset {
  padding: 0.3rem 0.9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.pg__preset.is-active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.pg__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
/* The config/schema row is compact — cap its editors well below the 30rem the code rows use. */
.pg__row--config :deep(.cm-editor) {
  max-height: 15rem;
}
@media (max-width: 640px) {
  .pg__row {
    grid-template-columns: 1fr;
  }
}
.pg__cell {
  min-width: 0;
}
.pg__label {
  margin: 0.5rem 0;
}
.pg__resolved {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-alt);
  /* Match the editor's cap so the two columns line up; scroll past it. */
  max-height: 30rem;
  overflow: auto;
}
.pg__entry-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0.25rem 0 0.5rem;
}
.pg__cls {
  font-weight: 700;
}
.pg__pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.pg__pill--stage {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-2);
}
.pg__pill--resolved {
  background: var(--vp-c-green-soft);
  color: var(--vp-c-green-1);
}
.pg__pill a {
  color: inherit;
  text-decoration: underline;
}
.pg__example {
  font-size: 0.8rem;
}
.pg__example :deep(pre) {
  margin: 0.25rem 0;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: var(--vp-c-bg);
  overflow-x: auto;
}
.pg__summary {
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}
.pg__facet {
  margin: 0.75rem 0;
}
.pg__facet-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-3);
  margin: 0 0 0.35rem;
  border: 0;
  padding: 0;
}
.pg__a11y {
  border-left: 3px solid var(--vp-c-brand-1);
  padding: 0.25rem 0 0.25rem 0.75rem;
  font-size: 0.85rem;
}
.pg__a11y p {
  margin: 0;
}
.pg__member {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.85rem;
  margin: 0.2rem 0;
}
.pg__desc {
  color: var(--vp-c-text-2);
  flex-basis: 100%;
  margin-left: 0.2rem;
}
.pg__badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--vp-c-yellow-soft);
  color: var(--vp-c-yellow-1);
}
.pg__meta {
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  margin: 0.25rem 0;
}
.pg__meta code {
  margin-left: 0.3rem;
}
/* Pinned to the bottom of the scrolling panel so lint findings stay visible while the model scrolls. */
.pg__findings {
  position: sticky;
  bottom: -0.5rem;
  font-size: 0.85rem;
  /* Bleed to the panel edges (which pad 0.5rem 1rem) so scrolling content can't peek at the sides. */
  margin: 0.5rem -1rem 0;
  padding: 0.5rem 1rem 0.25rem;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}
.pg__ok {
  color: var(--vp-c-green-1);
  margin: 0.25rem 0;
}
.pg__diag {
  margin: 0.25rem 0;
  padding-left: 0.5rem;
  border-left: 2px solid currentColor;
}
.pg__diag--warning {
  color: var(--vp-c-yellow-1);
}
.pg__diag--error {
  color: var(--vp-c-red-1);
}
.pg__error {
  color: var(--vp-c-red-1);
  font-size: 0.85rem;
}
</style>
