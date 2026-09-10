/**
 * Review JSON formatter — projects a {@link ReviewResult} into the
 * {@link ReviewJson} wire contract that CI surfaces render.
 *
 * The markdown and HTML reviews are written for a person reading top to bottom.
 * A PR comment is not that: it needs a verdict above the fold, a ranked list of
 * what is wrong, and a file and line to anchor each item to. Deriving that from
 * the markdown means the GitHub Action parses output it just generated, and
 * every heading tweak breaks the comment. So the ranking lives here, next to
 * the model it ranks, where a test can hold it still.
 */

import type { TestCaseResult } from "executable-stories-core/types/test-result";

import type {
  ReviewClaim,
  ReviewFinding,
  ReviewJson,
  ReviewJsonClaim,
  ReviewResult,
  ReviewSeverity,
} from "../types/review";

/** Merge-blocking weight, worst first. Drives the order findings are rendered in. */
const SEVERITY_RANK: Record<ReviewSeverity, number> = {
  blocker: 0,
  major: 1,
  minor: 2,
};

/** The step that failed, as the reader would say it aloud ("Then the total is £30"). */
function failingStep(testCase: TestCaseResult): string | undefined {
  const failed = testCase.stepResults.find((s) => s.status === "failed");
  if (!failed) return undefined;
  const step = testCase.story.steps?.[failed.index];
  return step ? `${step.keyword} ${step.text}` : undefined;
}

/** First line of an error, which is the part that names the problem. */
function firstLine(message: string): string {
  const line = message.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
  return line.length > 300 ? `${line.slice(0, 297)}…` : line;
}

function failedFinding(claim: ReviewClaim): ReviewFinding {
  const testCase = claim.testCase;
  const evidence: string[] = [`the scenario is ${claim.status}`];
  const step = failingStep(testCase);
  if (step) evidence.push(`failed at: ${step}`);
  if (testCase.errorMessage) evidence.push(firstLine(testCase.errorMessage));

  return {
    kind: "failed",
    severity: "blocker",
    title: `Unproven claim: ${claim.scenario}`,
    file: claim.sourceFile,
    line: claim.sourceLine,
    detail:
      "This scenario states a claim about the change and does not pass, so the claim is unproven.",
    evidence,
    remedy:
      "Fix the behaviour so the scenario passes, or correct the scenario if it states the wrong claim.",
  };
}

/**
 * A skipped or pending scenario is not a failure, and calling it one turns every
 * `it.skip` into a merge blocker. It is still an unproven claim, so it is
 * reported — as the mildest kind there is.
 */
function skippedFinding(claim: ReviewClaim): ReviewFinding {
  return {
    kind: "skipped",
    severity: "minor",
    title: `Claim not exercised: ${claim.scenario}`,
    file: claim.sourceFile,
    line: claim.sourceLine,
    detail: `This scenario is ${claim.status}, so it did not run and its claim about the change is unproven.`,
    evidence: claim.strengthReasons,
    remedy:
      "Run the scenario, or delete it if the claim no longer applies — a permanently skipped claim is worse than no claim.",
  };
}

function unassertedFinding(claim: ReviewClaim): ReviewFinding {
  return {
    kind: "unasserted",
    severity: "major",
    title: `Green but proves nothing: ${claim.scenario}`,
    file: claim.sourceFile,
    line: claim.sourceLine,
    detail:
      "This scenario passed without asserting anything, so it cannot fail and proves nothing about the change.",
    evidence: claim.strengthReasons,
    remedy:
      "Assert the outcome the scenario claims, so that breaking the behaviour turns it red.",
  };
}

function uncoveredFinding(
  file: ReviewResult["changedFiles"][number]
): ReviewFinding {
  return {
    kind: "uncovered",
    severity: "major",
    title: "Changed with no evidence",
    file: file.path,
    detail: `This file was ${file.changeKind} in the diff and no scenario in the run claims anything about it.`,
    evidence: ["no claim in this run correlates to this file"],
    remedy:
      "Add a scenario covering the behaviour this file changed, or say in the PR why it needs none.",
  };
}

function weakFinding(
  file: ReviewResult["changedFiles"][number]
): ReviewFinding {
  return {
    kind: "weak",
    severity: "minor",
    title: "Weak evidence only",
    file: file.path,
    detail: `This file was ${file.changeKind} in the diff and its only claims are weakly evidenced.`,
    evidence: file.claims.map((c) => `${c.scenario} (${c.strength})`),
    remedy:
      "Strengthen the proof: verify the test fails on the base ref, add integration or e2e coverage, or attach a screenshot or trace.",
  };
}

/**
 * Rank every problem this review found, worst first.
 *
 * A red scenario blocks. A green scenario that asserted nothing is `major` and
 * not `minor` on purpose: it is worse than an honestly missing test, because it
 * reads as proof to anyone skimming the run.
 */
export function reviewFindings(review: ReviewResult): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const claim of review.claims) {
    if (claim.status === "failed") {
      findings.push(failedFinding(claim));
    } else if (claim.status === "skipped" || claim.status === "pending") {
      findings.push(skippedFinding(claim));
    } else if (claim.strength === "none") {
      findings.push(unassertedFinding(claim));
    }
  }

  for (const file of review.changedFiles) {
    if (file.band === "uncovered") findings.push(uncoveredFinding(file));
    else if (file.band === "weak") findings.push(weakFinding(file));
  }

  return findings.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );
}

function toJsonClaim(claim: ReviewClaim): ReviewJsonClaim {
  return {
    id: claim.id,
    scenario: claim.scenario,
    sourceFile: claim.sourceFile,
    sourceLine: claim.sourceLine,
    status: claim.status,
    audience: claim.audience,
    changeType: claim.changeType,
    strength: claim.strength,
    strengthReasons: claim.strengthReasons,
    coversFiles: claim.coversFiles,
  };
}

/** Project a review into the JSON contract CI surfaces render. */
export function buildReviewJson(review: ReviewResult): ReviewJson {
  const run = { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0 };
  for (const testCase of review.run.testCases) {
    run.total++;
    if (
      testCase.status === "passed" ||
      testCase.status === "failed" ||
      testCase.status === "skipped" ||
      testCase.status === "pending"
    ) {
      run[testCase.status]++;
    }
  }

  return {
    version: 1,
    baseRef: review.context.baseRef,
    headRef: review.context.headRef,
    summary: review.summary,
    run,
    findings: reviewFindings(review),
    changedFiles: review.changedFiles,
    claims: review.claims.map(toJsonClaim),
  };
}
