/**
 * Flakiness calculation based on status transitions.
 */

import type { HistoryEntry, FlakinessLevel } from "./types";
import { MIN_FLAKINESS_SAMPLES } from "./sample-policy";

export interface FlakinessResult {
  flakinessLevel: FlakinessLevel;
  flakinessScore: number;
  failureRate: number;
  longestPassStreak: number;
  longestFailStreak: number;
}

export function calculateFlakiness(args: {
  entries: HistoryEntry[];
}): FlakinessResult {
  const { entries } = args;

  // Only count pass/fail entries (exclude skipped/pending)
  const countable = entries.filter(
    (e) => e.status === "passed" || e.status === "failed",
  );

  if (countable.length < MIN_FLAKINESS_SAMPLES) {
    return {
      flakinessLevel: "stable",
      flakinessScore: 0,
      failureRate: 0,
      longestPassStreak: countable.length,
      longestFailStreak: 0,
    };
  }

  // Count transitions (consecutive entries with different status)
  let transitions = 0;
  for (let i = 1; i < countable.length; i++) {
    if (countable[i].status !== countable[i - 1].status) {
      transitions++;
    }
  }

  const transitionScore = transitions / (countable.length - 1);
  const failures = countable.filter((e) => e.status === "failed").length;
  const failureRate = failures / countable.length;

  // Calculate streaks
  let longestPassStreak = 0;
  let longestFailStreak = 0;
  let currentPassStreak = 0;
  let currentFailStreak = 0;

  for (const e of countable) {
    if (e.status === "passed") {
      currentPassStreak++;
      currentFailStreak = 0;
      if (currentPassStreak > longestPassStreak) {
        longestPassStreak = currentPassStreak;
      }
    } else {
      currentFailStreak++;
      currentPassStreak = 0;
      if (currentFailStreak > longestFailStreak) {
        longestFailStreak = currentFailStreak;
      }
    }
  }

  // Classification
  let flakinessLevel: FlakinessLevel;
  if (
    transitionScore > 0.5 ||
    (transitionScore > 0.3 && failureRate > 0.2)
  ) {
    flakinessLevel = "flaky";
  } else if (transitionScore > 0.2 || failureRate > 0.3) {
    flakinessLevel = "unstable";
  } else {
    flakinessLevel = "stable";
  }

  return {
    flakinessLevel,
    flakinessScore: transitionScore,
    failureRate,
    longestPassStreak,
    longestFailStreak,
  };
}
