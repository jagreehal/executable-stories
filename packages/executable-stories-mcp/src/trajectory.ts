/**
 * Session trajectory for the agent loop — "passed N → M since you started".
 *
 * The count math (deltas, the "null until ≥2 runs" rule) lives in
 * `executable-stories-core` and is shared with the CLI/Astro trajectory. What's
 * specific to the MCP observe surface — and lives here — is the fold over
 * `StoryReport`s, keyed on the run's identity AND its counts so re-reading an
 * unchanged report is idempotent: an agent can call `get_trajectory` as often
 * as it likes without advancing the loop. It advances both when a new full run
 * lands (new `runId`) and when a focused `run_scenario` refresh changes the
 * counts under the same `runId` (the fix loop making progress); an unchanged
 * re-read of either does nothing.
 */
import {
  summarizeCountsTrajectory,
  type RunSummaryCounts,
  type TrajectorySummary,
} from "executable-stories-core";

/** Scenario counts by status for one run (core's canonical count shape). */
export type RunCounts = RunSummaryCounts;
export type { TrajectorySummary };

/** One observed run, identified by its StoryReport `runId`. */
export interface TrajectorySnapshot {
  runId: string;
  gitSha?: string;
  finishedAtMs: number;
  counts: RunCounts;
}

/**
 * The folded session state. `baseline` is pinned to the first run observed this
 * session (the loop anchor); `previous`/`current` shift forward each new run.
 */
export interface TrajectoryState {
  baseline: TrajectorySnapshot | null;
  previous: TrajectorySnapshot | null;
  current: TrajectorySnapshot | null;
  runCount: number;
}

export const emptyTrajectoryState: TrajectoryState = {
  baseline: null,
  previous: null,
  current: null,
  runCount: 0,
};

/** Two snapshots represent the same observed state (same run, same counts). */
function sameObservedState(a: TrajectorySnapshot, b: TrajectorySnapshot): boolean {
  return (
    a.runId === b.runId &&
    a.counts.total === b.counts.total &&
    a.counts.passed === b.counts.passed &&
    a.counts.failed === b.counts.failed &&
    a.counts.skipped === b.counts.skipped &&
    a.counts.pending === b.counts.pending
  );
}

/**
 * Fold a freshly-read snapshot into the prior state. Idempotent on the observed
 * state (runId + counts): re-reading an unchanged report is ignored and does not
 * inflate `runCount`. A new `runId` (full run) or changed counts under the same
 * `runId` (focused refresh) advances. The first distinct state pins the baseline.
 */
export function advanceTrajectory(
  prev: TrajectoryState,
  snapshot: TrajectorySnapshot,
): TrajectoryState {
  if (prev.current && sameObservedState(prev.current, snapshot)) return prev;
  if (prev.baseline === null) {
    return { baseline: snapshot, previous: null, current: snapshot, runCount: 1 };
  }
  return {
    baseline: prev.baseline,
    previous: prev.current,
    current: snapshot,
    runCount: prev.runCount + 1,
  };
}

const zeroCounts: RunCounts = { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 };

/**
 * Derive the loop-facing session/iteration deltas from folded report state.
 * Projects the snapshots down to counts and defers the delta math to core's
 * shared {@link summarizeCountsTrajectory}, so the count semantics can't drift
 * from the CLI/Astro trajectory.
 */
export function reportTrajectorySummary(state: TrajectoryState): TrajectorySummary {
  return summarizeCountsTrajectory({
    runCount: state.runCount,
    current: state.current?.counts ?? zeroCounts,
    baseline: state.baseline?.counts ?? null,
    previous: state.previous?.counts ?? null,
  });
}
