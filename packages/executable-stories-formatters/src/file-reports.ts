/**
 * One report per test source file.
 *
 * A test run reports only what it ran. `vitest run one-file`, `vitest -t "one
 * scenario"` and the MCP `run_scenario` tool all cover a fraction of the suite,
 * so rendering a run directly would drop every scenario it skipped out of the
 * docs.
 *
 * So the unit of storage is the test source file, not the run: each one owns a
 * canonical report, and running a file rewrites that report and leaves the rest
 * alone. One writer per file, nothing merged across files, and nothing hidden —
 * these are ordinary reports you can list, read and delete. Combined views are
 * derived from them (see aggregate-reports), never accumulated into a store
 * that could fall out of step with what is on disk.
 *
 * Retiring anything is the one destructive act here, so it takes certainty: only
 * a run that positively determined it covered a whole file may drop that file's
 * scenarios, and it says so in the log when it does.
 */
import path from "node:path";
import * as fsPromises from "node:fs/promises";

import type {
  FeatureDeclaration,
  RunScope,
  TestCaseResult,
  TestRunResult,
} from "executable-stories-core/types/test-result";

/**
 * Directory under `outputDir` holding one canonical run per test source file.
 *
 * Visible on purpose. These are reports, not hidden state: you can list them,
 * read one, delete one, and the effect is obvious. The alternative — a hidden
 * merge database whose contents change what the aggregate says — makes "why is
 * this scenario still here" unanswerable without knowing a secret.
 */
export const BY_FILE_DIR = "by-file";

export interface FileReportDeps {
  readFile: (filePath: string) => string;
  listDir: (dir: string) => string[] | undefined;
  fileExists: (filePath: string) => boolean;
  writeFile: (filePath: string, contents: string) => Promise<void>;
  removeFile: (filePath: string) => Promise<void>;
  logger: { warn(msg: string): void };
}

/**
 * What one file's report holds: a complete canonical run covering a single
 * source file. Shaping it as a run rather than a bespoke envelope means anything
 * that already reads a run JSON reads one of these too — the Astro loader points
 * straight at the directory with no special-casing.
 */
type FileReport = TestRunResult;

/** The source file a report covers. Every case in it shares one. */
function reportSourceFile(report: FileReport): string | undefined {
  return report.testCases[0]?.sourceFile;
}

/**
 * Report filename for a source file: the flattened path, the test extension
 * stripped, and a short digest of the full path — `src/pay.story.test.ts`
 * becomes `src-pay-1a2b3c.story-report.json`.
 *
 * The digest is always there rather than only on collision. Adding it lazily
 * made ownership depend on history: two paths that flatten alike would share a
 * name until one existed, and deleting the first owner left the second writing
 * a fresh plain-named file while its digested one lingered, unreachable by
 * pruning. Always digesting makes a source file's report name a pure function
 * of its path.
 */
export function reportFileNameFor(sourceFile: string): string {
  const stem = toPosix(sourceFile)
    .replace(/\.(story\.)?(test|spec)\.[cm]?[jt]sx?$/i, "")
    .replace(/\.[^/.]+$/, "")
    .replace(/\//g, "-");
  return `${stem}-${shortDigest(sourceFile)}.story-report.json`;
}

/** Stable short digest, used only to separate two files that flatten alike. */
function shortDigest(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  return hash.toString(36).slice(0, 6);
}

/** Posix-normalise a path. */
function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

export function byFileDirFor(outputDir: string): string {
  return path.posix.join(outputDir.replace(/\\/g, "/"), BY_FILE_DIR);
}

/** Read every report in the directory. An unreadable one is skipped, not fatal. */
function readFileReports(dir: string, deps: FileReportDeps): FileReport[] {
  const names = deps.listDir(dir);
  if (!names) return [];

  const reports: FileReport[] = [];
  for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
    const filePath = path.posix.join(dir, name);
    try {
      const parsed = JSON.parse(deps.readFile(filePath)) as FileReport;
      if (Array.isArray(parsed?.testCases) && reportSourceFile(parsed)) {
        reports.push(parsed);
      }
    } catch {
      // A corrupt report must not take the rest down with it: the run in hand
      // is still renderable, and the next run of that file rewrites it.
      deps.logger.warn(`Ignoring unreadable report: ${filePath}`);
    }
  }
  return reports;
}

/**
 * Fold this run into the stored per-file reports and return the run as it now
 * stands across every source file seen so far.
 *
 * Scenarios this run produced win over the stored copies of the same id.
 * Scenarios in a report that this run did not produce are kept as they were.
 */
export async function updateFileReports(
  args: { run: TestRunResult; outputDir: string },
  deps: FileReportDeps
): Promise<TestRunResult> {
  const dir = byFileDirFor(args.outputDir);

  // Stamp before storing. A report outlives the run that wrote it, so without
  // this a result carried forward would look as fresh as the run rendering it.
  const bySource = new Map<string, TestCaseResult[]>();
  for (const testCase of args.run.testCases) {
    const stamped: TestCaseResult = {
      ...testCase,
      lastRunAtMs: args.run.finishedAtMs,
      ...(args.run.gitSha ? { lastRunGitSha: args.run.gitSha } : {}),
    };
    const existing = bySource.get(stamped.sourceFile);
    if (existing) existing.push(stamped);
    else bySource.set(stamped.sourceFile, [stamped]);
  }

  // A file the run covered but that produced nothing still has to be visited,
  // or its previous scenarios outlive their deletion.
  for (const sourceFile of args.run.coveredSourceFiles ?? []) {
    if (!bySource.has(sourceFile)) bySource.set(sourceFile, []);
  }

  const stored = new Map(
    readFileReports(dir, deps).map((report) => [reportSourceFile(report)!, report])
  );

  // Same as the report writes: create the directory before writing into it.
  // Skipped for an empty run so a read-only render never makes a directory.
  if (bySource.size > 0) await fsPromises.mkdir(dir, { recursive: true });

  const scope = args.run.runScope;
  // A file whose collection broke cannot speak for itself, whatever the rest of
  // the run managed. Retiring its scenarios would delete documentation because
  // a hook threw.
  const incomplete = new Set(args.run.incompleteSourceFiles ?? []);

  for (const [sourceFile, testCases] of bySource) {
    const previous = stored.get(sourceFile)?.testCases ?? [];
    const reported = new Set(testCases.map((tc) => tc.id));
    const unreported = previous.filter((tc) => !reported.has(tc.id));

    // Only a run that positively claims full coverage of its files may retire a
    // scenario. Anything less keeps what it did not report, because deleting on
    // a guess is destructive and silent while keeping on a guess is merely
    // stale and visible.
    const retires = scope === "full" && !incomplete.has(sourceFile);
    const merged = new Map(
      retires ? [] : previous.map((tc) => [tc.id, tc] as const)
    );
    for (const testCase of testCases) merged.set(testCase.id, testCase);

    if (unreported.length > 0) warnAboutUnreported(
      { sourceFile, unreported, scope, incomplete: incomplete.has(sourceFile) },
      deps
    );

    // Sorting by id makes a report's bytes a function of its contents alone, so
    // an unchanged file rewrites to an identical report.
    const declared = args.run.features?.find((f) => f.sourceFile === sourceFile);
    // A declaration follows the same rule as a scenario: only a run that claims
    // the whole file may drop one. A filtered run never mentioned the file's
    // declaration, so it is in no position to say it is gone.
    const kept = declared ?? (retires ? undefined : stored.get(sourceFile)?.features?.[0]);
    const report: FileReport = {
      ...args.run,
      testCases: [...merged.values()].sort((a, b) => a.id.localeCompare(b.id)),
      ...(kept ? { features: [kept] } : { features: undefined }),
    };
    // An emptied report has nothing to own it and nothing to say; remove it
    // rather than leave a file claiming a suite that no longer has scenarios.
    if (report.testCases.length === 0) {
      stored.delete(sourceFile);
      await removeReportsFor({ dir, sourceFile }, deps);
      continue;
    }

    stored.set(sourceFile, report);
    await removeOtherReportsFor(
      { dir, sourceFile, keep: reportFileNameFor(sourceFile) },
      deps
    );
    await deps.writeFile(
      path.posix.join(dir, reportFileNameFor(sourceFile)),
      `${JSON.stringify(report, null, 2)}\n`
    );
  }

  for (const sourceFile of prunable(
    { stored: [...stored.keys()], ran: [...bySource.keys()], projectRoot: args.run.projectRoot },
    deps
  )) {
    stored.delete(sourceFile);
    await removeReportsFor({ dir, sourceFile }, deps);
  }

  const sourceFiles = [...stored.keys()].sort();
  const testCases = sourceFiles.flatMap(
    (sourceFile) => stored.get(sourceFile)?.testCases ?? []
  );
  // Declarations are per source file, so they accumulate exactly as scenarios
  // do. Without this a filtered run strips every other file's feature heading
  // and narrative out of the docs.
  const features = sourceFiles
    .flatMap((sourceFile) => stored.get(sourceFile)?.features ?? [])
    .filter((f): f is FeatureDeclaration => f !== undefined);

  return {
    ...args.run,
    testCases,
    ...(features.length > 0 ? { features } : {}),
  };
}

/**
 * Delete any other file in the directory that claims this source file.
 *
 * One test file owns one report. A second claiming the same file — left behind
 * by an older naming scheme, or copied by hand — would be counted again by
 * everything that reads the directory whole.
 */
async function removeReportsFor(
  args: { dir: string; sourceFile: string },
  deps: FileReportDeps
): Promise<void> {
  return removeOtherReportsFor({ ...args, keep: undefined }, deps);
}

async function removeOtherReportsFor(
  args: { dir: string; sourceFile: string; keep?: string },
  deps: FileReportDeps
): Promise<void> {
  for (const name of deps.listDir(args.dir) ?? []) {
    if (!name.endsWith(".json") || name === args.keep) continue;
    const filePath = path.posix.join(args.dir, name);
    try {
      const other = JSON.parse(deps.readFile(filePath)) as FileReport;
      if (reportSourceFile(other) !== args.sourceFile) continue;
    } catch {
      continue; // Unreadable: leave it alone and let the reader report it.
    }
    if (args.keep) {
      deps.logger.warn(
        `Removing ${filePath}: ${args.sourceFile} already has a report at ${args.keep}.`
      );
    }
    await deps.removeFile(filePath);
  }
}

/**
 * Say what happened to scenarios a run did not report.
 *
 * Removal is the one destructive act in the pipeline, so it leaves evidence
 * naming the file and every scenario dropped: an adapter that wrongly claims
 * full coverage then shows up in the log instead of quietly shrinking the docs.
 * Unknown scope keeps them and says so, which is how incomplete detection fails
 * stale rather than destructive.
 */
function warnAboutUnreported(
  args: {
    sourceFile: string;
    unreported: TestCaseResult[];
    scope?: RunScope;
    incomplete: boolean;
  },
  deps: FileReportDeps
): void {
  const { sourceFile, unreported, scope, incomplete } = args;
  if (scope === "filtered") return; // Expected: the run said it saw only part of the file.

  const names = unreported
    .map((tc) => tc.story.scenario?.trim() || tc.id)
    .sort()
    .join(", ");
  const count = `${unreported.length} previously recorded scenario${unreported.length === 1 ? "" : "s"}`;

  if (incomplete) {
    deps.logger.warn(
      `Run for ${sourceFile} could not collect its scenarios in full, so ${count} ` +
        `were kept rather than retired. Fix the failure and rerun to confirm they are gone: ${names}`
    );
    return;
  }

  if (scope === "full") {
    deps.logger.warn(
      `Authoritative run for ${sourceFile} omitted ${count}; removing them from the accumulated report: ${names}`
    );
    return;
  }

  deps.logger.warn(
    `Run for ${sourceFile} did not report ${count} and did not state its scope; keeping them. ` +
      `If this run covered the whole file they are stale: ${names}`
  );
}

/**
 * Shards whose test file is gone from the working tree. Deleting a test deletes
 * its scenarios, otherwise a renamed file shows up twice and a removed feature
 * documents itself forever.
 *
 * Guarded on the run's own files resolving on disk first. A run whose
 * `projectRoot` does not line up with the recorded source paths makes every
 * lookup miss, and pruning on that would wipe the accumulated history instead
 * of the one file the author actually deleted.
 */
function prunable(
  args: { stored: string[]; ran: string[]; projectRoot: string },
  deps: FileReportDeps
): string[] {
  const resolve = (sourceFile: string) =>
    path.resolve(args.projectRoot, sourceFile);

  const canResolveSources = args.ran.some((sourceFile) =>
    deps.fileExists(resolve(sourceFile))
  );
  if (!canResolveSources) return [];

  const ran = new Set(args.ran);
  return args.stored.filter(
    (sourceFile) => !ran.has(sourceFile) && !deps.fileExists(resolve(sourceFile))
  );
}
