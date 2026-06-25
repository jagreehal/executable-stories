/**
 * `check` — context-efficient backpressure for coding agents.
 *
 * The principle (from "Stop Babysitting Your Coding Agent. Give It Backpressure."):
 * compress success, expand failure. Passing scenarios collapse to a single count
 * line. Each failing scenario expands to its Given/When/Then narrative, the step
 * that broke, the error, and the product code it `covers` — so the agent gets an
 * actionable, intent-carrying signal instead of a wall of green.
 *
 * When a baseline run is supplied, the report also folds in what *regressed* and
 * what got *fixed* since the last run — the "retained" property of effective
 * feedback. Reuses the same status-transition vocabulary as {@link classifyStatusChange}.
 */

import type { TestCaseResult, TestStatus } from "executable-stories-core/types/test-result";
import type { StepKeyword } from "executable-stories-core/types/story";
import { failingScenarioMessage } from "./scenario-failure";

export interface CheckArgs {
  testCases: TestCaseResult[];
  /** Baseline scenario statuses keyed by scenario id, for regressed/fixed deltas. */
  baseline?: Map<string, TestStatus>;
  format: "text" | "json";
}

export type CheckDeps = Record<string, never>;

/** A single rendered step inside a failing scenario. */
export interface CheckStep {
  keyword: StepKeyword;
  text: string;
  /** True when this step is the one that failed. */
  failed: boolean;
}

/** Expanded detail for one failing scenario — the actionable payload. */
export interface CheckFailure {
  id: string;
  scenario: string;
  /** `sourceFile:sourceLine` */
  location: string;
  steps: CheckStep[];
  /** Failing step's error if isolated, else the scenario-level error. */
  errorMessage?: string;
  /** Product-code paths/globs this scenario exercises (what to fix). */
  covers: string[];
  tickets: string[];
  /** True when this scenario was passing in the baseline run. */
  regressed: boolean;
}

export interface CheckReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
  };
  failures: CheckFailure[];
  /** Count of scenarios that went passed → failed vs. the baseline. */
  regressed: number;
  /** Count of scenarios that went failed → passed vs. the baseline. */
  fixed: number;
  /** Whether a baseline was supplied (so callers know if deltas are meaningful). */
  comparedToBaseline: boolean;
}

const ICON_PASS = "✓"; // ✓
const ICON_FAIL = "✗"; // ✗
const ICON_SKIP = "⊘"; // ⊘
const ICON_PENDING = "⏳"; // ⏳
const ICON_WARN = "⚠"; // ⚠

/**
 * Build a structured check report from canonical test cases.
 * Pure: no IO. Callers render it as text or JSON and decide the exit code.
 */
export function buildCheck(args: CheckArgs, _deps: CheckDeps = {}): CheckReport {
  const { testCases, baseline } = args;

  const summary = {
    total: testCases.length,
    passed: testCases.filter((tc) => tc.status === "passed").length,
    failed: testCases.filter((tc) => tc.status === "failed").length,
    skipped: testCases.filter((tc) => tc.status === "skipped").length,
    pending: testCases.filter((tc) => tc.status === "pending").length,
  };

  let regressed = 0;
  let fixed = 0;
  if (baseline) {
    for (const tc of testCases) {
      const before = baseline.get(tc.id);
      if (before === "passed" && tc.status === "failed") regressed += 1;
      if (before === "failed" && tc.status === "passed") fixed += 1;
    }
  }

  const failures: CheckFailure[] = testCases
    .filter((tc) => tc.status === "failed")
    .map((tc) => toFailure(tc, baseline))
    // Regressions first (most actionable: an edit just broke a green scenario),
    // then stable by source location for deterministic output.
    .sort((a, b) => {
      if (a.regressed !== b.regressed) return a.regressed ? -1 : 1;
      return a.location.localeCompare(b.location);
    });

  return {
    summary,
    failures,
    regressed,
    fixed,
    comparedToBaseline: baseline !== undefined,
  };
}

function toFailure(
  tc: TestCaseResult,
  baseline?: Map<string, TestStatus>,
): CheckFailure {
  const failedIndexes = new Set(
    tc.stepResults.filter((s) => s.status === "failed").map((s) => s.index),
  );

  const steps: CheckStep[] = tc.story.steps.map((step, index) => ({
    keyword: step.keyword,
    text: step.text,
    failed: failedIndexes.has(index),
  }));

  return {
    id: tc.id,
    scenario: tc.story.scenario,
    location: `${tc.sourceFile}:${tc.sourceLine}`,
    steps,
    errorMessage: failingScenarioMessage(tc),
    covers: tc.story.covers ?? [],
    tickets: (tc.story.tickets ?? []).map((t) => t.id),
    regressed: baseline?.get(tc.id) === "passed",
  };
}

/**
 * Render the check report. Text is the default agent/human surface
 * (compressed success, expanded failure); JSON is the machine contract.
 */
export function renderCheck(report: CheckReport, format: "text" | "json"): string {
  return format === "json"
    ? JSON.stringify(report, null, 2)
    : renderCheckText(report);
}

function renderCheckText(report: CheckReport): string {
  const { summary, failures } = report;

  // One-line headline. Success is compressed to counts — no per-scenario noise.
  const headlineParts = [`${ICON_PASS} ${summary.passed} passed`];
  if (summary.failed > 0) headlineParts.push(`${ICON_FAIL} ${summary.failed} failed`);
  if (summary.skipped > 0) headlineParts.push(`${ICON_SKIP} ${summary.skipped} skipped`);
  if (summary.pending > 0) headlineParts.push(`${ICON_PENDING} ${summary.pending} pending`);
  const headline = `${headlineParts.join("   ")}   (${summary.total} scenarios)`;

  if (failures.length === 0) {
    const lines = [headline];
    if (report.comparedToBaseline && report.fixed > 0) {
      lines.push(`${ICON_PASS} ${report.fixed} fixed since baseline.`);
    }
    lines.push("All scenarios green.");
    return lines.join("\n");
  }

  const lines = [headline, ""];

  for (const f of failures) {
    lines.push(`${ICON_FAIL} ${f.scenario}${f.regressed ? "  (regressed)" : ""}`);
    lines.push(`  ${f.location}`);
    for (const step of f.steps) {
      const marker = step.failed ? `  ${ICON_FAIL} ` : "    ";
      lines.push(`${marker}${step.keyword} ${step.text}`);
    }
    if (f.errorMessage) {
      // Keep the error to its first line in text mode; full detail lives in JSON.
      const firstLine = f.errorMessage.split("\n")[0];
      lines.push(`    → ${firstLine}`);
    }
    if (f.covers.length > 0) {
      lines.push(`  covers: ${f.covers.join(", ")}`);
    }
    if (f.tickets.length > 0) {
      lines.push(`  ticket: ${f.tickets.join(", ")}`);
    }
    lines.push("");
  }

  // Retained signal: what changed since the baseline.
  if (report.comparedToBaseline) {
    if (report.regressed > 0) {
      lines.push(`${ICON_WARN} ${report.regressed} regressed since baseline (was passing).`);
    }
    if (report.fixed > 0) {
      lines.push(`${ICON_PASS} ${report.fixed} fixed since baseline.`);
    }
    if (report.regressed === 0 && report.fixed === 0) {
      lines.push("No status changes vs. baseline.");
    }
  }

  return lines.join("\n").trimEnd();
}
