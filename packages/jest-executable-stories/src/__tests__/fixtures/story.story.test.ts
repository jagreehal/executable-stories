/**
 * Minimal story test used by the reporter integration test. Run only via
 * vitest --config=src/__tests__/fixtures/vitest.config.mts
 */
import { scenario } from "../../index.js";
import { expect } from "vitest";

scenario("User logs in", ({ given, when, then }) => {
  given("user is on login page", () => {});
  when("user submits valid credentials", () => {});
  then("user sees the dashboard", () => {
    expect(true).toBe(true);
  });
});
