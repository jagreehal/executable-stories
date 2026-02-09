import { story } from "executable-stories-cypress";
import { add, subtract, multiply, divide } from "../../src/calculator.js";

describe("Calculator", () => {
  it("Calculator adds two numbers", () => {
    story.init();

    story.given("two numbers 5 and 3");
    const a = 5;
    const b = 3;

    story.when("the numbers are added");
    const result = add(a, b);

    story.then("the result is 8");
    expect(result).to.equal(8);
  });

  it("Calculator subtracts two numbers", () => {
    story.init();

    story.given("two numbers 10 and 4");
    const a = 10;
    const b = 4;

    story.when("the second is subtracted from the first");
    const result = subtract(a, b);

    story.then("the result is 6");
    expect(result).to.equal(6);
  });

  it("Calculator multiplies two numbers", () => {
    story.init();

    story.given("two numbers 7 and 6");
    const a = 7;
    const b = 6;

    story.note("This is a note3");

    story.when("the numbers are multiplied");
    const result = multiply(a, b);

    story.then("the result is 42");
    expect(result).to.equal(42);
  });

  it("Calculator divides two numbers", () => {
    story.init();

    story.given("two numbers 20 and 4");
    const a = 20;
    const b = 4;

    story.when("the first is divided by the second");
    const result = divide(a, b);

    story.then("the result is 5");
    expect(result).to.equal(5);
  });

  it("Calculator throws error on division by zero", () => {
    story.init();

    story.note("Division by zero should throw an error");

    story.given("a number 10 and zero");
    const a = 10;
    const b = 0;
    let error: Error | null = null;

    story.when("division is attempted");
    try {
      divide(a, b);
    } catch (e) {
      error = e as Error;
    }

    story.then("an error is thrown");
    expect(error).not.to.be.null;
    expect((error as Error)?.message).to.equal("Cannot divide by zero");
  });
});
