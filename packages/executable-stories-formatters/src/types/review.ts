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

/**
 * What a CI surface renders. `review` writes one of these alongside the
 * markdown and HTML so the GitHub Action (or a bot, or an agent) builds its PR
 * comment from structured data instead of re-parsing the markdown it just
 * generated.
 *
 * Deliberately a projection of {@link ReviewResult}, not the whole thing: the
 * full model carries every canonical test case and parsed patch, which is
 * megabytes a PR comment has no use for. Consumers needing that read the run
 * JSON. Fields are added, never repurposed; `version` moves only on a break.
 */
export interface ReviewJson {
  version: 1;
  baseRef?: string;
  headRef?: string;
  summary: ReviewSummary;
  /** Outcome counts for the run behind the review. */
  run: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
  };
  /** Everything wrong with this change, worst first. */
  findings: ReviewFinding[];
  changedFiles: ChangedFileReview[];
  claims: ReviewJsonClaim[];
  /**
   * Where this review can be read in full — a cloud run page, when one exists.
   * A CI surface links to it instead of, or alongside, the workflow artifact.
   */
  reportUrl?: string;
  /**
   * Whether a gate reached a verdict on this change, and which.
   *
   * Absent when none was asked for. `not-evaluated` is deliberately distinct
   * from `clear`: no release recorded for a commit means nothing was checked,
   * and rendering that as "clear" is a false assurance — the reader concludes
   * the policy passed when in fact it never ran.
   */
  gate?: "clear" | "blocked" | "not-evaluated";
}

/** A claim, minus the canonical test case and narrative the wire contract omits. */
export type ReviewJsonClaim = Pick<
  ReviewClaim,
  | "id"
  | "scenario"
  | "sourceFile"
  | "sourceLine"
  | "status"
  | "audience"
  | "changeType"
  | "strength"
  | "strengthReasons"
  | "coversFiles"
>;

/**
 * What kind of problem a finding reports.
 * - `failed`: a scenario is red, so its claim is not proven.
 * - `unasserted`: a scenario is green but asserted nothing, so it proves
 *   nothing either — the more dangerous of the two, because it reads as proof.
 * - `skipped`: a scenario did not run, so its claim is unproven. Not a failure,
 *   and deliberately the mildest kind — otherwise every `it.skip` blocks a merge.
 * - `uncovered`: a changed source file has no claim behind it at all.
 * - `weak`: a changed source file's only claims are weakly evidenced.
 * - `policy`: an organisation release policy this commit does not satisfy.
 *   Decided by a control plane rather than by this run, so it is the one kind
 *   with no file to anchor to.
 */
export type ReviewFindingKind =
  | "failed"
  | "unasserted"
  | "skipped"
  | "uncovered"
  | "weak"
  | "policy";

/** How much a finding should hold up a merge. */
export type ReviewSeverity = "blocker" | "major" | "minor";

/** One reviewable problem, shaped for a PR comment or an inline annotation. */
export interface ReviewFinding {
  kind: ReviewFindingKind;
  severity: ReviewSeverity;
  /** Headline, one line, no trailing punctuation. */
  title: string;
  /**
   * Repo-relative file this anchors to. Absent when the finding is about the
   * change as a whole rather than a place in it — a policy verdict has no line
   * to sit on, and inventing one would put a real annotation on innocent code.
   */
  file?: string;
  /** 1-based line, when the finding has one. */
  line?: number;
  /** One sentence naming what is wrong. */
  detail: string;
  /**
   * The observations behind the finding — CodeRabbit's "how this was verified".
   * A finding a reader cannot check is an assertion, not a review.
   */
  evidence: string[];
  /** What to do about it. Also feeds the copy-pasteable agent prompt. */
  remedy: string;
}
