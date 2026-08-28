/**
 * Whether a report was assembled from more than one test run.
 *
 * Scenarios carry the run that produced them, so a report holding several
 * distinct stamps is a composite rather than a picture of one run. Readers are
 * handed the rendered file, not the directory behind it, so the report has to
 * say this itself or the only explanation lives in state they cannot see.
 */
import type { TestCaseResult } from "../types/test-result.js";

export interface AccumulationSummary {
  /** Distinct runs represented, counted by their stamps. */
  runs: number;
  oldestRunAtMs: number;
  newestRunAtMs: number;
}

/**
 * Summarise the runs behind these scenarios, or undefined when they all came
 * from one run (or predate stamping, where there is nothing to disclose).
 */
export function summarizeAccumulation(
  testCases: readonly TestCaseResult[]
): AccumulationSummary | undefined {
  const stamps = testCases
    .map((tc) => tc.lastRunAtMs)
    .filter((ms): ms is number => typeof ms === "number" && ms > 0);
  if (stamps.length === 0) return undefined;

  const distinct = [...new Set(stamps)].sort((a, b) => a - b);
  if (distinct.length < 2) return undefined;

  return {
    runs: distinct.length,
    oldestRunAtMs: distinct[0]!,
    newestRunAtMs: distinct[distinct.length - 1]!,
  };
}
