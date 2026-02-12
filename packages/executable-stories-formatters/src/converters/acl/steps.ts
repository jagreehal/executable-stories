/**
 * Step fallback rules for deriving step results from scenario status.
 *
 * When frameworks don't provide step-level results, we derive them
 * from the overall scenario status using these rules.
 */

import type { StoryStep } from "../../types/story";
import type { TestStatus, StepResult } from "../../types/test-result";

/**
 * Derive step results from story steps and scenario status.
 *
 * Rules:
 * - Passed: All steps are passed
 * - Skipped/Pending: All steps are skipped/pending
 * - Failed: Steps up to failure are passed, failing step is failed, rest are skipped
 *   (Heuristic: last step is the failure, or use error info if available)
 *
 * @param steps - Story steps with keywords and text
 * @param scenarioStatus - Overall scenario status
 * @param error - Optional error information to help identify failing step
 * @returns Array of step results
 */
export function deriveStepResults(
  steps: StoryStep[],
  scenarioStatus: TestStatus,
  error?: { message?: string; stack?: string }
): StepResult[] {
  if (steps.length === 0) {
    return [];
  }

  // Passed: all steps passed
  if (scenarioStatus === "passed") {
    return steps.map((_, index) => ({
      index,
      status: "passed" as TestStatus,
      durationMs: 0,
    }));
  }

  // Skipped or Pending: all steps have same status
  if (scenarioStatus === "skipped" || scenarioStatus === "pending") {
    return steps.map((_, index) => ({
      index,
      status: scenarioStatus,
      durationMs: 0,
    }));
  }

  // Failed: identify failing step and mark accordingly
  const failingIndex = findFailingStepIndex(steps, error);

  return steps.map((_, index) => {
    if (index < failingIndex) {
      // Steps before failure are passed
      return { index, status: "passed" as TestStatus, durationMs: 0 };
    } else if (index === failingIndex) {
      // Failing step
      return {
        index,
        status: "failed" as TestStatus,
        durationMs: 0,
        errorMessage: error?.message,
      };
    } else {
      // Steps after failure are skipped
      return { index, status: "skipped" as TestStatus, durationMs: 0 };
    }
  });
}

/**
 * Attempt to identify which step failed based on error information.
 *
 * Strategies:
 * 1. Look for step text in error message/stack
 * 2. Default to last step if no match found
 *
 * @param steps - Story steps
 * @param error - Error information
 * @returns Index of the failing step (0-based)
 */
function findFailingStepIndex(
  steps: StoryStep[],
  error?: { message?: string; stack?: string }
): number {
  if (!error || steps.length === 0) {
    // Default: last step failed
    return steps.length - 1;
  }

  const errorText = `${error.message ?? ""} ${error.stack ?? ""}`.toLowerCase();

  // Try to find a step mentioned in the error
  for (let i = 0; i < steps.length; i++) {
    const stepText = steps[i].text.toLowerCase();
    if (errorText.includes(stepText)) {
      return i;
    }
  }

  // Default: last step failed
  return steps.length - 1;
}

/**
 * Merge raw step events with derived step results.
 *
 * When we have partial step data from the framework, merge it with
 * the derived results, preferring actual data over derived.
 *
 * @param derived - Derived step results from fallback rules
 * @param events - Raw step events from framework (if any)
 * @returns Merged step results
 */
export function mergeStepResults(
  derived: StepResult[],
  events?: Array<{
    index?: number;
    status?: string;
    durationMs?: number;
    errorMessage?: string;
  }>
): StepResult[] {
  if (!events || events.length === 0) {
    return derived;
  }

  // Create a map of actual results by index
  const actualByIndex = new Map<number, (typeof events)[0]>();
  for (const event of events) {
    if (event.index !== undefined) {
      actualByIndex.set(event.index, event);
    }
  }

  return derived.map((step) => {
    const actual = actualByIndex.get(step.index);
    if (!actual) {
      return step;
    }

    return {
      index: step.index,
      status: normalizeStepStatus(actual.status) ?? step.status,
      durationMs: actual.durationMs ?? step.durationMs,
      errorMessage: actual.errorMessage ?? step.errorMessage,
    };
  });
}

/**
 * Normalize step status string to TestStatus.
 */
function normalizeStepStatus(status?: string): TestStatus | undefined {
  if (!status) return undefined;

  const lower = status.toLowerCase();
  if (lower === "pass" || lower === "passed") return "passed";
  if (lower === "fail" || lower === "failed") return "failed";
  if (lower === "skip" || lower === "skipped") return "skipped";
  if (lower === "pending") return "pending";

  return undefined;
}
