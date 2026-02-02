/**
 * Config for failure-in-markdown test. Runs only the failure fixture;
 * reporter writes to dist/user-stories.md (includeErrorInMarkdown default true).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..", "..", "..");
const output = path.resolve(rootDir, "src", "__tests__", "fixtures", "failure", "dist", "user-stories.md");

export default defineConfig({
  testDir: __dirname,
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [path.join(rootDir, "dist", "reporter.js"), { output, enableGithubActionsSummary: false }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
  },
});
