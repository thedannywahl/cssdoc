// Let TypeScript accept the theme's side-effect CSS import.
declare module "*.css";

// Vite `?raw` imports (the playground loads the example CSS as a string).
declare module "*.css?raw" {
  const content: string;
  export default content;
}

declare module "*.json?raw" {
  const content: string;
  export default content;
}

declare module "*?raw" {
  const content: string;
  export default content;
}

// Vue single-file components (the playground).
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
