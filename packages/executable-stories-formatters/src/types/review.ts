/**
 * Review types — the model behind the Evidence-Driven Review report.
 *
 * The review report reframes a test run as "communication with evidence" for
 * reviewing AI-authored changes: intent, approach, proof, outcome — where the
 * proof is that the test passes, graded by how credible that proof actually is.
 *
 * `buildReview(run, context)` mirrors `diffRuns(baseline, current)`:
 * a pure function that produces a {@link ReviewResult} which the review
 * formatters render. Diff context ({@link ReviewContext}) enters at the
 * CLI/Action layer — adapters stay diff-blind.
 */

import type { TestRunResult, TestCaseResult, TestStatus } from "executable-stories-core/types/test-result";

/** Who a claim is addressed to. Derived from file convention (override via `audience:` tag). */
export type ReviewAudience = "stakeholder" | "engineer";

/** The kind of change a claim documents. Declared via a `change:*` tag. */
export type ChangeType =
  | "feature"
  | "bugfix"
  | "refactor"
  | "perf"
  | "deps"
  | "unknown";

/**
 * How credible a claim's proof is, worst → best.
 * - `none`: the test isn't passing, so it proves nothing about the change.
 * - `weak`: a passing self-authored unit assertion with no corroborating signal.
 * - `moderate`: integration-level, or corroborated by coverage / a screenshot / a trace.
 * - `strong`: tamper-resistant or constraint-proving — failing-first verified, high
 *   mutation score, or a stakeholder e2e claim backed by screenshot + trace.
 */
export type EvidenceStrength = "none" | "weak" | "moderate" | "strong";

/** Which evidence band a changed source file falls into. */
export type ReviewBand = "uncovered" | "weak" | "covered";

/** Change kind for a file in the diff. */
export type FileChangeKind = "added" | "modified" | "deleted" | "renamed";

/** A single changed file from the diff, fed in at the CLI/Action layer. */
export interface ChangedFile {
  /** Repo-relative path. */
  path: string;
  /** How the file changed. */
  changeKind: FileChangeKind;
  /** Added/modified line numbers in the new file (best-effort; enables finer correlation). */
  changedLines?: number[];
}

/**
 * Diff/PR context for a review. Supplied by the Action (`git diff`) or CLI —
 * NEVER by framework adapters. Optional so the report degrades to "claims only"
 * when no diff is available.
 */
export interface ReviewContext {
  /** Files changed in the PR/diff. */
  changedFiles: ChangedFile[];
  /** Base ref/sha the diff is against (informational). */
  baseRef?: string;
  /** Head ref/sha (informational). */
  headRef?: string;
}

/** One reviewable claim = one story/test case, enriched for review. */
export interface ReviewClaim {
  /** Canonical test case id. */
  id: string;
  /** Scenario title (the claim being made). */
  scenario: string;
  sourceFile: string;
  sourceLine: number;
  /** Test outcome. */
  status: TestStatus;
  /** Derived from file convention / `audience:` tag. */
  audience: ReviewAudience;
  /** Declared via `change:*` tag (defaults to `unknown`). */
  changeType: ChangeType;
  /** Graded credibility of this claim's proof. */
  strength: EvidenceStrength;
  /** Human-readable reasons the strength was assigned (what corroborated / what was missing). */
  strengthReasons: string[];
  /** Intent/approach narrative pulled from a "Why"/intent section or note, if present. */
  intent?: string;
  /** Changed source files this claim plausibly covers (colocated-filename correlation in v1). */
  coversFiles: string[];
  /** The underlying canonical test case (for formatters needing full detail). */
  testCase: TestCaseResult;
}

/** A changed source file correlated against the claims that touch it. */
export interface ChangedFileReview {
  path: string;
  changeKind: FileChangeKind;
  /** Evidence band: uncovered (🔴), weak (🟡), covered (🟢). */
  band: ReviewBand;
  /** Claims correlated to this file, with their strength. */
  claims: Array<{ id: string; scenario: string; strength: EvidenceStrength }>;
}

/** Roll-up counts for the review. */
export interface ReviewSummary {
  totalClaims: number;
  byAudience: Record<ReviewAudience, number>;
  byStrength: Record<EvidenceStrength, number>;
  /** Number of changed source files considered (test/config files excluded). */
  changedSourceFiles: number;
  uncovered: number;
  weaklyCovered: number;
  covered: number;
}

/** The full review model the formatters render. */
export interface ReviewResult {
  run: TestRunResult;
  context: ReviewContext;
  summary: ReviewSummary;
  /** Claims, sorted stakeholder-first then by strength (weakest first, to surface risk). */
  claims: ReviewClaim[];
  /** Changed source files, sorted uncovered → weak → covered. */
  changedFiles: ChangedFileReview[];
}
