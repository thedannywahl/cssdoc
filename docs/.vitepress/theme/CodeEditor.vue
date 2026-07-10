<script setup lang="ts">
import { useData } from "vitepress";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { EditorView } from "codemirror";
import type { Compartment, Extension } from "@codemirror/state";
import { cssdocHighlight } from "@cssdoc/codemirror";

const props = defineProps<{ modelValue: string; lang: "css" | "html" | "json" }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const { isDark } = useData();
const host = ref<HTMLElement>();
let view: EditorView | undefined;
let themeCompartment: Compartment | undefined;
let darkTheme: Extension = [];

const langExtension = async (lang: typeof props.lang): Promise<Extension> => {
  if (lang === "css") return [(await import("@codemirror/lang-css")).css(), cssdocHighlight()];
  if (lang === "html") return (await import("@codemirror/lang-html")).html();
  return (await import("@codemirror/lang-json")).json();
};

onMounted(async () => {
  // CodeMirror is heavy and browser-only — load it lazily on mount.
  const { basicSetup, EditorView } = await import("codemirror");
  const { EditorState, Compartment } = await import("@codemirror/state");
  darkTheme = (await import("@codemirror/theme-one-dark")).oneDark;
  themeCompartment = new Compartment();

  const chrome = EditorView.theme({
    "&": {
      minHeight: "8rem",
      maxHeight: "21rem",
      fontSize: "0.8rem",
      border: "1px solid var(--vp-c-divider)",
      borderRadius: "8px",
      backgroundColor: "var(--vp-c-bg-alt)",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": { fontFamily: "var(--vp-font-family-mono)", overflow: "auto" },
  });
  const sync = EditorView.updateListener.of((u) => {
    if (!u.docChanged) return;
    const value = u.state.doc.toString();
    if (value !== props.modelValue) emit("update:modelValue", value);
  });

  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [
        basicSetup,
        await langExtension(props.lang),
        themeCompartment.of(isDark.value ? darkTheme : []),
        chrome,
        sync,
      ],
    }),
  });
});

// External value changes (e.g. a preset swap) replace the document.
watch(
  () => props.modelValue,
  (value) => {
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  },
);

// Follow the site's light/dark theme.
watch(isDark, (dark) => {
  if (view && themeCompartment) {
    view.dispatch({ effects: themeCompartment.reconfigure(dark ? darkTheme : []) });
  }
});

onBeforeUnmount(() => view?.destroy());
</script>

<template>
  <div ref="host" class="code-editor" />
</template>

<style scoped>
.code-editor {
  display: flex;
  min-height: 0;
}
.code-editor :deep(.cm-editor) {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}
</style>
