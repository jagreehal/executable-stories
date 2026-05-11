/**
 * Pure functions for filtering a StoryReport by a search query.
 * Used by <ReportInteractive>. Kept side-effect-free so it can be unit-tested.
 */

import type {
  ReportScenario,
  ReportFeature,
  StoryReport,
} from "executable-stories-formatters";

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function scenarioMatches(scenario: ReportScenario, q: string): boolean {
  if (q === "") return true;
  if (scenario.title.toLowerCase().includes(q)) return true;
  for (const tag of scenario.tags) {
    if (tag.toLowerCase().includes(q)) return true;
  }
  for (const step of scenario.steps) {
    if (step.text.toLowerCase().includes(q)) return true;
  }
  return false;
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

export function filterReport(report: StoryReport, query: string): StoryReport {
  const q = normalizeQuery(query);
  if (q === "") return report;

  const features: ReportFeature[] = [];
  let topTotal = 0,
    topPassed = 0,
    topFailed = 0,
    topSkipped = 0,
    topPending = 0,
    topDuration = 0;

  for (const feature of report.features) {
    const matched = feature.scenarios.filter((s) => scenarioMatches(s, q));
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
