import { story, given, when, then, doc } from "playwright-executable-stories";
import { expect } from "@playwright/test";
import { add, subtract, multiply, divide } from "./calculator.js";

story("Calculator adds two numbers", () => {
  let a: number;
  let b: number;
  let result: number;

  given("two numbers 5 and 3", () => {
    a = 5;
    b = 3;
  });

  when("the numbers are added", () => {
    result = add(a, b);
  });

  then("the result is 8", () => {
    expect(result).toBe(8);
  });
});

story("Calculator subtracts two numbers", () => {
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

story("Calculator multiplies two numbers", () => {
  let a: number;
  let b: number;
  let result: number;

  given("two numbers 7 and 6", () => {
    a = 7;
    b = 6;
  });

  doc.note("This is a note3");

  when("the numbers are multiplied", () => {
    result = multiply(a, b);
  });

  then("the result is 42", () => {
    expect(result).toBe(42);
  });
});

story("Calculator divides two numbers", () => {
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

story("Calculator throws error on division by zero", () => {
  let a: number;
  let b: number;
  let error: Error | null = null;

  given("a number 10 and zero", () => {
    a = 10;
    b = 0;
  });

  doc.note("Division by zero should throw an error");

  when("division is attempted", () => {
    try {
      divide(a, b);
    } catch (e) {
      error = e as Error;
    }
  });

  then("an error is thrown", () => {
    expect(error).not.toBeNull();
    expect(error?.message).toBe("Cannot divide by zero");
  });
});
