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
