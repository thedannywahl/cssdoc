<template>
  <div ref="diagramRef" class="mermaid">{{ graphText }}</div>
</template>

<script setup lang="ts">
import { useData } from "vitepress";
import { computed, nextTick, ref, watch } from "vue";
import mermaid from "mermaid";

const props = defineProps<{ graph: string }>();

const { isDark } = useData();
const diagramRef = ref<HTMLElement | null>(null);
const graphText = computed(() => decodeURIComponent(props.graph));

const renderDiagram = async (): Promise<void> => {
  // The watcher runs `immediate` (during setup, before mount), so wait for the ref to bind first.
  await nextTick();
  const el = diagramRef.value;
  if (!el) return;

  // Theme the diagram to match the site (cssdoc teal on the VitePress surfaces), using the `base`
  // theme + custom variables so light/dark both look native. Tighter spacing + smaller font keep it
  // compact; `useMaxWidth` lets the SVG scale down to its container.
  const palette = isDark.value
    ? {
        primaryColor: "#202127",
        primaryBorderColor: "#1dc4b6",
        primaryTextColor: "#dfdfd6",
        lineColor: "#98989f",
      }
    : {
        primaryColor: "#f6f6f7",
        primaryBorderColor: "#388080",
        primaryTextColor: "#3c3c43",
        lineColor: "#8e8e93",
      };
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables: { fontSize: "13px", ...palette },
    flowchart: { useMaxWidth: true, nodeSpacing: 26, rankSpacing: 28, padding: 6 },
  });
  el.removeAttribute("data-processed");
  el.textContent = graphText.value;

  try {
    await mermaid.run({ nodes: [el], suppressErrors: false });
  } catch (error) {
    console.error("Mermaid rendering error:", error);
  }
};

watch([() => props.graph, () => isDark.value], () => void renderDiagram(), { immediate: true });
</script>

<style scoped>
.mermaid {
  display: flex;
  justify-content: center;
  margin: 0.5rem 0;
}
.mermaid :deep(svg) {
  max-width: 22rem;
  height: auto;
}
</style>
