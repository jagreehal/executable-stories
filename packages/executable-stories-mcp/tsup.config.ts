import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts", http: "src/http.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
  },
  {
    entry: { server: "src/server.ts" },
    format: ["esm"],
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
