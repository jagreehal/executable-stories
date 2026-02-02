/**
 * Fixture config for mixed output mode test.
 * - features/** → colocated
 * - e2e/** → aggregated to e2e-stories.md
 * - other/** → aggregated to other-stories.md (fallback)
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { StoryReporter } from "../../../../../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: [path.join(__dirname, "**/*.story.test.ts")],
    reporters: [
      "default",
      new StoryReporter({
        output: [
          { include: "**/features/**", mode: "colocated", extension: ".docs.md" },
          { include: "**/e2e/**", mode: "aggregated", outputFile: path.join(__dirname, "dist", "e2e-stories.md") },
          { include: "**/*", mode: "aggregated", outputFile: path.join(__dirname, "dist", "other-stories.md") },
        ],
        enableGithubActionsSummary: false,
      }),
    ],
  },
});
