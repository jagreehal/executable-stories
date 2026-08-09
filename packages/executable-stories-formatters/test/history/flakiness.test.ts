import { describe, it, expect } from "vitest";
import { calculateFlakiness } from "../../src/history/flakiness";
import type { HistoryEntry } from "../../src/history/types";

function entry(status: "passed" | "failed" | "skipped" | "pending"): HistoryEntry {
  return {
    runId: `r-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    status,
    durationMs: 100,
  };
}

describe("calculateFlakiness", () => {
  it("all passes -> stable, score 0", () => {
    const entries = [entry("passed"), entry("passed"), entry("passed"), entry("passed"), entry("passed")];
    const result = calculateFlakiness({ entries });

    expect(result.flakinessLevel).toBe("stable");
    expect(result.flakinessScore).toBe(0);
    expect(result.failureRate).toBe(0);
    expect(result.longestPassStreak).toBe(5);
    expect(result.longestFailStreak).toBe(0);
  });

  it("all fails -> unstable (failureRate 1.0)", () => {
    const entries = [entry("failed"), entry("failed"), entry("failed"), entry("failed"), entry("failed")];
    const result = calculateFlakiness({ entries });

    expect(result.flakinessLevel).toBe("unstable");
    expect(result.flakinessScore).toBe(0);
    expect(result.failureRate).toBe(1);
    expect(result.longestPassStreak).toBe(0);
    expect(result.longestFailStreak).toBe(5);
  });

  it("alternating P F P F P F -> flaky (high transition score)", () => {
    const entries = [
      entry("passed"),
      entry("failed"),
      entry("passed"),
      entry("failed"),
      entry("passed"),
      entry("failed"),
    ];
    const result = calculateFlakiness({ entries });

    expect(result.flakinessLevel).toBe("flaky");
    // 5 transitions / 5 = 1.0
    expect(result.flakinessScore).toBe(1);
    expect(result.failureRate).toBe(0.5);
  });

  it("P P P F P P -> 2 transitions / 5 = 0.4 + failureRate = 0.17 -> unstable (not flaky)", () => {
    /**
     * Documented edge case:
     * Transition score = 2/5 = 0.4 (> 0.2 threshold for unstable)
     * Failure rate = 1/6 = 0.167 (< 0.2, so transition > 0.3 AND failureRate > 0.2 is false)
     * => unstable, not flaky (transition > 0.5 is false, transition > 0.3 AND failureRate > 0.2 is false)
     */
    const entries = [
      entry("passed"),
      entry("passed"),
      entry("passed"),
      entry("failed"),
      entry("passed"),
      entry("passed"),
    ];
    const result = calculateFlakiness({ entries });

    expect(result.flakinessLevel).toBe("unstable");
    expect(result.flakinessScore).toBeCloseTo(0.4, 5);
    expect(result.failureRate).toBeCloseTo(1 / 6, 5);
  });

  it("skipped entries excluded from transitions and failure rate", () => {
    const entries = [
      entry("passed"),
      entry("skipped"),
      entry("passed"),
      entry("skipped"),
      entry("passed"),
    ];
    const result = calculateFlakiness({ entries });

    // Only 3 countable entries, all passed
    expect(result.flakinessLevel).toBe("stable");
    expect(result.flakinessScore).toBe(0);
    expect(result.failureRate).toBe(0);
    expect(result.longestPassStreak).toBe(3);
  });

  it("single entry -> stable", () => {
    const entries = [entry("passed")];
    const result = calculateFlakiness({ entries });

    expect(result.flakinessLevel).toBe("stable");
    expect(result.flakinessScore).toBe(0);
    expect(result.longestPassStreak).toBe(1);
  });

  it("empty entries -> stable", () => {
    const result = calculateFlakiness({ entries: [] });

    expect(result.flakinessLevel).toBe("stable");
    expect(result.flakinessScore).toBe(0);
    expect(result.failureRate).toBe(0);
    expect(result.longestPassStreak).toBe(0);
  });

  it("below MIN_FLAKINESS_SAMPLES -> stable, but the counts stay honest", () => {
    // MIN_FLAKINESS_SAMPLES is 3, so 2 entries cannot be classified as flaky.
    // The threshold gates the classification only: failure rate and streaks are
    // plain counts and must still describe the runs that happened.
    const entries = [entry("passed"), entry("failed")];
    const result = calculateFlakiness({ entries });

    expect(result.flakinessLevel).toBe("stable");
    expect(result.flakinessScore).toBe(0);
    expect(result.failureRate).toBe(0.5);
    expect(result.longestPassStreak).toBe(1);
    expect(result.longestFailStreak).toBe(1);
  });

  it("a scenario that has only ever failed never reports a pass streak", () => {
    // Regression: the sub-threshold branch used to return failureRate 0 and
    // longestPassStreak = countable.length, so two failures read as a
    // two-run pass streak with no failures at all.
    const entries = [entry("failed"), entry("failed")];
    const result = calculateFlakiness({ entries });

    expect(result.failureRate).toBe(1);
    expect(result.longestPassStreak).toBe(0);
    expect(result.longestFailStreak).toBe(2);
  });

  it("pending entries excluded like skipped", () => {
    const entries = [
      entry("passed"),
      entry("pending"),
      entry("failed"),
      entry("pending"),
      entry("passed"),
    ];
    const result = calculateFlakiness({ entries });

    // 3 countable: P F P -> 2 transitions / 2 = 1.0 -> flaky
    expect(result.flakinessLevel).toBe("flaky");
    expect(result.flakinessScore).toBe(1);
  });
});
