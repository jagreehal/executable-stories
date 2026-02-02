/**
 * Comprehensive API variations test for Vitest.
 * Tests all API patterns using step.then() instead of then() (Vitest-specific).
 *
 * IMPORTANT: Vitest does NOT export `then` at top level (causes thenable issues
 * with dynamic imports). Must use steps.then() or step.then().
 */
import {
  story,
  given,
  when,
  and,
  arrange,
  act,
  assert,
  setup,
  context,
  execute,
  action,
  verify,
  doc,
  step,
} from "vitest-executable-stories";
import { it, expect } from "vitest";

// 1. Framework-native with doc.story() - requires task param
it("Framework native with doc.story", ({ task }) => {
  doc.story("My framework native story", task);
  expect(true).toBe(true);
});

// 2. Optional callbacks for all keywords - use step.then() for then
story("Optional callbacks for all step keywords", () => {
  given("given context without callback");
  when("when action without callback");
  step.then("then assertion without callback");
  and("and additional step without callback");
  arrange("arrange context without callback");
  act("act action without callback");
  assert("assert with callback", () => expect(true).toBe(true));
  setup("setup context without callback");
  context("context setup without callback");
  execute("execute action without callback");
  action("action execute without callback");
  verify("verify with callback", () => expect(true).toBe(true));
});

// 3. steps object style (recommended for Vitest)
story("Using steps object", (s) => {
  s.given("context via steps param");
  s.when("action via steps param");
  s.then("assertion via steps param", () => expect(true).toBe(true));
});

story("Using step prefix", () => {
  step.given("context via step prefix");
  step.when("action via step prefix");
  step.then("assertion via step prefix", () => expect(true).toBe(true));
});

// 4. Multiple steps → And (using step.then())
story("Multiple steps become And", () => {
  given("first given");
  given("second given becomes And");
  when("first when");
  when("second when becomes And");
  step.then("first then", () => expect(true).toBe(true));
  step.then("second then becomes And", () => expect(true).toBe(true));
});

// 5. Step modifiers
story("Step modifiers", () => {
  given("normal step");
  given.skip("skipped step");
  given.todo("todo step");
  step.then("final assertion", () => expect(true).toBe(true));
});

// 6. Story with metadata
story("Story with metadata", { tags: ["smoke", "api"], ticket: "JIRA-123" }, () => {
  given("context");
  step.then("assertion", () => expect(true).toBe(true));
});

// 7. doc.note() and doc.tag() usage
story("Story with notes and tags", () => {
  doc.note("This is a note about the story");
  doc.tag("smoke");
  doc.tag(["api", "important"]);
  given("context");
  doc.kv("key", "value");
  step.then("assertion", () => expect(true).toBe(true));
});
