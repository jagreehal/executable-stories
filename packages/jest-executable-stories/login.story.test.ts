/**
 * Example story test. Run: npx jest
 * Then open docs/user-stories.md (or the outputFile you configured).
 */
import { story, given, when, then } from "./src/bdd";
import { expect } from "@jest/globals";

story("User logs in", () => {
  given("user is on login page", async () => {
    // e.g. await page.goto('/login')
  });
  when("user submits valid credentials", async () => {
    // e.g. await page.fill('[name=email]', '...'); await page.click('button[type=submit]')
  });
  then("user sees the dashboard", async () => {
    expect(true).toBe(true); // e.g. await expect(page).toHaveURL('/dashboard')
  });
});

story("User sees error on invalid login", () => {
  given("user is on login page", () => {});
  when("user submits invalid credentials", () => {});
  then("user sees an error message", () => {
    expect(true).toBe(true);
  });
});
