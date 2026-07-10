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

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: isDark.value ? "dark" : "default",
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
  margin: 1rem 0;
}
</style>
