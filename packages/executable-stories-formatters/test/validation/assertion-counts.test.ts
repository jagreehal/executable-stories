/**
 * The raw-run schema is the contract every adapter writes against, the six
 * non-JS ones included. A field the adapters emit but the schema rejects breaks
 * `validate` for everyone, so the schema has to know about it.
 */
import { describe, expect, it } from "vitest";
import { validateRawRun } from "../../src/validation/schema-validator";

function runWithStep(step: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    testCases: [
      {
        title: "adds two numbers",
        titlePath: ["adds two numbers"],
        story: { scenario: "adds two numbers", steps: [step] },
        sourceFile: "src/calc.story.test.ts",
        sourceLine: 1,
        status: "pass",
        durationMs: 1,
      },
    ],
    projectRoot: "/repo",
    startedAtMs: 0,
    finishedAtMs: 1,
  };
}

describe("raw-run schema: assertion counts", () => {
  it("accepts a step that reports how many assertions it made", () => {
    expect(
      validateRawRun(runWithStep({ keyword: "Then", text: "the result is 8", assertions: 2 })).valid
    ).toBe(true);
  });

  it("accepts a step that reports none", () => {
    expect(
      validateRawRun(runWithStep({ keyword: "Then", text: "the result is 8", assertions: 0 })).valid
    ).toBe(true);
  });

  it("accepts a step from an adapter that cannot observe assertions", () => {
    expect(
      validateRawRun(runWithStep({ keyword: "Then", text: "the result is 8" })).valid
    ).toBe(true);
  });

  it("rejects a negative count", () => {
    expect(
      validateRawRun(runWithStep({ keyword: "Then", text: "the result is 8", assertions: -1 })).valid
    ).toBe(false);
  });
});
