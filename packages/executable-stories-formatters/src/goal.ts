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
}

export interface GoalReport {
  /** True only when every requirement is met and no enforced guard fired. */
  met: boolean;
  requirements: GoalRequirementResult[];
  /** Scenarios that went passed -> failed versus baseline (when --no-regressions). */
  regressions: Array<{ id: string; title: string }>;
  regressionsEnforced: boolean;
  ratchet: { enforced: boolean; violations: RatchetViolation[] };
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

  const violations: RatchetViolation[] = [];
  if (baseline && args.enforceRatchet) {
    const current = new Map(cases.map((tc) => [tc.id, tc]));
    for (const base of baseline.testCases) {
      const now = current.get(base.id);
      if (!now) {
        violations.push({ id: base.id, title: base.story.scenario, kind: "removed", detail: "scenario no longer present" });
        continue;
      }
      if (ACTIVE.includes(base.status) && (now.status === "skipped" || now.status === "pending")) {
        violations.push({ id: base.id, title: base.story.scenario, kind: "disabled", detail: `${base.status} -> ${now.status}` });
      }
      const baseSteps = base.story.steps.length;
      const nowSteps = now.story.steps.length;
      if (nowSteps < baseSteps) {
        violations.push({ id: base.id, title: base.story.scenario, kind: "weakened", detail: `${baseSteps} steps -> ${nowSteps} steps` });
      }
    }
  }

  const met =
    requirements.every((r) => r.met) &&
    regressions.length === 0 &&
    violations.length === 0;

  return {
    met,
    requirements,
    regressions,
    regressionsEnforced: Boolean(baseline && args.enforceNoRegressions),
    ratchet: { enforced: Boolean(baseline && args.enforceRatchet), violations },
  };
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

  if (report.ratchet.enforced) {
    if (report.ratchet.violations.length === 0) {
      lines.push("  ratchet: clean (0 scenarios removed/weakened)");
    } else {
      lines.push(`  ratchet: ${report.ratchet.violations.length} removed/weakened`);
      for (const v of report.ratchet.violations) {
        lines.push(`    ${v.kind}: ${v.title} (${v.detail})`);
      }
    }
  }

  return lines.join("\n");
}
