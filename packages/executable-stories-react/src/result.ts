/**
 * Result<T> — explicit success/error type matching the cookbook convention.
 *
 * Used at the boundary where a StoryReport is parsed: the consumer hands us
 * an unknown value (file contents, fetch body, prop) and we return a Result.
 */
import type { StoryReport } from "executable-stories-core";

export type Result<T, E = ReportParseError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export interface ReportParseError {
  message: string;
  code: ReportParseErrorCode;
  issues?: readonly { path: string; message: string }[];
}

export type ReportParseErrorCode =
  | "INVALID_INPUT"
  | "SCHEMA_VERSION_MISMATCH"
  | "VALIDATION_FAILED";

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = (error: ReportParseError): Result<never> => ({ ok: false, error });

/**
 * Normalize the `StoryReport | Result<StoryReport>` prop accepted across the
 * render entrypoints (`Report`, `ReportInteractive`, `renderReportToHtml`) into
 * a single `Result`. A bare report becomes `ok(report)`; an already-wrapped
 * value passes through. One place owns the "is this a Result?" discrimination.
 */
export function unwrapReport(value: StoryReport | Result<StoryReport>): Result<StoryReport> {
  if (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    typeof (value as { ok: unknown }).ok === "boolean"
  ) {
    return value as Result<StoryReport>;
  }
  return ok(value as StoryReport);
}
