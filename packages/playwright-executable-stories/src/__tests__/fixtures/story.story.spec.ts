/**
 * Minimal story test used by the reporter integration test.
 * Run only via: npx playwright test --config=src/__tests__/fixtures/playwright.config.ts
 */
import { test, expect } from "@playwright/test";
import { story, given, when, then, doc } from "../../../dist/index.js";

story("User logs in", () => {
  given("user is on login page", async ({ page }) => {});
  when("user submits valid credentials", async ({ page }) => {});
  then("user sees the dashboard", async ({ page }) => {
    expect(true).toBe(true);
  });
});

// Framework-native: test('xxx', () => { doc.story('xxx'); ... }) same as story('xxx', () => { ... })
test("User logs in (framework native)", async () => {
  doc.story("User logs in (framework native)");
  expect(true).toBe(true);
});

story("Doc API test", () => {
  given("a precondition with static docs", async () => {
    doc.note("This is a static note");
    doc.kv("Test user", "admin@example.com");
  });

  when("action with runtime and static docs", async () => {
    doc.code("Request payload", { action: "login", user: "test" });
    doc.runtime.kv("Captured value", "captured-at-runtime");
  });

  then("verification", async () => {
    expect(true).toBe(true);
  });
});
