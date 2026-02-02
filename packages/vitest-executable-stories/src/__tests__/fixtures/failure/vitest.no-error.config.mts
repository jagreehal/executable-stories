/**
 * Config for failure-in-markdown test with includeErrorInMarkdown: false.
 * Reporter writes to dist/user-stories-no-error.md.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
import { StoryReporter } from "../../../../dist/reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..", "..", "..");
const output = path.resolve(rootDir, "src", "__tests__", "fixtures", "failure", "dist", "user-stories-no-error.md");

export default defineConfig({
  root: __dirname,
  test: {
    include: ["**/*.story.test.ts"],
    reporters: [
      "default",
      new StoryReporter({
        output,
        enableGithubActionsSummary: false,
        includeErrorInMarkdown: false,
      }),
    ],
  },
});
