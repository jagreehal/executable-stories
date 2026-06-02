/**
 * Schema validation tests for `otelSpans` in raw-run.schema.json.
 *
 * The vitest adapter attaches captured OpenTelemetry spans to story metadata
 * (story.attachSpans). The raw-run schema must accept them, otherwise any run
 * that captures spans fails validation in `format`/`list`.
 */

import { describe, it, expect } from "vitest";
import { validateRawRun } from "../../src/validation/schema-validator";

function rawRunWithSpans(otelSpans: unknown) {
  return {
    schemaVersion: 1,
    projectRoot: "/project",
    testCases: [
      {
        status: "pass",
        story: {
          scenario: "produces the full span tree",
          otelSpans,
        },
      },
    ],
  };
}

describe("otelSpans in raw-run schema", () => {
  it("accepts a story that carries captured otel spans", () => {
    const result = validateRawRun(
      rawRunWithSpans([
        { name: "sendMoney", traceId: "abc", spanId: "def", attributes: { "transfer.amount": 100 } },
        { name: "validate", traceId: "abc", spanId: "ghi" },
      ]),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts a story with no otelSpans (optional)", () => {
    const result = validateRawRun({
      schemaVersion: 1,
      projectRoot: "/project",
      testCases: [{ status: "pass", story: { scenario: "no spans" } }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects otelSpans that is not an array", () => {
    const result = validateRawRun(rawRunWithSpans({ not: "an array" }));
    expect(result.valid).toBe(false);
  });
});
