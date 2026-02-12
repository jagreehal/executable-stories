/**
 * Validation helpers for canonical TestRunResult.
 *
 * Used in tests to verify ACL output meets all invariants.
 */

import type { TestRunResult, TestCaseResult } from "../../types/test-result";

/** Validation result */
export interface ValidationResult {
  /** Whether the run is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
}

/**
 * Validate a canonical TestRunResult.
 *
 * Checks:
 * - All required fields are present
 * - stepResults length matches story.steps length
 * - stepResults indexes are valid and unique
 * - Durations are non-negative
 * - Timestamps are valid
 *
 * @param run - The TestRunResult to validate
 * @returns Validation result with errors if any
 */
export function validateCanonicalRun(run: TestRunResult): ValidationResult {
  const errors: string[] = [];

  // Validate run-level fields
  if (!run.runId) {
    errors.push("Run missing runId");
  }

  if (!run.projectRoot) {
    errors.push("Run missing projectRoot");
  }

  if (typeof run.startedAtMs !== "number" || run.startedAtMs < 0) {
    errors.push(`Invalid startedAtMs: ${run.startedAtMs}`);
  }

  if (typeof run.finishedAtMs !== "number" || run.finishedAtMs < 0) {
    errors.push(`Invalid finishedAtMs: ${run.finishedAtMs}`);
  }

  if (run.finishedAtMs < run.startedAtMs) {
    errors.push(`finishedAtMs (${run.finishedAtMs}) < startedAtMs (${run.startedAtMs})`);
  }

  if (typeof run.durationMs !== "number" || run.durationMs < 0) {
    errors.push(`Invalid durationMs: ${run.durationMs}`);
  }

  if (!Array.isArray(run.testCases)) {
    errors.push("testCases is not an array");
  } else {
    // Validate each test case
    for (let i = 0; i < run.testCases.length; i++) {
      const tcErrors = validateTestCase(run.testCases[i], i);
      errors.push(...tcErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single test case.
 */
function validateTestCase(tc: TestCaseResult, index: number): string[] {
  const errors: string[] = [];
  const prefix = `TestCase[${index}]`;

  // Required fields
  if (!tc.id) {
    errors.push(`${prefix}: missing id`);
  }

  if (!tc.story) {
    errors.push(`${prefix}: missing story`);
    return errors; // Can't validate further without story
  }

  if (!tc.sourceFile) {
    errors.push(`${prefix}: missing sourceFile`);
  }

  if (typeof tc.sourceLine !== "number" || tc.sourceLine < 1) {
    errors.push(`${prefix}: invalid sourceLine ${tc.sourceLine}`);
  }

  // Status must be valid enum value
  const validStatuses = ["passed", "failed", "skipped", "pending"];
  if (!validStatuses.includes(tc.status)) {
    errors.push(`${prefix}: invalid status "${tc.status}"`);
  }

  // Duration must be non-negative
  if (typeof tc.durationMs !== "number" || tc.durationMs < 0) {
    errors.push(`${prefix}: invalid durationMs ${tc.durationMs}`);
  }

  // Retry fields
  if (typeof tc.retry !== "number" || tc.retry < 0) {
    errors.push(`${prefix}: invalid retry ${tc.retry}`);
  }

  if (typeof tc.retries !== "number" || tc.retries < 0) {
    errors.push(`${prefix}: invalid retries ${tc.retries}`);
  }

  // Arrays must be arrays
  if (!Array.isArray(tc.attachments)) {
    errors.push(`${prefix}: attachments is not an array`);
  }

  if (!Array.isArray(tc.titlePath)) {
    errors.push(`${prefix}: titlePath is not an array`);
  }

  if (!Array.isArray(tc.tags)) {
    errors.push(`${prefix}: tags is not an array`);
  }

  // Validate stepResults
  if (!Array.isArray(tc.stepResults)) {
    errors.push(`${prefix}: stepResults is not an array`);
  } else {
    const stepsCount = tc.story.steps?.length ?? 0;

    // stepResults length should match story.steps length
    if (tc.stepResults.length !== stepsCount) {
      errors.push(
        `${prefix}: stepResults.length (${tc.stepResults.length}) !== story.steps.length (${stepsCount})`
      );
    }

    // Validate each step result
    const seenIndexes = new Set<number>();
    for (const sr of tc.stepResults) {
      // Index must be valid
      if (typeof sr.index !== "number" || sr.index < 0 || sr.index >= stepsCount) {
        errors.push(`${prefix}: invalid stepResult index ${sr.index}`);
      }

      // Index must be unique
      if (seenIndexes.has(sr.index)) {
        errors.push(`${prefix}: duplicate stepResult index ${sr.index}`);
      }
      seenIndexes.add(sr.index);

      // Status must be valid
      if (!validStatuses.includes(sr.status)) {
        errors.push(`${prefix}: invalid stepResult status "${sr.status}" at index ${sr.index}`);
      }

      // Duration must be non-negative
      if (typeof sr.durationMs !== "number" || sr.durationMs < 0) {
        errors.push(`${prefix}: invalid stepResult durationMs ${sr.durationMs} at index ${sr.index}`);
      }
    }
  }

  return errors;
}

/**
 * Assert that a run is valid, throwing if not.
 *
 * Useful in tests.
 *
 * @param run - The TestRunResult to validate
 * @throws Error if validation fails
 */
export function assertValidRun(run: TestRunResult): void {
  const result = validateCanonicalRun(run);
  if (!result.valid) {
    throw new Error(`Invalid TestRunResult:\n${result.errors.join("\n")}`);
  }
}
