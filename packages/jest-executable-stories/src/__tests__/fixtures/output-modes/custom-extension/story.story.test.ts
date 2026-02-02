/**
 * Fixture test for custom extension output mode.
 */
import { story, given, when, then } from "../../../../index.js";
import { expect } from "vitest";

story("User logs in", () => {
  given("user is on login page", () => {});
  when("user submits valid credentials", () => {});
  then("user sees the dashboard", () => {
    expect(true).toBe(true);
  });
});
