/**
 * Step aliases: arrange/act/assert, setup/execute/verify, context/action
 */
import { story } from "executable-stories-cypress";

describe("Step Aliases", () => {
  it("AAA Pattern: Arrange-Act-Assert", () => {
    story.init();
    story.note("Classic testing pattern using arrange/act/assert aliases");
    story.tag("aaa-pattern");

    story.arrange("calculator is initialized");
    const calculator = {
      add: (a: number, b: number) => a + b,
    };

    story.arrange("input values are prepared");
    const a = 5;
    const b = 3;

    story.act("addition is performed");
    const result = calculator.add(a, b);

    story.assert("result equals expected value");
    expect(result).to.equal(8);

    story.assert("result is a number");
    expect(typeof result).to.equal("number");
  });

  it("Setup-Execute-Verify Pattern", () => {
    story.init();
    story.note("Alternative naming using setup/execute/verify");
    story.tag("sev-pattern");

    story.setup("service is configured");
    const service = {
      process: (data: string) => data.toUpperCase(),
    };

    story.setup("dependencies are mocked");

    story.execute("service processes input");
    const output = service.process("hello");

    story.verify("output is transformed correctly");
    expect(output).to.equal("HELLO");

    story.verify("output is not empty");
    expect(output.length).to.be.greaterThan(0);
  });

  it("Context-Action Pattern", () => {
    story.init();
    story.note("Using context to establish state and action for operations");
    story.tag("context-action");

    story.context("user context is established");
    const state = {
      user: { name: "Alice", role: "admin" },
    };

    story.context("permissions are set");

    story.action("user performs privileged operation");
    const actionResult = state.user.role === "admin";

    story.then("operation succeeds");
    expect(actionResult).to.be.true;
  });

  it("Mixed pattern usage", () => {
    story.init();
    story.note("Different aliases can be combined in the same story");
    story.tag("mixed");

    story.given("initial data exists");
    const data = [1, 2, 3, 4, 5];

    story.arrange("data is validated");
    expect(data.length).to.be.greaterThan(0);

    story.context("sum accumulator is initialized");

    story.execute("sum is calculated");
    const sum = data.reduce((a, b) => a + b, 0);

    story.verify("sum is correct");
    expect(sum).to.equal(15);

    story.assert("sum is positive");
    expect(sum).to.be.greaterThan(0);
  });
});
