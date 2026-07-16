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
import type { AnchorResolution, DiffAnchor, FileDiff } from "./diff";

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
  /** Code Diff evidence groups (patch + annotation sidecar), supplied at the CLI/Action layer. */
  codeDiffs?: CodeDiffInput[];
}

/** One annotation from the Code Diff sidecar, ordered by concept (not Git file order). */
export interface CodeDiffAnnotationInput {
  /**
   * Content anchor — never a bare line number (see `review/diff-anchor`).
   * Absent when assembly could not produce one; `unresolved` then names the state.
   */
  anchor?: DiffAnchor;
  /**
   * Set instead of `anchor` when assembly failed: `orphaned` (no matching
   * changed line) or `ambiguous` (the match was not unique). Rendered as that
   * state directly, so authoring mistakes surface visibly.
   */
  unresolved?: "orphaned" | "ambiguous";
  /** Explanatory prose (plain text — rendered verbatim, never as HTML or Markdown). */
  text: string;
  /** Short conceptual label (drives the outline ordering). */
  label?: string;
  /** StoryReport scenario IDs whose execution proves this hunk's effect. */
  scenarioIds?: string[];
}

/** One Code Diff evidence group fed in at the CLI/Action layer — NEVER by adapters. */
export interface CodeDiffInput {
  /** Human title for this evidence group. */
  title: string;
  /** Unified diff content, expected from `git diff --histogram`. */
  patch: string;
  /**
   * Canonical HTTPS patch URL — audit provenance only, never a second render
   * source. Only `https:` URLs render as links; anything else renders inert.
   */
  patchUrl?: string;
  /** Human comparison labels; default from `baseRef`/`headRef`. */
  baseLabel?: string;
  headLabel?: string;
  annotations: CodeDiffAnnotationInput[];
}

/** A scenario cited by an annotation, resolved against the current run. */
export interface CodeDiffScenarioRef {
  id: string;
  /** False = the cited scenario is not in this run — render as "unverified reference". */
  resolved: boolean;
  scenario?: string;
  status?: TestStatus;
}

/** An annotation resolved against the parsed patch and the run. */
export interface CodeDiffAnnotation {
  /** Stable identity of the content anchor. Absent when assembly never produced one. */
  anchorHash?: string;
  /** Plain-text prose, rendered verbatim. */
  text: string;
  label?: string;
  /** anchored / ambiguous / orphaned — ambiguous and orphaned render visibly, never guessed. */
  resolution: AnchorResolution;
  scenarios: CodeDiffScenarioRef[];
}

/** Code Diff evidence on the review result, ready for formatters to render. */
export interface CodeDiffEvidence {
  title: string;
  /** The raw unified patch (audit fallback; renderers escape it as text). */
  patch: string;
  patchUrl?: string;
  baseLabel?: string;
  headLabel?: string;
  /** Parsed files/hunks so renderers never re-parse. */
  files: FileDiff[];
  annotations: CodeDiffAnnotation[];
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
  /** Code Diff evidence groups (empty when the context supplied none). */
  codeDiffs: CodeDiffEvidence[];
}
