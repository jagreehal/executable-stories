/**
 * Types for history tracking and test metrics.
 */

import type { CIProvider } from "executable-stories-core/types/ci";

export interface HistoryEntry {
  runId: string;
  timestamp: number;
  status: "passed" | "failed" | "skipped" | "pending";
  durationMs: number;
  ci?: { provider?: CIProvider; branch?: string; commitSha?: string };
}

export interface TestHistory {
  testId: string;
  testName: string;
  sourceFile: string;
  sourceLine?: number;
  entries: HistoryEntry[];
}

export interface HistoryStore {
  version: 1;
  maxRuns: number;
  tests: Record<string, TestHistory>;
  lastUpdated: number;
}

export type StabilityGrade = "A" | "B" | "C" | "D" | "F";
export type FlakinessLevel = "stable" | "unstable" | "flaky";
export type PerformanceTrend = "improving" | "stable" | "regressing";

export interface TestMetrics {
  testId: string;
  flakinessLevel: FlakinessLevel;
  flakinessScore: number;
  failureRate: number;
  stabilityGrade: StabilityGrade;
  performanceTrend: PerformanceTrend;
  avgDurationMs: number;
  passRate: number;
  longestPassStreak: number;
  consecutiveFailures: number;
  sampleSize: number;
}
