/**
 * Fixture test for mixed mode - e2e (aggregated).
 */
import { story, given, when, then } from "../../../../../index.js";
import { expect } from "vitest";

story("E2E checkout flow", () => {
  given("user has items in cart", () => {});
  when("user completes checkout", () => {});
  then("order is confirmed", () => {
    expect(true).toBe(true);
  });
});
