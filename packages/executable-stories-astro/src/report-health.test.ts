import { describe, it, expect } from "vitest";
import { summarizeHealth } from "./report-health.js";
import type { StoryReportLike } from "./verification.js";

function report(statuses: string[]): StoryReportLike {
  return {
    runId: "run-1",
    finishedAtMs: 1_700_000_000_000,
    features: [
      {
        title: "Checkout",
        sourceFile: "checkout.ts",
        scenarios: statuses.map((status, i) => ({
          id: `s-${i}`,
          title: `Scenario ${i}`,
          status: status as never,
        })),
      },
    ],
  };
}

describe("summarizeHealth", () => {
  it("counts statuses and computes pass rate", () => {
    const h = summarizeHealth(report(["passed", "passed", "failed", "skipped"]));
    expect(h.total).toBe(4);
    expect(h.passed).toBe(2);
    expect(h.failed).toBe(1);
    expect(h.skipped).toBe(1);
    expect(h.passRate).toBeCloseTo(0.5);
    expect(h.lastRunMs).toBe(1_700_000_000_000);
    expect(h.empty).toBe(false);
  });

  it("lists failing scenarios with context", () => {
    const h = summarizeHealth(report(["passed", "failed"]));
    expect(h.failing).toHaveLength(1);
    expect(h.failing[0]).toMatchObject({ title: "Scenario 1", feature: "Checkout" });
  });

  it("treats an empty report as empty with zero pass rate", () => {
    const h = summarizeHealth({ features: [], finishedAtMs: 0, runId: "" });
    expect(h.empty).toBe(true);
    expect(h.passRate).toBe(0);
    expect(h.lastRunMs).toBeUndefined();
  });
});
