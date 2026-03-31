import { createRequire } from "node:module";
import { defineConfig } from "vitest/config";

// Use createRequire to load the reporter CJS build — avoids Vite's config
// bundler trying to transform @cucumber/html-formatter's CJS require('fs').
const require = createRequire(import.meta.url);
const { StoryReporter } = require("./dist/reporter.cjs");

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/__tests__/fixtures/**",
    ],
    reporters: ["default", new StoryReporter({ output: "docs/user-stories.md" })],
  },
});
