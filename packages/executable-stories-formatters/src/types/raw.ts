/**
 * Raw types for Layer 1: Framework Adapters.
 *
 * These types are permissive and gather best-effort data from each framework.
 * The ACL (Layer 2) will normalize these into strict canonical types.
 */

import type { StoryMeta } from "./story";

/** Permissive status from any framework */
export type RawStatus =
  | "pass"
  | "fail"
  | "skip"
  | "todo"
  | "pending"
  | "timeout"
  | "interrupted"
  | "unknown";

/** Raw attachment - don't decide inline vs link yet */
export interface RawAttachment {
  name: string;
  mediaType: string;
  /** File reference (path on disk) */
  path?: string;
  /** Inline content */
  body?: string;
  /** Content encoding */
  encoding?: "BASE64" | "IDENTITY";
  /** Character set (default: "utf-8" when IDENTITY + text) */
  charset?: string;
  /** Actual artifact name (distinct from logical label) */
  fileName?: string;
  /** Size in bytes (for embed vs link decision) */
  byteLength?: number;
  /** Step index (undefined = test-case level) */
  stepIndex?: number;
  /** Stable step ID, preferred over stepIndex by converter */
  stepId?: string;
}

/** Raw step event from framework (if available) */
export interface RawStepEvent {
  index?: number;
  title?: string;
  status?: RawStatus;
  durationMs?: number;
  errorMessage?: string;
}

/** Raw test case - best-effort data gathering */
export interface RawTestCase {
  /** Framework's test ID */
  externalId?: string;
  /** Test title/name */
  title?: string;
  /** Full title path (describe blocks + test name) */
  titlePath?: string[];
  /** Story metadata from test */
  story?: StoryMeta;
  /** Source file path */
  sourceFile?: string;
  /** Source line number (1-based) */
  sourceLine?: number;

  /** Test status */
  status: RawStatus;
  /** Duration in milliseconds */
  durationMs?: number;

  /** Error information */
  error?: {
    message?: string;
    stack?: string;
  };

  /** Step-level info if framework provides it */
  stepEvents?: RawStepEvent[];

  /** Attachments (screenshots, logs, etc.) */
  attachments?: RawAttachment[];

  /** Framework-specific metadata (kept for debugging) */
  meta?: Record<string, unknown>;

  /** Retry attempt number (0-based) */
  retry?: number;
  /** Total retry count configured */
  retries?: number;
  /** Playwright project name */
  projectName?: string;
}

/** CI environment info */
export interface RawCIInfo {
  name: string;
  url?: string;
  buildNumber?: string;
}

/** Raw run - all framework data gathered */
export interface RawRun {
  /** All test cases from the run */
  testCases: RawTestCase[];
  /** Run start time (epoch ms) */
  startedAtMs?: number;
  /** Run finish time (epoch ms) */
  finishedAtMs?: number;
  /** Project root directory */
  projectRoot: string;
  /** Package version */
  packageVersion?: string;
  /** Git commit SHA */
  gitSha?: string;
  /** CI environment info */
  ci?: RawCIInfo;
}
