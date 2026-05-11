/**
 * Result<T> — explicit success/error type matching the cookbook convention.
 *
 * Used at the boundary where a StoryReport is parsed: the consumer hands us
 * an unknown value (file contents, fetch body, prop) and we return a Result.
 */

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
