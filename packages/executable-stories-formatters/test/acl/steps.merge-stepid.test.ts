import { describe, it, expect } from "vitest";
import { mergeStepResults } from "../../src/converters/acl/steps";

describe("mergeStepResults stepId matching", () => {
  it("prefers stepId over index when both are present", () => {
    const derived = [
      { index: 0, stepId: "step-a", status: "passed", durationMs: 0 as const },
      { index: 1, stepId: "step-b", status: "passed", durationMs: 0 as const },
    ];

    const merged = mergeStepResults(derived as any, [
      { stepId: "step-a", status: "failed", durationMs: 42, errorMessage: "boom" },
    ]);

    expect(merged[0].status).toBe("failed");
    expect(merged[0].durationMs).toBe(42);
    expect(merged[0].errorMessage).toBe("boom");
    expect(merged[1].status).toBe("passed");
  });
});
