import type { ScenarioChangeKind } from "./types/compare";
import type { ReportScenario, StoryReport, TestStatus } from "./types/story-report";

export interface BehaviorDiffEntry {
  id: string;
  title: string;
  sourceFile: string;
  kind: ScenarioChangeKind;
  baselineStatus?: TestStatus;
  currentStatus?: TestStatus;
}

export interface BehaviorDiff {
  schemaVersion: "1.0";
  summary: {
    added: number;
    removed: number;
    regressed: number;
    fixed: number;
    changed: number;
    unchanged: number;
  };
  scenarios: BehaviorDiffEntry[];
}

/**
 * Classify a single scenario's status transition between two runs.
 * Shares the `ScenarioChangeKind` vocabulary with the full compare engine.
 */
export function classifyStatusChange(
  baseline: TestStatus | undefined,
  current: TestStatus | undefined,
): ScenarioChangeKind {
  if (baseline === undefined) return "added";
  if (current === undefined) return "removed";
  if (baseline === current) return "unchanged";
  if (baseline === "passed" && current === "failed") return "regressed";
  if (baseline === "failed" && current === "passed") return "fixed";
  return "changed";
}

function scenarioMap(
  report: StoryReport,
): Map<string, { scenario: ReportScenario; sourceFile: string }> {
  const map = new Map<string, { scenario: ReportScenario; sourceFile: string }>();
  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      map.set(scenario.id, { scenario, sourceFile: feature.sourceFile });
    }
  }
  return map;
}

/**
 * Scenario-level diff of two StoryReports, keyed by scenario id. Reports status
 * transitions (the agent triage signal), not the full field-by-field diff that
 * the human-facing compare engine produces.
 */
export function diffStoryReports(baseline: StoryReport, current: StoryReport): BehaviorDiff {
  const base = scenarioMap(baseline);
  const curr = scenarioMap(current);
  const ids = [...new Set([...base.keys(), ...curr.keys()])];

  const scenarios: BehaviorDiffEntry[] = ids.map((id) => {
    const b = base.get(id);
    const c = curr.get(id);
    const kind = classifyStatusChange(b?.scenario.status, c?.scenario.status);
    const meta = c ?? b!;
    return {
      id,
      title: meta.scenario.title,
      sourceFile: meta.sourceFile,
      kind,
      baselineStatus: b?.scenario.status,
      currentStatus: c?.scenario.status,
    };
  });

  const summary = { added: 0, removed: 0, regressed: 0, fixed: 0, changed: 0, unchanged: 0 };
  for (const s of scenarios) summary[s.kind] += 1;

  return { schemaVersion: "1.0", summary, scenarios };
}
