/**
 * Fixture test for mixed mode - other (fallback aggregated).
 */
import { story } from "../../../../../index.js";
import { expect } from "vitest";

story("Other scenario", ({ given, when, then }) => {
  given("some setup", () => {});
  when("something happens", () => {});
  then("result is expected", () => {
    expect(true).toBe(true);
  });
});
