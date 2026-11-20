import type { MarkdownRenderer } from "vitepress";

export declare const mermaidPlugin: (md: MarkdownRenderer) => void;

export interface MermaidComponentProps {
  graph: string;
  enableExport?: boolean;
}
