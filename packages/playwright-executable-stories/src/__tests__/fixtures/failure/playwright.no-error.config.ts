/**
 * Config for failure-in-markdown test with includeErrorInMarkdown: false.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..", "..", "..");
const output = path.resolve(rootDir, "src", "__tests__", "fixtures", "failure", "dist", "user-stories-no-error.md");

export default defineConfig({
  testDir: __dirname,
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      path.join(rootDir, "dist", "reporter.js"),
      { output, enableGithubActionsSummary: false, includeErrorInMarkdown: false },
    ],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
  },
});
