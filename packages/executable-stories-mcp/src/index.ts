import * as fs from "node:fs";
import * as path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

// Canonicalization, the StoryReport projection, and their input/output types
// live in executable-stories-core — import them from where they actually live.
import type {
  FeatureSummaryItem,
  RawRun,
  ScenarioLookup,
  StoryReport,
} from "executable-stories-core";
import {
  canonicalizeRun,
  getFeatureSummary,
  getScenario,
  toStoryReport,
} from "executable-stories-core";
import type {
  ReportScenario,
  ReportSummary,
  BehaviorManifest,
  BehaviorDiff,
  BehaviorDiffEntry,
  ScenarioIndex,
  ScenarioIndexFilters,
  ScenarioIndexItem,
  DeploymentStatus,
  EnvironmentDrift,
} from "executable-stories-formatters";
import {
  diffStoryReports,
  scenariosCoveringPaths,
  toBehaviorManifest,
  toScenarioIndex,
  getDeploymentStatus as getDeploymentStatusCore,
  getEnvironmentDrift as getEnvironmentDriftCore,
} from "executable-stories-formatters";

import {
  advanceTrajectory,
  emptyTrajectoryState,
  reportTrajectorySummary,
  type RunCounts,
  type TrajectorySnapshot,
  type TrajectoryState,
  type TrajectorySummary,
} from "./trajectory.js";

// Scenario serialization is owned by the formatters package; re-export so MCP
// consumers get the same shape without a parallel definition to maintain.
export type { ScenarioIndexItem, ScenarioIndexFilters };

// Scenario lookup and feature summaries are pure StoryReport projections, and
// the HTML report's in-browser WebMCP tools answer the same two questions. They
// live in core so the two transports cannot drift; re-exported here because
// they are part of this package's published surface.
export { getScenario, getFeatureSummary };
export type { FeatureSummaryItem, ScenarioLookup };

export function loadStoryReport(reportPath: string): StoryReport {
  const absolutePath = path.resolve(reportPath);
  const parsed: unknown = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  assertStoryReport(parsed, absolutePath);
  return parsed;
}

export function listScenarios(
  report: StoryReport,
  filters?: ScenarioIndexFilters,
): ScenarioIndexItem[] {
  return toScenarioIndex(report, filters).scenarios;
}

export function getFailingScenarios(report: StoryReport): ScenarioIndexItem[] {
  return listScenarios(report, { statuses: ["failed"] });
}

export function getScenariosForPaths(report: StoryReport, paths: string[]): ScenarioIndexItem[] {
  return scenariosCoveringPaths(toScenarioIndex(report), paths);
}

export function getBehaviorDiff(baseline: StoryReport, current: StoryReport): BehaviorDiff {
  return diffStoryReports(baseline, current);
}

export function resolveReportPath(reportPath?: string): string {
  return path.resolve(reportPath ?? "reports/index.story-report.json");
}

export function getScenarioIndex(report: StoryReport): ScenarioIndex {
  return toScenarioIndex(report);
}

export function getBehaviorManifest(report: StoryReport): BehaviorManifest {
  return toBehaviorManifest(report);
}

export interface DeploymentQueryResult {
  status: DeploymentStatus;
  ledgerPath: string;
}

export function getDeploymentStatus(ledgerPath?: string): DeploymentStatus {
  return getDeploymentStatusCore(ledgerPath ?? ".executable-stories/deployments.json");
}

export function getEnvironmentDrift(envA: string, envB: string, ledgerPath?: string): EnvironmentDrift {
  return getEnvironmentDriftCore(ledgerPath ?? ".executable-stories/deployments.json", envA, envB);
}

/**
 * Single source of truth for the read-only tools, consumed by both the stdio
 * MCP server and the HTTP server so the two transports cannot drift apart.
 * Tools needing extra arguments (get_scenario, run_scenario) are wired up
 * directly in each transport.
 */
export interface ReadOnlyTool {
  /** MCP tool name. */
  name: string;
  /** Human-readable MCP tool title. */
  title: string;
  /** Shared description used by both transports. */
  description: string;
  /** HTTP route that exposes the same data. */
  route: string;
  /** Pure projection from a loaded report to its JSON payload. */
  run: (report: StoryReport) => unknown;
}

export const readOnlyTools: ReadOnlyTool[] = [
  {
    name: "get_failing_scenarios",
    title: "Get failing scenarios",
    description: "List failing executable story scenarios from StoryReport JSON.",
    route: "/scenarios/failing",
    run: getFailingScenarios,
  },
  {
    name: "get_feature_summary",
    title: "Get feature summary",
    description: "Summarize features and scenario status counts from StoryReport JSON.",
    route: "/features",
    run: getFeatureSummary,
  },
  {
    name: "get_scenario_index",
    title: "Get scenario index",
    description:
      "Return the Storybook-like scenario index artifact (schema v1) derived from StoryReport JSON.",
    route: "/scenario-index",
    run: getScenarioIndex,
  },
  {
    name: "get_behavior_manifest",
    title: "Get behavior manifest",
    description:
      "Return agent-oriented manifest metadata: source files, tags, doc coverage, debugger warnings.",
    route: "/manifest",
    run: getBehaviorManifest,
  },
];

export type FocusedRunFramework =
  | "vitest"
  | "jest"
  | "playwright"
  | "cypress"
  | "go"
  | "pytest"
  | "rust"
  | "dotnet";

export interface FocusedRunCommandArgs {
  framework: FocusedRunFramework;
  sourceFile: string;
  scenarioTitle?: string;
}

export interface FocusedRunCommand {
  command: string;
  args: string[];
}

export interface FocusedRunResult {
  ok: boolean;
  exitCode: number | null;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
}

/**
 * One runner per host framework. The seam that keeps `run_scenario` extensible:
 * adding a non-JS framework (go, cargo, pytest, dotnet) later is a single new
 * entry here — no changes to inference, command building, or the transports.
 */
export interface RunnerDefinition {
  framework: FocusedRunFramework;
  /** Infer this framework from a source-file path, when unambiguous. */
  detect?: (sourceFile: string) => boolean;
  /** Build the focused-run command for this framework. */
  buildCommand: (args: { sourceFile: string; scenarioTitle?: string }) => FocusedRunCommand;
}

export const RUNNERS: Record<FocusedRunFramework, RunnerDefinition> = {
  vitest: {
    framework: "vitest",
    buildCommand: ({ sourceFile, scenarioTitle }) => ({
      command: "pnpm",
      args: ["exec", "vitest", "run", sourceFile, ...(scenarioTitle ? ["-t", scenarioTitle] : [])],
    }),
  },
  jest: {
    framework: "jest",
    buildCommand: ({ sourceFile, scenarioTitle }) => ({
      command: "pnpm",
      args: ["exec", "jest", sourceFile, ...(scenarioTitle ? ["-t", scenarioTitle] : []), "--runInBand"],
    }),
  },
  playwright: {
    framework: "playwright",
    detect: (sourceFile) => sourceFile.includes(".story.spec."),
    buildCommand: ({ sourceFile, scenarioTitle }) => ({
      command: "pnpm",
      args: ["exec", "playwright", "test", sourceFile, ...(scenarioTitle ? ["-g", scenarioTitle] : [])],
    }),
  },
  cypress: {
    framework: "cypress",
    detect: (sourceFile) => sourceFile.includes(".story.cy."),
    buildCommand: ({ sourceFile }) => ({
      command: "pnpm",
      args: ["exec", "cypress", "run", "--spec", sourceFile],
    }),
  },
  // Non-JS runners. The scenario title is passed as each language's native test
  // filter — a best-effort focus, since story titles don't always map 1:1 to a
  // test function name. That's fine: the report refresh merges by scenario id,
  // so a loose filter that runs extra tests still updates the right rows. go and
  // pytest have distinctive story-test suffixes and so auto-detect; rust and
  // dotnet do not, so they require an explicit `framework`.
  go: {
    framework: "go",
    detect: (sourceFile) => sourceFile.endsWith("_story_test.go"),
    buildCommand: ({ sourceFile, scenarioTitle }) => {
      const dir = sourceFile.includes("/") ? `./${sourceFile.replace(/\/[^/]+$/, "")}` : ".";
      return {
        command: "go",
        args: ["test", dir, ...(scenarioTitle ? ["-run", scenarioTitle] : [])],
      };
    },
  },
  pytest: {
    framework: "pytest",
    detect: (sourceFile) => sourceFile.endsWith("_story.py"),
    buildCommand: ({ sourceFile, scenarioTitle }) => ({
      command: "pytest",
      args: [sourceFile, ...(scenarioTitle ? ["-k", scenarioTitle] : [])],
    }),
  },
  rust: {
    framework: "rust",
    buildCommand: ({ scenarioTitle }) => ({
      command: "cargo",
      args: ["test", ...(scenarioTitle ? ["--", scenarioTitle] : [])],
    }),
  },
  dotnet: {
    framework: "dotnet",
    buildCommand: ({ scenarioTitle }) => ({
      command: "dotnet",
      args: ["test", ...(scenarioTitle ? ["--filter", `DisplayName~${scenarioTitle}`] : [])],
    }),
  },
};

/** The supported focused-run frameworks (the keys of {@link RUNNERS}). */
export const FOCUSED_RUN_FRAMEWORKS = Object.keys(RUNNERS) as FocusedRunFramework[];

/** Whether an arbitrary value names a supported focused-run framework. */
export function isFocusedRunFramework(value: unknown): value is FocusedRunFramework {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RUNNERS, value);
}

export function inferFrameworkFromSourceFile(
  sourceFile: string,
): FocusedRunFramework | undefined {
  for (const runner of Object.values(RUNNERS)) {
    if (runner.detect?.(sourceFile)) return runner.framework;
  }
  return undefined;
}

export function resolveFocusedRunFramework(args: {
  sourceFile: string;
  framework?: FocusedRunFramework;
}): FocusedRunFramework {
  if (args.framework !== undefined) {
    // The type says this is valid, but untrusted callers (e.g. the HTTP body)
    // can lie — guard so an unknown name fails clearly, not as a later TypeError.
    if (!isFocusedRunFramework(args.framework)) {
      throw new Error(
        `Unsupported framework "${args.framework}". Expected one of: ${FOCUSED_RUN_FRAMEWORKS.join(" | ")}.`,
      );
    }
    return args.framework;
  }
  const inferred = inferFrameworkFromSourceFile(args.sourceFile);
  if (inferred) return inferred;
  throw new Error(
    `Could not infer test framework from ${args.sourceFile}. ` +
      `Auto-detection covers playwright/cypress/go/pytest; pass framework explicitly for vitest/jest/rust/dotnet ` +
      `(one of: ${FOCUSED_RUN_FRAMEWORKS.join(" | ")}).`,
  );
}

export function buildFocusedRunCommand(args: FocusedRunCommandArgs): FocusedRunCommand {
  return RUNNERS[args.framework].buildCommand(args);
}

export async function runFocusedScenario(args: FocusedRunCommandArgs & {
  cwd?: string;
  spawnFn?: typeof spawn;
}): Promise<FocusedRunResult> {
  const command = buildFocusedRunCommand(args);
  const spawnFn = args.spawnFn ?? spawn;

  return new Promise((resolve) => {
    const child = spawnFn(command.command, command.args, {
      cwd: args.cwd,
      env: process.env,
    }) as ChildProcessWithoutNullStreams;
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        exitCode: null,
        command: command.command,
        args: command.args,
        stdout,
        stderr: stderr + error.message,
      });
    });
    child.on("close", (exitCode) => {
      resolve({
        ok: exitCode === 0,
        exitCode,
        command: command.command,
        args: command.args,
        stdout,
        stderr,
      });
    });
  });
}

function assertStoryReport(
  value: unknown,
  reportPath: string,
): asserts value is StoryReport {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid StoryReport JSON in ${reportPath}: expected object`);
  }
  const report = value as Partial<StoryReport>;
  if (typeof report.schemaVersion !== "string" || !report.schemaVersion.startsWith("1.")) {
    throw new Error(
      `Invalid StoryReport JSON in ${reportPath}: expected schemaVersion 1.x`,
    );
  }
  if (!Array.isArray(report.features)) {
    throw new Error(`Invalid StoryReport JSON in ${reportPath}: expected features array`);
  }
}

// --- Session trajectory ------------------------------------------------------

/** Project a StoryReport's top-level summary down to the trajectory counts. */
export function summarizeReport(report: StoryReport): RunCounts {
  const s = report.summary;
  return { total: s.total, passed: s.passed, failed: s.failed, skipped: s.skipped, pending: s.pending };
}

function snapshotFromReport(report: StoryReport): TrajectorySnapshot {
  return {
    runId: report.runId,
    gitSha: report.gitSha,
    finishedAtMs: report.finishedAtMs,
    counts: summarizeReport(report),
  };
}

/** Default on-disk home for the persisted session state (gitignored). */
export function resolveTrajectoryStatePath(statePath?: string, cwd: string = process.cwd()): string {
  return path.resolve(cwd, statePath ?? ".executable-stories/trajectory.json");
}

function readTrajectoryState(statePath: string): TrajectoryState {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf8")) as Partial<TrajectoryState>;
    if (parsed && typeof parsed.runCount === "number") return parsed as TrajectoryState;
  } catch {
    // Missing/corrupt state file -> start a fresh session.
  }
  return emptyTrajectoryState;
}

function writeTrajectoryState(statePath: string, state: TrajectoryState): void {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/**
 * Fold the given report into the persisted session trajectory and return the
 * loop-facing summary. Idempotent on `report.runId` (re-reading the same report
 * does not advance the loop). `reset` re-pins the session baseline.
 */
export function getTrajectory(
  report: StoryReport,
  opts: { statePath?: string; reset?: boolean; cwd?: string } = {},
): TrajectorySummary {
  const statePath = resolveTrajectoryStatePath(opts.statePath, opts.cwd);
  const prev = opts.reset ? emptyTrajectoryState : readTrajectoryState(statePath);
  const next = advanceTrajectory(prev, snapshotFromReport(report));
  writeTrajectoryState(statePath, next);
  return reportTrajectorySummary(next);
}

// --- Report refresh after a focused run --------------------------------------

export interface ReportRefreshResult {
  /** True when the report on disk was updated from a fresh raw run. */
  reportRefreshed: boolean;
  /** Scenario ids whose status was merged in (present when refreshed). */
  updatedScenarioIds?: string[];
  /** Why the refresh was skipped (present when not refreshed). */
  reason?: string;
}

/** Recompute a feature/report summary block from its scenarios' statuses. */
function recomputeSummary(scenarios: ReportScenario[], durationMs: number): ReportSummary {
  const summary: ReportSummary = { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, durationMs };
  for (const s of scenarios) {
    summary.total += 1;
    if (s.status === "passed") summary.passed += 1;
    else if (s.status === "failed") summary.failed += 1;
    else if (s.status === "skipped") summary.skipped += 1;
    else if (s.status === "pending") summary.pending += 1;
  }
  return summary;
}

/**
 * Merge the just-run scenarios' statuses into the existing StoryReport by
 * scenario id, then recompute feature/report summaries so the observe tools
 * (`get_failing_scenarios`, `get_trajectory`) reflect the new state. A focused
 * run only contains the scenarios that ran, so this is a surgical patch — every
 * other scenario in the report is left untouched. Never overwrites the whole
 * report. Returns `reportRefreshed: false` (report left intact) when no fresh
 * raw run is available.
 */
export function refreshReportFromRawRun(args: {
  rawRunPath: string;
  reportPath: string;
}): ReportRefreshResult {
  if (!fs.existsSync(args.rawRunPath)) {
    return { reportRefreshed: false, reason: `No raw run found at ${args.rawRunPath}` };
  }
  if (!fs.existsSync(args.reportPath)) {
    return { reportRefreshed: false, reason: `No StoryReport found at ${args.reportPath}` };
  }

  let focused: StoryReport;
  try {
    const raw = JSON.parse(fs.readFileSync(args.rawRunPath, "utf8")) as RawRun;
    focused = toStoryReport(canonicalizeRun(raw));
  } catch (error) {
    return { reportRefreshed: false, reason: `Could not parse raw run: ${(error as Error).message}` };
  }

  const main = loadStoryReport(args.reportPath);
  const fresh = new Map<string, ReportScenario>();
  for (const feature of focused.features) {
    for (const scenario of feature.scenarios) fresh.set(scenario.id, scenario);
  }

  const updatedScenarioIds: string[] = [];
  for (const feature of main.features) {
    let touched = false;
    for (let i = 0; i < feature.scenarios.length; i++) {
      const next = fresh.get(feature.scenarios[i].id);
      if (next) {
        feature.scenarios[i] = next;
        updatedScenarioIds.push(next.id);
        touched = true;
      }
    }
    if (touched) feature.summary = recomputeSummary(feature.scenarios, feature.summary.durationMs);
  }

  if (updatedScenarioIds.length === 0) {
    return { reportRefreshed: false, reason: "Raw run contained no scenarios matching the report" };
  }

  main.summary = recomputeSummary(
    main.features.flatMap((f) => f.scenarios),
    main.summary.durationMs,
  );
  fs.writeFileSync(args.reportPath, `${JSON.stringify(main, null, 2)}\n`, "utf8");
  return { reportRefreshed: true, updatedScenarioIds };
}

// --- Execution: single + batch -----------------------------------------------

export interface RunScenarioOutcome {
  scenario: { id: string; title: string; sourceFile: string } | null;
  framework?: FocusedRunFramework;
  error?: string;
  ok?: boolean;
  exitCode?: number | null;
  command?: string;
  args?: string[];
  stdout?: string;
  stderr?: string;
  refresh?: ReportRefreshResult;
}

/**
 * Look up one scenario, run it through its host framework, then merge the
 * result back into the report (unless disabled). Shared by the `run_scenario`
 * and `run_scenarios` / `run_changed` tools so single and batch runs behave
 * identically. The report is passed in (loaded once) so batch callers don't
 * re-read it per scenario.
 */
export async function runScenarioById(args: {
  report: StoryReport;
  reportPath: string;
  idOrTitle: string;
  framework?: FocusedRunFramework;
  cwd?: string;
  rawRunPath?: string;
  refreshReport?: boolean;
  spawnFn?: typeof spawn;
}): Promise<RunScenarioOutcome> {
  const lookup = getScenario(args.report, args.idOrTitle);
  if (!lookup) {
    return { scenario: null, error: `Scenario not found: ${args.idOrTitle}` };
  }

  const sourceFile = lookup.feature.sourceFile;
  const framework = resolveFocusedRunFramework({ sourceFile, framework: args.framework });
  const run = await runFocusedScenario({
    framework,
    sourceFile,
    scenarioTitle: lookup.scenario.title,
    cwd: args.cwd ?? process.cwd(),
    spawnFn: args.spawnFn,
  });

  const refresh =
    args.refreshReport === false
      ? { reportRefreshed: false, reason: "refreshReport disabled" }
      : refreshReportFromRawRun({
          rawRunPath: args.rawRunPath ?? ".executable-stories/raw-run.json",
          reportPath: args.reportPath,
        });

  return {
    scenario: { id: lookup.scenario.id, title: lookup.scenario.title, sourceFile },
    framework,
    ...run,
    refresh,
  };
}

/**
 * Run several scenarios in sequence (so they don't clobber each other's shared
 * raw-run JSON), refreshing the report after each. Returns one outcome per id.
 */
export async function runScenarios(args: {
  report: StoryReport;
  reportPath: string;
  idsOrTitles: string[];
  framework?: FocusedRunFramework;
  cwd?: string;
  rawRunPath?: string;
  refreshReport?: boolean;
  spawnFn?: typeof spawn;
}): Promise<RunScenarioOutcome[]> {
  const outcomes: RunScenarioOutcome[] = [];
  for (const idOrTitle of args.idsOrTitles) {
    outcomes.push(
      await runScenarioById({
        report: args.report,
        reportPath: args.reportPath,
        idOrTitle,
        framework: args.framework,
        cwd: args.cwd,
        rawRunPath: args.rawRunPath,
        refreshReport: args.refreshReport,
        spawnFn: args.spawnFn,
      }),
    );
  }
  return outcomes;
}

export interface RunChangedResult {
  /** The product-code paths that were looked up. */
  paths: string[];
  /** Scenarios whose `covers` globs matched the paths (the run set). */
  matched: ScenarioIndexItem[];
  /** One outcome per matched scenario. */
  outcomes: RunScenarioOutcome[];
}

/**
 * Code → run: find the scenarios whose declared `covers` globs match the given
 * changed-file paths, then run them. The natural "I edited these files, verify
 * the behaviours that cover them" act in an agent loop.
 */
export async function runChanged(args: {
  report: StoryReport;
  reportPath: string;
  paths: string[];
  framework?: FocusedRunFramework;
  cwd?: string;
  rawRunPath?: string;
  refreshReport?: boolean;
  spawnFn?: typeof spawn;
}): Promise<RunChangedResult> {
  const matched = getScenariosForPaths(args.report, args.paths);
  const outcomes = await runScenarios({
    report: args.report,
    reportPath: args.reportPath,
    idsOrTitles: matched.map((s) => s.id),
    framework: args.framework,
    cwd: args.cwd,
    rawRunPath: args.rawRunPath,
    refreshReport: args.refreshReport,
    spawnFn: args.spawnFn,
  });
  return { paths: args.paths, matched, outcomes };
}

// --- Loop status: the one-read "am I done?" ----------------------------------

export interface LoopStatus {
  /** True when nothing is failing and (if a baseline was given) nothing regressed. */
  done: boolean;
  failing: ScenarioIndexItem[];
  failingCount: number;
  /** Scenarios that went passed → failed vs the baseline, or null when no baseline given. */
  regressed: BehaviorDiffEntry[] | null;
  regressedCount: number;
  trajectory: TrajectorySummary;
}

/**
 * The single read an agent loop polls to decide whether to keep going. Composes
 * the failing list, the regression set (vs an optional baseline), and the
 * session trajectory into one `done` verdict.
 */
export function getLoopStatus(
  report: StoryReport,
  opts: { baseline?: StoryReport; statePath?: string; cwd?: string } = {},
): LoopStatus {
  const failing = getFailingScenarios(report);
  const regressed = opts.baseline
    ? diffStoryReports(opts.baseline, report).scenarios.filter((s) => s.kind === "regressed")
    : null;
  const trajectory = getTrajectory(report, { statePath: opts.statePath, cwd: opts.cwd });
  const regressedCount = regressed?.length ?? 0;
  return {
    done: failing.length === 0 && regressedCount === 0,
    failing,
    failingCount: failing.length,
    regressed,
    regressedCount,
    trajectory,
  };
}
