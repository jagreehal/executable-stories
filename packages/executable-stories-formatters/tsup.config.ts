import { defineConfig } from "tsup";

// Bundle executable-stories-core into the dist so the published formatters
// package (and its CJS build, loaded by Jest's CommonJS runtime) stays
// self-contained — core ships ESM-only deep modules that a CJS consumer in
// node_modules can't parse. Core remains a separate package for the Astro
// integration, which consumes it natively as ESM.
const noExternal = ["executable-stories-core"];

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      adapters: "src/converters/adapters/index.ts",
    },
    format: ["esm", "cjs"],
    dts: { resolve: [/executable-stories-core/] },
    clean: true,
    splitting: false,
    sourcemap: true,
    external: [],
    noExternal,
  },
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
    external: [],
    noExternal,
  },
]);
