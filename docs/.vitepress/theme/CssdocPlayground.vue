<script setup lang="ts">
import { parseCssDocs } from "@cssdoc/core";
import { createIndex } from "@cssdoc/index";
import {
  checkClassUsage,
  lintModel,
  resolveNaming,
  resolveRuleSeverities,
} from "@cssdoc/providers";
import { computed, ref } from "vue";
import CodeEditor from "./CodeEditor.vue";
import { presets } from "./presets.ts";

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

/** The editable cssdoc.json, parsed to the fields the browser-safe APIs accept. */
const cfg = computed(() => {
  try {
    const raw = JSON.parse(config.value) as {
      modifierConvention?: unknown;
      rules?: Record<string, "off" | "warn" | "error">;
      naming?: { component?: string; part?: string };
    };
    return {
      convention: raw.modifierConvention as never,
      severities: resolveRuleSeverities(raw.rules),
      naming: resolveNaming(raw.naming),
      error: undefined as string | undefined,
    };
  } catch (e) {
    return {
      convention: undefined as never,
      severities: resolveRuleSeverities(),
      naming: resolveNaming(),
      error: (e as Error).message,
    };
  }
});

/** Parse + author-side lint. Malformed CSS surfaces as an error, not a crash. */
const model = computed(() => {
  try {
    const entries = parseCssDocs(css.value, { modifierConvention: cfg.value.convention });
    const index = createIndex(css.value, { modifierConvention: cfg.value.convention });
    return {
      entries,
      diagnostics: lintModel(index, cfg.value.severities, cfg.value.naming),
      error: undefined as string | undefined,
    };
  } catch (e) {
    return { entries: [], diagnostics: [], error: (e as Error).message };
  }
});

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

    <!-- 2 — cssdoc.json (editable, full width) -->
    <div class="pg__panel">
      <p class="pg__label">cssdoc.json</p>
      <CodeEditor v-model="config" lang="json" />
      <p v-if="cfg.error" class="pg__error">⚠ Invalid JSON — {{ cfg.error }}</p>
    </div>

    <!-- 3 — component CSS | resolved + lint -->
    <div class="pg__row">
      <div class="pg__cell">
        <p class="pg__label">Component CSS</p>
        <CodeEditor v-model="css" lang="css" />
      </div>
      <div class="pg__cell pg__resolved">
        <p v-if="model.error" class="pg__error">⚠ {{ model.error }}</p>
        <template v-for="entry in model.entries" :key="entry.name">
          <h4>
            <code>{{ entry.className }}</code>
          </h4>
          <dl class="pg__facts">
            <template v-if="entry.modifiers.length">
              <dt>Modifiers</dt>
              <dd>
                <div v-for="m in entry.modifiers" :key="m.name">
                  <code>{{ m.name }}</code>
                  <span class="pg__meta">
                    {{ m.prop }}<template v-if="m.value">={{ m.value }}</template
                    ><template v-if="m.deprecated"> · deprecated</template>
                  </span>
                </div>
              </dd>
            </template>
            <template v-if="entry.parts.length">
              <dt>Parts</dt>
              <dd>{{ entry.parts.map((p) => p.name).join(", ") }}</dd>
            </template>
            <template v-if="entry.states.length">
              <dt>States</dt>
              <dd>{{ entry.states.map((s) => s.name).join(", ") }}</dd>
            </template>
            <template v-if="entry.slots.length">
              <dt>Slots</dt>
              <dd>{{ entry.slots.map((s) => s.name).join(", ") }}</dd>
            </template>
            <template v-if="entry.cssPropertiesDeclared.length">
              <dt>Properties</dt>
              <dd>{{ entry.cssPropertiesDeclared.map((p) => p.name).join(", ") }}</dd>
            </template>
          </dl>
        </template>
        <div class="pg__findings">
          <p v-if="!model.diagnostics.length && !model.error" class="pg__ok">
            ✓ No author findings
          </p>
          <p v-for="(d, i) in model.diagnostics" :key="i" class="pg__diag">
            <code>{{ d.rule }}</code> {{ d.message }}
          </p>
        </div>
      </div>
    </div>

    <!-- 4 — component HTML | resolved + lint -->
    <div class="pg__row">
      <div class="pg__cell">
        <p class="pg__label">Consumer HTML</p>
        <CodeEditor v-model="html" lang="html" />
      </div>
      <div class="pg__cell pg__resolved">
        <p class="pg__meta" v-if="usage.bases.length">
          References <code v-for="b in usage.bases" :key="b">.{{ b }}</code>
        </p>
        <div class="pg__findings">
          <p v-if="!usage.diagnostics.length" class="pg__ok">✓ No usage findings</p>
          <p v-for="(d, i) in usage.diagnostics" :key="i" class="pg__diag">
            <code>{{ d.rule }}</code> {{ d.message }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pg {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
@media (max-width: 640px) {
  .pg__row {
    grid-template-columns: 1fr;
  }
}
.pg__cell {
  min-width: 0;
}
.pg__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin: 0 0 0.35rem;
}
.pg__resolved {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-alt);
  overflow-x: auto;
}
.pg__resolved h4 {
  margin: 0.25rem 0;
}
.pg__facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0.5rem 0;
  font-size: 0.85rem;
}
.pg__facts dt {
  font-weight: 600;
  color: var(--vp-c-text-2);
}
.pg__facts dd {
  margin: 0;
}
.pg__meta {
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  margin: 0.25rem 0;
}
.pg__meta code {
  margin-left: 0.3rem;
}
.pg__findings {
  font-size: 0.85rem;
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}
.pg__ok {
  color: var(--vp-c-green-1);
  margin: 0.25rem 0;
}
.pg__diag {
  color: var(--vp-c-yellow-1);
  margin: 0.25rem 0;
}
.pg__error {
  color: var(--vp-c-red-1);
  font-size: 0.85rem;
}
</style>
