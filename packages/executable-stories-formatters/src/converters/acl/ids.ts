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
