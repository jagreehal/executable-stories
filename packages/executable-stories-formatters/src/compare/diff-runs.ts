import type { TestCaseResult, TestRunResult } from "executable-stories-core/types/test-result";
import type {
  RunDiffResult,
  ScenarioChangeFlags,
  ScenarioChangeKind,
  ScenarioDiff,
} from "../types/compare";
import { toScenarioSnapshot } from "../types/compare";
import {
  behaviourFingerprint,
  behaviourSimilarity,
  type BehaviourIdentityInput,
} from "executable-stories-core/converters/acl/ids";

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
    renamed: 4,
    moved: 5,
    changed: 6,
    unchanged: 7,
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

/** Only re-pair fuzzy matches at or above this content similarity (0..1). */
const SIMILARITY_THRESHOLD = 0.75;

function identityInput(tc: TestCaseResult): BehaviourIdentityInput {
  return {
    scenario: tc.story.scenario,
    sourceFile: tc.sourceFile,
    steps: tc.story.steps,
    covers: tc.story.covers,
  };
}

function changedFieldsOf(flags: ScenarioChangeFlags): string[] {
  return Object.entries(flags)
    .filter(([, changed]) => changed)
    .map(([field]) => field);
}

/** Flags for a wholesale add/remove — every dimension differs from nothing. */
function allChangedFlags(errorMessage?: string): ScenarioChangeFlags {
  return {
    status: true,
    steps: true,
    docs: true,
    tags: true,
    tickets: true,
    source: true,
    duration: true,
    attachments: true,
    error: Boolean(errorMessage),
    titlePath: true,
  };
}

interface IdentityPair {
  before: TestCaseResult;
  after: TestCaseResult;
  confidence: number;
  matchedBy: "fingerprint" | "similarity";
}

/**
 * Re-pair id-unmatched removals and additions that are the same behaviour relabelled or
 * relocated. Conservative by design — a wrong pairing would hide a real deletion inside a
 * release gate, so we only match (1) one-to-one exact content fingerprints, then (2) a
 * unique fuzzy best above {@link SIMILARITY_THRESHOLD}. Anything ambiguous stays add/remove.
 */
function matchIdentities(
  removed: TestCaseResult[],
  added: TestCaseResult[]
): { pairs: IdentityPair[]; unmatchedRemoved: TestCaseResult[]; unmatchedAdded: TestCaseResult[] } {
  const pairs: IdentityPair[] = [];
  const remainingRemoved = new Set(removed);
  const remainingAdded = new Set(added);

  // Pass 1 — exact content fingerprint, one-to-one only.
  const removedByFp = new Map<string, TestCaseResult[]>();
  const addedByFp = new Map<string, TestCaseResult[]>();
  for (const tc of remainingRemoved) {
    const fp = behaviourFingerprint(identityInput(tc));
    if (fp === "") continue;
    (removedByFp.get(fp) ?? removedByFp.set(fp, []).get(fp)!).push(tc);
  }
  for (const tc of remainingAdded) {
    const fp = behaviourFingerprint(identityInput(tc));
    if (fp === "") continue;
    (addedByFp.get(fp) ?? addedByFp.set(fp, []).get(fp)!).push(tc);
  }
  for (const [fp, removedGroup] of removedByFp) {
    const addedGroup = addedByFp.get(fp);
    if (removedGroup.length === 1 && addedGroup && addedGroup.length === 1) {
      pairs.push({ before: removedGroup[0], after: addedGroup[0], confidence: 1, matchedBy: "fingerprint" });
      remainingRemoved.delete(removedGroup[0]);
      remainingAdded.delete(addedGroup[0]);
    }
  }

  // Pass 2 — guarded fuzzy: a unique best match above threshold.
  for (const before of [...remainingRemoved]) {
    let best: TestCaseResult | undefined;
    let bestScore = 0;
    let tied = false;
    for (const after of remainingAdded) {
      const score = behaviourSimilarity(identityInput(before), identityInput(after));
      if (score > bestScore) {
        bestScore = score;
        best = after;
        tied = false;
      } else if (score === bestScore) {
        tied = true;
      }
    }
    if (best && !tied && bestScore >= SIMILARITY_THRESHOLD) {
      pairs.push({ before, after: best, confidence: Math.round(bestScore * 100) / 100, matchedBy: "similarity" });
      remainingRemoved.delete(before);
      remainingAdded.delete(best);
    }
  }

  return {
    pairs,
    unmatchedRemoved: [...remainingRemoved],
    unmatchedAdded: [...remainingAdded],
  };
}

/** A content-preserving identity change is a move when only the file differs, else a rename. */
function identityKind(before: TestCaseResult, after: TestCaseResult): "renamed" | "moved" {
  const titleChanged = before.story.scenario !== after.story.scenario;
  const fileChanged = before.sourceFile !== after.sourceFile;
  return fileChanged && !titleChanged ? "moved" : "renamed";
}

export interface DiffRunsOptions {
  /**
   * The current run covers only some test files (a filtered local run, a CI
   * shard, or a push from a watch session). A baseline scenario in a file the
   * current run never touched is then "not run", not "removed" — without this
   * a one-file run against a full baseline reports the whole suite as deleted.
   *
   * Deliberately opt-in: a file that is absent because it was deleted looks
   * exactly like a file that is absent because it was not selected, and
   * guessing wrong hides a real deletion from a release gate.
   */
  partialCurrent?: boolean;
}

export function diffRuns(
  baseline: TestRunResult,
  current: TestRunResult,
  options: DiffRunsOptions = {}
): RunDiffResult {
  const baselineById = new Map(baseline.testCases.map((tc) => [tc.id, tc]));
  const currentById = new Map(current.testCases.map((tc) => [tc.id, tc]));
  const ids = new Set([...baselineById.keys(), ...currentById.keys()]);

  // The current run's own scenarios define its scope: the files it covered.
  const coveredFiles = options.partialCurrent
    ? new Set(current.testCases.map((tc) => tc.sourceFile))
    : undefined;

  const scenarios: ScenarioDiff[] = [];
  const removedCases: TestCaseResult[] = [];
  const addedCases: TestCaseResult[] = [];
  let notRun = 0;

  // First pass: id-matched scenarios diff in place; id-unique ones are collected so we can
  // try to re-pair renames/moves before declaring them genuine additions/deletions.
  for (const id of ids) {
    const before = baselineById.get(id);
    const after = currentById.get(id);

    if (!before && after) {
      addedCases.push(after);
      continue;
    }
    if (before && !after) {
      // Out of a partial run's scope: not observed, so nothing can be said about
      // it. It also stays out of rename/move matching, since the file that would
      // prove the move was never run.
      if (coveredFiles && !coveredFiles.has(before.sourceFile)) {
        notRun += 1;
        continue;
      }
      removedCases.push(before);
      continue;
    }
    if (!before || !after) continue;

    const flags = buildFlags(before, after);
    const changedFields = changedFieldsOf(flags);
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

  // Second pass: re-pair relabelled/relocated behaviours so a rename is not a false
  // delete + add. Matched pairs become `renamed`/`moved`; leftovers stay added/removed.
  const { pairs, unmatchedRemoved, unmatchedAdded } = matchIdentities(removedCases, addedCases);

  for (const { before, after, confidence, matchedBy } of pairs) {
    const flags = buildFlags(before, after);
    scenarios.push({
      kind: identityKind(before, after),
      id: after.id,
      previousId: before.id,
      scenario: after.story.scenario,
      sourceFile: after.sourceFile,
      sourceLine: after.sourceLine,
      baseline: toScenarioSnapshot(before),
      current: toScenarioSnapshot(after),
      flags,
      changedFields: changedFieldsOf(flags),
      durationDeltaMs: after.durationMs - before.durationMs,
      matchConfidence: confidence,
      matchedBy,
    });
  }

  for (const after of unmatchedAdded) {
    const flags = allChangedFlags(after.errorMessage);
    scenarios.push({
      kind: "added",
      id: after.id,
      scenario: after.story.scenario,
      sourceFile: after.sourceFile,
      sourceLine: after.sourceLine,
      current: toScenarioSnapshot(after),
      flags,
      changedFields: changedFieldsOf(flags),
    });
  }

  for (const before of unmatchedRemoved) {
    const flags = allChangedFlags(before.errorMessage);
    scenarios.push({
      kind: "removed",
      id: before.id,
      scenario: before.story.scenario,
      sourceFile: before.sourceFile,
      sourceLine: before.sourceLine,
      baseline: toScenarioSnapshot(before),
      flags,
      changedFields: changedFieldsOf(flags),
    });
  }

  const sorted = sortDiffs(scenarios);
  const summary = {
    totalBaseline: baseline.testCases.length,
    totalCurrent: current.testCases.length,
    added: sorted.filter((s) => s.kind === "added").length,
    removed: sorted.filter((s) => s.kind === "removed").length,
    renamed: sorted.filter((s) => s.kind === "renamed").length,
    moved: sorted.filter((s) => s.kind === "moved").length,
    changed: sorted.filter((s) => s.kind === "changed").length,
    regressed: sorted.filter((s) => s.kind === "regressed").length,
    fixed: sorted.filter((s) => s.kind === "fixed").length,
    unchanged: sorted.filter((s) => s.kind === "unchanged").length,
    notRun,
  };

  return {
    baseline,
    current,
    summary,
    scenarios: sorted,
  };
}

