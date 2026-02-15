/**
 * Stability grade calculation (composite score).
 */

import type { StabilityGrade } from "./types";

export interface CalculateStabilityArgs {
  passRate: number;
  flakinessScore: number;
  longestPassStreak: number;
  sampleSize: number;
}

export function calculateStability(args: CalculateStabilityArgs): StabilityGrade {
  const { passRate, flakinessScore, longestPassStreak, sampleSize } = args;

  const inverseFlakiness = 1 - flakinessScore;
  const streakNorm = longestPassStreak / Math.min(sampleSize, 10);

  const score = passRate * 0.6 + inverseFlakiness * 0.3 + streakNorm * 0.1;

  if (score >= 0.95) return "A";
  if (score >= 0.85) return "B";
  if (score >= 0.70) return "C";
  if (score >= 0.50) return "D";
  return "F";
}
