/**
 * Fixture test for mixed mode - e2e (aggregated).
 */
import { story } from "../../../../../index.js";
import { expect } from "vitest";

story("E2E checkout flow", ({ given, when, then }) => {
  given("user has items in cart", () => {});
  when("user completes checkout", () => {});
  then("order is confirmed", () => {
    expect(true).toBe(true);
  });
});
