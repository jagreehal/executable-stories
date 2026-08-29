/**
 * Raw types for Layer 1: Framework Adapters.
 *
 * These types are permissive and gather best-effort data from each framework.
 * The ACL (Layer 2) will normalize these into strict canonical types.
 */

import type { StoryMeta } from "./story.js";
import type { TestCaseEvidence } from "./test-result.js";

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
  stepId?: string;
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

  /**
   * Evidence ingested from external tools (mutation/coverage/failing-first).
   * Not produced by framework adapters — injected at ingestion time and passed
   * through to the canonical {@link TestCaseResult.evidence}.
   */
  evidence?: TestCaseEvidence;

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
  /** Typed provider key (stable identifier) */
  provider?: import("./ci").CIProvider;
  url?: string;
  buildNumber?: string;
  /** Git branch name */
  branch?: string;
  /** Git commit SHA */
  commitSha?: string;
  /** Pull/merge request number */
  prNumber?: string;
}

/**
 * A feature declared by `story.feature(...)` in a test file.
 *
 * Scenarios say what the system does. A declaration says what the feature is
 * for, in the words the business uses, so a reader meets the intent before the
 * examples.
 */
export interface RawFeature {
  /** Source file the declaration was made in. */
  sourceFile?: string;
  /** Heading for the feature. */
  title: string;
  /**
   * How to introduce it. `ability` frames the feature as something a person can
   * now do; `business-need` covers cross-cutting concerns like security or
   * performance that no single user asks for. Defaults to `feature`.
   */
  kind?: "feature" | "ability" | "business-need";
  /** Markdown explaining why the feature exists and who it serves. */
  narrative?: string;
  /** Tags applied to every scenario in the file. */
  tags?: string[];
  /** Terms this feature defines, for the report glossary. */
  glossary?: RawGlossaryTerm[];
}

/** One entry in a feature's glossary. */
export interface RawGlossaryTerm {
  /** The term as it appears in scenario and step text. */
  term: string;
  /** What it means, in one or two sentences. */
  definition: string;
}

/** Raw run - all framework data gathered */
export interface RawRun {
  /** All test cases from the run */
  testCases: RawTestCase[];
  /** Feature declarations, keyed to their source files. */
  features?: RawFeature[];
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
  /**
   * How much of each source file this run covered: `"full"` (the adapter
   * determined no name filter was applied), `"filtered"` (one was), or absent
   * when the adapter cannot tell. Only `"full"` lets a scenario be retired.
   * See {@link TestRunResult.runScope}.
   */
  runScope?: "full" | "filtered";
  /**
   * Source files this run executed, whether or not they produced scenarios.
   * See {@link TestRunResult.coveredSourceFiles}.
   */
  coveredSourceFiles?: string[];
  /**
   * Source files whose scenarios could not be collected in full (a hook threw
   * before the story was declared, a collection error, a crash). Never treated
   * as authoritative. See {@link TestRunResult.incompleteSourceFiles}.
   */
  incompleteSourceFiles?: string[];
}
