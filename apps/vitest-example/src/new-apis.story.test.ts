/**
 * Demos: framework-native test + doc.story(title), optional step callback, arrange/step.
 */
import { story, doc, given, when, step, arrange } from "vitest-executable-stories";
import { expect, it } from "vitest";
import { add } from "./calculator.js";

// Framework-native: it('xxx', ({ task }) => { doc.story('xxx', task); ... })
it("Calculator sum (framework native)", ({ task }) => {
  doc.story("Calculator sum (framework native)", task);
  expect(add(1, 2)).toBe(3);
});

// Optional step callback: given/when/arrange with single string (no-op body)
story("Optional step callback demo", () => {
  given("two numbers 1 and 2");
  arrange("we are about to add");
  when("add is called", () => {});
  step.then("the result is 3", () => {
    expect(add(1, 2)).toBe(3);
  });
});
