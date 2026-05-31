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
      durationMs: 125,
      errorMessage: "Expected login to fail",
      story: stubs.storyMeta({
        scenario: "Login fails",
        suitePath: ["Auth"],
        steps: [
          {
            id: "step-0",
            keyword: "Given",
            text: "a suspended account",
            docs: [{ kind: "note", phase: "runtime", text: "fixture: suspended user" }],
          },
          { id: "step-1", keyword: "Then", text: "login is blocked" },
        ],
        tickets: [{ id: "AUTH-123" }],
        docs: [{ kind: "link", phase: "runtime", label: "Policy", url: "https://example.com" }],
      }),
      tags: ["smoke"],
      stepResults: [
        { index: 0, stepId: "step-0", status: "passed", durationMs: 5 },
        { index: 1, stepId: "step-1", status: "failed", durationMs: 9, errorMessage: "blocked assertion failed" },
      ],
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
      suitePath: ["Auth"],
      tickets: [{ id: "AUTH-123" }],
      durationMs: 125,
      error: { message: "Expected login to fail" },
      docKinds: ["link", "note"],
    });
    expect(parsed[0].steps).toEqual([
      {
        id: "step-0",
        index: 0,
        keyword: "Given",
        text: "a suspended account",
        status: "passed",
        durationMs: 5,
        docKinds: ["note"],
      },
      {
        id: "step-1",
        index: 1,
        keyword: "Then",
        text: "login is blocked",
        status: "failed",
        durationMs: 9,
        errorMessage: "blocked assertion failed",
        docKinds: [],
      },
    ]);
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
