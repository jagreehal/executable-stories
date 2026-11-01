import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
  },
  {
    entry: { bin: "src/bin.ts" },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
    sourcemap: true,
  },
]);
