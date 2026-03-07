import { defineConfig } from "vitest/config";
import { StoryReporter } from "./dist/reporter.js";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/__tests__/fixtures/**",
    ],
    reporters: ["default", new StoryReporter({ output: "docs/user-stories.md" })],
  },
});
