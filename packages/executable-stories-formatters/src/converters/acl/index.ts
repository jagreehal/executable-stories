/**
 * Anti-Corruption Layer (ACL) - Layer 2.
 *
 * Transforms permissive RawRun data from framework adapters into
 * strict canonical TestRunResult for formatters.
 */

import type { StoryMeta } from "../../types/story";
import type { RawRun, RawTestCase } from "../../types/raw";
import type {
  TestRunResult,
  TestCaseResult,
  TestStatus,
} from "../../types/test-result";
import type { CanonicalizeOptions } from "../../types/options";
import { normalizeStatus } from "./status";
import { generateTestCaseId, generateRunId } from "./ids";
import { deriveStepResults, mergeStepResults } from "./steps";
import { resolveAttachments } from "./attachments";

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

  const testCases = raw.testCases
    .filter((tc) => tc.story != null)
    .map((tc) => canonicalizeTestCase(tc, options, raw.projectRoot));

  return {
    testCases,
    startedAtMs,
    finishedAtMs,
    durationMs: finishedAtMs - startedAtMs,
    projectRoot: raw.projectRoot,
    runId,
    packageVersion: raw.packageVersion,
    gitSha: raw.gitSha,
    ci: raw.ci,
  };
}

/**
 * Canonicalize a single test case.
 */
function canonicalizeTestCase(
  raw: RawTestCase,
  options: CanonicalizeOptions,
  projectRoot: string
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

  // Normalize tags
  const tags = normalizeTags(story);

  // Build title path
  const titlePath = buildTitlePath(raw, story);

  return {
    id,
    story,
    sourceFile,
    sourceLine: raw.sourceLine ?? 1,
    status,
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
  };
}

/**
 * Normalize tags from story metadata.
 *
 * - Ensures array format
 * - Deduplicates
 * - Sorts alphabetically
 */
function normalizeTags(story: StoryMeta): string[] {
  const tags = story.tags ?? [];
  return [...new Set(tags)].sort();
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

// Re-export helpers for advanced usage
export { normalizeStatus } from "./status";
export { generateTestCaseId, generateRunId, slugify } from "./ids";
export { deriveStepResults, mergeStepResults } from "./steps";
export { resolveAttachment, resolveAttachments } from "./attachments";
