/**
 * Fixture test for mixed mode - e2e (aggregated).
 */
import { story, given, when, then } from "../../../../../../dist/index.js";
import { expect } from "@playwright/test";

story("E2E checkout flow", () => {
  given("user has items in cart", async () => {});
  when("user completes checkout", async () => {});
  then("order is confirmed", async () => {
    expect(true).toBe(true);
  });
});
