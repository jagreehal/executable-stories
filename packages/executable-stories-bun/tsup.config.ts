import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    preload: "src/preload.ts",
  },
  // ESM only: the package only runs under Bun, which loads the import condition.
  format: ["esm"],
  dts: true,
  // Overwrite in place rather than emptying dist first (see the vitest package).
  clean: false,
  splitting: false,
  sourcemap: true,
  external: ["bun:test"],
});
