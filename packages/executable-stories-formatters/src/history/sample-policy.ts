/**
 * Centralized sample-size policy for history metrics.
 *
 * Easy to tune without hunting across files.
 */

/** Minimum duration-bearing entries for performance trend analysis. */
export const MIN_PERF_SAMPLES = 6;

/** Minimum entries before showing badges/metrics in reports. */
export const MIN_METRIC_SAMPLES = 5;

/** Minimum entries for flakiness calculation (below this → "stable"). */
export const MIN_FLAKINESS_SAMPLES = 3;

/** Check whether an array meets the minimum sample threshold. */
export function hasSufficientHistory(
  entries: unknown[],
  min: number,
): boolean {
  return entries.length >= min;
}
