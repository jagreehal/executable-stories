import { defineConfig } from "vitest/config";
import { StoryReporter } from "./src/index";

export default defineConfig({
  test: {
    exclude: ["**/__tests__/fixtures/**"],
    reporters: ["default", new StoryReporter({ output: "docs/user-stories.md" })],
  },
});
