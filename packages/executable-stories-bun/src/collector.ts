/**
 * Per-process collector for bun:test.
 *
 * bun:test has no reporter API, so the wrapped `test` records each test here
 * and the preload's global `afterAll` turns the records into a raw run.
 *
 * State lives on `globalThis` because tsup bundles a copy of this module into
 * both entries (index and preload), and both must see the same records. Under
 * `--isolate` / `--parallel` every file gets a fresh global and its own
 * `afterAll`, so each flush merges into the run file written by earlier files
 * of the same run instead of replacing it.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import type { RawRun, RawStatus, RawStepEvent, RawTestCase } from "executable-stories-core/types/raw";
import type { StoryMeta, StoryStep } from "executable-stories-core/types/story";

/** One `test(...)` registered through this package. */
export interface TestRecord {
  title: string;
  suitePath: string[];
  /** Absolute path of the file that called `test(...)`. */
  file: string;
  line: number;
  /** Set at registration for skip/todo, on settle for tests that ran. */
  status?: RawStatus;
  /** The body started. A non-skipped test that never ran was filtered out. */
  ran: boolean;
  story?: StoryMeta;
  stepCounter: number;
  /** The wrapped step whose body threw, until another step starts (the throw was caught). */
  failedStep?: StoryStep;
  error?: { message: string; stack?: string };
  durationMs?: number;
  /** Times the body has run: more than one when bun retried it. */
  attempts: number;
  /** The `retry` option the test was registered with. */
  retries: number;
  /** Ran concurrently and its body resolved; the flush confirms the pass. */
  concurrent?: true;
}

interface CollectorState {
  records: TestRecord[];
  startedAtMs: number;
  /** Matchers run since the current test's first beforeEach; reset by the preload. */
  assertions: number;
  /** What `expect.assertions(n)` / `expect.hasAssertions()` asked of the current test. */
  expected?: { count: number; exact: boolean };
  /** Preload beforeEach and afterEach runs: bun skips the afterEach once an earlier one throws. */
  hookRuns: { before: number; after: number };
  /** Some test called expect.assertions() or expect.hasAssertions(). */
  declaredAssertions: boolean;
}

const KEY = Symbol.for("executable-stories-bun.collector");

export function collector(): CollectorState {
  const g = globalThis as { [KEY]?: CollectorState };
  return (g[KEY] ??= {
    records: [],
    startedAtMs: Date.now(),
    assertions: 0,
    hookRuns: { before: 0, after: 0 },
    declaredAssertions: false,
  });
}

/** The written file: a RawRun plus the schema's run-level fields. */
export type RawRunFile = RawRun & {
  schemaVersion: 1;
  meta?: { adapter: "bun"; bunRunId: string };
};

/**
 * Identifies one `bun test` invocation across `--isolate` files (same pid) and
 * `--parallel` workers (same parent, flagged by BUN_TEST_WORKER_ID).
 */
function runId(): string {
  return String(process.env.BUN_TEST_WORKER_ID ? process.ppid : process.pid);
}

function toPosix(file: string, root: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

function gitSha(root: string): string | undefined {
  for (const key of ["GITHUB_SHA", "GIT_COMMIT", "CI_COMMIT_SHA"]) {
    if (process.env[key]) return process.env[key];
  }
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    })
      .toString()
      .trim() || undefined;
  } catch {
    return undefined;
  }
}

function packageVersion(root: string): string | undefined {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Markers don't wrap code, so the step running when the test threw is the last
 * one started. Saying so stops the formatter guessing from the error text.
 */
function failedStepEvents(story: StoryMeta, errorMessage?: string): RawStepEvent[] {
  const last = story.steps.length - 1;
  return story.steps.map((step, index) => ({
    index,
    stepId: step.id,
    status: index === last ? "fail" : "pass",
    ...(index === last && errorMessage ? { errorMessage } : {}),
  }));
}

/** Build this process's share of the run from its records. Pure apart from git/package lookups. */
export function buildRun(
  records: TestRecord[],
  args: {
    root: string;
    startedAtMs: number;
    /** No afterEach failed and no test declared an assertion count: concurrent passes stand. */
    concurrentConfirmed?: boolean;
  },
): RawRunFile {
  const { root } = args;
  let filtered = false;
  const testCases: RawTestCase[] = [];
  const incomplete = new Set<string>();

  for (const r of records) {
    const sourceFile = toPosix(r.file, root);
    if (!r.ran && r.status !== "skip" && r.status !== "todo") {
      // Registered but never run: `-t`, `.only`, or a hook that stopped it.
      filtered = true;
      continue;
    }
    // Ran but never settled: bun timed it out. A concurrent pass the flush cannot confirm is "unknown".
    const unconfirmed = r.concurrent && !args.concurrentConfirmed;
    const status: RawStatus = unconfirmed ? "unknown" : (r.status ?? "timeout");
    const error = unconfirmed
      ? { message: "ran concurrently in a run where an afterEach hook failed or a test declared expect.assertions(), so the result belongs to no single test" }
      : r.error;
    if (!r.story) {
      // A failure before `story.init()` hides a scenario; mark the file incomplete so it is not read as deleted.
      if (r.ran && status !== "pass") incomplete.add(sourceFile);
      if (r.ran) continue;
    }
    const story: StoryMeta = r.story ?? { scenario: r.title, steps: [], suitePath: r.suitePath.length ? r.suitePath : undefined };
    testCases.push({
      title: r.title,
      titlePath: [...r.suitePath, r.title],
      story,
      sourceFile,
      sourceLine: Math.max(1, r.line),
      status,
      durationMs: r.durationMs ?? 0,
      ...(error ? { error } : {}),
      ...(status === "fail" && story.steps.length ? { stepEvents: failedStepEvents(story, error?.message) } : {}),
      retry: Math.max(0, Math.min(r.attempts - 1, r.retries)),
      retries: r.retries,
    });
  }

  const coveredSourceFiles = [...new Set(records.map((r) => toPosix(r.file, root)))].sort();
  return {
    schemaVersion: 1,
    testCases,
    startedAtMs: args.startedAtMs,
    finishedAtMs: Date.now(),
    projectRoot: root,
    packageVersion: packageVersion(root),
    gitSha: gitSha(root),
    runScope: filtered ? "filtered" : "full",
    coveredSourceFiles,
    ...(incomplete.size ? { incompleteSourceFiles: [...incomplete].sort() } : {}),
    meta: { adapter: "bun", bunRunId: runId() },
  };
}

/** Fold a later file's share into what earlier files of the same run wrote. */
export function mergeRuns(prev: RawRunFile, next: RawRunFile): RawRunFile {
  const replaced = new Set(next.coveredSourceFiles ?? []);
  const union = (a?: string[], b?: string[]) => [...new Set([...(a ?? []), ...(b ?? [])])].sort();
  const incomplete = union(
    prev.incompleteSourceFiles?.filter((f) => !replaced.has(f)),
    next.incompleteSourceFiles,
  );
  return {
    ...next,
    testCases: [...prev.testCases.filter((t) => !replaced.has(t.sourceFile ?? "")), ...next.testCases],
    startedAtMs: Math.min(prev.startedAtMs ?? Infinity, next.startedAtMs ?? Infinity),
    runScope: prev.runScope === "filtered" || next.runScope === "filtered" ? "filtered" : next.runScope,
    coveredSourceFiles: union(prev.coveredSourceFiles, next.coveredSourceFiles),
    ...(incomplete.length ? { incompleteSourceFiles: incomplete } : { incompleteSourceFiles: undefined }),
  };
}

function outputPath(root: string): string {
  return path.resolve(root, process.env.EXECUTABLE_STORIES_OUTPUT ?? ".executable-stories/raw-run.json");
}

function readRun(file: string): RawRunFile | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as RawRunFile;
  } catch {
    return undefined;
  }
}

/**
 * Hold a lock dir while reading and rewriting the run file, so `--parallel`
 * workers finishing together don't drop each other's scenarios.
 */
function withLock(file: string, fn: () => void): void {
  const lock = `${file}.lock`;
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch {
      // A lock older than 5s belongs to a worker that exited: take it over.
      if (Date.now() > deadline) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try {
    fn();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

/** Write everything recorded so far and forget it. Called from the preload's `afterAll`. */
export function flush(): void {
  const state = collector();
  if (state.records.length === 0) return;
  const records = state.records.splice(0);
  const { hookRuns, declaredAssertions } = state;
  const concurrentConfirmed = hookRuns.before === hookRuns.after && !declaredAssertions;
  state.hookRuns = { before: 0, after: 0 };
  state.declaredAssertions = false;
  const root = process.cwd();
  const run = buildRun(records, { root, startedAtMs: state.startedAtMs, concurrentConfirmed });
  const file = outputPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  withLock(file, () => {
    const prev = readRun(file);
    const merged = prev?.meta?.bunRunId === run.meta?.bunRunId && prev?.meta?.adapter === "bun" ? mergeRuns(prev, run) : run;
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(merged, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, file);
  });
}
