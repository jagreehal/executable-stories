import { describe, it, expect } from "vitest";
import { computeTestMetrics } from "../../src/history/metrics";
import type { HistoryEntry } from "../../src/history/types";

function entry(
  status: "passed" | "failed" | "skipped" = "passed",
  durationMs = 100,
): HistoryEntry {
  return {
    runId: `r-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    status,
    durationMs,
  };
}

describe("computeTestMetrics", () => {
  it("composes all sub-functions correctly", () => {
    const entries = [
      entry("passed", 100),
      entry("passed", 100),
      entry("passed", 100),
      entry("passed", 100),
      entry("passed", 100),
      entry("passed", 100),
    ];

    const metrics = computeTestMetrics({ testId: "t1", entries });

    expect(metrics.testId).toBe("t1");
    expect(metrics.flakinessLevel).toBe("stable");
    expect(metrics.flakinessScore).toBe(0);
    expect(metrics.failureRate).toBe(0);
    expect(metrics.stabilityGrade).toBe("A");
    expect(metrics.performanceTrend).toBe("stable");
    expect(metrics.avgDurationMs).toBeCloseTo(100, 0);
    expect(metrics.passRate).toBe(1);
    expect(metrics.longestPassStreak).toBe(6);
    expect(metrics.consecutiveFailures).toBe(0);
  });

  it("sampleSize matches entries.length", () => {
    const entries = [
      entry("passed"),
      entry("failed"),
      entry("passed"),
      entry("passed"),
      entry("passed"),
    ];

    const metrics = computeTestMetrics({ testId: "t2", entries });

    expect(metrics.sampleSize).toBe(5);
  });

  it("all fields populated for mixed history", () => {
    const entries = [
      entry("passed", 100),
      entry("failed", 200),
      entry("passed", 150),
      entry("failed", 250),
      entry("passed", 100),
      entry("failed", 200),
    ];

    const metrics = computeTestMetrics({ testId: "t3", entries });

    expect(metrics.testId).toBe("t3");
    expect(typeof metrics.flakinessLevel).toBe("string");
    expect(typeof metrics.flakinessScore).toBe("number");
    expect(typeof metrics.failureRate).toBe("number");
    expect(typeof metrics.stabilityGrade).toBe("string");
    expect(typeof metrics.performanceTrend).toBe("string");
    expect(typeof metrics.avgDurationMs).toBe("number");
    expect(typeof metrics.passRate).toBe("number");
    expect(typeof metrics.longestPassStreak).toBe("number");
    expect(typeof metrics.consecutiveFailures).toBe("number");
    expect(typeof metrics.sampleSize).toBe("number");
  });

  it("calculates consecutiveFailures from tail", () => {
    const entries = [
      entry("passed"),
      entry("passed"),
      entry("failed"),
      entry("failed"),
      entry("failed"),
    ];

    const metrics = computeTestMetrics({ testId: "t4", entries });

    expect(metrics.consecutiveFailures).toBe(3);
  });

  it("consecutiveFailures is 0 when last entry passed", () => {
    const entries = [
      entry("failed"),
      entry("failed"),
      entry("passed"),
    ];

    const metrics = computeTestMetrics({ testId: "t5", entries });

    expect(metrics.consecutiveFailures).toBe(0);
  });

  it("handles empty entries", () => {
    const metrics = computeTestMetrics({ testId: "empty", entries: [] });

    expect(metrics.sampleSize).toBe(0);
    expect(metrics.passRate).toBe(1);
    expect(metrics.consecutiveFailures).toBe(0);
    expect(metrics.flakinessLevel).toBe("stable");
  });
});
