import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    reporter: "src/reporter.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ["@playwright/test"],
});
