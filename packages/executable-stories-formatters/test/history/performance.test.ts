import { describe, it, expect } from "vitest";
import { detectPerformanceTrend } from "../../src/history/performance";
import type { HistoryEntry } from "../../src/history/types";

function entry(durationMs: number, status: "passed" | "failed" | "skipped" = "passed"): HistoryEntry {
  return {
    runId: `r-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    status,
    durationMs,
  };
}

describe("detectPerformanceTrend", () => {
  it("entries with increasing durations -> regressing", () => {
    // Earlier half: 100, 100, 100; Recent half: 200, 200, 200
    const entries = [
      entry(100),
      entry(100),
      entry(100),
      entry(200),
      entry(200),
      entry(200),
    ];
    const result = detectPerformanceTrend({ entries });

    expect(result.trend).toBe("regressing");
    expect(result.avgDurationMs).toBeCloseTo(150, 0);
  });

  it("entries with decreasing durations -> improving", () => {
    // Earlier half: 200, 200, 200; Recent half: 100, 100, 100
    const entries = [
      entry(200),
      entry(200),
      entry(200),
      entry(100),
      entry(100),
      entry(100),
    ];
    const result = detectPerformanceTrend({ entries });

    expect(result.trend).toBe("improving");
    expect(result.avgDurationMs).toBeCloseTo(150, 0);
  });

  it("flat durations -> stable", () => {
    const entries = [
      entry(100),
      entry(100),
      entry(100),
      entry(100),
      entry(100),
      entry(100),
    ];
    const result = detectPerformanceTrend({ entries });

    expect(result.trend).toBe("stable");
    expect(result.avgDurationMs).toBeCloseTo(100, 0);
  });

  it("below MIN_PERF_SAMPLES -> stable", () => {
    const entries = [entry(100), entry(200), entry(300)];
    const result = detectPerformanceTrend({ entries });

    expect(result.trend).toBe("stable");
    expect(result.avgDurationMs).toBeCloseTo(200, 0);
  });

  it("skipped entries filtered out", () => {
    // Only 4 countable entries after removing 2 skipped -> below MIN_PERF_SAMPLES (6)
    const entries = [
      entry(100),
      entry(100, "skipped"),
      entry(100),
      entry(200, "skipped"),
      entry(100),
      entry(100),
    ];
    const result = detectPerformanceTrend({ entries });

    expect(result.trend).toBe("stable");
    expect(result.avgDurationMs).toBeCloseTo(100, 0);
  });

  it("empty entries -> stable with 0 avg", () => {
    const result = detectPerformanceTrend({ entries: [] });

    expect(result.trend).toBe("stable");
    expect(result.avgDurationMs).toBe(0);
  });

  it("marginal change within 10% -> stable", () => {
    // Earlier avg: 100, Recent avg: 108 (8% change, under 10%)
    const entries = [
      entry(100),
      entry(100),
      entry(100),
      entry(108),
      entry(108),
      entry(108),
    ];
    const result = detectPerformanceTrend({ entries });

    expect(result.trend).toBe("stable");
  });
});
