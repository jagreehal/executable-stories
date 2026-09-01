import { toStoryReport } from "executable-stories-core/converters/story-report";
import { scenarioContentHash } from "executable-stories-core/explainer";
import { assertionState } from "executable-stories-core/utils/assertive-steps";
import type { ReportFeature, ReportScenario, ReportStep, StoryReport, TestStatus } from "executable-stories-core/types/story-report";
import type { TestRunResult } from "executable-stories-core/types/test-result";

export interface ScenarioIndex {
  schemaVersion: "1.0";
  runId: string;
  generatedAtMs: number;
  summary: StoryReport["summary"];
  scenarios: ScenarioIndexItem[];
}

/**
 * One scenario as this formatter emits it.
 *
 * This is an OUTPUT type: it describes what `toScenarioIndex` produces, which
 * is why `hash` and `assertionState` are required here while
 * `scenario-index-v1.json` marks both optional. The schema is deliberately the
 * laxer of the two so artifacts written before either field existed still
 * validate; every artifact written since carries them.
 *
 * The consequence, and it is intended: parsing an arbitrary v1 file and casting
 * it to this type is not sound for those two fields. Validate against the
 * schema and treat them as optional if you are reading files you did not just
 * write.
 */
export interface ScenarioIndexItem {
  id: string;
  title: string;
  /**
   * Content hash (title + step keywords/texts) for explainer provenance —
   * copy into an explainer's frontmatter `scenarios[].hash` so
   * `check-explainers` can detect drift. Status is deliberately excluded.
   */
  hash: string;
  status: TestStatus;
  feature: string;
  sourceFile: string;
  sourceLine?: number;
  tags: string[];
  tickets: Array<{ id: string; url?: string }>;
  covers: string[];
  durationMs: number;
  steps: ScenarioIndexStep[];
  docKinds: string[];
  error?: { message: string; stack?: string };
  /**
   * Whether the scenario's claim was checked: `asserted`, `unasserted`, or
   * `unobserved` where the adapter cannot count. A passing scenario that is
   * `unasserted` ran and proved nothing.
   */
  assertionState: "asserted" | "unasserted" | "unobserved";
}

export interface ScenarioIndexStep {
  id: string;
  index: number;
  keyword: ReportStep["keyword"];
  text: string;
  status: TestStatus;
  durationMs: number;
  errorMessage?: string;
  docKinds: string[];
  /**
   * Assertions the framework observed. Absent means the adapter has no counter;
   * `0` means it counted none. Never defaulted — the difference is the point.
   */
  assertions?: number;
}

export interface ScenarioIndexFilters {
  statuses?: TestStatus[];
  tags?: string[];
  sourceFiles?: string[];
}

export interface ScenarioIndexJsonOptions {
  pretty?: boolean;
  filters?: ScenarioIndexFilters;
}

export class ScenarioIndexJsonFormatter {
  private options: Required<Pick<ScenarioIndexJsonOptions, "pretty">> & {
    filters?: ScenarioIndexFilters;
  };

  constructor(options: ScenarioIndexJsonOptions = {}) {
    this.options = {
      pretty: options.pretty ?? true,
      filters: options.filters,
    };
  }

  toIndex(run: TestRunResult): ScenarioIndex {
    return toScenarioIndex(toStoryReport(run), this.options.filters);
  }

  format(run: TestRunResult): string {
    const index = this.toIndex(run);
    return this.options.pretty ? JSON.stringify(index, null, 2) : JSON.stringify(index);
  }
}

export function toScenarioIndex(
  report: StoryReport,
  filters: ScenarioIndexFilters = {},
): ScenarioIndex {
  const scenarios = report.features
    .flatMap((feature) =>
      feature.scenarios.map((scenario) => toScenarioIndexItem(feature, scenario)),
    )
    .filter((scenario) => matchesFilters(scenario, filters));

  return {
    schemaVersion: "1.0",
    runId: report.runId,
    generatedAtMs: report.finishedAtMs,
    summary: summarize(scenarios),
    scenarios,
  };
}

function toScenarioIndexItem(
  feature: ReportFeature,
  scenario: ReportScenario,
): ScenarioIndexItem {
  return {
    id: scenario.id,
    title: scenario.title,
    hash: scenarioContentHash(scenario),
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

function matchesFilters(
  scenario: ScenarioIndexItem,
  filters: ScenarioIndexFilters,
): boolean {
  if (filters.statuses?.length && !filters.statuses.includes(scenario.status)) {
    return false;
  }
  if (
    filters.tags?.length &&
    !filters.tags.some((tag) => scenario.tags.includes(tag))
  ) {
    return false;
  }
  if (
    filters.sourceFiles?.length &&
    !filters.sourceFiles.some((sourceFile) => scenario.sourceFile.includes(sourceFile))
  ) {
    return false;
  }
  return true;
}

function summarize(scenarios: ScenarioIndexItem[]): StoryReport["summary"] {
  return {
    total: scenarios.length,
    passed: scenarios.filter((scenario) => scenario.status === "passed").length,
    failed: scenarios.filter((scenario) => scenario.status === "failed").length,
    skipped: scenarios.filter((scenario) => scenario.status === "skipped").length,
    pending: scenarios.filter((scenario) => scenario.status === "pending").length,
    durationMs: scenarios.reduce((total, scenario) => total + scenario.durationMs, 0),
  };
}
