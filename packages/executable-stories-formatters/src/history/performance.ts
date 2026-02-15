/**
 * Performance trend detection via half-split comparison.
 */

import type { HistoryEntry, PerformanceTrend } from "./types";
import { MIN_PERF_SAMPLES } from "./sample-policy";

export interface PerformanceResult {
  trend: PerformanceTrend;
  avgDurationMs: number;
}

export function detectPerformanceTrend(args: {
  entries: HistoryEntry[];
}): PerformanceResult {
  const { entries } = args;

  // Filter out entries with no meaningful duration data
  const countable = entries.filter(
    (e) => e.status !== "skipped" && e.status !== "pending",
  );

  if (countable.length === 0) {
    return { trend: "stable", avgDurationMs: 0 };
  }

  const avgAll =
    countable.reduce((sum, e) => sum + e.durationMs, 0) / countable.length;

  if (countable.length < MIN_PERF_SAMPLES) {
    return { trend: "stable", avgDurationMs: avgAll };
  }

  // Split into earlier half and recent half
  const mid = Math.floor(countable.length / 2);
  const earlier = countable.slice(0, mid);
  const recent = countable.slice(mid);

  const earlierAvg =
    earlier.reduce((sum, e) => sum + e.durationMs, 0) / earlier.length;
  const recentAvg =
    recent.reduce((sum, e) => sum + e.durationMs, 0) / recent.length;

  let trend: PerformanceTrend;
  if (earlierAvg === 0) {
    trend = "stable";
  } else {
    const change = (recentAvg - earlierAvg) / earlierAvg;
    if (change > 0.1) {
      trend = "regressing";
    } else if (change < -0.1) {
      trend = "improving";
    } else {
      trend = "stable";
    }
  }

  return { trend, avgDurationMs: avgAll };
}
