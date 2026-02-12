/**
 * Canonical types for Layer 2: Anti-Corruption Layer output.
 *
 * These types are strict and have all required fields populated.
 * Formatters (Layer 3) accept only these canonical types.
 */

import type { StoryMeta } from "./story";

/** Canonical test status (Cucumber-compatible) */
export type TestStatus = "passed" | "failed" | "skipped" | "pending";

/** Step result with status and timing */
export interface StepResult {
  /** Step index (0-based) */
  index: number;
  /** Step status */
  status: TestStatus;
  /** Duration in milliseconds (default 0) */
  durationMs: number;
  /** Error message if step failed */
  errorMessage?: string;
}

/** Resolved attachment (always has body) */
export interface Attachment {
  /** Attachment name */
  name: string;
  /** MIME type */
  mediaType: string;
  /** Content (base64-encoded or URL) */
  body: string;
  /** Content encoding */
  contentEncoding: "BASE64" | "IDENTITY";
}

/** Single test attempt for retry tracking */
export interface TestCaseAttempt {
  /** Attempt number (0-based) */
  attempt: number;
  /** Status of this attempt */
  status: TestStatus;
  /** Duration of this attempt in milliseconds */
  durationMs: number;
  /** Error message if this attempt failed */
  errorMessage?: string;
  /** Error stack trace if this attempt failed */
  errorStack?: string;
}

/** Canonical test case result */
export interface TestCaseResult {
  /** Unique deterministic ID */
  id: string;
  /** Story metadata (required) */
  story: StoryMeta;
  /** Source file path (required) */
  sourceFile: string;
  /** Source line number (required, default 1) */
  sourceLine: number;
  /** Test status (required) */
  status: TestStatus;
  /** Duration in milliseconds (required, default 0) */
  durationMs: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Error stack trace if failed */
  errorStack?: string;
  /** Attachments (required, empty array if none) */
  attachments: Attachment[];
  /** Step results (required, always populated via fallback rules) */
  stepResults: StepResult[];
  /** Full title path from suite/describe blocks (required, empty array if none) */
  titlePath: string[];
  /** Playwright project name (optional) */
  projectName?: string;
  /** Retry attempt number (required, default 0) */
  retry: number;
  /** Total retries configured (required, default 0) */
  retries: number;
  /** Normalized tags from story (required, empty array if none) */
  tags: string[];
  /** All retry attempts (optional, includes details per attempt) */
  attempts?: TestCaseAttempt[];
}

/** CI environment info */
export interface CIInfo {
  name: string;
  url?: string;
  buildNumber?: string;
}

/** Coverage summary for the test run */
export interface CoverageSummary {
  /** Line coverage percentage (0-100) */
  linesPct?: number;
  /** Branch coverage percentage (0-100) */
  branchesPct?: number;
  /** Function coverage percentage (0-100) */
  functionsPct?: number;
  /** Statement coverage percentage (0-100) */
  statementsPct?: number;
}

/** Canonical test run result */
export interface TestRunResult {
  /** All test case results */
  testCases: TestCaseResult[];
  /** Run start time (epoch ms, required) */
  startedAtMs: number;
  /** Run finish time (epoch ms, required) */
  finishedAtMs: number;
  /** Total duration in milliseconds (required) */
  durationMs: number;
  /** Project root directory (required) */
  projectRoot: string;
  /** Unique run ID (required, generated) */
  runId: string;
  /** Package version */
  packageVersion?: string;
  /** Git commit SHA */
  gitSha?: string;
  /** CI environment info */
  ci?: CIInfo;
  /** Coverage summary for the run */
  coverage?: CoverageSummary;
}
