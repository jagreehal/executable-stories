import * as path from "node:path";
import { defineConfig } from "vitest/config";
import { StoryReporter } from "../executable-stories-vitest/dist/reporter.js";

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
