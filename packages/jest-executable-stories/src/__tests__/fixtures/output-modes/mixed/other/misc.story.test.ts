/**
 * Fixture test for mixed mode - other (fallback aggregated).
 */
import { scenario } from "../../../../../index.js";
import { expect } from "vitest";

scenario("Other scenario", ({ given, when, then }) => {
  given("some setup", () => {});
  when("something happens", () => {});
  then("result is expected", () => {
    expect(true).toBe(true);
  });
});
