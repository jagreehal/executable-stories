/**
 * Fixture test for mixed mode - features (colocated).
 */
import { story, given, when, then } from "../../../../../../dist/index.js";
import { expect } from "@playwright/test";

story("User logs in", () => {
  given("user is on login page", async () => {});
  when("user submits valid credentials", async () => {});
  then("user sees the dashboard", async () => {
    expect(true).toBe(true);
  });
});
