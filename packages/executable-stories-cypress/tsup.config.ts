import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    support: "src/support.ts",
    plugin: "src/plugin.ts",
    reporter: "src/reporter.ts",
  },
  format: ["esm", "cjs"],
  dts: { resolve: [/executable-stories-core/] },
  clean: true,
  splitting: false,
  sourcemap: true,
  // Bundle executable-stories-core so the published package is self-contained
  // (core is an internal, unpublished workspace package). formatters stays
  // external — it is published and installed as a real runtime dependency.
  noExternal: ["executable-stories-core"],
  external: ["cypress", "executable-stories-formatters"],
});
