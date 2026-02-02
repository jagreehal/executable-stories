/**
 * Example story test. Run: npx playwright test
 * Then open docs/user-stories.md (or the output you configured).
 */
import { story, given, when, then } from "./dist/index.js";
import { expect } from "@playwright/test";

story("User logs in", () => {
  given("user is on login page", async ({ page: _page }) => {
    // e.g. await _page.goto('/login')
  });
  when("user submits valid credentials", async ({ page: _page }) => {
    // e.g. await _page.fill('[name=email]', '...'); await _page.click('button[type=submit]')
  });
  then("user sees the dashboard", async ({ page: _page }) => {
    expect(true).toBe(true); // e.g. await expect(_page).toHaveURL('/dashboard')
  });
});

story("User sees error on invalid login", () => {
  given("user is on login page", async ({ page: _page }) => {});
  when("user submits invalid credentials", async ({ page: _page }) => {});
  then("user sees an error message", async ({ page: _page }) => {
    expect(true).toBe(true);
  });
});
