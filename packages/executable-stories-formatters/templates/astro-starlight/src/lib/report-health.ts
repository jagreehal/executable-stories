/**
 * Health summary for the dashboard landing page.
 *
 * Confluence dashboards are the first thing a team sees and they are static.
 * This one is computed from the latest test run, so the home page always
 * reflects whether the documented system is actually green right now.
 *
 * Pure (no Astro imports) so it can be unit-tested.
 */

import { flattenReport, type StoryReportLike, type ScenarioLike } from "./verification";

export interface FailingScenario {
  id: string;
  title: string;
  feature?: string;
  sourceFile?: string;
}

export interface HealthSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  /** Passed / total, 0..1 (0 when there are no scenarios). */
  passRate: number;
  lastRunMs?: number;
  runId?: string;
  failing: FailingScenario[];
  /** True when no run has populated the report yet. */
  empty: boolean;
}

export function summarizeHealth(report: StoryReportLike): HealthSummary {
  const scenarios: ScenarioLike[] = flattenReport(report);
  const count = (status: string) => scenarios.filter((s) => s.status === status).length;

  const passed = count("passed");
  const failed = count("failed");
  const skipped = count("skipped");
  const pending = count("pending");
  const total = scenarios.length;

  const failing: FailingScenario[] = scenarios
    .filter((s) => s.status === "failed")
    .map((s) => ({ id: s.id, title: s.title, feature: s.feature, sourceFile: s.sourceFile }));

  return {
    total,
    passed,
    failed,
    skipped,
    pending,
    passRate: total > 0 ? passed / total : 0,
    lastRunMs: report.finishedAtMs && report.finishedAtMs > 0 ? report.finishedAtMs : undefined,
    runId: report.runId && report.runId.length > 0 ? report.runId : undefined,
    failing,
    empty: total === 0,
  };
}
