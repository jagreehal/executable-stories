/**
 * Composite test metrics from history entries.
 */

import type { HistoryEntry, TestMetrics } from "./types";
import { calculateFlakiness } from "./flakiness";
import { detectPerformanceTrend } from "./performance";
import { calculateStability } from "./stability";

export function computeTestMetrics(args: {
  testId: string;
  entries: HistoryEntry[];
}): TestMetrics {
  const { testId, entries } = args;

  const flakiness = calculateFlakiness({ entries });
  const perf = detectPerformanceTrend({ entries });

  // Calculate pass rate (excluding skipped/pending)
  const countable = entries.filter(
    (e) => e.status === "passed" || e.status === "failed",
  );
  const passRate =
    countable.length > 0
      ? countable.filter((e) => e.status === "passed").length / countable.length
      : 1;

  const stabilityGrade = calculateStability({
    passRate,
    flakinessScore: flakiness.flakinessScore,
    longestPassStreak: flakiness.longestPassStreak,
    sampleSize: entries.length,
  });

  // Calculate consecutive failures from the tail end
  let consecutiveFailures = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].status === "failed") {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  return {
    testId,
    flakinessLevel: flakiness.flakinessLevel,
    flakinessScore: flakiness.flakinessScore,
    failureRate: flakiness.failureRate,
    stabilityGrade,
    performanceTrend: perf.trend,
    avgDurationMs: perf.avgDurationMs,
    passRate,
    longestPassStreak: flakiness.longestPassStreak,
    consecutiveFailures,
    sampleSize: entries.length,
  };
}
