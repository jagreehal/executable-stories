import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    reporter: "src/reporter.ts",
    setup: "src/setup.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  external: ["jest", "@jest/globals"],
});
