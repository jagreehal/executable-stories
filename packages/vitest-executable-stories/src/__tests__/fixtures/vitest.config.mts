/**
 * Fixture config for reporter integration test. Runs only the fixture story test
 * and writes the report to fixtures/dist/user-stories.md.
 *
 * Fixtures use the reporter subpath or dist/reporter.js so resolution matches
 * installed behavior. Do not import StoryReporter from src/index.ts.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";
// dist must exist (run build before test); use reporter entry so Vitest is not loaded in config
import { StoryReporter } from "../../../dist/reporter.js";

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
