import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /\.(story\.)?spec\.ts$/,
  testIgnore: ["**/__tests__/fixtures/**", "**/fixtures/failure/**"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["./dist/reporter.js", { output: "docs/user-stories.md" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
});
