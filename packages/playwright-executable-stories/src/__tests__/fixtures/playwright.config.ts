/**
 * Fixture config for reporter integration test. Runs only the fixture story test
 * and writes the report to fixtures/dist/user-stories.md.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(__dirname, "dist", "user-stories.md");

export default defineConfig({
  testDir: __dirname,
  testMatch: "**/*.spec.ts",
  testIgnore: ["**/failure/**"],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    [path.join(__dirname, "..", "..", "..", "dist", "reporter.js"), { output, enableGithubActionsSummary: false }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
  },
});
