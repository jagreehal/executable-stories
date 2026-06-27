import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const USE_CLIENT_BANNER = { js: '"use client";' };

// The canonical JSON Schema is the single source of truth for the runtime Zod
// validator. It MUST be inlined into every library bundle: left as an external
// runtime import, esbuild drops the `with { type: "json" }` attribute, and Node
// 22+ then refuses to load it as JSON (breaks Astro SSR). noExternal forces
// esbuild to resolve + inline it as a plain object instead.
const INLINE_SCHEMA_JSON = /schemas\/story-report-v1\.json$/;

// Mirror the tsconfig `@/*` → ./src/* path alias so esbuild resolves the
// shadcn component imports (`@/components/ui/*`, `@/lib/utils`) at bundle time.
const aliasSrc = (options: { alias?: Record<string, string> }) => {
  options.alias = { ...options.alias, "@": resolve("src") };
};

export default defineConfig([
  {
    // Server-safe: parseStoryReport, Result types, schema constants.
    entry: { parse: "src/parse-entry.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: ["react", "react-dom", "react/jsx-runtime"],
    noExternal: [INLINE_SCHEMA_JSON],
  },
  {
    // Server-only: renderReportToHtml (renderToStaticMarkup of <Report/>).
    // No "use client" banner — this is invoked from Node (the CLI / Astro SSR).
    entry: { ssr: "src/ssr-entry.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime"],
    noExternal: [INLINE_SCHEMA_JSON],
    esbuildOptions: aliasSrc,
  },
  {
    // Client: main UI components (use createContext, hooks).
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    // `mermaid` is an optional peer, dynamically imported by MermaidDiagram —
    // keep it external so it's never pulled into the base bundle.
    external: ["react", "react-dom", "react/jsx-runtime", "mermaid"],
    noExternal: [INLINE_SCHEMA_JSON],
    banner: USE_CLIENT_BANNER,
    esbuildOptions: aliasSrc,
    onSuccess: async () => {
      copyFileSync(resolve("src/styles.css"), resolve("dist/styles.css"));
    },
  },
  {
    // Client: chrome (search, keyboard, failure banner, deep link, help).
    entry: { interactive: "src/interactive/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    splitting: false,
    sourcemap: true,
    external: ["react", "react-dom", "react/jsx-runtime", "executable-stories-react"],
    noExternal: [INLINE_SCHEMA_JSON],
    banner: USE_CLIENT_BANNER,
    esbuildOptions: aliasSrc,
  },
  {
    // Standalone hydration island: a self-contained IIFE (React + everything
    // bundled, minified) inlined into the CLI's html-react output. noExternal
    // [/.*/] forces React/marked/radix into the bundle so the file runs offline.
    // `mermaid` and `highlight.js` are the deliberate exceptions: they are loaded
    // from a CDN at runtime (see island-renderers) so the heavy libraries never
    // bloat the inlined island, so they must stay external here.
    entry: { "report-island": "src/island-entry.tsx" },
    format: ["iife"],
    globalName: "EsReportIsland",
    platform: "browser",
    dts: false,
    clean: false,
    splitting: false,
    minify: true,
    sourcemap: false,
    // Bundle everything (React/marked/radix) so the island runs offline — EXCEPT
    // mermaid + highlight.js, which are loaded from a CDN at runtime (see
    // island-renderers) so the heavy libraries never bloat the inlined island.
    // The negative lookahead keeps them out of noExternal so `external` wins.
    noExternal: [/^(?!mermaid|highlight\.js)/],
    external: ["mermaid", "highlight.js"],
    esbuildOptions: aliasSrc,
  },
]);
