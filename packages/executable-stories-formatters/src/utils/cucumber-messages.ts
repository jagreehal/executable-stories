/**
 * Utility functions for Cucumber Messages NDJSON format.
 */

import { createHash } from "node:crypto";
import type {
  Timestamp,
  Duration,
  KeywordType,
  PickleStepType,
  TestStepResultStatus,
} from "../types/cucumber-messages";
import type { TestStatus } from "../types/test-result";
import type { StepKeyword } from "../types/story";

/**
 * Convert epoch milliseconds to protobuf Timestamp.
 */
export function msToTimestamp(ms: number): Timestamp {
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.round((ms % 1000) * 1_000_000);
  return { seconds, nanos };
}

/**
 * Convert milliseconds to protobuf Duration.
 */
export function msToDuration(ms: number): Duration {
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.round((ms % 1000) * 1_000_000);
  return { seconds, nanos };
}

/**
 * Map a StepKeyword to a Cucumber KeywordType.
 *
 * And/But/* inherit from the previous non-conjunction keyword type.
 */
export function keywordToKeywordType(keyword: StepKeyword): KeywordType {
  switch (keyword) {
    case "Given":
      return "Context";
    case "When":
      return "Action";
    case "Then":
      return "Outcome";
    case "And":
    case "But":
      return "Conjunction";
    default:
      return "Unknown";
  }
}

/**
 * Resolve the effective PickleStepType for a sequence of steps,
 * inheriting the previous non-conjunction type for And/But.
 *
 * Returns an array of resolved types, one per step.
 */
export function resolvePickleStepTypes(
  keywords: StepKeyword[]
): PickleStepType[] {
  let lastNonConjunction: PickleStepType = "Unknown";
  return keywords.map((kw) => {
    const kt = keywordToKeywordType(kw);
    if (kt === "Conjunction") {
      return lastNonConjunction;
    }
    const resolved = keywordTypeToPickleStepType(kt);
    lastNonConjunction = resolved;
    return resolved;
  });
}

/**
 * Convert a non-conjunction KeywordType to PickleStepType.
 */
function keywordTypeToPickleStepType(kt: KeywordType): PickleStepType {
  switch (kt) {
    case "Context":
      return "Context";
    case "Action":
      return "Action";
    case "Outcome":
      return "Outcome";
    default:
      return "Unknown";
  }
}

/**
 * Map TestStatus to Cucumber TestStepResultStatus.
 */
export function statusToCucumberStatus(
  status: TestStatus
): TestStepResultStatus {
  switch (status) {
    case "passed":
      return "PASSED";
    case "failed":
      return "FAILED";
    case "skipped":
      return "SKIPPED";
    case "pending":
      return "PENDING";
    default:
      return "UNKNOWN";
  }
}

/**
 * Generate a deterministic ID using SHA-1.
 *
 * @param kind - Namespace to prevent collisions between entity types (e.g., "pickle", "testCase")
 * @param salt - Optional salt from options (idSalt)
 * @param parts - Strings to hash
 * @returns 36-character hex string (UUID-length without dashes)
 */
export function deterministicId(
  kind: string,
  salt: string,
  ...parts: string[]
): string {
  const input = [salt, kind, ...parts].join("::");
  return createHash("sha1").update(input).digest("hex").slice(0, 36);
}
