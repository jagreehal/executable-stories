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

  it("outputs CSV format with headers and escaped values", () => {
    const tc = stubs.testCaseResult({
      id: "abc123",
      status: "passed",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login with valid credentials", tags: ["smoke", "auth"] }),
      tags: ["smoke", "auth"],
    });

    const result = listScenarios({ testCases: [tc], format: "csv" }, {});
    const lines = result.split("\n");

    expect(lines[0]).toBe("id,scenario,status,sourceFile,sourceLine,tags");
    expect(lines[1]).toBe('abc123,Login with valid credentials,passed,src/auth/login.test.ts,42,smoke auth');
  });

  it("CSV escapes values containing commas", () => {
    const tc = stubs.testCaseResult({
      id: "x1",
      status: "failed",
      sourceFile: "src/auth.test.ts",
      sourceLine: 1,
      story: stubs.storyMeta({ scenario: 'User clicks "submit, please"', tags: [] }),
      tags: [],
    });

    const result = listScenarios({ testCases: [tc], format: "csv" }, {});
    const lines = result.split("\n");
    expect(lines[1]).toBe('x1,"User clicks ""submit, please""",failed,src/auth.test.ts,1,');
  });

  it("outputs markdown-table format", () => {
    const tc = stubs.testCaseResult({
      status: "passed",
      sourceFile: "src/auth/login.test.ts",
      sourceLine: 42,
      story: stubs.storyMeta({ scenario: "Login with valid credentials", tags: ["smoke"] }),
      tags: ["smoke"],
    });

    const result = listScenarios({ testCases: [tc], format: "markdown-table" }, {});
    const lines = result.split("\n");

    expect(lines[0]).toBe("| Status | Scenario | Location | Tags |");
    expect(lines[1]).toBe("|--------|----------|----------|------|");
    expect(lines[2]).toContain("✅");
    expect(lines[2]).toContain("Login with valid credentials");
    expect(lines[2]).toContain("src/auth/login.test.ts:42");
    expect(lines[2]).toContain("@smoke");
  });

  it("markdown-table leaves tags cell blank when no tags", () => {
    const tc = stubs.testCaseResult({
      status: "failed",
      sourceFile: "src/auth.test.ts",
      sourceLine: 1,
      story: stubs.storyMeta({ scenario: "Fails gracefully", tags: [] }),
      tags: [],
    });

    const result = listScenarios({ testCases: [tc], format: "markdown-table" }, {});
    expect(result).toContain("|  |");
  });
});
