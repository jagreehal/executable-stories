import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
    reporter: "src/reporter.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  // Don't bundle @jest/globals so Jest can inject the real implementation when running tests.
  external: ["@jest/globals"],
});
