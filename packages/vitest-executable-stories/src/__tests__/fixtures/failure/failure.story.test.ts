/**
 * Failing story test used by reporter integration tests to assert
 * failure-in-markdown behavior. Run only via failure/vitest.config.mts.
 */
import { story } from "../../../index.js";
import { expect } from "vitest";

story("Calculator multiplies two numbers", ({ given, when, then }) => {
  given("two numbers 7 and 6", () => {});
  when("the numbers are multiplied", () => {});
  then("the result is 42", () => {
    expect(1).toBe(42);
  });
});
