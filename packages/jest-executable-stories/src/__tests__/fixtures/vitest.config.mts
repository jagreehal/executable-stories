/**
 * Fixture config for reporter integration test. Runs only the fixture story test
 * and writes the report to fixtures/dist/user-stories.md.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
// Relative to this config file; dist must exist (run `npm run build` before test)
import { StoryReporter } from "../../../dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(__dirname, "dist", "user-stories.md");

export default defineConfig({
  test: {
    include: ["**/__tests__/fixtures/*.story.test.ts"],
    reporters: [
      "default",
      new StoryReporter({
        output,
        enableGithubActionsSummary: false,
      }),
    ],
  },
});
