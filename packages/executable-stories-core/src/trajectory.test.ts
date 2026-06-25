import { describe, it, expect } from "vitest";

import { advanceState, initialRunState, summarizeRun, trajectorySummary } from "./trajectory.js";
import type { TestRunResult } from "./types/test-result.js";

const run = (id: string): TestRunResult =>
  ({ runId: id, testCases: [], startedAtMs: 0, finishedAtMs: 1, durationMs: 1, projectRoot: "/r" } as unknown as TestRunResult);

/** A run with the given status tally. */
const runWith = (statuses: string[]): TestRunResult =>
  ({
    runId: "r",
    testCases: statuses.map((status, i) => ({ id: `t${i}`, status })),
    startedAtMs: 0,
    finishedAtMs: 1,
    durationMs: 1,
    projectRoot: "/r",
  } as unknown as TestRunResult);

describe("advanceState", () => {
  it("pins the session baseline on the first run", () => {
    const s = advanceState(initialRunState, run("a"));
    expect(s.sessionBaseline?.runId).toBe("a");
    expect(s.current?.runId).toBe("a");
    expect(s.previous).toBeNull();
    expect(s.runCount).toBe(1);
  });

  it("shifts previous/current forward but keeps the baseline pinned", () => {
    let s = advanceState(initialRunState, run("a"));
    s = advanceState(s, run("b"));
    s = advanceState(s, run("c"));
    expect(s.sessionBaseline?.runId).toBe("a"); // still the first run
    expect(s.previous?.runId).toBe("b");
    expect(s.current?.runId).toBe("c");
    expect(s.runCount).toBe(3);
  });

  it("is pure — does not mutate the prior state", () => {
    const first = advanceState(initialRunState, run("a"));
    const snapshot = { ...first };
    advanceState(first, run("b"));
    expect(first).toEqual(snapshot);
  });
});

describe("summarizeRun", () => {
  it("tallies scenarios by status", () => {
    const s = summarizeRun(runWith(["passed", "passed", "failed", "skipped"]));
    expect(s).toEqual({ total: 4, passed: 2, failed: 1, skipped: 1, pending: 0 });
  });

  it("returns zeros for a null run", () => {
    expect(summarizeRun(null)).toEqual({ total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 });
  });
});

describe("trajectorySummary", () => {
  it("has no deltas until two runs exist", () => {
    const s = trajectorySummary(advanceState(initialRunState, runWith(["passed"])));
    expect(s.session).toBeNull();
    expect(s.iteration).toBeNull();
    expect(s.current.passed).toBe(1);
  });

  it("computes session + iteration count deltas after a second run", () => {
    let st = advanceState(initialRunState, runWith(["failed", "failed", "passed"])); // baseline: 1 passed, 2 failed
    st = advanceState(st, runWith(["passed", "passed", "passed"])); // current: 3 passed
    const s = trajectorySummary(st);
    expect(s.runCount).toBe(2);
    expect(s.session?.diff.passed).toBe(2); // 3 - 1
    expect(s.session?.diff.failed).toBe(-2); // 0 - 2
    expect(s.iteration?.diff.passed).toBe(2); // previous === baseline here
  });
});
