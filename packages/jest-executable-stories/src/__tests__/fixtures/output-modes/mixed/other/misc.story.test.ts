/**
 * Fixture test for mixed mode - other (fallback aggregated).
 */
import { story, given, when, then } from "../../../../../index.js";
import { expect } from "vitest";

story("Other scenario", () => {
  given("some setup", () => {});
  when("something happens", () => {});
  then("result is expected", () => {
    expect(true).toBe(true);
  });
});
