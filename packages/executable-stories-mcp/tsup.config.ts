import { defineConfig } from "tsup";

// Bundle executable-stories-core into the dist so the published package is
// self-contained — core is an internal, unpublished workspace package.
// formatters stays external: it is published and installed as a real dependency.
const noExternal = ["executable-stories-core"];

export default defineConfig([
  {
    entry: { index: "src/index.ts", http: "src/http.ts" },
    format: ["esm", "cjs"],
    dts: { resolve: [/executable-stories-core/] },
    clean: true,
    splitting: false,
    sourcemap: true,
    external: ["@modelcontextprotocol/sdk", "zod"],
    noExternal,
  },
  {
    entry: { server: "src/server.ts" },
    format: ["esm"],
    dts: false,
    clean: false,
    splitting: false,
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
    external: ["@modelcontextprotocol/sdk", "zod"],
    noExternal,
  },
]);
