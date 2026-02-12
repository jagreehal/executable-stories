import { defineConfig } from "vitest/config";
import { StoryReporter } from "./dist/reporter.js";

export default defineConfig({
  test: {
    exclude: [
      "**/__tests__/fixtures/**",
      "**/node_modules/@cucumber/**",
    ],
    reporters: ["default", new StoryReporter({ output: "docs/user-stories.md" })],
  },
});
