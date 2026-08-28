/**
 * Review domain — `buildReview(run, context)` mirrors `diffRuns(baseline, current)`.
 *
 * A pure function that enriches a canonical run into a {@link ReviewResult}:
 * each test case becomes a graded claim, and (when diff context is supplied)
 * changed source files are correlated to claims and banded
 * uncovered → weak → covered. The review formatters render the result.
 */

import type { DocEntry } from "executable-stories-core/types/story";
import { assertionState } from "executable-stories-core";
import type { TestCaseResult } from "executable-stories-core/types/test-result";
import type {
  ChangedFileReview,
  CodeDiffEvidence,
  CodeDiffInput,
  EvidenceStrength,
  ReviewAudience,
  ReviewClaim,
  ReviewContext,
  ReviewResult,
  ReviewSummary,
} from "../types/review";
import { parseUnifiedDiff, relocateAnchor } from "./diff-anchor";
import {
  deriveAudience,
  deriveChangeType,
  isReviewableSource,
  sourceBaseKey,
  testBaseKey,
} from "./conventions";

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
  none: 0,
  weak: 1,
  moderate: 2,
  strong: 3,
};

const INTENT_SECTION_TITLE = /\b(why|intent|approach|rationale|reasoning)\b/i;

/** Recursively find the first doc entry (including children) matching a predicate. */
function findDoc(
  docs: DocEntry[] | undefined,
  predicate: (doc: DocEntry) => boolean
): DocEntry | undefined {
  if (!docs) return undefined;
  for (const doc of docs) {
    if (predicate(doc)) return doc;
    const nested = findDoc(doc.children, predicate);
    if (nested) return nested;
  }
  return undefined;
}

function anyDoc(
  docs: DocEntry[] | undefined,
  predicate: (doc: DocEntry) => boolean
): boolean {
  return findDoc(docs, predicate) !== undefined;
}

/** Pull the intent/approach narrative from a "Why"-style section, falling back to a note. */
function extractIntent(testCase: TestCaseResult): string | undefined {
  const docs = testCase.story.docs;
  const section = findDoc(
    docs,
    (d): d is Extract<DocEntry, { kind: "section" }> =>
      d.kind === "section" && INTENT_SECTION_TITLE.test(d.title)
  );
  if (section && section.kind === "section") return section.markdown;

  const note = findDoc(docs, (d) => d.kind === "note");
  if (note && note.kind === "note") return note.text;
  return undefined;
}

/** True when the test case carries a screenshot (attachment or `screenshot` doc). */
function hasScreenshot(testCase: TestCaseResult): boolean {
  if (testCase.attachments.some((a) => a.mediaType.startsWith("image/"))) {
    return true;
  }
  if (anyDoc(testCase.story.docs, (d) => d.kind === "screenshot")) return true;
  return testCase.story.steps.some((step) =>
    anyDoc(step.docs, (d) => d.kind === "screenshot")
  );
}

function hasOtelTrace(testCase: TestCaseResult): boolean {
  return (testCase.story.otelSpans?.length ?? 0) > 0;
}

/**
 * Grade how credible a claim's proof is.
 *
 * A passing self-authored test is the weakest evidence. Strength climbs as
 * tamper-resistant or constraint-proving signals appear: a screenshot/trace, a
 * decent mutation score, and — strongest — failing-first verification.
 */
export function gradeEvidence(
  testCase: TestCaseResult,
  audience: ReviewAudience
): { strength: EvidenceStrength; reasons: string[] } {
  if (testCase.status !== "passed") {
    return {
      strength: "none",
      reasons: [`test is ${testCase.status} — the proof does not hold`],
    };
  }

  // A scenario that asserted nothing cannot fail, so it proves nothing, and no
  // attached artifact changes that. This floor sits above every other signal:
  // mutation score and failing-first are unreachable for a test that is green
  // by construction.
  if (assertionState(testCase.story.steps) === "unasserted") {
    return {
      strength: "none",
      reasons: ["the scenario passed without asserting anything"],
    };
  }

  const ev = testCase.evidence;
  const screenshot = hasScreenshot(testCase);
  const otel = hasOtelTrace(testCase);
  const isIntegration = /\.int\.test\./i.test(testCase.sourceFile);
  const mutation = ev?.mutationScorePct;
  const changedCov = ev?.changedLineCoveragePct;

  const strong: string[] = [];
  if (ev?.failingFirstVerified) {
    strong.push("failing-first verified (red on base ref, green on head)");
  }
  if (typeof mutation === "number" && mutation >= 80) {
    strong.push(`mutation score ${mutation}% (≥80%)`);
  }
  if (screenshot && otel) {
    strong.push("backed by screenshot + OTEL trace");
  } else if (audience === "stakeholder" && (screenshot || otel)) {
    strong.push(`stakeholder proof: ${screenshot ? "screenshot" : "OTEL trace"}`);
  }
  if (strong.length > 0) return { strength: "strong", reasons: strong };

  const moderate: string[] = [];
  if (screenshot) moderate.push("screenshot attached");
  if (otel) moderate.push("OTEL trace attached");
  if (typeof mutation === "number" && mutation >= 50) {
    moderate.push(`mutation score ${mutation}%`);
  }
  if (typeof changedCov === "number" && changedCov >= 80) {
    moderate.push(`changed-line coverage ${changedCov}%`);
  }
  if (isIntegration) moderate.push("integration-level test");
  if (moderate.length > 0) return { strength: "moderate", reasons: moderate };

  return {
    strength: "weak",
    reasons: [
      "passing test only — no corroborating evidence (add e2e proof, mutation score, or failing-first)",
    ],
  };
}

function toClaim(
  testCase: TestCaseResult,
  changedSourcePaths: string[]
): ReviewClaim {
  const audience = deriveAudience(testCase.sourceFile, testCase.tags);
  const changeType = deriveChangeType(testCase.tags);
  const { strength, reasons } = gradeEvidence(testCase, audience);

  // Colocated-filename correlation: a test covers a changed source file when the
  // test's base path (infix stripped) matches the source file's base path.
  const key = testBaseKey(testCase.sourceFile);
  const coversFiles = changedSourcePaths.filter(
    (path) => sourceBaseKey(path) === key
  );

  return {
    id: testCase.id,
    scenario: testCase.story.scenario,
    sourceFile: testCase.sourceFile,
    sourceLine: testCase.sourceLine,
    status: testCase.status,
    audience,
    changeType,
    strength,
    strengthReasons: reasons,
    intent: extractIntent(testCase),
    coversFiles,
    testCase,
  };
}

function bandFor(claims: ReviewClaim[]): ChangedFileReview["band"] {
  if (claims.length === 0) return "uncovered";
  const maxRank = Math.max(...claims.map((c) => STRENGTH_RANK[c.strength]));
  return maxRank >= STRENGTH_RANK.moderate ? "covered" : "weak";
}

const AUDIENCE_ORDER: Record<ReviewAudience, number> = {
  stakeholder: 0,
  engineer: 1,
};

/**
 * Resolve one Code Diff evidence group: parse the patch, relocate each
 * annotation's content anchor, and resolve cited scenario IDs against the
 * run. Ambiguous/orphaned anchors and unresolved scenario IDs stay visible
 * in the result — they are never dropped or silently reattached.
 */
function buildCodeDiff(
  input: CodeDiffInput,
  run: ReviewResult["run"],
  context: ReviewContext
): CodeDiffEvidence {
  const files = parseUnifiedDiff(input.patch);
  const byId = new Map(run.testCases.map((tc) => [tc.id, tc]));
  return {
    title: input.title,
    patch: input.patch,
    patchUrl: input.patchUrl,
    baseLabel: input.baseLabel ?? context.baseRef,
    headLabel: input.headLabel ?? context.headRef,
    files,
    annotations: input.annotations.map((annotation) => ({
      anchorHash: annotation.anchor?.hash,
      text: annotation.text,
      label: annotation.label,
      resolution: annotation.anchor
        ? relocateAnchor(annotation.anchor, files)
        : { state: annotation.unresolved ?? ("orphaned" as const) },
      scenarios: (annotation.scenarioIds ?? []).map((id) => {
        const testCase = byId.get(id);
        return testCase
          ? {
              id,
              resolved: true,
              scenario: testCase.story.scenario,
              status: testCase.status,
            }
          : { id, resolved: false };
      }),
    })),
  };
}

/**
 * Build the review model from a canonical run and optional diff context.
 *
 * With no `changedFiles`, the report degrades gracefully to "claims only"
 * (no banding). With diff context, changed source files are correlated and
 * banded — the 🔴 uncovered band being the reviewer's first stop.
 */
export function buildReview(
  run: ReviewResult["run"],
  context: ReviewContext = { changedFiles: [] }
): ReviewResult {
  const changedSource = context.changedFiles.filter((f) =>
    isReviewableSource(f.path)
  );
  const changedSourcePaths = changedSource.map((f) => f.path);

  const claims = run.testCases.map((tc) => toClaim(tc, changedSourcePaths));

  const changedFiles: ChangedFileReview[] = changedSource.map((file) => {
    const covering = claims.filter((c) => c.coversFiles.includes(file.path));
    return {
      path: file.path,
      changeKind: file.changeKind,
      band: bandFor(covering),
      claims: covering.map((c) => ({
        id: c.id,
        scenario: c.scenario,
        strength: c.strength,
      })),
    };
  });

  // Claims: stakeholder first, then weakest evidence first (surface risk), then stable.
  const sortedClaims = [...claims].sort((a, b) => {
    if (AUDIENCE_ORDER[a.audience] !== AUDIENCE_ORDER[b.audience]) {
      return AUDIENCE_ORDER[a.audience] - AUDIENCE_ORDER[b.audience];
    }
    if (STRENGTH_RANK[a.strength] !== STRENGTH_RANK[b.strength]) {
      return STRENGTH_RANK[a.strength] - STRENGTH_RANK[b.strength];
    }
    if (a.sourceFile !== b.sourceFile) {
      return a.sourceFile.localeCompare(b.sourceFile);
    }
    return a.scenario.localeCompare(b.scenario);
  });

  const bandRank = { uncovered: 0, weak: 1, covered: 2 } as const;
  const sortedFiles = [...changedFiles].sort((a, b) => {
    if (bandRank[a.band] !== bandRank[b.band]) {
      return bandRank[a.band] - bandRank[b.band];
    }
    return a.path.localeCompare(b.path);
  });

  const summary = buildSummary(sortedClaims, sortedFiles);

  return {
    run,
    context,
    summary,
    claims: sortedClaims,
    changedFiles: sortedFiles,
    codeDiffs: (context.codeDiffs ?? []).map((d) => buildCodeDiff(d, run, context)),
  };
}

/**
 * Code Diff integrity diagnostics: orphaned/ambiguous anchors and unverified
 * scenario references. The CLI prints these as warnings; `--strict-code-diff`
 * turns them into review-gate failures so CI catches explainers that lost
 * their grounding.
 */
export function codeDiffDiagnostics(review: ReviewResult): string[] {
  const issues: string[] = [];
  for (const evidence of review.codeDiffs) {
    evidence.annotations.forEach((annotation, i) => {
      const name = annotation.label ?? `annotation ${i + 1}`;
      if (annotation.resolution.state !== "anchored") {
        issues.push(
          `"${evidence.title}" ${name}: anchor is ${annotation.resolution.state} in the current patch`
        );
      }
      for (const ref of annotation.scenarios) {
        if (!ref.resolved) {
          issues.push(
            `"${evidence.title}" ${name}: cites scenario "${ref.id}" which is not in this run`
          );
        }
      }
    });
  }
  return issues;
}

function buildSummary(
  claims: ReviewClaim[],
  changedFiles: ChangedFileReview[]
): ReviewSummary {
  const byAudience: Record<ReviewAudience, number> = {
    stakeholder: 0,
    engineer: 0,
  };
  const byStrength: Record<EvidenceStrength, number> = {
    none: 0,
    weak: 0,
    moderate: 0,
    strong: 0,
  };
  for (const claim of claims) {
    byAudience[claim.audience] += 1;
    byStrength[claim.strength] += 1;
  }

  return {
    totalClaims: claims.length,
    byAudience,
    byStrength,
    changedSourceFiles: changedFiles.length,
    uncovered: changedFiles.filter((f) => f.band === "uncovered").length,
    weaklyCovered: changedFiles.filter((f) => f.band === "weak").length,
    covered: changedFiles.filter((f) => f.band === "covered").length,
  };
}
