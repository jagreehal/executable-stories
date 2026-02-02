/**
 * Fixture config for custom extension test.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { StoryReporter } from "../../../../../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: [path.join(__dirname, "*.story.test.ts")],
    reporters: [
      "default",
      new StoryReporter({
        output: [{ include: "**/*.story.test.ts", mode: "colocated", extension: ".md" }],
        enableGithubActionsSummary: false,
      }),
    ],
  },
});
