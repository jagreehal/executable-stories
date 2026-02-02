/**
 * Fixture test for mixed mode - other (fallback aggregated).
 */
import { story, given, when, then } from "../../../../../../dist/index.js";
import { expect } from "@playwright/test";

story("Other scenario", () => {
  given("some setup", async () => {});
  when("something happens", async () => {});
  then("result is expected", async () => {
    expect(true).toBe(true);
  });
});
