/**
 * "Since YOU were last here" — a per-reader delta, kept in this browser only.
 *
 * The run-to-run delta (<ReportLastRunDelta>) answers "what changed in the last
 * run", which is rarely the question someone opening a week-old tab arrives
 * with. This compares the report against the statuses that reader last saw,
 * however many runs ago that was. Pure functions; the storage and the clock
 * live in <ReportSinceLastVisit>.
 */

import type { StoryReport } from "executable-stories-core";
import type { ScenarioRef, ScenarioRunStatus } from "../lib/run-history";

export interface VisitSnapshot {
  runId: string;
  atMs: number;
  statuses: Record<string, ScenarioRunStatus>;
}

export interface VisitDelta {
  /** When the reader was last here. */
  sinceMs: number;
  newlyFailing: ScenarioRef[];
  newlyPassing: ScenarioRef[];
  /** Scenarios that did not exist (for this reader) at the last visit. */
  added: ScenarioRef[];
}

export function snapshotOf(report: StoryReport, atMs: number): VisitSnapshot {
  const statuses: Record<string, ScenarioRunStatus> = {};
  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      statuses[scenario.id] = scenario.status;
    }
  }
  return { runId: report.runId, atMs, statuses };
}

/**
 * Null when there is nothing worth saying: no previous visit, the same run the
 * reader already saw, or a new run that changed nothing they had seen.
 */
export function diffSinceVisit(previous: VisitSnapshot | null, report: StoryReport): VisitDelta | null {
  if (!previous) return null;
  if (previous.runId === report.runId) return null;

  const newlyFailing: ScenarioRef[] = [];
  const newlyPassing: ScenarioRef[] = [];
  const added: ScenarioRef[] = [];

  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      const ref: ScenarioRef = { id: scenario.id, title: scenario.title };
      const before = previous.statuses[scenario.id];
      if (before === undefined) {
        added.push(ref);
      } else if (before !== "failed" && scenario.status === "failed") {
        newlyFailing.push(ref);
      } else if (before === "failed" && scenario.status === "passed") {
        newlyPassing.push(ref);
      }
    }
  }

  if (newlyFailing.length === 0 && newlyPassing.length === 0 && added.length === 0) return null;
  return { sinceMs: previous.atMs, newlyFailing, newlyPassing, added };
}
