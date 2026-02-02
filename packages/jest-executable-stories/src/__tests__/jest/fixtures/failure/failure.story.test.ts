/**
 * Failing story test used by reporter integration test to assert
 * failure-in-markdown behavior. Run only via failure jest config.
 */
import { expect } from "@jest/globals";
import { story, given, when, then } from "../../../../bdd.js";

story("Calculator multiplies two numbers", () => {
  given("two numbers 7 and 6", () => {});
  when("the numbers are multiplied", () => {});
  then("the result is 42", () => {
    expect(1).toBe(42);
  });
});
