<script setup lang="ts">
import { useData } from "vitepress";
import { onMounted, ref, watch } from "vue";
import type { Highlighter } from "shiki";

const props = defineProps<{ modelValue: string; lang: "css" | "html" | "json" }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { isDark } = useData();
const highlighted = ref("");
let hl: Highlighter | undefined;

// One highlighter shared across every editor instance: the CSS grammar, HTML, and the cssdoc
// doc-comment injection (so `@tag`s colour the same as the rest of the docs). Lazy, client-only.
let highlighterPromise: Promise<Highlighter> | undefined;
const getHighlighter = (): Promise<Highlighter> => {
  highlighterPromise ??= (async () => {
    const { createHighlighter } = await import("shiki");
    const cssdocGrammar = (await import("@cssdoc/tmlanguage")).default;
    return createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["css", "html", "json", cssdocGrammar],
    });
  })();
  return highlighterPromise;
};

const render = (): void => {
  if (!hl) return;
  highlighted.value = hl.codeToHtml(`${props.modelValue}\n`, {
    lang: props.lang,
    theme: isDark.value ? "github-dark" : "github-light",
  });
};

onMounted(async () => {
  try {
    hl = await getHighlighter();
    render();
  } catch {
    highlighted.value = ""; // graceful fallback to a plain textarea
  }
});

watch([() => props.modelValue, isDark], render);
</script>

<template>
  <div class="code-editor" :class="{ 'is-highlighted': highlighted }">
    <div class="code-editor__hl" v-html="highlighted" aria-hidden="true" />
    <textarea
      :value="modelValue"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      :aria-label="`${lang.toUpperCase()} editor`"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>

<style scoped>
/* The highlighted <pre> sizes the box; the textarea overlays it exactly. Both layers share identical
   typography + padding so the caret lines up with the highlighted glyphs. */
.code-editor {
  position: relative;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  overflow: hidden;
}
.code-editor__hl,
.code-editor textarea {
  margin: 0;
  padding: 0.75rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.5;
  tab-size: 2;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  box-sizing: border-box;
}
.code-editor__hl {
  min-height: 9rem;
}
.code-editor__hl :deep(pre.shiki) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  overflow: visible;
}
.code-editor__hl :deep(code) {
  font: inherit;
}
.code-editor textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  resize: none;
  background: transparent;
  color: var(--vp-c-text-1);
  caret-color: var(--vp-c-text-1);
}
/* Once highlighted, hide the textarea's own text so only the coloured layer shows (caret stays). */
.code-editor.is-highlighted textarea {
  color: transparent;
}
.code-editor textarea::selection {
  background: var(--vp-c-brand-soft);
}
</style>
