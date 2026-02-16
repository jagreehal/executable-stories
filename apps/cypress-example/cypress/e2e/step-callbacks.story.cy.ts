import { story } from "executable-stories-cypress";
import { add, multiply } from "../../src/calculator.js";

describe("Step Callbacks", () => {
  it("Calculator adds two numbers using step callbacks", () => {
    story.init();

    const a = story.given("number a is 5", () => 5);
    const b = story.given("number b is 3", () => 3);

    const result = story.when("the numbers are added", () => add(a, b));

    story.then("the result is 8", () => {
      expect(result).to.equal(8);
    });
  });

  it("Mixed markers and step callbacks", () => {
    story.init();

    story.given("the calculator is ready");

    const result = story.when("we multiply 7 by 6", () => multiply(7, 6));

    story.then("the result is 42", () => {
      expect(result).to.equal(42);
    });

    story.and("the result is a positive number");
    expect(result).to.be.greaterThan(0);
  });

  it("Step callbacks with inline docs still use marker-only", () => {
    story.init();

    story.given("valid credentials", {
      json: { label: "Credentials", value: { email: "user@example.com" } },
    });

    const result = story.when("login is attempted", () => ({ authenticated: true }));

    story.then("user is authenticated", () => {
      expect(result.authenticated).to.equal(true);
    });

    story.but("rate limit is not exceeded");
  });
});
