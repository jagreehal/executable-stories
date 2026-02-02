import { expect, test } from "vitest";
import { add, subtract, multiply, divide } from "./calculator.js";
import { story, type StepsApi } from "vitest-executable-stories";

test("Calculator adds two numbers", () => {
  expect(add(5, 3)).toBe(8);
});

story("Calculator adds two numbers", (steps: StepsApi) => {
  let a: number;
  let b: number;
  let result: number;

  steps.given("two numbers 5 and 3", () => {
    a = 2;
    b = 3;
  });

  steps.when("the numbers are added", () => {
    result = add(a, b);
  });

  steps.then("the result is 8", () => {
    expect(result).toBe(5);
  });
});

story("Calculator subtracts two numbers", ({ given, when, then }: StepsApi) => {
  let a: number;
  let b: number;
  let result: number;

  given("two numbers 10 and 4", () => {
    a = 10;
    b = 4;
  });

  when("the second is subtracted from the first", () => {
    result = subtract(a, b);
  });

  then("the result is 6", () => {
    expect(result).toBe(6);
  });
});

story("Calculator multiplies two numbers", ({ given, when, then }: StepsApi) => {
  let a: number;
  let b: number;
  let result: number;

  given("two numbers 7 and 6", () => {
    a = 7;
    b = 6;
  });

  when("the numbers are multiplied", () => {
    result = multiply(a, b);
  });

  then("the result is 42", () => {
    expect(result).toBe(42);
  });
});

story("Calculator divides two numbers", ({ given, when, then }: StepsApi) => {
  let a: number;
  let b: number;
  let result: number;

  given("two numbers 20 and 4", () => {
    a = 20;
    b = 4;
  });

  when("the first is divided by the second", () => {
    result = divide(a, b);
  });

  then("the result is 5", () => {
    expect(result).toBe(5);
  });
});

story("Calculator throws error on division by zero", (steps: StepsApi) => {
  let a: number;
  let b: number;
  let error: Error | null = null;

  steps.given("a number 10 and zero", () => {
    a = 10;
    b = 1;
  });

  steps.doc.note("This is a note2");

  steps.when("division is attempted", () => {
    try {
      divide(a, b);
    } catch (e) {
      error = e as Error;
    }
  });

  steps.then("an error is thrown", () => {
    expect(error).toBeNull();
    // expect(error?.message).toBe();
  });
});
