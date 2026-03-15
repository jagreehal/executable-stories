import { describe, it, expect, beforeEach } from "vitest";
import { listScenarios } from "../src/list-scenarios";
import { stubs } from "./stubs";

describe("listScenarios", () => {
  beforeEach(() => {
    stubs.setFakerSeed(42);
  });

  it("outputs text format with scenario details", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login with valid credentials", tags: ["smoke", "auth"] }),
      tags: ["smoke", "auth"],
    });

    const result = listScenarios({ testCases: [tc], format: "text" }, {});

    expect(result).toContain("Review summary:");
    expect(result).toContain("Priority:");
    expect(result).toContain("passed");
    expect(result).toContain("Login with valid credentials");
    expect(result).toContain("src/auth/login.test.ts:42");
    expect(result).toContain("smoke, auth");
  });

  it("orders failures first in text output", () => {
    const failed = stubs.testCaseResult({
      status: "failed",
      sourceFile: "src/auth/failure.test.ts",
      sourceLine: 2,
      story: stubs.storyMeta({ scenario: "Failure", tags: [] }),
      tags: [],
    });
    const passed = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/auth/success.test.ts",
      sourceLine: 1,
      story: stubs.storyMeta({ scenario: "Success", tags: [] }),
      tags: [],
    });

    const result = listScenarios({ testCases: [passed, failed], format: "text" }, {});
    const failurePos = result.indexOf("Failure");
    const successPos = result.indexOf("Success");
    expect(failurePos).toBeGreaterThan(-1);
    expect(successPos).toBeGreaterThan(-1);
    expect(failurePos).toBeLessThan(successPos);
  });

  it("outputs JSON format", () => {
    const tc = stubs.testCaseResult({
      id: "abc123",
      status: "failed",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login fails" }),
      tags: ["smoke"],
    });

    const result = listScenarios({ testCases: [tc], format: "json" }, {});
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      scenario: "Login fails",
      status: "failed",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      tags: ["smoke"],
      id: "abc123",
    });
  });

  it("handles empty test cases", () => {
    const result = listScenarios({ testCases: [], format: "text" }, {});
    expect(result).toBe("No scenarios found.");
  });

  it("handles empty test cases in JSON", () => {
    const result = listScenarios({ testCases: [], format: "json" }, {});
    expect(JSON.parse(result)).toEqual([]);
  });
});
