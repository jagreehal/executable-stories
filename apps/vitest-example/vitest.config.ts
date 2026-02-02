import { defineConfig } from "vitest/config";
import { StoryReporter } from "vitest-executable-stories/reporter";

export default defineConfig({
  test: {
    reporters: ["default", new StoryReporter()],
  },
});
