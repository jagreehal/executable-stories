import { story } from "executable-stories-cypress";
import { add, subtract, multiply, divide } from "../../src/calculator.js";

describe("Wrapped Steps (fn/expect)", () => {
  it("Calculator adds two numbers using fn and expect", () => {
    story.init();

    const a = story.fn("Given", "number a is 5", () => 5);
    const b = story.fn("Given", "number b is 3", () => 3);

    const result = story.fn("When", "the numbers are added", () => add(a, b));

    story.expect("the result is 8", () => {
      expect(result).to.equal(8);
    });
  });

  it("Calculator subtracts using fn with timing", () => {
    story.init();

    const nums = story.fn("Given", "two numbers 10 and 4", () => ({
      a: 10,
      b: 4,
    }));

    const result = story.fn("When", "the second is subtracted from the first", () =>
      subtract(nums.a, nums.b),
    );

    story.expect("the result is 6", () => {
      expect(result).to.equal(6);
    });
  });

  it("Calculator division by zero captured in fn", () => {
    story.init();

    story.fn("Given", "a number 10 and zero", () => {});

    story.expect("division by zero throws an error", () => {
      expect(() => divide(10, 0)).to.throw("Cannot divide by zero");
    });
  });

  it("Mixed markers and wrapped steps", () => {
    story.init();

    story.given("the calculator is ready");

    const result = story.fn("When", "we multiply 7 by 6", () => multiply(7, 6));

    story.expect("the result is 42", () => {
      expect(result).to.equal(42);
    });

    story.and("the result is a positive number");
    expect(result).to.be.greaterThan(0);
  });
});
