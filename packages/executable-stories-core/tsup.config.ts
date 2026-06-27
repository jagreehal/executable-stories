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
});
