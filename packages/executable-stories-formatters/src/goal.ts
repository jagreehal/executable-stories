/**
 * `goal` — a behavioral definition-of-done for autonomous agent loops.
 *
 * A `/goal`-style loop keeps working until a verifiable condition holds. This
 * expresses that condition in behavior, not "tests green and lint clean": the
 * required scenarios pass, nothing regressed, and nobody weakened a scenario to
 * fake done (the ratchet). It returns a clear met / not-met verdict and what is
 * left, so the loop and the human reading after it can both trust "done".
 */

import type { TestCaseResult, TestRunResult, TestStatus } from "executable-stories-core/types/test-result";
import { assertiveSteps } from "executable-stories-core";
import { diffRuns } from "./compare/diff-runs";
import { asNoul, type JevClient } from "./jev";

/** Result of one required selector (a tag, ticket, or scenario that must pass). */
export interface GoalRequirementResult {
  /** Human-readable selector, e.g. "tag:US-101", "ticket:CART-9", "all scenarios". */
  selector: string;
  matched: number;
  passed: number;
  /** Titles of matched scenarios that did not pass. */
  failing: string[];
  /** matched > 0 and every matched scenario passed. */
  met: boolean;
}

/** A scenario that was removed or weakened versus the baseline (anti-fake-done). */
export interface RatchetViolation {
  id: string;
  title: string;
  kind: "removed" | "disabled" | "weakened";
  detail: string;
  /** Where the scenario now lives. Absent when it was removed. */
  sourceFile?: string;
  sourceLine?: number;
}

export interface GoalReport {
  /** True only when every requirement is met and no enforced guard fired. */
  met: boolean;
  requirements: GoalRequirementResult[];
  /** Scenarios that went passed -> failed versus baseline (when --no-regressions). */
  regressions: Array<{ id: string; title: string }>;
  regressionsEnforced: boolean;
  /** Files where a test failed before declaring its scenario. Any of them blocks `met`. */
  incompleteFiles: string[];
  ratchet: {
    enforced: boolean;
    violations: RatchetViolation[];
    /** Jev's read of scenarios that changed without shrinking. Never affects `met`. */
    advisories: RatchetViolation[];
    /**
     * Baseline scenarios this run could not have seen: absent from a `filtered`
     * run, or from an incomplete file. Any of them blocks `met`: only a full run
     * proves a scenario is still there.
     */
    unchecked: Array<{ id: string; title: string }>;
  };
}

export interface GoalArgs {
  run: TestRunResult;
  baseline?: TestRunResult;
  requireTags: string[];
  requireTickets: string[];
  requireScenarios: string[];
  enforceNoRegressions: boolean;
  enforceRatchet: boolean;
  format: "text" | "json";
}

export type GoalDeps = Record<string, never>;

const ACTIVE: TestStatus[] = ["passed", "failed"];

export function buildGoal(args: GoalArgs, _deps: GoalDeps = {}): GoalReport {
  const { run, baseline } = args;
  const cases = run.testCases;

  // Each required tag/ticket/scenario becomes a selector that must resolve to
  // at least one passing scenario. With none declared, the goal is "all pass".
  const selectors: Array<{ label: string; match: (tc: TestCaseResult) => boolean }> = [
    ...args.requireTags.map((tag) => ({ label: `tag:${tag}`, match: (tc: TestCaseResult) => tc.tags.includes(tag) })),
    ...args.requireTickets.map((id) => ({ label: `ticket:${id}`, match: (tc: TestCaseResult) => (tc.story.tickets ?? []).some((t) => t.id === id) })),
    ...args.requireScenarios.map((sel) => ({ label: `scenario:${sel}`, match: (tc: TestCaseResult) => tc.id === sel || tc.story.scenario === sel })),
  ];

  const requirements: GoalRequirementResult[] =
    selectors.length === 0
      ? [evaluate("all scenarios", cases)]
      : selectors.map((s) => evaluate(s.label, cases.filter(s.match)));

  const regressions: GoalReport["regressions"] = [];
  if (baseline && args.enforceNoRegressions) {
    const before = statusMap(baseline);
    for (const tc of cases) {
      if (before.get(tc.id) === "passed" && tc.status === "failed") {
        regressions.push({ id: tc.id, title: tc.story.scenario });
      }
    }
  }

  const { violations, unchecked } =
    baseline && args.enforceRatchet ? ratchet(baseline, run) : { violations: [], unchecked: [] };

  // A file that broke before declaring its scenarios hides them from every check above.
  const incompleteFiles = [...(run.incompleteSourceFiles ?? [])].sort();
  const met =
    requirements.every((r) => r.met) &&
    regressions.length === 0 &&
    violations.length === 0 &&
    unchecked.length === 0 &&
    incompleteFiles.length === 0;

  return {
    met,
    requirements,
    regressions,
    regressionsEnforced: Boolean(baseline && args.enforceNoRegressions),
    incompleteFiles,
    ratchet: { enforced: Boolean(baseline && args.enforceRatchet), violations, advisories: [], unchecked },
  };
}

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/**
 * Assertions the claim steps observably made, or undefined when the adapter
 * observed none of them (absent is "cannot see", never zero).
 */
function observedAssertions(tc: TestCaseResult): number | undefined {
  const counted = assertiveSteps(tc.story.steps).filter((s) => typeof s.assertions === "number");
  return counted.length === 0 ? undefined : counted.reduce((sum, s) => sum + (s.assertions ?? 0), 0);
}

/**
 * The ratchet: what the suite checked on the baseline that it no longer checks.
 * A scenario is matched by id, then through `diffRuns`' rename/move pairing,
 * so relabelling a scenario is not reported as removing it. Shared by `goal`
 * and `review`.
 */
export function ratchet(
  baseline: TestRunResult,
  run: TestRunResult,
): { violations: RatchetViolation[]; unchecked: Array<{ id: string; title: string }> } {
  const current = new Map(run.testCases.map((tc) => [tc.id, tc]));
  const renamedTo = new Map(
    diffRuns(baseline, run).scenarios.flatMap((s) => (s.previousId ? [[s.previousId, s.id] as const] : [])),
  );
  // A focused run lacks everything it did not target, so its absences prove
  // nothing. An unknown scope still counts, so the guard stays strict for
  // adapters that cannot tell.
  const incomplete = new Set(run.incompleteSourceFiles ?? []);
  const violations: RatchetViolation[] = [];
  const unchecked: Array<{ id: string; title: string }> = [];

  for (const base of baseline.testCases) {
    const now = current.get(base.id) ?? current.get(renamedTo.get(base.id) ?? "");
    if (!now && (run.runScope === "filtered" || incomplete.has(base.sourceFile))) {
      unchecked.push({ id: base.id, title: base.story.scenario });
      continue;
    }
    if (!now) {
      violations.push({ id: base.id, title: base.story.scenario, kind: "removed", detail: "scenario no longer present" });
      continue;
    }
    const at = { sourceFile: now.sourceFile, sourceLine: now.sourceLine };
    if (ACTIVE.includes(base.status) && (now.status === "skipped" || now.status === "pending")) {
      violations.push({ id: base.id, title: base.story.scenario, kind: "disabled", detail: `${base.status} -> ${now.status}`, ...at });
    }
    const reasons: string[] = [];
    const baseSteps = base.story.steps.length;
    const nowSteps = now.story.steps.length;
    if (nowSteps < baseSteps) reasons.push(`${count(baseSteps, "step")} -> ${count(nowSteps, "step")}`);
    // Only two green runs compare: a failing run stops at the failure, so its
    // count is short for a reason that is not weakening.
    const before = observedAssertions(base);
    const after = observedAssertions(now);
    if (base.status === "passed" && now.status === "passed" && before !== undefined && after !== undefined && after < before) {
      reasons.push(`${count(before, "assertion")} -> ${count(after, "assertion")}`);
    }
    if (reasons.length > 0) {
      violations.push({ id: base.id, title: base.story.scenario, kind: "weakened", detail: reasons.join("; "), ...at });
    }
  }
  return { violations, unchecked };
}

/** Jev must be this sure before a rewrite is called out as weakening. */
export const GOAL_WEAKENED_MIN_PROBABILITY = 0.75;

const stepText = (tc: TestCaseResult) => tc.story.steps.map((s) => `${s.keyword} ${s.text}`);

/**
 * The step-count ratchet sees counts, so merging two steps keeps it clean.
 * When a baseline scenario's steps were rewritten without shrinking, ask Jev
 * whether the new version checks less. Advisory only: `met` is decided by
 * the rules above, and this is a judgment.
 */
export async function enrichGoal(report: GoalReport, args: GoalArgs, jev: JevClient): Promise<GoalReport> {
  const { baseline } = args;
  if (!baseline || !report.ratchet.enforced) return report;
  const current = new Map(args.run.testCases.map((tc) => [tc.id, tc]));
  const flagged = new Set(report.ratchet.violations.map((v) => v.id));

  const rewritten = baseline.testCases.flatMap((base) => {
    const now = current.get(base.id);
    if (!now || flagged.has(base.id)) return [];
    const before = stepText(base);
    const after = stepText(now);
    return before.join("\n") === after.join("\n") ? [] : [{ base, before, after }];
  });

  const advisories = (
    await Promise.all(
      rewritten.map(async ({ base, before, after }) => {
        const answers = await jev.ask(
          { baseline: before, now: after },
          {
            weakened: {
              type: "noul",
              instructions:
                "Does the NOW scenario check less than the BASELINE scenario: fewer or weaker assertions, looser expectations, or a removed check?",
            },
          },
        );
        const p = asNoul(answers.weakened);
        if (p === undefined || p < GOAL_WEAKENED_MIN_PROBABILITY) return [];
        return [{ id: base.id, title: base.story.scenario, kind: "weakened" as const, detail: `jev ${p.toFixed(2)}: steps rewritten, checks less` }];
      }),
    )
  ).flat();

  return { ...report, ratchet: { ...report.ratchet, advisories } };
}

function evaluate(selector: string, matched: TestCaseResult[]): GoalRequirementResult {
  const passed = matched.filter((tc) => tc.status === "passed").length;
  const failing = matched.filter((tc) => tc.status !== "passed").map((tc) => tc.story.scenario);
  return {
    selector,
    matched: matched.length,
    passed,
    failing,
    met: matched.length > 0 && failing.length === 0,
  };
}

function statusMap(run: TestRunResult): Map<string, TestStatus> {
  return new Map(run.testCases.map((tc) => [tc.id, tc.status]));
}

export function renderGoal(report: GoalReport, format: "text" | "json"): string {
  if (format === "json") return JSON.stringify(report, null, 2);

  const lines = [`GOAL: ${report.met ? "met" : "not met"}`];

  for (const req of report.requirements) {
    if (req.matched === 0) {
      lines.push(`  ${req.selector}: no matching scenario (no proof)`);
      continue;
    }
    const tail = req.failing.length > 0 ? ` (${req.failing.length} failing)` : "";
    lines.push(`  ${req.selector}: ${req.passed}/${req.matched} scenarios pass${tail}`);
  }

  if (report.regressionsEnforced) {
    if (report.regressions.length === 0) {
      lines.push("  regressions: 0");
    } else {
      lines.push(`  regressions: ${report.regressions.length} (${report.regressions.map((r) => r.title).join(", ")})`);
    }
  }

  if (report.incompleteFiles.length > 0) {
    lines.push(`  incomplete: ${report.incompleteFiles.length} file(s) failed before declaring scenarios (${report.incompleteFiles.join(", ")})`);
  }

  if (report.ratchet.enforced) {
    if (report.ratchet.violations.length === 0) {
      lines.push("  ratchet: clean (0 scenarios removed/weakened)");
    } else {
      lines.push(`  ratchet: ${report.ratchet.violations.length} removed/weakened`);
      for (const v of report.ratchet.violations) {
        lines.push(`    ${v.kind}: ${v.title} (${v.detail})`);
      }
    }
    if (report.ratchet.unchecked.length > 0) {
      lines.push(`  not checked for removal: ${report.ratchet.unchecked.length} baseline scenarios this run did not cover; run the full suite, or pass --no-ratchet for a focused run`);
    }
    for (const v of report.ratchet.advisories) {
      lines.push(`    advisory ${v.kind}: ${v.title} (${v.detail})`);
    }
  }

  return lines.join("\n");
}
