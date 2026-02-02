/**
 * Comprehensive API variations test for Playwright.
 * Tests all API patterns: doc.story(), optional callbacks, steps/step object,
 * multiple steps → And, step modifiers, story with metadata, doc.note().
 */
import { test, expect } from "@playwright/test";
import {
  story,
  given,
  when,
  then,
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
} from "playwright-executable-stories";

// 1. Framework-native with doc.story()
test("Framework native with doc.story", async () => {
  doc.story("My framework native story");
  expect(true).toBe(true);
});

// 2. Optional callbacks for all keywords
story("Optional callbacks for all step keywords", () => {
  given("given context without callback");
  when("when action without callback");
  then("then assertion without callback");
  and("and additional step without callback");
  arrange("arrange context without callback");
  act("act action without callback");
  assert("assert with callback", async () => expect(true).toBe(true));
  setup("setup context without callback");
  context("context setup without callback");
  execute("execute action without callback");
  action("action execute without callback");
  verify("verify with callback", async () => expect(true).toBe(true));
});

// 3. steps object style
story("Using steps object", (s) => {
  s.given("context via steps param");
  s.when("action via steps param");
  s.then("assertion via steps param", async () => expect(true).toBe(true));
});

story("Using step prefix", () => {
  step.given("context via step prefix");
  step.when("action via step prefix");
  step.then("assertion via step prefix", async () => expect(true).toBe(true));
});

// 4. Multiple steps → And
story("Multiple steps become And", () => {
  given("first given");
  given("second given becomes And");
  when("first when");
  when("second when becomes And");
  then("first then", async () => expect(true).toBe(true));
  then("second then becomes And", async () => expect(true).toBe(true));
});

// 5. Step modifiers
story("Step modifiers", () => {
  given("normal step");
  given.skip("skipped step");
  given.todo("todo step");
  then("final assertion", async () => expect(true).toBe(true));
});

// 6. Story with metadata
story("Story with metadata", { tags: ["smoke", "api"], ticket: "JIRA-123" }, () => {
  given("context");
  then("assertion", async () => expect(true).toBe(true));
});

// 7. doc.note() and doc.tag() usage
story("Story with notes and tags", () => {
  doc.note("This is a note about the story");
  doc.tag("smoke");
  doc.tag(["api", "important"]);
  given("context");
  doc.kv("key", "value");
  then("assertion", async () => expect(true).toBe(true));
});
