/**
 * Pure functions for filtering a StoryReport by a search query.
 * Used by <ReportInteractive>. Kept side-effect-free so it can be unit-tested.
 */

import type {
  ReportScenario,
  ReportFeature,
  StoryReport,
} from "executable-stories-core";
import type { UrlStatusFilter } from "../lib/hash-state";

/** Defined with the URL codec that has to validate it, so the two can't drift. */
export type StatusFilter = UrlStatusFilter;

export interface FilterCriteria {
  query?: string;
  status?: StatusFilter;
  /** Scenario matches if it carries ANY of these tags (empty = no tag filter). */
  tags?: string[];
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/** Unique scenario tags across the whole report, in first-seen order. */
export function allTags(report: StoryReport): string[] {
  const seen = new Set<string>();
  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      for (const tag of scenario.tags) seen.add(tag);
    }
  }
  return [...seen];
}

/**
 * What people paste into the search box rarely comes from the report itself: a
 * ticket id from the tracker, a string out of a stack trace, a path from a PR
 * diff. So the query matches those too, not just the title/tags/steps.
 */
function queryMatches(scenario: ReportScenario, q: string, sourceFile?: string): boolean {
  if (q === "") return true;
  if (scenario.title.toLowerCase().includes(q)) return true;
  if (sourceFile?.toLowerCase().includes(q)) return true;
  if (scenario.errorMessage?.toLowerCase().includes(q)) return true;
  for (const tag of scenario.tags) {
    if (tag.toLowerCase().includes(q)) return true;
  }
  for (const ticket of scenario.tickets ?? []) {
    if (ticket.id.toLowerCase().includes(q)) return true;
  }
  for (const step of scenario.steps) {
    if (step.text.toLowerCase().includes(q)) return true;
  }
  return false;
}

function scenarioMatches(
  scenario: ReportScenario,
  q: string,
  status: StatusFilter,
  tags: string[],
  sourceFile?: string,
): boolean {
  if (status !== "all" && scenario.status !== status) return false;
  if (tags.length > 0 && !tags.some((t) => scenario.tags.includes(t))) return false;
  return queryMatches(scenario, q, sourceFile);
}

function summarizeScenarios(scenarios: ReportScenario[]) {
  let total = 0,
    passed = 0,
    failed = 0,
    skipped = 0,
    pending = 0,
    durationMs = 0;
  for (const s of scenarios) {
    total += 1;
    durationMs += s.durationMs;
    if (s.status === "passed") passed += 1;
    else if (s.status === "failed") failed += 1;
    else if (s.status === "skipped") skipped += 1;
    else pending += 1;
  }
  return { total, passed, failed, skipped, pending, durationMs };
}

export function filterReport(report: StoryReport, criteria: string | FilterCriteria): StoryReport {
  const c: FilterCriteria = typeof criteria === "string" ? { query: criteria } : criteria;
  const q = normalizeQuery(c.query ?? "");
  const status = c.status ?? "all";
  const tags = c.tags ?? [];
  if (q === "" && status === "all" && tags.length === 0) return report;

  const features: ReportFeature[] = [];
  let topTotal = 0,
    topPassed = 0,
    topFailed = 0,
    topSkipped = 0,
    topPending = 0,
    topDuration = 0;

  for (const feature of report.features) {
    const matched = feature.scenarios.filter((s) =>
      scenarioMatches(s, q, status, tags, feature.sourceFile),
    );
    if (matched.length === 0) continue;
    const summary = summarizeScenarios(matched);
    features.push({ ...feature, summary, scenarios: matched });
    topTotal += summary.total;
    topPassed += summary.passed;
    topFailed += summary.failed;
    topSkipped += summary.skipped;
    topPending += summary.pending;
    topDuration += summary.durationMs;
  }

  return {
    ...report,
    summary: {
      total: topTotal,
      passed: topPassed,
      failed: topFailed,
      skipped: topSkipped,
      pending: topPending,
      durationMs: topDuration,
    },
    features,
  };
}

export interface FailureRef {
  featureId: string;
  scenarioId: string;
  scenarioTitle: string;
  errorMessage?: string;
}

/** The failing scenarios themselves — for handing the whole red set to an agent. */
export function failedScenarios(report: StoryReport): ReportScenario[] {
  return report.features.flatMap((f) => f.scenarios.filter((s) => s.status === "failed"));
}

export function listFailures(report: StoryReport): FailureRef[] {
  const out: FailureRef[] = [];
  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      if (scenario.status === "failed") {
        const ref: FailureRef = {
          featureId: feature.id,
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
        };
        if (scenario.errorMessage !== undefined) {
          ref.errorMessage = scenario.errorMessage;
        }
        out.push(ref);
      }
    }
  }
  return out;
}
