/**
 * Fixture story tests for reporter tests.
 */
import { describe, it, expect } from "@jest/globals";
import { story } from "executable-stories-jest";

describe("Calculator", () => {
  it("adds two numbers", () => {
    story.init();
    story.given("two numbers 5 and 3");
    const a = 5;
    const b = 3;
    story.when("they are added");
    const result = a + b;
    story.then("the result is 8");
    expect(result).toBe(8);
  });

  it("subtracts two numbers", () => {
    story.init();
    story.given("two numbers 10 and 4");
    story.when("the second is subtracted from the first");
    story.then("the result is 6");
    expect(10 - 4).toBe(6);
  });
});

describe("Doc API", () => {
  it("story with note and tags", () => {
    story.init({ tags: ["smoke"], ticket: "T-1" });
    story.note("This scenario uses doc methods.");
    story.given("precondition");
    story.when("action");
    story.then("outcome");
    expect(true).toBe(true);
  });
});
