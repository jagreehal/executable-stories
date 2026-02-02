/**
 * Demos: framework-native test + doc.story(title), optional step callback, arrange.
 */
import { test, expect } from "@playwright/test";
import { story, given, when, then, doc, arrange } from "playwright-executable-stories";
import { add } from "./calculator.js";

// Framework-native: test('xxx', () => { doc.story('xxx'); ... })
test("Calculator sum (framework native)", async () => {
  doc.story("Calculator sum (framework native)");
  expect(add(1, 2)).toBe(3);
});

// Optional step callback: given/arrange/when with single string (no-op body)
story("Optional step callback demo", () => {
  given("two numbers 1 and 2");
  arrange("we are about to add");
  when("add is called", async () => {});
  then("the result is 3", async () => {
    expect(add(1, 2)).toBe(3);
  });
});
