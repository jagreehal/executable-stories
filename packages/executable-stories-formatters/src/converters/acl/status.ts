/**
 * Status mapping from raw framework statuses to canonical TestStatus.
 */

import type { RawStatus } from "../../types/raw";
import type { TestStatus } from "../../types/test-result";

/** Map raw status to canonical TestStatus */
const STATUS_MAP: Record<RawStatus, TestStatus> = {
  pass: "passed",
  fail: "failed",
  skip: "skipped",
  pending: "pending",
  todo: "pending", // Map todo → pending
  timeout: "failed", // Map timeout → failed
  interrupted: "failed", // Map interrupted → failed
  unknown: "skipped", // Safest default
};

/**
 * Convert a raw status to canonical TestStatus.
 *
 * @param raw - The raw status from a framework
 * @returns The canonical TestStatus
 */
export function normalizeStatus(raw: RawStatus): TestStatus {
  return STATUS_MAP[raw] ?? "skipped";
}

/**
 * Convert a string to RawStatus, with fallback to "unknown".
 *
 * @param status - Any status string
 * @returns A valid RawStatus
 */
export function parseRawStatus(status: string | undefined): RawStatus {
  if (!status) return "unknown";
  const lower = status.toLowerCase();

  // Direct matches
  if (lower === "pass" || lower === "passed") return "pass";
  if (lower === "fail" || lower === "failed") return "fail";
  if (lower === "skip" || lower === "skipped") return "skip";
  if (lower === "pending") return "pending";
  if (lower === "todo") return "todo";
  if (lower === "timeout" || lower === "timedout" || lower === "timed_out") return "timeout";
  if (lower === "interrupted") return "interrupted";

  return "unknown";
}
