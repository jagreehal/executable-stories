import type { TestCaseResult, TestRunResult } from "../types/test-result";
import type {
  RunDiffResult,
  ScenarioChangeFlags,
  ScenarioChangeKind,
  ScenarioDiff,
} from "../types/compare";
import { toScenarioSnapshot } from "../types/compare";

function compareStringArrays(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function isFailedStatus(status: TestCaseResult["status"]): boolean {
  return status === "failed";
}

function getPrimaryKind(
  baseline: TestCaseResult,
  current: TestCaseResult,
  hasChanges: boolean
): ScenarioChangeKind {
  if (isFailedStatus(current.status) && !isFailedStatus(baseline.status)) {
    return "regressed";
  }
  if (!isFailedStatus(current.status) && isFailedStatus(baseline.status)) {
    return "fixed";
  }
  return hasChanges ? "changed" : "unchanged";
}

function buildFlags(
  baseline: TestCaseResult,
  current: TestCaseResult
): ScenarioChangeFlags {
  const baselineDocs = baseline.story.docs ?? [];
  const currentDocs = current.story.docs ?? [];

  return {
    status: baseline.status !== current.status,
    steps: stableJson(baseline.story.steps) !== stableJson(current.story.steps),
    docs: stableJson(baselineDocs) !== stableJson(currentDocs),
    tags: !compareStringArrays(baseline.tags, current.tags),
    tickets: stableJson(baseline.story.tickets ?? []) !== stableJson(current.story.tickets ?? []),
    source:
      baseline.sourceFile !== current.sourceFile ||
      baseline.sourceLine !== current.sourceLine,
    duration: baseline.durationMs !== current.durationMs,
    attachments:
      stableJson(baseline.attachments) !== stableJson(current.attachments),
    error:
      (baseline.errorMessage ?? "") !== (current.errorMessage ?? ""),
    titlePath: !compareStringArrays(baseline.titlePath, current.titlePath),
  };
}

function sortDiffs(scenarios: ScenarioDiff[]): ScenarioDiff[] {
  const rank: Record<ScenarioChangeKind, number> = {
    regressed: 0,
    fixed: 1,
    added: 2,
    removed: 3,
    changed: 4,
    unchanged: 5,
  };

  return [...scenarios].sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) {
      return rank[a.kind] - rank[b.kind];
    }
    if (a.sourceFile !== b.sourceFile) {
      return a.sourceFile.localeCompare(b.sourceFile);
    }
    if (a.sourceLine !== b.sourceLine) {
      return a.sourceLine - b.sourceLine;
    }
    return a.scenario.localeCompare(b.scenario);
  });
}

export function diffRuns(
  baseline: TestRunResult,
  current: TestRunResult
): RunDiffResult {
  const baselineById = new Map(baseline.testCases.map((tc) => [tc.id, tc]));
  const currentById = new Map(current.testCases.map((tc) => [tc.id, tc]));
  const ids = new Set([...baselineById.keys(), ...currentById.keys()]);

  const scenarios: ScenarioDiff[] = [];

  for (const id of ids) {
    const before = baselineById.get(id);
    const after = currentById.get(id);

    if (!before && after) {
      const flags: ScenarioChangeFlags = {
        status: true,
        steps: true,
        docs: true,
        tags: true,
        tickets: true,
        source: true,
        duration: true,
        attachments: true,
        error: Boolean(after.errorMessage),
        titlePath: true,
      };
      scenarios.push({
        kind: "added",
        id,
        scenario: after.story.scenario,
        sourceFile: after.sourceFile,
        sourceLine: after.sourceLine,
        current: toScenarioSnapshot(after),
        flags,
        changedFields: Object.entries(flags)
          .filter(([, changed]) => changed)
          .map(([field]) => field),
      });
      continue;
    }

    if (before && !after) {
      const flags: ScenarioChangeFlags = {
        status: true,
        steps: true,
        docs: true,
        tags: true,
        tickets: true,
        source: true,
        duration: true,
        attachments: true,
        error: Boolean(before.errorMessage),
        titlePath: true,
      };
      scenarios.push({
        kind: "removed",
        id,
        scenario: before.story.scenario,
        sourceFile: before.sourceFile,
        sourceLine: before.sourceLine,
        baseline: toScenarioSnapshot(before),
        flags,
        changedFields: Object.entries(flags)
          .filter(([, changed]) => changed)
          .map(([field]) => field),
      });
      continue;
    }

    if (!before || !after) {
      continue;
    }

    const flags = buildFlags(before, after);
    const changedFields = Object.entries(flags)
      .filter(([, changed]) => changed)
      .map(([field]) => field);
    const kind = getPrimaryKind(before, after, changedFields.length > 0);

    scenarios.push({
      kind,
      id,
      scenario: after.story.scenario,
      sourceFile: after.sourceFile,
      sourceLine: after.sourceLine,
      baseline: toScenarioSnapshot(before),
      current: toScenarioSnapshot(after),
      flags,
      changedFields,
      durationDeltaMs: after.durationMs - before.durationMs,
    });
  }

  const sorted = sortDiffs(scenarios);
  const summary = {
    totalBaseline: baseline.testCases.length,
    totalCurrent: current.testCases.length,
    added: sorted.filter((s) => s.kind === "added").length,
    removed: sorted.filter((s) => s.kind === "removed").length,
    changed: sorted.filter((s) => s.kind === "changed").length,
    regressed: sorted.filter((s) => s.kind === "regressed").length,
    fixed: sorted.filter((s) => s.kind === "fixed").length,
    unchanged: sorted.filter((s) => s.kind === "unchanged").length,
  };

  return {
    baseline,
    current,
    summary,
    scenarios: sorted,
  };
}

export { createPrCommentSummary } from "./pr-summary";
export { pickAutoBaseline } from "./auto-baseline";
