/**
 * Pure StoryReport projections — the queries an agent asks of a run.
 *
 * These live in core, not in the MCP server or the formatters package, because
 * the same questions are now asked over three transports: MCP stdio, the
 * formatters HTTP routes, and WebMCP tools registered by the HTML report in the
 * reader's own browser. One implementation means the answers cannot drift by
 * transport.
 *
 * Everything here is browser-safe by construction. That is the constraint that
 * shapes `ScenarioSummary`: it is `ScenarioIndexItem` (formatters) minus its
 * `hash`, because the content hash comes from `scenarioContentHash`, which is
 * node-only (`node:crypto`). A browser bundle must not pull that in, so the
 * in-page tools answer with everything except the hash. `scenario-index-parity`
 * in the formatters tests fails if the two shapes drift any further apart.
 */

import type {
  ReportFeature,
  ReportScenario,
  ReportStep,
  StoryReport,
  TestStatus,
} from "./types/story-report.js";
import { assertionState } from "./utils/assertive-steps.js";

/** One step, flattened for an agent: no doc entry bodies, just their kinds. */
export interface ScenarioSummaryStep {
  id: string;
  index: number;
  keyword: ReportStep["keyword"];
  text: string;
  status: TestStatus;
  durationMs: number;
  errorMessage?: string;
  docKinds: string[];
  /**
   * Assertions the framework observed in this step. Absent means the adapter
   * has no counter to read; `0` means it counted none. The difference matters,
   * so it is never defaulted.
   */
  assertions?: number;
}

/**
 * One scenario, flattened for an agent. Identical to the formatters'
 * `ScenarioIndexItem` except for the node-only `hash` field — see the module
 * comment.
 */
export interface ScenarioSummary {
  id: string;
  title: string;
  status: TestStatus;
  feature: string;
  sourceFile: string;
  sourceLine?: number;
  tags: string[];
  tickets: Array<{ id: string; url?: string }>;
  covers: string[];
  durationMs: number;
  steps: ScenarioSummaryStep[];
  docKinds: string[];
  error?: { message: string; stack?: string };
  /**
   * Whether the scenario's claim was actually checked — the same verdict
   * Evidence Review grades on, computed by `assertionState`.
   *
   * A consumer reading a passing scenario needs this: `passed` plus
   * `unasserted` is a scenario that ran and proved nothing, and reporting it as
   * evidence is the failure this field exists to prevent. `unobserved` is not
   * `unasserted` — several adapters have no assertion counter at all.
   */
  assertionState: "asserted" | "unasserted" | "unobserved";
}

/** Filters applied with AND across kinds, OR within a kind. */
export interface ScenarioFilters {
  statuses?: TestStatus[];
  tags?: string[];
  /** Matched as a substring of the feature's source file path. */
  sourceFiles?: string[];
}

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

export function toScenarioSummary(
  feature: ReportFeature,
  scenario: ReportScenario,
): ScenarioSummary {
  return {
    id: scenario.id,
    title: scenario.title,
    status: scenario.status,
    feature: feature.title,
    sourceFile: feature.sourceFile,
    sourceLine: scenario.sourceLine,
    tags: scenario.tags,
    tickets: scenario.tickets ?? [],
    covers: scenario.covers ?? [],
    durationMs: scenario.durationMs,
    steps: scenario.steps.map((step) => ({
      id: step.id,
      index: step.index,
      keyword: step.keyword,
      text: step.text,
      status: step.status,
      durationMs: step.durationMs,
      errorMessage: step.errorMessage,
      docKinds: step.docEntries.map((entry) => entry.kind),
      assertions: step.assertions,
    })),
    docKinds: scenario.docEntries.map((entry) => entry.kind),
    assertionState: assertionState(scenario.steps),
    error: scenario.errorMessage
      ? { message: scenario.errorMessage, stack: scenario.errorStack }
      : undefined,
  };
}

export function matchesScenarioFilters(
  scenario: ScenarioSummary,
  filters: ScenarioFilters,
): boolean {
  if (filters.statuses?.length && !filters.statuses.includes(scenario.status)) {
    return false;
  }
  if (filters.tags?.length && !filters.tags.some((tag) => scenario.tags.includes(tag))) {
    return false;
  }
  if (
    filters.sourceFiles?.length &&
    !filters.sourceFiles.some((needle) => scenario.sourceFile.includes(needle))
  ) {
    return false;
  }
  return true;
}

/** Every scenario in the report, flattened and filtered, in source order. */
export function listScenarioSummaries(
  report: StoryReport,
  filters: ScenarioFilters = {},
): ScenarioSummary[] {
  return report.features
    .flatMap((feature) =>
      feature.scenarios.map((scenario) => toScenarioSummary(feature, scenario)),
    )
    .filter((scenario) => matchesScenarioFilters(scenario, filters));
}

/**
 * One scenario by id or exact title, with the feature it belongs to.
 *
 * Titles are accepted because that is what a person reading the report has to
 * hand; ids are what a permalink carries.
 *
 * Ids are searched across the whole report before any title is considered. A
 * single pass matching either would let an early scenario *titled* like a later
 * scenario's id win, which is the one case where the caller definitely meant
 * the id.
 */
export function getScenario(
  report: StoryReport,
  idOrTitle: string,
): ScenarioLookup | undefined {
  return findBy(report, (s) => s.id === idOrTitle) ?? findBy(report, (s) => s.title === idOrTitle);
}

function findBy(
  report: StoryReport,
  match: (scenario: ReportScenario) => boolean,
): ScenarioLookup | undefined {
  for (const feature of report.features) {
    const scenario = feature.scenarios.find(match);
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

/**
 * Which run produced this answer.
 *
 * Attached to every tool payload because a report is a snapshot, and the reader
 * asking about it has no way to tell a run from ten minutes ago from one from
 * three weeks ago. Without this an agent relays a long-dead failure as current.
 */
export interface RunProvenance {
  runId: string;
  startedAtMs: number;
  finishedAtMs: number;
  gitSha?: string;
  branch?: string;
  packageVersion?: string;
  /** Whole days between the run finishing and the question being asked. */
  ageDays: number;
}

export function runProvenance(report: StoryReport, nowMs: number): RunProvenance {
  const sha = report.ci?.commitSha ?? report.gitSha;
  return {
    runId: report.runId,
    startedAtMs: report.startedAtMs,
    finishedAtMs: report.finishedAtMs,
    ...(sha !== undefined && { gitSha: sha }),
    ...(report.ci?.branch !== undefined && { branch: report.ci.branch }),
    ...(report.packageVersion !== undefined && { packageVersion: report.packageVersion }),
    ageDays: Math.max(0, Math.floor((nowMs - report.finishedAtMs) / 86_400_000)),
  };
}
