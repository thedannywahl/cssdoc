<template>
  <div class="vitepress-mermaid-wrapper">
    <div ref="diagramRef" class="mermaid" role="img" :aria-label="ariaLabel"></div>
    <div v-if="showExportButton" class="mermaid-controls">
      <button
        class="export-button"
        title="Download diagram as SVG"
        aria-label="Download diagram as SVG"
        @click="exportDiagramSvg"
      >
        ⬇️ SVG
      </button>
      <button
        class="export-button"
        title="Copy diagram to clipboard"
        aria-label="Copy diagram to clipboard"
        @click="copyDiagramSvg"
      >
        📋 Copy
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import mermaid from "mermaid";
import { useData } from "vitepress";
import { computed, nextTick, ref, watch } from "vue";

const props = defineProps<{
  graph: string;
  enableExport?: boolean;
}>();

const { isDark } = useData();
const diagramRef = ref<HTMLElement | null>(null);
const graphText = computed(() => decodeURIComponent(props.graph));
const showExportButton = computed(() => props.enableExport ?? false);

// Extract a simple description for aria-label from the diagram type
const ariaLabel = computed(() => {
  const text = graphText.value;
  if (text.includes("flowchart")) return "Flow diagram showing component structure";
  if (text.includes("sequenceDiagram")) return "Sequence diagram";
  if (text.includes("classDiagram")) return "Class diagram";
  return "Mermaid diagram";
});

const getThemeVariables = () => {
  const brandColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--vp-c-brand-1")
    .trim();

  // Dark mode palette
  if (isDark.value) {
    return {
      // Primary colors for main elements
      primaryColor: "#202127",
      primaryBorderColor: brandColor,
      primaryTextColor: "#dfdfd6",

      // Secondary colors for auxiliary elements
      secondBkgColor: "#2a2a31",
      secondBorderColor: "#5a5a66",
      secondTextColor: "#a9a9b1",

      // Tertiary colors for additional hierarchy (Mermaid v12 feature)
      tertiaryColor: "#1a1a1f",
      tertiaryBorderColor: brandColor,
      tertiaryTextColor: "#c5c5cc",

      // Edge labels and connections
      edgeLabelBackground: { fill: "#202127", color: "#dfdfd6" },
      lineColor: "#98989f",
      lineIntensity: 0.4,

      // Note styling
      noteBkgColor: "#2a2a31",
      noteBorderColor: "#5a5a66",
      notTextColor: "#dfdfd6",

      // Font sizing
      fontSize: "13px",
      fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
    };
  }

  // Light mode palette
  return {
    // Primary colors for main elements
    primaryColor: "#f6f6f7",
    primaryBorderColor: brandColor,
    primaryTextColor: "#3c3c43",

    // Secondary colors for auxiliary elements
    secondBkgColor: "#e8e8ed",
    secondBorderColor: "#a9a9b1",
    secondTextColor: "#5a5a66",

    // Tertiary colors for additional hierarchy (Mermaid v12 feature)
    tertiaryColor: "#fafafa",
    tertiaryBorderColor: brandColor,
    tertiaryTextColor: "#505057",

    // Edge labels and connections
    edgeLabelBackground: { fill: "#ffffff", color: "#3c3c43" },
    lineColor: "#8e8e93",
    lineIntensity: 0.3,

    // Note styling
    noteBkgColor: "#e8e8ed",
    noteBorderColor: "#a9a9b1",
    notTextColor: "#3c3c43",

    // Font sizing
    fontSize: "13px",
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
  };
};

const renderDiagram = async (): Promise<void> => {
  // The watcher runs `immediate` (during setup, before mount), so wait for the ref to bind first.
  await nextTick();
  const el = diagramRef.value;
  if (!el) return;

  const themeVariables = getThemeVariables();

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    themeVariables,
    // Enhanced flowchart configuration (Mermaid v12 features)
    flowchart: {
      useMaxWidth: true,
      nodeSpacing: 26,
      rankSpacing: 28,
      padding: 6,
      htmlLabels: true, // Enable rich text labels
      arrowMarkerAbsolute: true, // Better SVG compatibility
      nodeDistance: 50, // Control node distribution
    },
    // Accessibility enhancements
    accessibility: {
      usemax: true,
    },
    // SVG optimization for smaller exports
    gantt: { useWidth: 100 },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageAlign: "center",
      mirrorActors: true,
    },
  });

  el.removeAttribute("data-processed");
  el.textContent = graphText.value;

  try {
    await mermaid.run({ nodes: [el], suppressErrors: false });
  } catch (error) {
    console.error("Mermaid rendering error:", error);
  }
};

const exportDiagramSvg = (): void => {
  const svg = diagramRef.value?.querySelector("svg");
  if (!svg) return;

  const svgString = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "diagram.svg";
  link.click();
  URL.revokeObjectURL(url);
};

const copyDiagramSvg = async (): Promise<void> => {
  const svg = diagramRef.value?.querySelector("svg");
  if (!svg) return;

  const svgString = new XMLSerializer().serializeToString(svg);
  try {
    await navigator.clipboard.writeText(svgString);
    // Provide visual feedback
    const button = event?.target as HTMLElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = "✓ Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }
  } catch (err) {
    console.error("Failed to copy diagram:", err);
  }
};

watch(
  [() => props.graph, () => isDark.value],
  () => {
    void renderDiagram();
  },
  { immediate: true },
);
</script>

<style scoped>
.vitepress-mermaid-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
}

.mermaid {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.mermaid :deep(svg) {
  max-width: 22rem;
  height: auto;
  /* Accessibility: ensure sufficient color contrast */
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Improve text contrast in diagrams */
.mermaid :deep(text) {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 13px;
}

/* Export button styling */
.mermaid-controls {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.vitepress-mermaid-wrapper:hover .mermaid-controls {
  opacity: 1;
}

.export-button {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  white-space: nowrap;
}

.export-button:hover {
  background-color: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.export-button:active {
  transform: translateY(0);
  opacity: 0.8;
}

/* Focus styles for accessibility */
.export-button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .mermaid :deep(svg) {
    max-width: 100%;
    padding: 0 0.5rem;
  }

  .export-button {
    padding: 0.35rem 0.6rem;
    font-size: 11px;
  }
}
</style>
