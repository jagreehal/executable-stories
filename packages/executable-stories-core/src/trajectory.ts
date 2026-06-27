/**
 * Session trajectory primitive — the valuable part of the old `serve.ts`.
 *
 * Pins a session baseline (the first run observed) and folds each subsequent run
 * forward, so a docs/agent loop can show "how this run compares to where the
 * session started" rather than just the noise between adjacent runs. Pure (no
 * I/O, no diff engine) so it lives in core and is consumable by the Astro
 * integration and the CLI alike. Diffing the runs is layered on top by the
 * consumer (the diff engine lives in the formatters package).
 */
import type { TestRunResult } from "./types/test-result.js";

/**
 * The realtime state a live view renders. The session baseline is pinned to the
 * first run observed after boot, so the headline tracks the whole loop's
 * trajectory rather than the noise between any two adjacent iterations.
 */
export interface RunState {
  /** First run observed this session — the trajectory anchor. */
  sessionBaseline: TestRunResult | null;
  /** The run immediately before {@link RunState.current} — the per-iteration anchor. */
  previous: TestRunResult | null;
  /** Latest run. */
  current: TestRunResult | null;
  /** How many runs have been observed since boot. */
  runCount: number;
}

/** The empty state before any run has been observed. */
export const initialRunState: RunState = {
  sessionBaseline: null,
  previous: null,
  current: null,
  runCount: 0,
};

/**
 * Fold a freshly-read run into the prior state. The first run pins the session
 * baseline; later runs shift `previous`/`current` forward. Pure.
 */
export function advanceState(prev: RunState, run: TestRunResult): RunState {
  if (prev.sessionBaseline === null) {
    return { sessionBaseline: run, previous: null, current: run, runCount: 1 };
  }
  return {
    sessionBaseline: prev.sessionBaseline,
    previous: prev.current,
    current: run,
    runCount: prev.runCount + 1,
  };
}

/** Scenario counts by status for one run. */
export interface RunSummaryCounts {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
}

/** Count scenarios by status. Pure; no diff engine — just tallies the run. */
export function summarizeRun(run: TestRunResult | null): RunSummaryCounts {
  const counts: RunSummaryCounts = { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 };
  if (!run) return counts;
  for (const tc of run.testCases) {
    counts.total += 1;
    const status = tc.status;
    if (status === "passed") counts.passed += 1;
    else if (status === "failed") counts.failed += 1;
    else if (status === "skipped") counts.skipped += 1;
    else if (status === "pending") counts.pending += 1;
  }
  return counts;
}

/** A count-level delta between two runs (current minus reference). */
export interface TrajectoryDelta {
  current: RunSummaryCounts;
  reference: RunSummaryCounts;
  /** current.passed - reference.passed, etc. */
  diff: RunSummaryCounts;
}

/** Compute a count-level delta (current minus reference). */
export function diffCounts(current: RunSummaryCounts, reference: RunSummaryCounts): TrajectoryDelta {
  return {
    current,
    reference,
    diff: {
      total: current.total - reference.total,
      passed: current.passed - reference.passed,
      failed: current.failed - reference.failed,
      skipped: current.skipped - reference.skipped,
      pending: current.pending - reference.pending,
    },
  };
}

/** The two count-deltas a live view shows: versus the session baseline, and versus the previous run. */
export interface TrajectorySummary {
  runCount: number;
  /** Current run vs the session's first run (the loop's trajectory). Null until ≥2 runs. */
  session: TrajectoryDelta | null;
  /** Current run vs the immediately-previous run (the last iteration). Null until ≥2 runs. */
  iteration: TrajectoryDelta | null;
  current: RunSummaryCounts;
}

/**
 * The single source of truth for trajectory count math: derive the
 * session/iteration deltas from already-tallied counts. Every consumer folds
 * its own run history into counts (the {@link RunState} fold below;
 * the MCP package's `StoryReport` fold) and then calls this. Both deltas are
 * null until there are two runs to compare. Count-based — no behaviour diff
 * engine (that lives in the formatters package).
 */
export function summarizeCountsTrajectory(input: {
  runCount: number;
  current: RunSummaryCounts;
  baseline: RunSummaryCounts | null;
  previous: RunSummaryCounts | null;
}): TrajectorySummary {
  const { runCount, current, baseline, previous } = input;
  if (runCount <= 1 || baseline === null) {
    return { runCount, current, session: null, iteration: null };
  }
  return {
    runCount,
    current,
    session: diffCounts(current, baseline),
    iteration: previous ? diffCounts(current, previous) : null,
  };
}

/**
 * Derive count-level session/iteration deltas from a {@link RunState} history —
 * enough to drive a live "passed N → M since you started" headline.
 */
export function trajectorySummary(state: RunState): TrajectorySummary {
  return summarizeCountsTrajectory({
    runCount: state.runCount,
    current: summarizeRun(state.current),
    baseline: state.sessionBaseline ? summarizeRun(state.sessionBaseline) : null,
    previous: state.previous ? summarizeRun(state.previous) : null,
  });
}
