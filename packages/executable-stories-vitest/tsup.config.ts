import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    reporter: "src/reporter.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  // Overwrite in place rather than emptying dist first: under `turbo run type-check`
  // a dependent app may read this dist while it rebuilds, and a clean step
  // would briefly remove the .d.ts files (race). Entrypoints are fixed, so
  // nothing stale lingers.
  clean: false,
  splitting: false,
  sourcemap: true,
});
