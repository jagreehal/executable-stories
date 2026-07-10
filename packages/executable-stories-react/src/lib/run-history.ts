export type ScenarioRunStatus = "passed" | "failed" | "skipped" | "pending";

/** One historical run of a scenario, oldest → newest in a history array. */
export interface ScenarioRunEvent {
  /** Epoch ms the run started. */
  timestamp: number;
  status: ScenarioRunStatus;
  runId?: string;
  durationMs?: number;
  commitSha?: string;
  branch?: string;
}

/** Recent run events keyed by ReportScenario.id. */
export type ScenarioHistoryMap = Record<string, ScenarioRunEvent[]>;

export interface RunStreak {
  status: ScenarioRunStatus;
  /** How many consecutive trailing runs share that status (≥1). */
  count: number;
}

/** The trailing same-status streak — "passing for 5 runs", "failing for 2". */
export function currentStreak(entries: readonly ScenarioRunEvent[]): RunStreak | undefined {
  const last = entries[entries.length - 1];
  if (!last) return undefined;
  let count = 0;
  for (let i = entries.length - 1; i >= 0 && entries[i]!.status === last.status; i--) count++;
  return { status: last.status, count };
}

const STREAK_VERB: Record<ScenarioRunStatus, string> = {
  passed: "Passing",
  failed: "Failing",
  skipped: "Skipped",
  pending: "Pending",
};

/** Short human summary of a history window, used for the strip's tooltip. */
export function describeRunHistory(entries: readonly ScenarioRunEvent[]): string {
  const passed = entries.filter((e) => e.status === "passed").length;
  const base = `${passed}/${entries.length} runs passed`;
  const streak = currentStreak(entries);
  if (!streak || entries.length < 2) return base;
  return `${base} · ${STREAK_VERB[streak.status]} for the last ${streak.count === 1 ? "run" : `${streak.count} runs`}`;
}

export type FlakinessLevel = "stable" | "unstable" | "flaky";

/**
 * Below this many pass/fail samples a scenario is always "stable" — mirrors
 * MIN_FLAKINESS_SAMPLES in the formatters history module, which owns the
 * canonical thresholds. Keep the two in sync.
 */
const MIN_FLAKINESS_SAMPLES = 3;

/**
 * Status-transition flakiness over a scenario's recent runs. Same
 * classification as the CLI history module (`calculateFlakiness`), ported so
 * the island stays self-sufficient on the embedded history JSON.
 */
export function flakinessOf(entries: readonly ScenarioRunEvent[]): FlakinessLevel {
  const countable = entries.filter((e) => e.status === "passed" || e.status === "failed");
  if (countable.length < MIN_FLAKINESS_SAMPLES) return "stable";

  let transitions = 0;
  for (let i = 1; i < countable.length; i++) {
    if (countable[i]!.status !== countable[i - 1]!.status) transitions++;
  }
  const transitionScore = transitions / (countable.length - 1);
  const failureRate = countable.filter((e) => e.status === "failed").length / countable.length;

  if (transitionScore > 0.5 || (transitionScore > 0.3 && failureRate > 0.2)) return "flaky";
  if (transitionScore > 0.2 || failureRate > 0.3) return "unstable";
  return "stable";
}

export interface ScenarioRef {
  id: string;
  title: string;
}

export interface LastRunDelta {
  /** Failed in this run, not failed in the previous one. */
  newlyFailing: ScenarioRef[];
  /** Passed in this run, failed in the previous one. */
  newlyPassing: ScenarioRef[];
  /** First appearance in the history window — no previous run to compare. */
  added: ScenarioRef[];
}

/**
 * What changed between the previous run and this one, for the report-header
 * strip. The history store appends the current run before the report is
 * generated, so each scenario's last entry IS this run and the entry before
 * it is the previous run. Returns undefined when no scenario has a previous
 * run to compare against (first run with history enabled).
 */
export function diffSinceLastRun(
  history: ScenarioHistoryMap,
  scenarios: readonly ScenarioRef[],
): LastRunDelta | undefined {
  let hasPreviousRun = false;
  const delta: LastRunDelta = { newlyFailing: [], newlyPassing: [], added: [] };

  for (const scenario of scenarios) {
    const entries = history[scenario.id];
    if (!entries || entries.length === 0) continue;
    const last = entries[entries.length - 1]!;
    const prev = entries[entries.length - 2];
    if (!prev) {
      delta.added.push(scenario);
      continue;
    }
    hasPreviousRun = true;
    if (last.status === "failed" && prev.status !== "failed") delta.newlyFailing.push(scenario);
    else if (last.status === "passed" && prev.status === "failed") delta.newlyPassing.push(scenario);
  }

  return hasPreviousRun ? delta : undefined;
}
