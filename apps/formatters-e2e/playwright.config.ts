import { defineConfig } from "@playwright/test";

// Chromium cannot register its Mach port under the macOS agent sandbox, so it
// dies on launch. A single-process browser spawns no children and never needs
// that port. Opt in with ES_CHROMIUM_SINGLE_PROCESS=1; CI leaves it unset.
const sandboxLaunchOptions = process.env.ES_CHROMIUM_SINGLE_PROCESS
  ? { args: ["--single-process"] }
  : {};

export default defineConfig({
  testDir: "./src",
  testMatch: "**/*.story.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", launchOptions: sandboxLaunchOptions },
    },
  ],
});
