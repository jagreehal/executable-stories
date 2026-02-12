/**
 * Pure helper: map test status to display icon.
 * Used by scenario and steps renderers; inject via deps for testability.
 */

import type { TestStatus } from "../../../types/test-result";

export type GetStatusIcon = (status: TestStatus) => string;

export function getStatusIcon(status: TestStatus): string {
  switch (status) {
    case "passed":
      return "✓";
    case "failed":
      return "✗";
    case "skipped":
      return "○";
    case "pending":
      return "◔";
    default:
      return "?";
  }
}
