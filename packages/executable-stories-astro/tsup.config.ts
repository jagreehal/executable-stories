import { defineConfig } from "tsup";

// ESM-only (Astro is ESM). Bundle core so the published package is
// self-contained and consumers don't need to resolve core's deep subpaths.
export default defineConfig({
  entry: { index: "src/index.ts", loader: "src/loader.ts" },
  format: ["esm"],
  dts: { resolve: [/executable-stories-core/] },
  clean: true,
  sourcemap: true,
  noExternal: ["executable-stories-core"],
  // React + the renderer components are consumer-provided peers; never bundle.
  external: ["astro", "react", "react-dom", /^executable-stories-react(\/|$)/],
});
