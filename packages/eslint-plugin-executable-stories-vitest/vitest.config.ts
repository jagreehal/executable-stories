import * as path from "node:path";
import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const { StoryReporter } = require("../executable-stories-vitest/dist/reporter.cjs");

const vitestPkg = path.resolve(__dirname, "../executable-stories-vitest");

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
    include: ["tests/**/*.test.ts"],
    reporters: [
      "default",
      new StoryReporter({
        formats: ["markdown"],
        outputDir: "docs",
        outputName: "eslint-vitest-stories",
      }),
    ],
  },
});
