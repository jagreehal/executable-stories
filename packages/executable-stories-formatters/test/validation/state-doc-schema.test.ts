/**
 * Schema validation tests for the `state` DocEntry kind.
 *
 * A raw-run containing state docs (labeled and unlabeled) must pass
 * validation; a state doc missing its required `value` must fail.
 */

import { describe, it, expect } from "vitest";
import { validateRawRun } from "../../src/validation/schema-validator";

/** Minimal valid RawRun wrapping doc entries in a step's docs */
function rawRunWithStepDocs(docs: Array<Record<string, unknown>>) {
  return {
    schemaVersion: 1,
    projectRoot: "/project",
    testCases: [
      {
        status: "pass",
        story: {
          scenario: "Basket grows",
          steps: [{ keyword: "Given", text: "a basket", docs }],
        },
      },
    ],
  };
}

describe("state DocEntry in raw-run JSON schema", () => {
  it("accepts a labeled state doc", () => {
    const result = validateRawRun(
      rawRunWithStepDocs([
        { kind: "state", label: "Basket", value: { items: [{ qty: 1 }] }, phase: "runtime" },
      ]),
    );
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("accepts an unlabeled state doc with a scalar value", () => {
    const result = validateRawRun(
      rawRunWithStepDocs([{ kind: "state", value: 42, phase: "runtime" }]),
    );
    expect(result.valid).toBe(true);
  });

  it("accepts two same-label state docs across steps", () => {
    const result = validateRawRun({
      schemaVersion: 1,
      projectRoot: "/project",
      testCases: [
        {
          status: "pass",
          story: {
            scenario: "Basket grows",
            steps: [
              {
                keyword: "Given",
                text: "a basket",
                docs: [{ kind: "state", label: "Basket", value: { items: [] }, phase: "runtime" }],
              },
              {
                keyword: "When",
                text: "an apple is added",
                docs: [{ kind: "state", label: "Basket", value: { items: ["apple"] }, phase: "runtime" }],
              },
            ],
          },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a state doc missing `value`", () => {
    const result = validateRawRun(
      rawRunWithStepDocs([{ kind: "state", label: "Basket", phase: "runtime" }]),
    );
    expect(result.valid).toBe(false);
  });
});
