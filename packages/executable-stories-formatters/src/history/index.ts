/**
 * History tracking barrel exports.
 */

export type {
  HistoryEntry,
  TestHistory,
  HistoryStore,
  StabilityGrade,
  FlakinessLevel,
  PerformanceTrend,
  TestMetrics,
} from "./types";

export { loadHistory, saveHistory, updateHistory } from "./history-store";
export { calculateFlakiness } from "./flakiness";
export { detectPerformanceTrend } from "./performance";
export { calculateStability } from "./stability";
export { computeTestMetrics } from "./metrics";
export {
  MIN_PERF_SAMPLES,
  MIN_METRIC_SAMPLES,
  MIN_FLAKINESS_SAMPLES,
  hasSufficientHistory,
} from "./sample-policy";
