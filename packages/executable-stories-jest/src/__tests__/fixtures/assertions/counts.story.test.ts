/**
 * Fixture: both step styles, so the reporter's raw run can be checked for
 * assertion counts attributed to the right steps.
 */
import { describe, it, expect } from "@jest/globals";
import { story } from "executable-stories-jest";

describe("Calculator", () => {
  it("counts assertions inside a wrapped step", () => {
    story.init();
    story.given("two numbers 5 and 3");
    story.then("the result is 8", () => {
      expect(5 + 3).toBe(8);
    });
  });

  it("counts assertions following a marker step", () => {
    story.init();
    story.given("two numbers 10 and 4");
    story.then("the result is 6");
    expect(10 - 4).toBe(6);
  });

  it("reports a claim that checked nothing", () => {
    story.init();
    story.given("a warm cache");
    story.then("p99 stays under 50ms");
  });
});
