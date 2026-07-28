/**
 * Journey-level run history — "Checkout journey: 7/10 recent runs passed,
 * flaky" on the journey pages.
 *
 * Reads the same history store the CLI's `--history-file` maintains (version 1,
 * scenario-keyed) and folds member-scenario entries up to the journey: a
 * journey failed a run when ANY member failed it. Flakiness uses the same
 * status-transition classification as the CLI history module and the report
 * island (`flakinessOf`) — keep the thresholds in sync.
 *
 * Store entries are keyed by canonical test-case id, which the collection
 * entries don't carry, so members are matched by scenario title (narrowed by
 * source file when two tests share a title).
 */
import fs from "node:fs";
import path from "node:path";

/** One run's entry for one test, as the CLI history store records it. */
export interface HistoryEntryLike {
  runId: string;
  timestamp: number;
  status: "passed" | "failed" | "skipped" | "pending";
}

interface TestHistoryLike {
  testName: string;
  sourceFile: string;
  entries: HistoryEntryLike[];
}

export type JourneyFlakiness = "stable" | "unstable" | "flaky";

/** One journey-level run: failed when any member failed that run. */
export interface JourneyRunEvent {
  runId: string;
  timestamp: number;
  status: "passed" | "failed";
}

export interface JourneyHistorySummary {
  /** Oldest → newest, one event per run any member reported into. */
  runs: JourneyRunEvent[];
  passed: number;
  total: number;
  level: JourneyFlakiness;
}

/** Mirrors MIN_FLAKINESS_SAMPLES in the formatters history module. */
const MIN_SAMPLES = 3;

/** Same transition-score classification as the CLI/report scenario flakiness. */
function classify(runs: JourneyRunEvent[]): JourneyFlakiness {
  if (runs.length < MIN_SAMPLES) return "stable";
  let transitions = 0;
  for (let i = 1; i < runs.length; i++) {
    if (runs[i]!.status !== runs[i - 1]!.status) transitions++;
  }
  const transitionScore = transitions / (runs.length - 1);
  const failureRate = runs.filter((r) => r.status === "failed").length / runs.length;
  if (transitionScore > 0.5 || (transitionScore > 0.3 && failureRate > 0.2)) return "flaky";
  if (transitionScore > 0.2 || failureRate > 0.3) return "unstable";
  return "stable";
}

/**
 * Fold member histories into journey-level runs. Only pass/fail entries count
 * (a skipped member says nothing about the journey). Returns undefined until
 * there are two runs to talk about — a single data point is not a trend.
 */
export function aggregateJourneyHistory(
  memberEntries: HistoryEntryLike[][],
): JourneyHistorySummary | undefined {
  const byRun = new Map<string, { timestamp: number; failed: boolean }>();
  for (const entries of memberEntries) {
    for (const entry of entries) {
      if (entry.status !== "passed" && entry.status !== "failed") continue;
      const run = byRun.get(entry.runId) ?? { timestamp: entry.timestamp, failed: false };
      run.timestamp = Math.min(run.timestamp, entry.timestamp);
      run.failed = run.failed || entry.status === "failed";
      byRun.set(entry.runId, run);
    }
  }
  const runs: JourneyRunEvent[] = [...byRun.entries()]
    .map(([runId, r]) => ({ runId, timestamp: r.timestamp, status: r.failed ? ("failed" as const) : ("passed" as const) }))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (runs.length < 2) return undefined;
  return {
    runs,
    passed: runs.filter((r) => r.status === "passed").length,
    total: runs.length,
    level: classify(runs),
  };
}

/**
 * Parse a version-1 history store; undefined for anything unreadable. The file
 * is external input, so malformed per-test values (null, missing entries) are
 * dropped here rather than trusted by every consumer.
 */
export function readHistoryStore(absPath: string): Record<string, TestHistoryLike> | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const store = parsed as { version?: unknown; tests?: unknown };
  if (store.version !== 1 || typeof store.tests !== "object" || store.tests === null) return undefined;
  const tests: Record<string, TestHistoryLike> = {};
  for (const [key, value] of Object.entries(store.tests as Record<string, unknown>)) {
    const t = value as TestHistoryLike | null;
    if (t && typeof t === "object" && typeof t.testName === "string" && Array.isArray(t.entries)) {
      tests[key] = { ...t, entries: t.entries.filter((e) => e && typeof e === "object") };
    }
  }
  return tests;
}

/** Member shape the matcher needs (StoryEntryData satisfies it). */
export interface JourneyMemberLike {
  title: string;
  feature?: { sourceFile: string };
}

/** Find a member's history by title, narrowed by source-file suffix on a tie. */
export function matchMemberHistory(
  member: JourneyMemberLike,
  tests: Record<string, TestHistoryLike>,
): TestHistoryLike | undefined {
  const candidates = Object.values(tests).filter((t) => t.testName === member.title);
  if (candidates.length <= 1) return candidates[0];
  const sourceFile = member.feature?.sourceFile;
  if (!sourceFile) return candidates[0];
  return (
    candidates.find(
      (t) =>
        typeof t.sourceFile === "string" &&
        (t.sourceFile.endsWith(sourceFile) || sourceFile.endsWith(t.sourceFile)),
    ) ?? candidates[0]
  );
}

/**
 * The journey pages' entry point: read the configured history store (if any)
 * and summarise the journey's recent runs. Undefined whenever there's nothing
 * trustworthy to show — no file configured, unreadable store, no matching
 * members, or fewer than two recorded runs.
 */
export function journeyRunHistory(args: {
  historyFile: string | null | undefined;
  scenarios: JourneyMemberLike[];
}): JourneyHistorySummary | undefined {
  if (!args.historyFile) return undefined;
  const tests = readHistoryStore(path.resolve(args.historyFile));
  if (!tests) return undefined;
  const memberEntries = args.scenarios
    .map((member) => matchMemberHistory(member, tests)?.entries)
    .filter((entries): entries is HistoryEntryLike[] => entries !== undefined);
  if (memberEntries.length === 0) return undefined;
  return aggregateJourneyHistory(memberEntries);
}
