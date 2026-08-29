/**
 * Canonical types for Layer 2: Anti-Corruption Layer output.
 *
 * These types are strict and have all required fields populated.
 * Formatters (Layer 3) accept only these canonical types.
 */

import type { StoryMeta } from "./story.js";

/** How much of each source file a run covered. See {@link TestRunResult.runScope}. */
export type RunScope = "full" | "filtered";

/** Canonical test status (Cucumber-compatible) */
export type TestStatus = "passed" | "failed" | "skipped" | "pending";

/** Step result with status and timing */
export interface StepResult {
  /** Step index (0-based) */
  index: number;
  /** Stable step ID when available */
  stepId?: string;
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
  /** Original adapter/framework status (preserved for diagnostics). */
  rawStatus?: import("./raw").RawStatus;
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
  /**
   * When the run that produced this result finished (epoch ms).
   *
   * A report assembled from accumulated shards holds results from several runs,
   * so the run-level `finishedAtMs` stops describing its contents. Stamped when
   * a result is folded into the accumulated state, never by adapters.
   */
  lastRunAtMs?: number;
  /** Commit the run that produced this result was on. Stamped alongside {@link lastRunAtMs}. */
  lastRunGitSha?: string;
  /**
   * Ingested evidence (mutation/coverage/failing-first) used by the review
   * formatter to grade proof strength. Populated at the ACL/ingestion layer,
   * never by adapters. Optional and additive.
   */
  evidence?: TestCaseEvidence;
}

/**
 * Evidence ingested from external tools to harden the "the test passes" claim.
 *
 * Populated at the ACL/ingestion layer from the host project's own tooling
 * (Stryker/PITest mutation runs, coverage reports, base-ref re-verification).
 * The packages never RUN these tools — same ingestion shape as {@link StoryMeta.otelSpans}.
 * Consumed by the review formatter to grade how credible a claim's proof is.
 */
export interface TestCaseEvidence {
  /** Mutation score (0-100) attributed to this test/file, from Stryker/PITest/etc. */
  mutationScorePct?: number;
  /** Mutants killed by this test's covered code (when the tool reports it). */
  mutantsKilled?: number;
  /** Total mutants in this test's covered code (when the tool reports it). */
  mutantsTotal?: number;
  /**
   * True when the test was verified red on the base ref and green on head
   * (the failing-first regression lock for bugfixes).
   */
  failingFirstVerified?: boolean;
  /** Coverage of the changed lines this test exercises (0-100), when computable. */
  changedLineCoveragePct?: number;
}

/** CI environment info */
export interface CIInfo {
  name: string;
  url?: string;
  buildNumber?: string;
  branch?: string;
  commitSha?: string;
  prNumber?: string;
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

/** One entry in a feature's glossary. */
export interface GlossaryTerm {
  /** The term as it appears in scenario and step text. */
  term: string;
  /** What it means, in one or two sentences. */
  definition: string;
}

/**
 * A feature declared in a test file, canonicalized.
 *
 * `sourceFile` is required here: the report groups scenarios by file, and a
 * declaration with no file has nothing to attach to.
 */
export interface FeatureDeclaration {
  /** Source file the declaration was made in. */
  sourceFile: string;
  /** Heading for the feature. */
  title: string;
  /** How to introduce it. */
  kind: "feature" | "ability" | "business-need";
  /** Markdown explaining why the feature exists and who it serves. */
  narrative?: string;
  /** Tags applied to every scenario in the file. */
  tags?: string[];
  /** Terms this feature defines. */
  glossary?: GlossaryTerm[];
}

/** Canonical test run result */
export interface TestRunResult {
  /** All test case results */
  testCases: TestCaseResult[];
  /** Feature declarations, one per declaring source file. */
  features?: FeatureDeclaration[];
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
  /**
   * How much of each source file this run covered, which decides whether it may
   * retire scenarios it did not report.
   *
   * - `"full"` — the adapter positively determined no name filter was applied,
   *   so the scenarios reported for each file ARE that file's contents. Only
   *   this may delete: a scenario renamed or removed since the last run goes.
   * - `"filtered"` — a name filter was applied (`vitest -t`, an MCP
   *   `run_scenario` call), so the run saw part of its own files and updates
   *   only what it names.
   * - absent (unknown) — the adapter cannot tell. Merges like `"filtered"`, and
   *   warns, naming what it kept.
   *
   * Absent is the default on purpose. Deleting on a guess is destructive and
   * silent; keeping on a guess is merely stale and visible. Uncertainty
   * preserves data, and only certainty removes it.
   */
  runScope?: RunScope;
  /**
   * Source files this run actually executed, whether or not they produced any
   * scenarios.
   *
   * A run's test cases only name the files that produced something, so a file
   * whose last scenario was deleted is indistinguishable from one that did not
   * run — and, still existing on disk, it survives pruning too. This inventory
   * is what lets a `"full"` run empty a file's report.
   *
   * Optional: an adapter that cannot enumerate what it ran omits it, and a file
   * that reports nothing keeps its previous scenarios.
   */
  coveredSourceFiles?: string[];
  /**
   * Source files whose scenarios this run could not collect in full — a hook
   * that threw before the story was declared, a collection error, a crash.
   *
   * Such a file looks exactly like one whose scenarios were deleted, and a run
   * claiming `"full"` would retire them. Losing documentation because the suite
   * broke is the worst moment to lose it, so these files are merged rather than
   * replaced however authoritative the rest of the run is.
   */
  incompleteSourceFiles?: string[];
}
