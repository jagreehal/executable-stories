/**
 * Fixture test for mixed mode - other (fallback aggregated).
 */
import { scenario } from "../../../../../../dist/index.js";
import { expect } from "@playwright/test";

scenario("Other scenario", ({ given, when, then }) => {
  given("some setup", async () => {});
  when("something happens", async () => {});
  then("result is expected", async () => {
    expect(true).toBe(true);
  });
});
