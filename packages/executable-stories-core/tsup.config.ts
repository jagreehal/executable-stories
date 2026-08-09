import { defineConfig } from "tsup";

// One output file per source module (preserves the src tree under dist/) so deep
// subpath imports (executable-stories-core/types/test-result) resolve 1:1 and keep
// exact module identity — avoids barrel name collisions (e.g. two CIInfo types).
// Source relative imports carry .js extensions so the emitted ESM is Node-valid.
export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  bundle: false,
  sourcemap: true,
  // No `shims`: it injects __filename/__dirname helpers built on node:url +
  // node:path into a shared chunk, which breaks browser bundles that import
  // core (the React report, Cypress). otel-detect's `import.meta.url ??
  // __filename` fallback already covers the CJS build, at the cost of an
  // empty-import-meta warning from esbuild.
});
