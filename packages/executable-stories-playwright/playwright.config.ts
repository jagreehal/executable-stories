import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/__tests__",
  testMatch: "**/*.test.ts",
  timeout: 30000,
  reporter: [["list"]],
  use: {
    trace: "off",
  },
});
