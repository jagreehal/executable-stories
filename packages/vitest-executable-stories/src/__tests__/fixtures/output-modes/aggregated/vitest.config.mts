/**
 * Fixture config for aggregated output mode using output option.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { StoryReporter } from "../../../../../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputFile = path.join(__dirname, "dist", "stories.md");

export default defineConfig({
  test: {
    include: [path.join(__dirname, "*.story.test.ts")],
    reporters: [
      "default",
      new StoryReporter({
        output: outputFile,
        enableGithubActionsSummary: false,
      }),
    ],
  },
});
