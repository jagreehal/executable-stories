import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    support: "src/support.ts",
    plugin: "src/plugin.ts",
    reporter: "src/reporter.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ["cypress", "executable-stories-core", "executable-stories-formatters"],
});
