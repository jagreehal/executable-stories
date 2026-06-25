/**
 * verified-by resolver — the core of living documentation.
 *
 * A docs page declares which stories prove it is still true:
 *
 *   ---
 *   title: ADR 0007 — Cap combined discount at 30%
 *   verifiedBy: [checkout--caps-the-discount-at-30-percent, pricing]
 *   ---
 *
 * At build time each reference is resolved against the latest test run
 * (story-report.json) so the page renders a live status badge. If the
 * referenced story is missing or failing, the page says so loudly — that is
 * the mechanism that stops documentation from rotting.
 *
 * This module is intentionally free of any Astro/runtime imports so it can be
 * unit-tested in isolation and reused anywhere.
 */
import type { TestStatus, ReportTicket } from "executable-stories-core";

/** Scenario result status — the same union core uses for report scenarios. */
export type ScenarioStatus = TestStatus;

/** Overall verification verdict for a set of references. */
export type VerificationStatus =
  /** Every matched story passed in the last run. */
  | "verified"
  /** At least one matched story failed. */
  | "failing"
  /** Stories matched but some were skipped/pending — not actually exercised. */
  | "not-run"
  /** No story matched — the page references something that doesn't exist. */
  | "unverified";

export interface ScenarioLike {
  id: string;
  title: string;
  status: ScenarioStatus;
  tags?: string[];
  tickets?: ReportTicket[];
  /** Feature title (filled in when flattening a report). */
  feature?: string;
  sourceFile?: string;
  sourceLine?: number;
}

export interface StoryReportLike {
  runId?: string;
  finishedAtMs?: number;
  features?: Array<{
    title?: string;
    sourceFile?: string;
    scenarios?: ScenarioLike[];
  }>;
}

/** Per-reference resolution: which scenarios a single `verifiedBy` entry matched. */
export interface RefResolution {
  ref: string;
  matched: ScenarioLike[];
}

export interface VerificationResult {
  status: VerificationStatus;
  /** Run finish time, used as the "last verified" timestamp. */
  lastVerifiedMs?: number;
  runId?: string;
  /** Number of distinct scenarios matched across all references. */
  total: number;
  passed: number;
  failed: number;
  /** skipped + pending. */
  notRun: number;
  refs: RefResolution[];
  /** References that matched no scenario at all. */
  missingRefs: string[];
}

/** Flatten a story report into a single list of scenarios with feature context. */
export function flattenReport(report: StoryReportLike): ScenarioLike[] {
  const features = report.features ?? [];
  return features.flatMap((feature) =>
    (feature.scenarios ?? []).map((scenario) => ({
      ...scenario,
      feature: scenario.feature ?? feature.title,
      sourceFile: scenario.sourceFile ?? feature.sourceFile,
    })),
  );
}

/** Resolve a single scenario id against the latest report. */
export function findScenarioById(
  report: StoryReportLike,
  scenarioId: string,
): ScenarioLike | undefined {
  return flattenReport(report).find((scenario) => scenario.id === scenarioId);
}

/** Convenience check for human-authored pages that point at one scenario id. */
export function hasScenarioId(report: StoryReportLike, scenarioId: string): boolean {
  return findScenarioById(report, scenarioId) !== undefined;
}

/** Does a single reference identify this scenario? id, tag, ticket id, or exact title. */
function scenarioMatchesRef(scenario: ScenarioLike, ref: string): boolean {
  if (scenario.id === ref) return true;
  if (scenario.title === ref) return true;
  if ((scenario.tags ?? []).includes(ref)) return true;
  if ((scenario.tickets ?? []).some((ticket) => ticket.id === ref)) return true;
  return false;
}

function toRefArray(refs: string | string[]): string[] {
  const list = Array.isArray(refs) ? refs : [refs];
  // Trim, drop empties, de-duplicate while preserving order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const ref = raw.trim();
    if (ref && !seen.has(ref)) {
      seen.add(ref);
      out.push(ref);
    }
  }
  return out;
}

/**
 * Resolve `verifiedBy` references against a story report.
 *
 * Status semantics (deliberately strict — a doc is only "verified" when the
 * evidence actually passed):
 *   - any matched scenario failed            → "failing"
 *   - every matched scenario passed          → "verified"
 *   - matched but some skipped/pending       → "not-run"
 *   - nothing matched                        → "unverified"
 */
export function resolveVerification(
  refs: string | string[],
  report: StoryReportLike,
): VerificationResult {
  const refList = toRefArray(refs);
  const scenarios = flattenReport(report);

  const refResolutions: RefResolution[] = refList.map((ref) => ({
    ref,
    matched: scenarios.filter((scenario) => scenarioMatchesRef(scenario, ref)),
  }));

  // De-duplicate matched scenarios across references (a tag + id can overlap).
  const matchedById = new Map<string, ScenarioLike>();
  for (const resolution of refResolutions) {
    for (const scenario of resolution.matched) {
      matchedById.set(scenario.id, scenario);
    }
  }
  const matched = [...matchedById.values()];

  const passed = matched.filter((s) => s.status === "passed").length;
  const failed = matched.filter((s) => s.status === "failed").length;
  const notRun = matched.filter(
    (s) => s.status === "skipped" || s.status === "pending",
  ).length;

  let status: VerificationStatus;
  if (matched.length === 0) {
    status = "unverified";
  } else if (failed > 0) {
    status = "failing";
  } else if (notRun > 0) {
    status = "not-run";
  } else {
    status = "verified";
  }

  return {
    status,
    lastVerifiedMs: report.finishedAtMs && report.finishedAtMs > 0 ? report.finishedAtMs : undefined,
    runId: report.runId && report.runId.length > 0 ? report.runId : undefined,
    total: matched.length,
    passed,
    failed,
    notRun,
    refs: refResolutions,
    missingRefs: refResolutions.filter((r) => r.matched.length === 0).map((r) => r.ref),
  };
}

export interface StatusPresentation {
  label: string;
  icon: string;
  /** Short human sentence describing the verdict. */
  summary: string;
}

/** Whole days since the verification run completed, if known. */
export function verificationAgeDays(
  result: VerificationResult,
  nowMs = Date.now(),
): number | undefined {
  if (!result.lastVerifiedMs) return undefined;
  return Math.floor(Math.max(0, nowMs - result.lastVerifiedMs) / 86_400_000);
}

/** Simple freshness heuristic for portal UI warnings. */
export function isVerificationStale(
  result: VerificationResult,
  staleAfterDays: number,
  nowMs = Date.now(),
): boolean {
  const ageDays = verificationAgeDays(result, nowMs);
  return ageDays !== undefined && ageDays >= staleAfterDays;
}

/** Presentation metadata for each status — kept here so badge + tests agree. */
export function presentStatus(result: VerificationResult): StatusPresentation {
  switch (result.status) {
    case "verified":
      return {
        label: "Verified",
        icon: "✓",
        summary:
          result.total === 1
            ? "Verified by a passing story"
            : `Verified by ${result.total} passing stories`,
      };
    case "failing":
      return {
        label: "Failing",
        icon: "✕",
        summary: `${result.failed} of ${result.total} verifying stories are failing`,
      };
    case "not-run":
      return {
        label: "Not run",
        icon: "⏳",
        summary: "Verifying stories exist but were not exercised in the last run",
      };
    case "unverified":
      return {
        label: "Unverified",
        icon: "⚠",
        summary:
          result.missingRefs.length > 0
            ? `No story matches: ${result.missingRefs.join(", ")}`
            : "No verifying story is linked",
      };
  }
}

/**
 * Build a {@link StoryReportLike} from the flat entries the storiesLoader feeds
 * into the `stories` collection (each entry carries scenario fields plus a
 * `feature` object and per-run context). Lets the VerifiedBy / HealthDashboard
 * components resolve against the live collection without re-reading the report.
 */
export function reportFromStoryEntries(
  entries: Array<{
    id: string;
    title: string;
    status: ScenarioStatus;
    tags?: string[];
    tickets?: ReportTicket[];
    sourceLine?: number;
    feature?: { title?: string; sourceFile?: string };
    run?: { runId?: string; finishedAtMs?: number };
  }>,
): StoryReportLike {
  const scenarios: ScenarioLike[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    tags: e.tags,
    tickets: e.tickets,
    feature: e.feature?.title,
    sourceFile: e.feature?.sourceFile,
    sourceLine: e.sourceLine,
  }));
  const first = entries[0]?.run;
  return {
    runId: first?.runId,
    finishedAtMs: first?.finishedAtMs,
    features: [{ scenarios }],
  };
}
