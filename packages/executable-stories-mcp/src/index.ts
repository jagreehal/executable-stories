import * as fs from "node:fs";
import * as path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import type {
  ReportFeature,
  ReportScenario,
  StoryReport,
  BehaviorManifest,
  BehaviorDiff,
  ScenarioIndex,
  ScenarioIndexFilters,
  ScenarioIndexItem,
} from "executable-stories-formatters";
import {
  diffStoryReports,
  scenariosCoveringPaths,
  toBehaviorManifest,
  toScenarioIndex,
} from "executable-stories-formatters";

// Scenario serialization is owned by the formatters package; re-export so MCP
// consumers get the same shape without a parallel definition to maintain.
export type { ScenarioIndexItem, ScenarioIndexFilters };

export interface FeatureSummaryItem {
  id: string;
  title: string;
  sourceFile: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  durationMs: number;
}

export interface ScenarioLookup {
  feature: ReportFeature;
  scenario: ReportScenario;
}

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

export function getScenario(report: StoryReport, idOrTitle: string): ScenarioLookup | undefined {
  for (const feature of report.features) {
    const scenario = feature.scenarios.find(
      (candidate) => candidate.id === idOrTitle || candidate.title === idOrTitle,
    );
    if (scenario) return { feature, scenario };
  }
  return undefined;
}

export function getFeatureSummary(report: StoryReport): FeatureSummaryItem[] {
  return report.features.map((feature) => ({
    id: feature.id,
    title: feature.title,
    sourceFile: feature.sourceFile,
    total: feature.summary.total,
    passed: feature.summary.passed,
    failed: feature.summary.failed,
    skipped: feature.summary.skipped,
    pending: feature.summary.pending,
    durationMs: feature.summary.durationMs,
  }));
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
    route: "/scenarios-index",
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

export type FocusedRunFramework = "vitest" | "jest" | "playwright" | "cypress";

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
};

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
  if (args.framework) return args.framework;
  const inferred = inferFrameworkFromSourceFile(args.sourceFile);
  if (inferred) return inferred;
  throw new Error(
    `Could not infer test framework from ${args.sourceFile}. Pass framework: vitest | jest | playwright | cypress.`,
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
