import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      adapters: "src/converters/adapters/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    external: [],
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
    external: [],
  },
]);
