/**
 * Build one run from the per-file reports.
 *
 * Each test source file owns a report; the combined view people read is derived
 * from those, explicitly. That keeps the storage model and the presentation
 * model separate: running one test file replaces one report, and any aggregate
 * is a pure function over whatever reports exist at the time.
 *
 * Deriving rather than accumulating is the point. There is no state here to get
 * out of step with the files on disk, because the files on disk are the state.
 */
import path from "node:path";

import type {
  FeatureDeclaration,
  TestCaseResult,
  TestRunResult,
} from "executable-stories-core/types/test-result";

export interface AggregateDeps {
  readFile: (filePath: string) => string;
  listDir: (dir: string) => string[] | undefined;
  logger: { warn(msg: string): void };
}

export interface AggregateResult {
  run: TestRunResult;
  /** How many per-file reports went into it. */
  files: number;
  /** Reports that could not be parsed. Named, never silently skipped. */
  unreadable: string[];
  /** Scenario ids claimed by more than one report. */
  duplicateIds: string[];
}

/** Files this treats as a per-file report. */
function isReportFile(name: string): boolean {
  return name.endsWith(".json");
}

/**
 * Read every per-file report in `dir` and combine them into one run.
 *
 * Returns undefined when the directory holds no reports, so a caller can tell
 * "nothing here yet" from "here is an empty run".
 */
export function aggregateReports(
  args: { dir: string },
  deps: AggregateDeps
): AggregateResult | undefined {
  const names = (deps.listDir(args.dir) ?? []).filter(isReportFile);
  if (names.length === 0) return undefined;

  const runs: TestRunResult[] = [];
  const unreadable: string[] = [];

  for (const name of [...names].sort()) {
    const filePath = path.posix.join(args.dir, name);
    try {
      const parsed = JSON.parse(deps.readFile(filePath)) as TestRunResult;
      if (!Array.isArray(parsed?.testCases)) throw new Error("no testCases");
      runs.push(parsed);
    } catch {
      // One unreadable report must not take the aggregate down with it, but it
      // must not vanish either: the reader needs to know their view is partial.
      unreadable.push(filePath);
      deps.logger.warn(
        `Ignoring unreadable report ${filePath}; the combined report is missing whatever it held.`
      );
    }
  }

  if (runs.length === 0 && unreadable.length === 0) return undefined;

  const testCases: TestCaseResult[] = [];
  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];

  // Sorted by source file so the same reports always produce the same document,
  // whatever order the filesystem hands them back.
  const ordered = runs
    .flatMap((run) => run.testCases)
    .sort(
      (a, b) => a.sourceFile.localeCompare(b.sourceFile) || a.id.localeCompare(b.id)
    );

  for (const testCase of ordered) {
    if (seenIds.has(testCase.id)) {
      duplicateIds.push(testCase.id);
      continue;
    }
    seenIds.add(testCase.id);
    testCases.push(testCase);
  }

  if (duplicateIds.length > 0) {
    deps.logger.warn(
      `${duplicateIds.length} scenario id(s) claimed by more than one report; keeping the first of each: ${duplicateIds.join(", ")}`
    );
  }

  const features: FeatureDeclaration[] = [];
  const seenFeatureFiles = new Set<string>();
  for (const run of runs) {
    for (const feature of run.features ?? []) {
      if (seenFeatureFiles.has(feature.sourceFile)) continue;
      seenFeatureFiles.add(feature.sourceFile);
      features.push(feature);
    }
  }
  features.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));

  // The aggregate spans its inputs rather than claiming a single moment: these
  // reports were produced by different runs at different times.
  const starts = runs.map((r) => r.startedAtMs).filter((n) => typeof n === "number" && n > 0);
  const finishes = runs.map((r) => r.finishedAtMs).filter((n) => typeof n === "number" && n > 0);
  const startedAtMs = starts.length > 0 ? Math.min(...starts) : 0;
  const finishedAtMs = finishes.length > 0 ? Math.max(...finishes) : startedAtMs;

  const newest = runs.reduce<TestRunResult | undefined>(
    (best, run) => (!best || run.finishedAtMs > best.finishedAtMs ? run : best),
    undefined
  );

  const run: TestRunResult = {
    testCases,
    ...(features.length > 0 ? { features } : {}),
    startedAtMs,
    finishedAtMs,
    durationMs: Math.max(0, finishedAtMs - startedAtMs),
    projectRoot: newest?.projectRoot ?? runs[0]?.projectRoot ?? "",
    runId: newest?.runId ?? "aggregate",
    ...(newest?.packageVersion ? { packageVersion: newest.packageVersion } : {}),
    ...(newest?.gitSha ? { gitSha: newest.gitSha } : {}),
    ...(newest?.ci ? { ci: newest.ci } : {}),
  };

  return { run, files: runs.length, unreadable, duplicateIds };
}
