/**
 * Fixture test for mixed mode - features (colocated).
 */
import { scenario } from "../../../../../../dist/index.js";
import { expect } from "@playwright/test";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", async () => {});
  when("user submits valid credentials", async () => {});
  then("user sees the dashboard", async () => {
    expect(true).toBe(true);
  });
});
