/**
 * Minimal story test used by the reporter integration test. Run only via
 * vitest --config=src/__tests__/fixtures/vitest.config.mts
 */
import { story, docStoryOverload } from "../../bdd.js";
import { expect, it } from "vitest";

story("User logs in", ({ given, when, then }) => {
  given("user is on login page", () => {});
  when("user submits valid credentials", () => {});
  then("user sees the dashboard", () => {
    expect(true).toBe(true);
  });
});

// Framework-native: it('xxx', ({ task }) => { doc.story('xxx', task); ... }) same as story('xxx', () => { ... })
it("User logs in (framework native)", ({ task }) => {
  docStoryOverload("User logs in (framework native)", task);
  expect(true).toBe(true);
});
