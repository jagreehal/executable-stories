import { defineConfig } from "tsup";

// ESM-only (Astro is ESM).
export default defineConfig({
  entry: { index: "src/index.ts", loader: "src/loader.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // React + the renderer components are consumer-provided peers; never bundle.
  external: ["astro", "react", "react-dom", /^executable-stories-react(\/|$)/],
});
