import * as path from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const vitestPkg = path.resolve(__dirname, "../executable-stories-vitest");

// Use createRequire to load the reporter — this avoids Vite's config
// bundler trying to transform CJS deps like @cucumber/html-formatter
// which use require('fs') and fail in Vite's ESM transform.
const { StoryReporter } = require("../executable-stories-vitest/dist/reporter.cjs");

export default defineConfig({
  resolve: {
    alias: {
      "executable-stories-vitest/reporter": path.join(
        vitestPkg,
        "dist/reporter.js",
      ),
      "executable-stories-vitest": path.join(vitestPkg, "dist/index.js"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["test/**/*.test.ts"],
    // These are unit tests, but several render a real HTML report through the
    // React SSR renderer: the first one in each worker pays the renderer's
    // module init on top of its own work, and the slowest here run ~1.2s on an
    // idle machine. Vitest's 5s default leaves no room for a loaded CI runner
    // sharing cores across 100+ files, which showed up as a single test timing
    // out on an otherwise green merge. The headroom costs nothing when tests
    // pass and only delays a genuinely hung one.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    reporters: [
      "default",
      new StoryReporter({
        formats: ["markdown"],
        outputDir: "docs",
        outputName: "formatters-stories",
      }),
    ],
  },
});
