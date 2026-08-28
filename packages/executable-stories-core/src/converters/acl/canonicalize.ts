/**
 * Anti-Corruption Layer (ACL) - Layer 2.
 *
 * Transforms permissive RawRun data from framework adapters into
 * strict canonical TestRunResult for formatters.
 */

import type { StoryMeta, NormalizedTicket } from "../../types/story.js";
import type { RawRun, RawTestCase } from "../../types/raw.js";
import type {
  TestRunResult,
  TestCaseResult,
  FeatureDeclaration,
} from "../../types/test-result.js";
import type { CanonicalizeOptions } from "../../types/canonicalize.js";
import { normalizeStatus } from "./status.js";
import { generateTestCaseId, generateRunId } from "./ids.js";
import { deriveStepResults, mergeStepResults } from "./steps.js";
import { resolveAttachments } from "./attachments.js";

/**
 * Canonicalize a raw run into a strict TestRunResult.
 *
 * This is the main entry point for the ACL. It:
 * - Enforces required fields with defaults
 * - Normalizes statuses to TestStatus enum
 * - Applies step fallback rules
 * - Resolves attachments (embed vs link)
 * - Generates deterministic IDs
 *
 * @param raw - Raw run data from a framework adapter
 * @param options - Canonicalization options
 * @returns Strict canonical TestRunResult
 */
export function canonicalizeRun(
  raw: RawRun,
  options: CanonicalizeOptions = {}
): TestRunResult {
  const now = Date.now();
  const startedAtMs = raw.startedAtMs ?? options.defaults?.startedAtMs ?? now;
  const finishedAtMs = raw.finishedAtMs ?? options.defaults?.finishedAtMs ?? now;

  const runId = generateRunId(startedAtMs, raw.projectRoot);

  const features = canonicalizeFeatures(raw.features);

  // A declaration's tags belong to every scenario in its file — that is the
  // point of putting tags on story.feature() rather than repeating them on
  // each scenario. Features are built first so the scenarios can inherit.
  const inheritedTags = new Map<string, string[]>(
    features.flatMap((f) => (f.tags?.length ? [[f.sourceFile, f.tags] as const] : [])),
  );

  const testCases = raw.testCases
    .filter((tc) => tc.story != null)
    .map((tc) => canonicalizeTestCase(tc, options, raw.projectRoot, inheritedTags));

  return {
    testCases,
    ...(features.length > 0 ? { features } : {}),
    startedAtMs,
    finishedAtMs,
    durationMs: finishedAtMs - startedAtMs,
    projectRoot: raw.projectRoot,
    runId,
    packageVersion: raw.packageVersion,
    gitSha: raw.gitSha,
    ci: raw.ci,
    ...(raw.runScope ? { runScope: raw.runScope } : {}),
    ...(raw.coveredSourceFiles?.length
      ? { coveredSourceFiles: [...raw.coveredSourceFiles] }
      : {}),
    ...(raw.incompleteSourceFiles?.length
      ? { incompleteSourceFiles: [...raw.incompleteSourceFiles] }
      : {}),
  };
}

/**
 * Keep the declarations that can actually be attached to something.
 *
 * The report groups scenarios by source file, so a declaration without a file,
 * or without a title to show, has nowhere to land. Later declarations for the
 * same file win, which matches how a re-declaration reads in source order.
 */
function canonicalizeFeatures(raw: RawRun["features"]): FeatureDeclaration[] {
  if (!raw?.length) return [];

  const byFile = new Map<string, FeatureDeclaration>();
  for (const feature of raw) {
    if (!feature.sourceFile || !feature.title) continue;
    byFile.set(feature.sourceFile, {
      sourceFile: feature.sourceFile,
      title: feature.title,
      kind: feature.kind ?? "feature",
      ...(feature.narrative ? { narrative: feature.narrative } : {}),
      ...(feature.tags?.length ? { tags: feature.tags } : {}),
      ...(feature.glossary?.length ? { glossary: feature.glossary } : {}),
    });
  }

  return [...byFile.values()];
}

/**
 * Canonicalize a single test case.
 */
function canonicalizeTestCase(
  raw: RawTestCase,
  options: CanonicalizeOptions,
  projectRoot: string,
  /** Tags declared by this file's `story.feature(...)`, keyed by source file. */
  inheritedTags: Map<string, string[]> = new Map()
): TestCaseResult {
  const story = raw.story!;
  const sourceFile = raw.sourceFile ?? "unknown";
  const scenario = story.scenario ?? raw.title ?? "Unknown Scenario";

  // Generate deterministic ID
  const id = generateTestCaseId(sourceFile, scenario);

  // Normalize status
  const status = normalizeStatus(raw.status);

  // Derive step results
  const derivedSteps = deriveStepResults(story.steps ?? [], status, raw.error);
  const stepResults = mergeStepResults(
    derivedSteps,
    raw.stepEvents?.map((e) => ({
      index: e.index,
      stepId: e.stepId,
      status: e.status,
      durationMs: e.durationMs,
      errorMessage: e.errorMessage,
    }))
  );

  // Resolve attachments
  const attachments = resolveAttachments(raw.attachments, {
    maxEmbedBytes: options.attachments?.maxEmbedBytes,
    externalDir: options.attachments?.externalDir,
    projectRoot,
  });

  // Normalize tags, folding in the ones the file's feature declaration applies
  // to every scenario in it.
  const tags = normalizeTags(story, inheritedTags.get(sourceFile));

  // Normalize tickets (raw JSON may have plain strings)
  if (story.tickets) {
    story.tickets = normalizeTickets(story.tickets as unknown as (string | NormalizedTicket)[]);
  }

  // Build title path
  const titlePath = buildTitlePath(raw, story);

  return {
    id,
    story,
    sourceFile,
    sourceLine: raw.sourceLine ?? 1,
    status,
    rawStatus: raw.status,
    durationMs: raw.durationMs ?? 0,
    errorMessage: raw.error?.message,
    errorStack: raw.error?.stack,
    attachments,
    stepResults,
    titlePath,
    projectName: raw.projectName,
    retry: raw.retry ?? 0,
    retries: raw.retries ?? 0,
    tags,
    ...(raw.evidence ? { evidence: raw.evidence } : {}),
  };
}

/**
 * Normalize tags from story metadata.
 *
 * - Ensures array format
 * - Deduplicates
 * - Sorts alphabetically
 */
function normalizeTags(story: StoryMeta, inherited?: string[]): string[] {
  const tags = [...(story.tags ?? []), ...(inherited ?? [])];
  return [...new Set(tags)].sort();
}

/**
 * Normalize raw tickets to NormalizedTicket objects.
 *
 * Raw JSON may contain plain strings (from language packages or older adapters)
 * or objects with {id, url}. This ensures a uniform shape for formatters.
 */
function normalizeTickets(raw: (string | NormalizedTicket)[]): NormalizedTicket[] {
  return raw.map((t) => (typeof t === "string" ? { id: t } : t));
}

/**
 * Build title path from raw test case and story metadata.
 *
 * Prefers story.suitePath if available, falls back to raw.titlePath.
 */
function buildTitlePath(raw: RawTestCase, story: StoryMeta): string[] {
  if (story.suitePath && story.suitePath.length > 0) {
    return story.suitePath;
  }

  if (raw.titlePath && raw.titlePath.length > 0) {
    // Exclude the last element (test name) if titlePath includes it
    const withoutTestName = raw.titlePath.slice(0, -1);
    return withoutTestName.length > 0 ? withoutTestName : [];
  }

  return [];
}
