/**
 * Vitest config for doc-api fixture test.
 */
import { defineConfig } from "vitest/config";
import StoryReporter from "../../../reporter.js";

export default defineConfig({
  test: {
    include: ["src/__tests__/fixtures/doc-api/**/*.story.test.ts"],
    reporters: [new StoryReporter({ output: "src/__tests__/fixtures/doc-api/dist/docs.md" })],
  },
});
