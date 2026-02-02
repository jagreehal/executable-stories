/**
 * Minimal story test used by the reporter integration test.
 * Run only via: npx playwright test --config=src/__tests__/fixtures/playwright.config.ts
 */
import { scenario } from "../../../dist/index.js";
import { expect } from "@playwright/test";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", async ({ page }) => {});
  when("user submits valid credentials", async ({ page }) => {});
  then("user sees the dashboard", async ({ page }) => {
    expect(true).toBe(true);
  });
});

scenario("Doc API test", ({ given, when, then, doc }) => {
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
