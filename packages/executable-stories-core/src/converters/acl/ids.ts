/**
 * ID generation and slug helpers for deterministic, Cucumber-compatible IDs.
 */

import { createHash } from "node:crypto";

/**
 * Generate a deterministic test case ID from source file and scenario name.
 *
 * @param sourceFile - The source file path
 * @param scenario - The scenario name
 * @returns A 12-character hex ID
 */
export function generateTestCaseId(sourceFile: string, scenario: string): string {
  const input = `${sourceFile}::${scenario}`;
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

/**
 * Generate a deterministic run ID from timestamp and project root.
 *
 * @param startedAtMs - Run start timestamp
 * @param projectRoot - Project root directory
 * @returns A 16-character hex ID
 */
export function generateRunId(startedAtMs: number, projectRoot: string): string {
  const input = `${startedAtMs}::${projectRoot}`;
  return createHash("sha1").update(input).digest("hex").slice(0, 16);
}

/**
 * Slugify a string for Cucumber JSON IDs.
 *
 * Converts to lowercase, replaces path separators/spaces with hyphens,
 * removes other special chars, and trims leading/trailing hyphens.
 *
 * @param text - The text to slugify
 * @returns A URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[/\\]+/g, "-") // Convert path separators to hyphens
    .replace(/[^\w\s-]/g, "") // Remove other special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Generate a Cucumber-compatible feature ID from file path.
 *
 * Uses the full path (without extension) to ensure uniqueness for files
 * with the same basename in different directories.
 *
 * @param uri - The feature file URI/path
 * @returns A slugified feature ID
 */
export function generateFeatureId(uri: string): string {
  // Use full path without extension for uniqueness
  const pathWithoutExt = uri.replace(/\.[^.]+$/, "");
  return slugify(pathWithoutExt);
}

/**
 * Generate a Cucumber-compatible scenario ID.
 *
 * Format: feature-id;scenario-name
 *
 * @param featureId - The feature ID
 * @param scenarioName - The scenario name
 * @returns A Cucumber-compatible scenario ID
 */
export function generateScenarioId(featureId: string, scenarioName: string): string {
  return `${featureId};${slugify(scenarioName)}`;
}

// --- Behaviour identity: rename/move-resilient matching ---------------------
//
// `generateTestCaseId` hashes (sourceFile + scenario title), so renaming a test or
// moving its file changes the id and a diff reports the behaviour as removed + added.
// The helpers below derive identity from a behaviour's *content* so the compare engine
// can re-pair a removed/added couple as `renamed` / `moved` instead of a false deletion.

/** Minimal shape needed to compute behaviour identity, decoupled from canonical types. */
export interface BehaviourIdentityInput {
  /** Scenario title. */
  scenario: string;
  /** Source file path. */
  sourceFile: string;
  /** Ordered BDD steps (keyword + text) — the most intent-bearing content. */
  steps: ReadonlyArray<{ keyword: string; text: string }>;
  /** Product-code paths/globs this scenario covers (optional; strengthens identity). */
  covers?: readonly string[];
}

/** Lowercase, strip punctuation, collapse whitespace. */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

/**
 * A content fingerprint independent of the scenario title and source file.
 *
 * Two behaviours with the same ordered steps (and `covers`) share a fingerprint even
 * after a rename or move — the signal used to reclassify a `removed` + `added` pair as
 * `renamed` / `moved`. Returns `""` when there is nothing to fingerprint (no steps and
 * no covers), so callers can skip exact matching for content-less scenarios.
 */
export function behaviourFingerprint(input: BehaviourIdentityInput): string {
  const steps = input.steps
    .map((step) => `${step.keyword.toLowerCase()}:${normalizeText(step.text)}`)
    .join("\n");
  const covers = [...(input.covers ?? [])]
    .map((path) => path.trim())
    .filter(Boolean)
    .sort()
    .join(",");
  if (steps.length === 0 && covers.length === 0) return "";
  return createHash("sha1").update(`${steps}\u0000${covers}`).digest("hex").slice(0, 16);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function stepTokens(steps: BehaviourIdentityInput["steps"]): Set<string> {
  const tokens = new Set<string>();
  for (const step of steps) {
    for (const token of tokenize(step.text)) tokens.add(token);
  }
  return tokens;
}

/**
 * A 0..1 similarity between two behaviours, blending step-content overlap (weighted
 * highest — it carries the behaviour) with title overlap (a label). Used as a guarded
 * second pass after exact-fingerprint matching, to catch renames that also edited a step.
 */
export function behaviourSimilarity(
  a: BehaviourIdentityInput,
  b: BehaviourIdentityInput
): number {
  const aSteps = stepTokens(a.steps);
  const bSteps = stepTokens(b.steps);
  // With no step content on either side there is no behavioural signal to compare — the id
  // hash already encoded title + file, so a content-less pair stays add/remove (conservative,
  // avoids pairing unrelated scenarios that merely share a common title word).
  if (aSteps.size === 0 || bSteps.size === 0) return 0;
  const stepScore = jaccard(aSteps, bSteps);
  const titleScore = jaccard(new Set(tokenize(a.scenario)), new Set(tokenize(b.scenario)));
  return stepScore * 0.7 + titleScore * 0.3;
}
