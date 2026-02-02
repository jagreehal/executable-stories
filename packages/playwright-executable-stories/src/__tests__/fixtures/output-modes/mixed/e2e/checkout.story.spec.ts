/**
 * Fixture test for mixed mode - e2e (aggregated).
 */
import { scenario } from "../../../../../../dist/index.js";
import { expect } from "@playwright/test";

scenario("E2E checkout flow", ({ given, when, then }) => {
  given("user has items in cart", async () => {});
  when("user completes checkout", async () => {});
  then("order is confirmed", async () => {
    expect(true).toBe(true);
  });
});
